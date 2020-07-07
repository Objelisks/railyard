import regl from '../regl.js'
import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { model } from './model.js'
import { drawLines } from './lines.js'
import RBush from '../libs/rbush.mjs'
import { LINE_POINTS, TRACK_GAUGE } from '../constants.js'
import { to_vec2 } from '../utils.js'

const bush = new RBush()

export const addToBush = (track) => {
    const box = track.curve.bbox()
    const region = {
        minX: box.x.min + track.position[0],
        minY: box.y.min + track.position[2],
        maxX: box.x.max + track.position[0],
        maxY: box.y.max + track.position[2],
        track: track
    }
    bush.insert(region)
}

export const loadToBush = (tracks) => {
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

export const removeFromBush = (track) => {
    bush.remove(track, (a, b) => a.id === b.id)
}

export const resetBush = () => {
    bush.clear()
}

export const intersectTracks = (region) => {
    return bush.search(region)
}

export const trackRail = (curve, offset, height=-0.5) => {
    // guarantee we always generate the same number of points, no matter how many 'simple' segments are created from offset
    let pointsUsed = 0
    const offsets = offset === 0 ? [curve] : curve.offset(offset)
    const rail = offsets
        .flatMap((innerCurve, i) => {
            let pointsUsedThisSegment = i === offsets.length-1 ? LINE_POINTS - pointsUsed : Math.floor(LINE_POINTS/offsets.length)
            pointsUsed += pointsUsedThisSegment
            return innerCurve.getLUT(pointsUsedThisSegment)
        })
        .map(p => [p.x, height, p.y])
    return rail
}

const track = (trackL, trackR, length) => {
    const drawTrackL = drawLines(trackL, length)
    const drawTrackR = drawLines(trackR, length)
    return model(() => {
        drawTrackL()
        drawTrackR()
    })
}

// hmm, need to do a separate draw call for each piece of track, if they're all unique curves
// if i decide to limit track pieces to 90, 45, straight angles, then i can batch them
export const makeTrack = ([x0, y0], [x1, y1], [x2, y2], [x3, y3]) => {
    const curve = new Bezier(x0, y0, x1, y1, x2, y2, x3, y3)
    const pointsL = trackRail(curve, -TRACK_GAUGE)
    const trackL = regl.buffer({
        usage: 'dynamic',
        type: 'float',
        data: pointsL
    })
    const pointsR = trackRail(curve, +TRACK_GAUGE)
    const trackR = regl.buffer({
        usage: 'dynamic',
        type: 'float',
        data: pointsR
    })
    const length = pointsR.length
    return {
        id: uuid(),
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        curve: curve,
        draw: track(trackL, trackR, length),
        trackL,
        trackR,
        points: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
    }
}

export const updateTrack = (track, {start, control1, control2, end}) => {
    const startPoint = (start && {x: start[0], y: start[1]}) || track.curve.points[0]
    const controlPoint1 = (control1 && {x: control1[0], y: control1[1]}) || track.curve.points[1]
    const controlPoint2 = (control2 && {x: control2[0], y: control2[1]}) || track.curve.points[2]
    const endPoint = (end && {x: end[0], y: end[1]}) || track.curve.points[3]
    const newCurve = new Bezier(startPoint, controlPoint1, controlPoint2, endPoint)
    track.trackL.subdata(Float32Array.from(trackRail(newCurve, -TRACK_GAUGE).flat()))
    track.trackR.subdata(Float32Array.from(trackRail(newCurve, +TRACK_GAUGE).flat()))
    track.curve = newCurve
    track.points = track.curve.points.map(to_vec2)
}