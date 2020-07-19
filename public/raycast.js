import RBush from './libs/rbush.mjs'
import { box2Around } from './utils.js'
import { FROG_SIZE } from './constants.js'

const turnoutBush = new RBush()

export const addToTurnoutBush = (turnout) => {
    // TODO: consistency around adding to bushes
    const region = box2Around(turnout.point, FROG_SIZE)
    turnoutBush.insert({
        ...region,
        turnout
    })
}

export const intersectTurnouts = (region) => {
    return turnoutBush.search(region)
}

export const resetTurnoutBush = () => {
    turnoutBush.clear()
}


const trackBush = new RBush()

export const addToTrackBush = (track) => {
    const box = track.curve.bbox()
    const region = {
        minX: box.x.min + track.position[0],
        minY: box.y.min + track.position[2],
        maxX: box.x.max + track.position[0],
        maxY: box.y.max + track.position[2],
        track: track
    }
    trackBush.insert(region)
}

export const loadToTrackBush = (tracks) => {
    const regions = tracks
        .map(track => {
            const box = track.curve.bbox()
            return {
                minX: box.x.min + track.position[0],
                minY: box.y.min + track.position[2],
                maxX: box.x.max + track.position[0],
                maxY: box.y.max + track.position[2],
                track: track
            }
        })
        trackBush.load(regions)
}

export const removeFromTrackBush = (track) => {
    trackBush.remove(track, (a, b) => a.id === b.id)
}

export const resetTrackBush = () => {
    trackBush.clear()
}

export const intersectTracks = (region) => {
    return trackBush.search(region)
}
