import { generateDebugArrowsForTurnout } from './primitives/debug.js'
import { addToTurnoutBush } from './raycast.js'

const state = {
    tracks: [],
    turnouts: [],
    trains: []
}


export const addTurnout = (turnout) => {
    const index = state.turnouts.push(turnout) - 1
    turnout.index = index
    generateDebugArrowsForTurnout(turnout)
    addToTurnoutBush(turnout)
    return index
}

export const getTurnouts = () => state.turnouts
export const setTurnouts = (turnouts) => state.turnouts = turnouts


export const addTrack = (track) => {
    const index = state.tracks.push(track) - 1
    track.index = index
    return index
}

export const getTracks = () => state.tracks
export const setTracks = (tracks) => state.tracks = tracks


export const addTrain = (train) => {
    const index = state.trains.push(train) - 1
    train.index = index
    return index
}

export const getTrains = () => state.trains
export const setTrains = (trains) => state.trains = trains
