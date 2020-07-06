import { makeTrack, loadToBush } from './primitives/track.js'
import { makeTurnout } from './primitives/turnout.js'
import { makeTrain } from './primitives/train.js'
import { generateDebugArrowsForTurnout } from './primitives/debug.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { to_vec2 } from './utils.js'

const state = {
    tracks: [],
    turnouts: [],
    trains: []
}
state.tracks = [
    makeTrack([0, 10], [-10, 0], 7.1),
    makeTrack([0, 10], [10, 0], -7.1),
    makeTrack([10, 0], [0, -10], -7.1),
    makeTrack([0, -10], [-10, 0], -7.1),
    makeTrack([0, -10], [-20, -10], 0),
    makeTrack([-20, -10], [-30, 0], -7.1),
    makeTrack([-30, 0], [-20, 10], -7.1),
    makeTrack([0, 10], [-20, 10], 0),
]
state.turnouts = [
    makeTurnout([state.tracks[3], state.tracks[4]], to_vec2(state.tracks[3].curve.get(0))),
    makeTurnout([state.tracks[0],  state.tracks[7]], to_vec2(state.tracks[0].curve.get(0)))
]
state.trains = [
    makeTrain()
]

const placeTrainOnTrack = (train, track) => {
    const curve = track.curve
    const point = curve.get(0.1)
    const tangent = curve.derivative(0.1)
    train.position = [point.x, 0, point.y]
    train.rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    train.speed = 0
}

// initialize railyard state
loadToBush(state.tracks)
state.turnouts.forEach(turnout => generateDebugArrowsForTurnout(turnout))
placeTrainOnTrack(state.trains[0], state.tracks[0])


export const addTrack = (track) => {
    return state.tracks.push(track) - 1
}

export const getTracks = () => state.tracks


export const addTurnout = (turnout) => {
    return state.turnouts.push(turnout) - 1
}

export const getTurnouts = () => state.turnouts


export const addTrain = (train) => {
    return state.trains.push(train) - 1
}

export const getTrains = () => state.trains

export const setTrains = (trains) => state.trains = trains