import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { to_vec2 } from '../math.js'
import { drawCube } from './cube.js'
import { setColor } from '../reglhelpers.js'
import { setUniforms } from './model.js'
import { generateDebugArrowsForTurnout } from './debug.js'

// assumptions about turnouts:
// there will only ever be at most 2 turnouts at a single point
// turnouts on the same point will be facing opposite directions
// turnouts can have any number of tracks, but only one is open
// turnouts have a facing direction

const whichEndpoint = (track, point) => vec2.distance(to_vec2(track.curve.get(0)), point) <=
    vec2.distance(to_vec2(track.curve.get(1)), point) ? 0 : 1

export const makeTurnout = (tracks, point) => {
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

    return turnout
}

export const toggleTurnout = (turnout, dispatch=true) => {
    turnout.open = (turnout.open + 1) % turnout.tracks.length
    if(dispatch) {
        window.dispatchEvent(new CustomEvent('turnoutswitch', {detail: turnout}))
    }
    generateDebugArrowsForTurnout(turnout)
    return turnout.open
}

const box = (props) => setUniforms(props, () => drawCube())
export const drawTurnout = (props) => setColor(props, () => box(props))