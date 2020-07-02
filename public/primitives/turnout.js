import RBush from '../libs/rbush.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { to_vec2, box2Around } from '../utils.js'

const FROG_SIZE = 1
const turnoutBush = new RBush()

// assumptions about turnouts:
// there will only ever be at most 2 turnouts at a single point
// turnouts on the same point will be facing opposite directions
// turnouts can have any number of tracks, but only one is open

export const makeTurnout = (tracks, point) => {
    // TODO: assert endpoints match
    const turnout = {
        id: uuid(),
        tracks,
        point,
        endpoints: tracks.map(track => vec2.distance(to_vec2(track.curve.get(0)), point) <=
                                    vec2.distance(to_vec2(track.curve.get(1)), point) ? 0 : 1),
        open: 0
    }
    const region = box2Around(point, FROG_SIZE)
    turnoutBush.insert({
        ...region,
        turnout
    })
    return turnout
}

export const addTrackToTurnout = (turnout, track) => {
    // TODO: assert endpoints match
    turnout.tracks.push(track)
    turnout.endpoints.push(vec2.distance(to_vec2(track.curve.get(0)), turnout.point) <
                            vec2.distance(to_vec2(track.curve.get(1)), turnout.point) ? 0 : 1)
}

export const intersectTurnouts = (region) => {
    return turnoutBush.search(region)
}

export const toggleTurnout = (turnout) => {
    turnout.open = (turnout.open + 1) % turnout.tracks.length
    return turnout.open
}