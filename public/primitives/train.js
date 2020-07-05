import regl from "../regl.js"
import { model } from './model.js'
import { drawCube } from './cube.js'
import { intersectTracks } from './track.js'
import { intersectTurnouts } from './turnout.js'
import { vec2, vec3, quat } from '../libs/gl-matrix.mjs'
import { to_vec2, box2Around } from '../utils.js'
import { v4 as uuid } from '../libs/uuid.mjs'
import { DERAILMENT_FACTOR, BOGIE_SIZE, TURNOUT_DETECTOR_SIZE } from '../constants.js'

const setupTrain = regl({
    context: {
        position: regl.prop('position'),
        rotation: regl.prop('rotation'),
        scale: [2, 1, 1]
    }
})
const draw = model(() => drawCube())
export const drawTrain = (props) => setupTrain(props, draw)

export const makeTrain = () => ({
    id: uuid(),
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    speed: 0.2,
    powered: false
})


// TODO: weird stuff at very slow speeds
const moveBogie = (bogie, direction, speed) => {
    const velocity = vec3.scale([], direction, speed)
    const newBogie = vec3.add([], bogie, velocity)
    const bogie2d = [newBogie[0], newBogie[2]]

    const tracks = intersectTracks(box2Around(bogie2d, BOGIE_SIZE)).map(entry => entry.track)
    const turnouts = intersectTurnouts(box2Around(bogie2d, TURNOUT_DETECTOR_SIZE)).map(entry => entry.turnout)
    const nearbyClosedEndpoints = turnouts.flatMap(turnout => turnout.tracks
        .filter((_, i) => i !== turnout.open)
        .map((track, i) => ({turnoutTrack: track, end: turnout.endpoints[i]}))
    )

    const isClosedInThisDirection = (track) => {
        const closerEndpoint = vec2.distance(bogie2d, to_vec2(track.curve.get(0))) < vec2.distance(bogie2d, to_vec2(track.curve.get(1)))
            ? 0 : 1
        const closerEndpointClosed = nearbyClosedEndpoints
            .some(({turnoutTrack, end}) => turnoutTrack === track && end === closerEndpoint)
        const entranceDirection = vec2.scale([], to_vec2(track.curve.derivative(closerEndpoint)), closerEndpoint === 0 ? 1 : -1)
        const isMovementDirection = vec2.dot(entranceDirection, [velocity[0], velocity[2]]) > 0
    
        const shouldFilterOutClosedPath = closerEndpointClosed && isMovementDirection
        return shouldFilterOutClosedPath ? 10000 : 0
    }

    // sort instead of filter to prefer open paths over closed paths
    // rate the tracks based on which is the best fit to follow
    const rateTrack = (track) => isClosedInThisDirection(track) + vec2.distance(to_vec2(track.curve.project({x: newBogie[0], y: newBogie[2]})), bogie2d)
    let sortedTracks = tracks
        .sort((trackA, trackB) => rateTrack(trackA) - rateTrack(trackB))
    const projected = sortedTracks
        .map(track => track.curve.project({x: newBogie[0], y: newBogie[2]}))
        .filter(projectedPoint => vec2.dist(bogie2d, to_vec2(projectedPoint)) <= DERAILMENT_FACTOR)

    const nearestProjectedPoint = projected[0]
    if(nearestProjectedPoint) {
        return [nearestProjectedPoint.x, 0, nearestProjectedPoint.y]
    }
    return newBogie
}

export const moveTrain = (train, delta) => {
    // use momentum (last movement) instead of facing direction
    const moveDirection = vec3.transformQuat([], [1, 0, 0], train.rotation)
    const front = vec3.add([], train.position, vec3.scale([], moveDirection, 0.5))
    const back = vec3.add([], train.position, vec3.scale([], moveDirection, -0.5))

    const newFront = moveBogie(front, moveDirection, train.speed)
    const newBack = moveBogie(back, moveDirection, train.speed)

    const midpoint = vec3.scale([], vec3.add([], newFront, newBack), 0.5)
    const newDirection = quat.rotationTo([], [1, 0, 0], vec3.normalize([], vec3.sub([], newFront, newBack)))

    train.position = midpoint
    train.rotation = newDirection
    return train
}
