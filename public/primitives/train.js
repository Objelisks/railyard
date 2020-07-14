import regl from "../regl.js"
import { vec2, vec3, quat } from '../libs/gl-matrix.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { DERAILMENT_FACTOR, BOGIE_SIZE, TURNOUT_DETECTOR_SIZE, CONNECTOR_OFFSET } from '../constants.js'
import { intersectTracks, intersectTurnouts } from '../raycast.js'
import { getTrains } from '../railyard.js'
import { to_vec2, box2Around, reglArg, clamp, sign } from '../utils.js'
import { drawCube } from './cube.js'
import { model } from './model.js'
import createRay from '../libs/ray-aabb.mjs'

const FORWARD = [1, 0, 0]
const UP = [0, 1, 0]
const BOGIE_OFFSET = 0.5
const ENGINE_ACCELERATION = 1
const AIR_FRICTION = 1
const POINT_BREAK = 1

const getTrainColor = (train) => {
    if(train.remote) {
        return [0.81, 0.94, 0.8]
    }
    if(train.visible) {
        return [.9, .7, .9]
    }
    return [1.0, .412, .38]
}

const setupTrain = regl({
    context: {
        position: regl.prop('position'),
        rotation: regl.prop('rotation'),
        scale: [2, 1, 1],
        color: (context, props) => getTrainColor(props)
    }
})
const draw = model(() => drawCube())
export const drawTrain = (props) => setupTrain(props, draw)

export const makeTrain = (config) => ({
    id: uuid(),
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    powered: false,

    poweredTargetSpeed: 0,
    velocity: [0, 0],
    angularVelocity: 0,

    ...config
})

// have current momentum
// want to add or remove speed based on poweredTargetSpeed if powered
// subtract friction, multiplier if braking, based on curvature
// but also, transfer momentum through collision and linkages
// each bogie moves in the direction of the momentum of the center of mass of the car

// movement model:
//  currently: speed is static, no friction, no collision, no momentum (move in direction of train)
//  want: speed is affected by friction and power, collides with other trains, can be pulled by other trains transfering momentum, center of mass
// dynamic friction based on curvature???? resistance = K / curvature

const moveBogie = (bogie, velocity) => {
    const bogie2d = vec2.add([], bogie, velocity)

    const tracks = intersectTracks(box2Around(bogie2d, BOGIE_SIZE)).map(entry => entry.track)
    const turnouts = intersectTurnouts(box2Around(bogie2d, TURNOUT_DETECTOR_SIZE)).map(entry => entry.turnout)
    const nearbyClosedEndpoints = turnouts.flatMap(turnout => turnout.tracks
        .map((track, i) => ({turnoutTrack: track, end: turnout.endpoints[i]}))
        .filter((_, i) => i !== turnout.open)
    )

    const isClosedInThisDirection = (track) => {
        const closerEndpoint = vec2.distance(bogie2d, to_vec2(track.curve.get(0))) < vec2.distance(bogie2d, to_vec2(track.curve.get(1)))
            ? 0 : 1
        const closerEndpointClosed = nearbyClosedEndpoints
            .some(({turnoutTrack, end}) => turnoutTrack === track && end === closerEndpoint)
        const entranceDirection = vec2.scale([], vec2.normalize([], to_vec2(track.curve.derivative(closerEndpoint))), closerEndpoint === 0 ? 1 : -1)
        const isMovementDirection = vec2.dot(entranceDirection, velocity) > 0
    
        const shouldFilterOutClosedPath = closerEndpointClosed && isMovementDirection
        return shouldFilterOutClosedPath ? 10000 : 0
    }

    // sort instead of filter to prefer open paths over closed paths
    // rate the tracks based on which is the best fit to follow
    const rateTrack = (track) => isClosedInThisDirection(track) + vec2.distance(to_vec2(track.curve.project({x: bogie2d[0], y: bogie2d[1]})), bogie2d)
    let sortedTracks = tracks
        .sort((trackA, trackB) => rateTrack(trackA) - rateTrack(trackB))
    const projected = sortedTracks
        .map(track => track.curve.project({x: bogie2d[0], y: bogie2d[1]}))
        .filter(projectedPoint => vec2.dist(bogie2d, to_vec2(projectedPoint)) <= DERAILMENT_FACTOR)

    const nearestProjectedPoint = projected[0]
    if(nearestProjectedPoint) {
        return [nearestProjectedPoint.x, 0, nearestProjectedPoint.y]
    }
    return [bogie2d[0], 0, bogie2d[1]]
}

const raycaster = createRay([0, 0, 0], [1, 0, 0])

export const moveTrain = (train, delta) => {
    const facing3d = vec3.transformQuat([], [1, 0, 0], train.rotation)
    const facing = [facing3d[0], facing3d[2]]
    const frontConnectorOffset = vec3.scale([], facing3d, CONNECTOR_OFFSET)
    const backConnectorOffset = vec3.scale([], facing3d, -CONNECTOR_OFFSET)

    if(train.powered) {
        const direction = vec2.normalize([], train.velocity)
        const directionalSpeed = vec2.length(train.velocity) * sign(vec2.dot(direction, facing))
        const powerDirection = train.poweredTargetSpeed > directionalSpeed ? 1 : train.poweredTargetSpeed < directionalSpeed ? -1 : 0
        const magnitude = clamp(Math.abs(train.poweredTargetSpeed - directionalSpeed), 0, 1)
        const isBraking = Math.abs(directionalSpeed) > Math.abs(train.poweredTargetSpeed)
        
        const powerForce = [0, 0]
        if(isBraking) {
            vec2.add(powerForce, powerForce, vec2.scale([], direction, -ENGINE_ACCELERATION * magnitude)) // brakes
        } else {
            vec2.add(powerForce, powerForce, vec2.scale([], facing, powerDirection * ENGINE_ACCELERATION)) // engine
        }
        
        // apply force
        vec2.add(train.velocity, train.velocity, vec2.scale([], powerForce, delta))
    }

    const CONNECT_THRESHOLD = 0.1
    const connectors = [
        {
            side: 'connectionFront',
            pos: vec3.add([], train.position, frontConnectorOffset),
            dir: vec3.normalize([], frontConnectorOffset),
        },
        {
            side: 'connectionBack',
            pos: vec3.add([], train.position, -backConnectorOffset),
            dir: vec3.normalize([], backConnectorOffset)
        }
    ]
    connectors.forEach(({side, pos, dir}) => {
        raycaster.update(pos, dir)
        let nearestCar = null
        let nearestDistance = Infinity

        // TODO: early exit when found within distance
        getTrains().forEach(other => {
            if(other.id === train.id) return

            const box = [
                [other.position[0]-1, other.position[1]-0.5, other.position[2]-0.5],
                [other.position[0]+1, other.position[1]+0.5, other.position[2]+0.5],
            ]
            const normal = [0, 0, 0]
            const hit = raycaster.intersects(box, normal)
            if(hit !== false) {
                if(hit < nearestDistance) {
                    nearestDistance = hit
                    nearestCar = other
                }
            }
        })
        if(nearestCar !== null && nearestDistance < CONNECT_THRESHOLD) {
            // get nearest connector
            // if free, attach
            // else bump if within bump distance
            const facing3dConn = vec3.transformQuat([], FORWARD, nearestCar.rotation)
            const offsetFront = vec3.scale([], facing3dConn, CONNECTOR_OFFSET)
            const offsetBack = vec3.scale([], facing3dConn, -CONNECTOR_OFFSET)
            const nearerConnector = vec3.distance(pos, vec3.add([], nearestCar.position, offsetFront)) < 
                vec3.distance(pos, vec3.add([], nearestCar.position, offsetBack)) ?
                'connectionFront' : 'connectionBack'
            nearestCar[nearerConnector] = train.id
            train[side] = nearestCar.id
        }
    })

    // idk abt this
    // friction from rail using approx of curvature
    //vec2.add(force, force, vec2.scale([], direction, Math.max(speed * Math.abs(1-vec2.dot(direction, facing)) * -AIR_FRICTION * 100000.0, -1)))
    

    const airResistanceForce = vec2.scale([], train.velocity, -AIR_FRICTION)
    vec2.add(train.velocity, train.velocity, vec2.scale([], airResistanceForce, delta))


    // transfer force through connections (simulated spring and dampening)
    const applyConnectorForce = (connection, myConnectorOffset) => {
        const connectedId = train[connection]
        const connected = getTrains().find(other => other.id === connectedId)
        const facing3dConn = vec3.transformQuat([], FORWARD, connected.rotation)
        const theirConnectorOffset = connected.connectionFront === train.id ?
            vec3.scale([], facing3dConn, CONNECTOR_OFFSET) :
            vec3.scale([], facing3dConn, -CONNECTOR_OFFSET)
        const myConnector = vec3.add([], train.position, myConnectorOffset)
        const theirConnector = vec3.add([], connected.position, theirConnectorOffset)
        const K = 5 // spring constant
        const C = 10 // damping constant

        const relativePoint = vec3.sub([], myConnector, theirConnector)
        if(vec3.length(relativePoint) > POINT_BREAK) {
            train[connection] = null
            const theirConnection = connected.connectionFront === train.id ? 'connectionFront' : 'connectionBack'
            connected[theirConnection] = null
            return
        }

        // TODO: something about springForce is making it hard for the train to stop fully
        const springForce = vec3.scale([], relativePoint, -K)

        const angularVelocity = vec3.scale([], vec3.cross([], myConnectorOffset, UP), train.angularVelocity)
        const angularVelocityConn = vec3.scale([], vec3.cross([], theirConnectorOffset, UP), connected.angularVelocity)

        const dampingVelocityForce = vec2.scale([], vec2.sub([], train.velocity, connected.velocity), -C)
        const dampingAngularForce = vec2.scale([], vec2.sub([],
                [angularVelocity[0], angularVelocity[2]],
                [angularVelocityConn[0], angularVelocityConn[2]]),
            -C)

        const dampingForce = vec2.add([], dampingVelocityForce, dampingAngularForce)

        const totalForce = vec2.add([], [springForce[0], springForce[2]], dampingForce)
        
        // TODO: maybe i need to build up a force vector and apply it to the velocity instananeously
        //   this is currently applying half the correct force, and then another half using already affected velocity
        // apply force to this car (only half, because other half will be applied by other car)
        vec2.add(train.velocity, train.velocity, vec2.scale([], totalForce, delta/2))

        // apply opposite force to connected car
        vec2.add(connected.velocity, connected.velocity, vec2.scale([], totalForce, -delta/2))
    }

    // apply forces in both directions
    if(train.connectionFront) {
        applyConnectorForce('connectionFront', frontConnectorOffset)
    }
    if(train.connectionBack) {
        applyConnectorForce('connectionBack', backConnectorOffset)
    }

    const pos2d = [train.position[0], train.position[2]]

    const front = vec2.add([], pos2d, vec2.scale([], facing, BOGIE_OFFSET))
    const back = vec2.add([], pos2d, vec2.scale([], facing, -BOGIE_OFFSET))

    const newFront = moveBogie(front, train.velocity)
    const newBack = moveBogie(back, train.velocity)

    const midpoint = vec3.scale([], vec3.add([], newFront, newBack), 0.5)

    const newDirection = quat.rotationTo([], FORWARD, vec3.normalize([], vec3.sub([], newFront, newBack)))

    train.angularVelocity = -vec3.cross([], vec3.transformQuat([], FORWARD, train.rotation), vec3.transformQuat([], FORWARD, newDirection))[1]
    if(isNaN(train.angularVelocity)) {
        train.angularVelocity = 0
    }

    // calculate deflection due to rail and rotate velocity
    // this will be in the same direction as velocity if off track
    // if we're not moving, just use new velocity
    let deltaCenterOfMass = vec3.sub([], midpoint, train.position)
    if(vec3.length(deltaCenterOfMass) !== 0) {
        // velocity goes this way now
        train.velocity = vec2.scale([], vec2.normalize([], [deltaCenterOfMass[0], deltaCenterOfMass[2]]), vec2.length(train.velocity))
    }

    train.position = midpoint
    train.rotation = newDirection
    return train
}
