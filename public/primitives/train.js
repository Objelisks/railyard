import regl from "../regl.js"
import { vec2, vec3, quat } from '../libs/gl-matrix.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { DERAILMENT_FACTOR, BOGIE_SIZE, TURNOUT_DETECTOR_SIZE } from '../constants.js'
import { to_vec2, box2Around, reglArg, log100ms } from '../utils.js'
import { intersectTurnouts } from './turnout.js'
import { intersectTracks } from './track.js'
import { drawCube } from './cube.js'
import { model } from './model.js'

const getTrainColor = (train) => {
    return train.remote ? [0.81, 0.94, 0.8] : [1.0, .412, .38]
}

const setupTrain = regl({
    context: {
        position: regl.prop('position'),
        rotation: regl.prop('rotation'),
        scale: [2, 1, 1],
        color: (context, props) => getTrainColor({remote: reglArg('remote', false, context, props)})
    }
})
const draw = model(() => drawCube())
export const drawTrain = (props) => setupTrain(props, draw)

export const makeTrain = () => ({
    id: uuid(),
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    powered: true,

    poweredTargetSpeed: 0,
    velocity: [0, 0]
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

    // const colliders = raycastCollidables(ray, distance)
    // if(colliders.length > 0) {
    //     // if its a train, and its accepting connections, connect to it
    //     // otherwise, bounce off it and transfer some momentum
    // }

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

const ENGINE_ACCELERATION = 0.6
const FRICTION = 0.5
const clamp = (a, min, max) => Math.max(Math.min(a, max), min)

export const moveTrain = (train, delta) => {
    const facing3d = vec3.transformQuat([], [1, 0, 0], train.rotation)
    const facing = [facing3d[0], facing3d[2]]
    const direction = vec2.normalize([], train.velocity)
    const speed = vec2.length(train.velocity)
    const force = [0, 0]
    if(train.powered) {
        const powerDirection = train.poweredTargetSpeed > speed ? 1 : train.poweredTargetSpeed < speed ? -1 : 0
        const magnitude = clamp(Math.abs(train.poweredTargetSpeed - speed), 0, 1)
        const isBraking = Math.abs(speed) > Math.abs(train.poweredTargetSpeed)
        
        if(isBraking) {
            vec2.add(force, force, vec2.scale([], direction, -ENGINE_ACCELERATION * magnitude)) // brakes
        } else {
            vec2.add(force, force, vec2.scale([], facing, powerDirection * ENGINE_ACCELERATION)) // engine
        }
    }
    // collision (hit and pull)

    // idk abt this
    //vec2.add(force, force, vec2.scale([], direction, Math.max(speed * Math.abs(1-vec2.dot(direction, facing)) * -FRICTION * 100000.0, -1))) // friction from rail using approx of curvature
    vec2.add(force, force, vec2.scale([], direction, speed * -FRICTION)) // friction from air
    vec2.add(train.velocity, train.velocity, vec2.scale([], force, delta))

    // transfer momentum

    const pos2d = [train.position[0], train.position[2]]

    const front = vec2.add([], pos2d, vec2.scale([], facing, 0.5))
    const back = vec2.add([], pos2d, vec2.scale([], facing, -0.5))

    const newFront = moveBogie(front, train.velocity)
    const newBack = moveBogie(back, train.velocity)

    const midpoint = vec3.scale([], vec3.add([], newFront, newBack), 0.5)
    const newDirection = quat.rotationTo([], [1, 0, 0], vec3.normalize([], vec3.sub([], newFront, newBack)))

    // calculate deflection due to rail and rotate velocity
    // this will be in the same direction as velocity if off track
    // if we're not moving, just use new velocity
    let deltaCenterOfMass = vec3.sub([], midpoint, train.position)
    if(vec3.length(deltaCenterOfMass) !== 0) {
        train.velocity = vec2.scale([], vec2.normalize([], [deltaCenterOfMass[0], deltaCenterOfMass[2]]), vec2.length(train.velocity))
    }

    train.position = midpoint
    train.rotation = newDirection
    return train
}
