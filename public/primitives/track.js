import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { model } from '../model.js'
import { drawLines } from './lines.js'
import RBush from '../libs/rbush.mjs'

const SMOOTHNESS = 20
const TRACK_GAUGE = 0.2
let bush = new RBush()

export const addToBush = (tracks) => {
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
    bush.load(regions)
}

export const resetBush = () => {
    bush = new RBush()
}

export const intersectTracks = (region) => {
    return bush.search(region)
}

const trackRail = (curve, offset) => {
    return curve.offset(offset).flatMap(curve => curve.getLUT(SMOOTHNESS).map(p => [p.x, -0.5, p.y]))
}

const track = (curve) => {
    const trackL = drawLines(trackRail(curve, -TRACK_GAUGE))
    const trackR = drawLines(trackRail(curve, +TRACK_GAUGE))
    return model(() => {
        trackL()
        trackR()
    })
}

// hmm, need to do a separate draw call for each piece of track, if they're all unique curves
// if i decide to limit track pieces to 90, 45, straight angles, then i can batch them
export const makeTrack = (start, end, bend = 0) => {
    const ptA = [start[0], start[2]]
    const ptB = [end[0], end[2]]
    const perp = vec2.normalize([], vec2.rotate([], vec2.sub([], ptA, ptB), [0, 0], Math.PI/2))
    const mid = vec2.add([], vec2.scale([], vec2.add([], ptA, ptB), 0.5), vec2.scale([], vec2.normalize([], perp), bend))
    const curve = new Bezier({x: ptA[0], y: ptA[1]}, {x: mid[0], y: mid[1]}, {x: ptB[0], y: ptB[1]})
    return {
        id: uuid(),
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        curve: curve,
        draw: track(curve)
    }
}
