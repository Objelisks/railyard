import { generateDebugArrowsForTurnout } from './primitives/debug.js'
import { addToTurnoutBush } from './raycast.js'
import { rgbToHex } from '../utils.js'
import { boxTrain } from './boxes.js'

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
    // TODO: don't use this index ???
    const index = state.tracks.push(track) - 1
    track.index = index
    return index
}

export const getTracks = () => state.tracks
export const setTracks = (tracks) => state.tracks = tracks


export const addTrain = (train) => {
    state.trains.push(train)
    
    boxTrain(train, train.powered)

    return train
}

export const getTrains = () => state.trains
export const setTrains = (trains) => state.trains = trains

export const setTrainColors = ({color1, color2}) => {
    getTrains().forEach(train => {
        train.color1 = color1 ?? train.color1
        train.color2 = color2 ?? train.color2
    })
    if(color1) {
        localStorage.setItem('color1', rgbToHex(color1))
    }
    
    if(color2) {
        localStorage.setItem('color2', rgbToHex(color2))
    }
    // todo save local storage
}