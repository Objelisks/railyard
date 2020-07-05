import RBush from '../libs/rbush.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { to_vec2, box2Around } from '../utils.js'

export const FROG_SIZE = 1
const turnoutBush = new RBush()

// assumptions about turnouts:
// there will only ever be at most 2 turnouts at a single point
// turnouts on the same point will be facing opposite directions
// turnouts can have any number of tracks, but only one is open
// turnouts have a facing direction

const whichEndpoint = (track, point) => vec2.distance(to_vec2(track.curve.get(0)), point) <=
    vec2.distance(to_vec2(track.curve.get(1)), point) ? 0 : 1

export const makeTurnout = (tracks, point) => {
    // TODO: assert endpoints match
    const endpoints = tracks.map(track => whichEndpoint(track, point))
    let facing = vec2.normalize([], to_vec2(tracks[0].curve.derivative(endpoints[0])))
    if(endpoints[0] === 1) {
        facing = vec2.negate([], facing)
    }
    const turnout = {
        id: uuid(),
        tracks,
        point,
        facing,
        endpoints,
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
    console.log('add track to turnout')
    turnout.tracks.push(track)
    turnout.endpoints.push(whichEndpoint(track, turnout.point))
}

export const intersectTurnouts = (region) => {
    return turnoutBush.search(region)
}

export const toggleTurnout = (turnout) => {
    turnout.open = (turnout.open + 1) % turnout.tracks.length
    return turnout.open
}