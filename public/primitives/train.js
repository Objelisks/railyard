import regl from "../regl.js"
import { vec2, vec3, quat } from '../libs/gl-matrix.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { DERAILMENT_FACTOR, BOGIE_SIZE, TURNOUT_DETECTOR_SIZE, CONNECTOR_OFFSET } from '../constants.js'
import { intersectTracks, intersectTurnouts } from '../raycast.js'
import { getTrains } from '../railyard.js'
import { to_vec2, project2, clamp } from '../math.js'
import { box2Around, reglArg, hexToRgb } from '../utils.js'
import { drawCube } from './cube.js'
import { setUniforms, setContext } from './model.js'
import createRay from '../libs/ray-aabb.mjs'
import { meshes } from './meshes.js'
import { flags } from '../flags.js'
import { connectBogies, disconnectBogies } from "../boxes.js"
import planck from '../libs/planck-js.mjs'
import { playEffect } from '../audio.js'

const FORWARD = [1, 0, 0]
const ENGINE_ACCELERATION = 0.1
const POINT_BREAK = 20
const TOP_SPEED = 5
const DISCONNECT_GRACE = 1
const CONNECT_THRESHOLD = 0.5

const raycaster = createRay([0, 0, 0], [1, 0, 0])

const trainTypes = {
    'sw1': { length: 4, bogieOffset: 1 },
    'berkshire': { length: 5.1, bogieOffset: 1.7, hidden: ['bogieFront'] },
    'caboose': { length: 3, bogieOffset: 0.8 },
    'g43': { length: 4.7, bogieOffset: 1.6 },
    'tm8': { length: 3.5, bogieOffset: 1 },
    'x36': { length: 4.1, bogieOffset: 1.3 },
    'p42': { length: 6.1, bogieOffset: 2 },
}


const setupTrain = regl({
    context: {
        position: (context, props) => reglArg('position', [0, 0, 0], context, props),
        rotation: (context, props) => reglArg('rotation', [0, 0, 0, 1], context, props),
        scale: [1, 1, 1],
        color1: (context, props) => props.color1.map(x => x * (!props.remote && props.visible ? 1.5 : 1)),
        color2: (context, props) => props.color2.map(x => x * (!props.remote && props.visible ? 1.5 : 1)),
        type: regl.prop('type')
    }
})

const drawhd = (props) => {
    setUniforms(props, (context) => meshes[context.type]())
    if(props.bogieFront && !props.hidden.includes('bogieFront')) {
        const bogieFrontPos = to_vec2(props.bogieFront.getPosition())
        setContext({
            position: [bogieFrontPos[0]/10, -0.3, bogieFrontPos[1]/10],
            rotation: quat.fromEuler([], 0, -props.bogieFront.getAngle()*180/Math.PI, 0)
        }, () => setUniforms(props, () => meshes['bogie']()))
    }
    if(props.bogieBack && !props.hidden.includes('bogieBack')) {
        const bogieBackPos = to_vec2(props.bogieBack.getPosition())
        setContext({
            position: [bogieBackPos[0]/10, -0.3, bogieBackPos[1]/10],
            rotation: quat.fromEuler([], 0, -props.bogieBack.getAngle()*180/Math.PI, 0)
        }, () => setUniforms(props, () => meshes['bogie']()))
    }
}

const draw = (props) => 
    flags.graphics ? 
        drawhd(props) :
        setContext({ scale: [props.length, 1, 1] }, () => setUniforms(props, () => drawCube()))

export const drawTrain = (props) => {
    setupTrain(props, () => draw(props))
}

export const makeTrain = (config) => ({
    id: uuid(),

    type: config.type,
    powered: false,
    poweredTargetSpeed: 0,
    currentSpeed: 0,
    color1: hexToRgb(localStorage.getItem('color1') ?? '#ffaaaa'),
    color2: hexToRgb(localStorage.getItem('color2') ?? '#ffaaaa'),
    length: trainTypes[config.type].length ?? 4,
    bogieOffset: trainTypes[config.type].bogieOffset ?? 1,
    hidden: trainTypes[config.type].hidden ?? [],

    // render
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],

    // physics
    bogieFront: null,
    bogieBack: null,

    // deprecated
    force: [0, 0],
    angularVelocity: 0,

    ...config
})

export const disconnect = (train, connection) => {
    console.log('disconnect')
    const trains = getTrains()
    const other = trains.find(t => t.id === train[connection])
    const otherConnection = other.connectionFront === train.id ? 'connectionFront' : 'connectionBack'
    const facing3dOther = vec3.transformQuat([], [1, 0, 0], other.rotation)
    const myBogie = connection === 'connectionFront' ? train.bogieFront : train.bogieBack
    const otherBogie = otherConnection === 'connectionFront' ? other.bogieFront : other.bogieBack
    disconnectBogies(myBogie, otherBogie)
    other[otherConnection] = null
    train[connection] = null
    train.justDisconnected = other.id
    other.justDisconnected = train.id
    train.lastDisconnect = regl.now()
    other.lastDisconnect = regl.now()
    const DISCONNECT_FORCE = 0.02
}

export const updateTrain = (train) => {
    if(train.lastDisconnect !== null && regl.now() - train.lastDisconnect > DISCONNECT_GRACE) {
        train.lastDisconnect = null
        train.justDisconnected = null
    }
    const connectors = ['connectionFront', 'connectionBack']
    connectors.forEach(myConnector => {
        // disconnect any cars that are too far
        const bogie = myConnector === 'connectionFront' ? train.bogieFront : train.bogieBack
        const connectedCar = getTrains().find(t => t.id === train[myConnector])
        if(connectedCar) {
            const connectedConnector = connectedCar.connectionFront === train.id ? 'connectionFront' : 'connectionBack'
            const otherBogie = connectedConnector === 'connectionFront' ? connectedCar.bogieFront : connectedCar.bogieBack
            // TODO: tune point break
            if(train[myConnector] && vec3.distance(train.position, connectedCar.position) > POINT_BREAK) {
                disconnect(train, myConnector)
            }
        }
    })
}

export const closestPointOnRail = (position) => {
    const tracks = intersectTracks(box2Around(position, BOGIE_SIZE)).map(entry => entry.track)
    const rateTrack = (track) => {
        const projectedPoint = track.curve.project({x: position[0], y: position[1]})
        return vec2.distance([projectedPoint.x, projectedPoint.y], position)
    }
    let sortedTracks = tracks
        .sort((trackA, trackB) => rateTrack(trackA) - rateTrack(trackB))
    const projected = sortedTracks
        .map(track => track.curve.project({x: position[0], y: position[1]}))
        .filter(projectedPoint => vec2.dist(position, to_vec2(projectedPoint)) <= DERAILMENT_FACTOR)

    const nearestProjectedPoint = projected[0]
    return { point: nearestProjectedPoint, track: sortedTracks[0] }
}

// 2d pos and dir
export const closestPointOnRailRespectClosed = (position, direction = [0, 0]) => {
    const tracks = intersectTracks(box2Around(position, BOGIE_SIZE)).map(entry => entry.track)
    const turnouts = intersectTurnouts(box2Around(position, TURNOUT_DETECTOR_SIZE)).map(entry => entry.turnout)
    const nearbyClosedEndpoints = turnouts.flatMap(turnout => turnout.tracks
        .map((track, i) => ({turnoutTrack: track, end: turnout.endpoints[i]}))
        .filter((_, i) => i !== turnout.open)
    )

    const isClosedInThisDirection = (track) => {
        const closerEndpoint = vec2.distance(position, to_vec2(track.curve.get(0))) < vec2.distance(position, to_vec2(track.curve.get(1)))
            ? 0 : 1
        const closerEndpointClosed = nearbyClosedEndpoints
            .some(({turnoutTrack, end}) => turnoutTrack === track && end === closerEndpoint)
        const entranceDirection = vec2.scale([], vec2.normalize([], to_vec2(track.curve.derivative(closerEndpoint))), closerEndpoint === 0 ? 1 : -1)
        const isMovementDirection = vec2.dot(entranceDirection, direction) > 0
    
        const shouldFilterOutClosedPath = closerEndpointClosed && isMovementDirection
        return shouldFilterOutClosedPath ? 10000 : 0
    }

    // sort instead of filter to prefer open paths over closed paths
    // rate the tracks based on which is the best fit to follow
    const rateTrack = (track) => {
        const projectedPoint = track.curve.project({x: position[0], y: position[1]})
        const tangent = vec2.normalize([], to_vec2(track.curve.derivative(projectedPoint.t)))
        return isClosedInThisDirection(track) +
            vec2.distance([projectedPoint.x, projectedPoint.y], position) + 
            (1-Math.abs(vec2.dot(tangent, direction)))
    }
    let sortedTracks = tracks
        .sort((trackA, trackB) => rateTrack(trackA) - rateTrack(trackB))
    const projected = sortedTracks
        .map(track => track.curve.project({x: position[0], y: position[1]}))
        .filter(projectedPoint => vec2.dist(position, to_vec2(projectedPoint)) <= DERAILMENT_FACTOR)

    const nearestProjectedPoint = projected[0]
    return { point: nearestProjectedPoint, track: sortedTracks[0] }
}

export const applyTrainForces = (train, bogie) => {
    // train facing direction
    const direction = vec3.transformQuat([], [1, 0, 0], train.rotation)
    const isFront = train.bogieFront === bogie
    
    // rail alignment force (energy into rail)
    const bogieBack2d = vec2.scale([], to_vec2(bogie.getPosition().add(bogie.getLinearVelocity())), 0.1)
    const movementDirection = to_vec2(bogie.getLinearVelocity())

    const { point: nearestProjectedPoint, track } = closestPointOnRailRespectClosed(bogieBack2d, movementDirection)

    if(nearestProjectedPoint) {
        // move train (this is the only place its position is updated, we're ignoring box2d's opinion)
        bogie.setPosition(planck.Vec2({x: nearestProjectedPoint.x*10, y: nearestProjectedPoint.y*10}))
        const derivative = track.curve.derivative(nearestProjectedPoint.t)
        const oldVelocity = bogie.getLinearVelocity()
        const newVelocityDirection = project2([oldVelocity.x, oldVelocity.y], [derivative.x, derivative.y])
        const newVelocity = vec2.scale([], vec2.normalize([], newVelocityDirection), oldVelocity.length())
        bogie.setLinearVelocity({x: newVelocity[0], y: newVelocity[1]})
        bogie.setAngle(Math.atan2(derivative.y, derivative.x))
    }

    // external forces:
    // apply motor force (energy from power)
    const signedBogieSpeed = bogie.getLinearVelocity().length() * vec2.dot([direction[0], direction[2]], vec2.normalize([], to_vec2(bogie.getLinearVelocity())))
    const targetSpeed = train.poweredTargetSpeed * TOP_SPEED
    if(train.powered) {
        train.currentSpeed += clamp(targetSpeed - signedBogieSpeed, -1, 1) * ENGINE_ACCELERATION
        const movementForce = vec2.scale([], [direction[0], direction[2]], train.currentSpeed)
        bogie.setLinearVelocity(planck.Vec2(movementForce[0], movementForce[1]))
    } else {
        train.currentSpeed *= 0.99
    }

    // internal forces:
    // distance constraint between bogies
    // spring constraint between cars
    const frontConnectorOffset = vec3.scale([], direction, train.length/2)
    const backConnectorOffset = vec3.scale([], direction, -train.length/2)
    const { myConnector, pos, dir } = isFront ? 
        {
            myConnector: 'connectionFront',
            pos: vec3.add([], train.position, frontConnectorOffset),
            dir: vec3.normalize([], frontConnectorOffset),
        } :
        {
            myConnector: 'connectionBack',
            pos: vec3.add([], train.position, backConnectorOffset),
            dir: vec3.normalize([], backConnectorOffset)
        }

    raycaster.update(pos, dir)
    let nearestCar = null
    let nearestBogie = null
    let nearestDistance = Infinity
    const trains = getTrains()
    const bogies = []

    // TODO: early exit when found within distance
    trains.forEach(other => {
        if(other.id === train.id) return
        if((train.ghost || other.ghost) && other.owner !== train.owner) return

        const otherDirection = vec3.transformQuat([], FORWARD, other.rotation)
        const frontConnectorOffset = vec3.scale([], otherDirection, other.length/2)
        const backConnectorOffset = vec3.scale([], otherDirection, -other.length/2)
        bogies.push(
            {
                position: vec3.add([], other.position, frontConnectorOffset),
                connector: 'connectionFront',
                train: other
            },
            {
                position: vec3.add([], other.position, -backConnectorOffset),
                connector: 'connectionBack',
                train: other
            }
        )
    })

    bogies.forEach(bogie => {
        const box = [
            [bogie.position[0]-BOGIE_SIZE, bogie.position[1]-BOGIE_SIZE, bogie.position[2]-BOGIE_SIZE],
            [bogie.position[0]+BOGIE_SIZE, bogie.position[1]+BOGIE_SIZE, bogie.position[2]+BOGIE_SIZE],
        ]
        const normal = [0, 0, 0]
        const hit = raycaster.intersects(box, normal)
        if(hit !== false) {
            if(hit < nearestDistance) {
                nearestDistance = hit
                nearestCar = bogie.train
                nearestBogie = bogie
            }
        }
    })

    // if there is another car and the distance to that car is within the threshold
    if(nearestCar !== null && nearestDistance < CONNECT_THRESHOLD) {
        // TODO: what do i do if the train is like, half way on the turnout

        const isCarValidConnectee = (car) => {
            // if the other car is not my own car and we didn't just disconnect from the other car
            return !(train.connectionFront === car.id || train.connectionBack === car.id)
                && train.justDisconnected !== car.id
        }

        // find closest connector on closest train
        const nearestFacing = vec3.transformQuat([], FORWARD, nearestCar.rotation)
        const offsetFront = vec3.scale([], nearestFacing, CONNECTOR_OFFSET)
        const offsetBack = vec3.scale([], nearestFacing, -CONNECTOR_OFFSET)
        const nearerConnector = vec3.distance(pos, vec3.add([], nearestCar.position, offsetFront)) < 
            vec3.distance(pos, vec3.add([], nearestCar.position, offsetBack)) ?
            'connectionFront' : 'connectionBack'
        
        // the nearest connector is not already in use, my connector is not already in use, 
        // the nearest car is a valid choice, the connectors are not hidden (not valid connectors)
        if(!nearestCar[nearerConnector] && !train[myConnector] && isCarValidConnectee(nearestCar) &&
            !train.hidden.includes(myConnector === 'connectionFront' ? 'bogieFront' : 'bogieBack') &&
            !nearestCar.hidden.includes(nearerConnector === 'connectionFront' ? 'bogieFront' : 'bogieBack')) {
            const bodyA = myConnector === 'connectionFront' ? train.bogieFront : train.bogieBack
            const bodyB = nearerConnector === 'connectionFront' ? nearestCar.bogieFront : nearestCar.bogieBack
            connectBogies(bodyA, bodyB)
            playEffect(Math.random() > 0.5 ? 'trainAttachA' : 'trainAttachB')
            nearestCar[nearerConnector] = train.id
            train[myConnector] = nearestCar.id
        }
    }
}
