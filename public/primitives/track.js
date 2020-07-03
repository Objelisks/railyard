import regl from '../regl.js'
import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { model } from './model.js'
import { drawLines } from './lines.js'
import RBush from '../libs/rbush.mjs'

const LINE_POINTS = 32
const TRACK_GAUGE = 0.2
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

export const resetBush = () => {
    bush.clear()
}

export const intersectTracks = (region) => {
    return bush.search(region)
}

export const trackRail = (curve, offset, height=-0.5) => {
    // guarantee we always generate the same number of points, no matter how many 'simple' segments are created from offset
    let pointsUsed = 0
    const offsets = curve.offset(offset)
    const rail = offsets
        .flatMap((curve, i) => {
            let pointsUsedThisSegment = i === offsets.length-1 ? LINE_POINTS - pointsUsed : Math.floor(LINE_POINTS/offsets.length)
            pointsUsed += pointsUsedThisSegment
            return curve.getLUT(pointsUsedThisSegment)
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
export const makeTrack = (start, end, bend = 0) => {
    const ptA = start
    const ptB = end
    const perp = vec2.normalize([], vec2.rotate([], vec2.sub([], ptA, ptB), [0, 0], Math.PI/2))
    const mid = vec2.add([], vec2.scale([], vec2.add([], ptA, ptB), 0.5), vec2.scale([], vec2.normalize([], perp), bend))
    const curve = new Bezier(
        {x: ptA[0], y: ptA[1]}, // point 1
        {x: mid[0], y: mid[1]}, // point 1 control point
        {x: mid[0], y: mid[1]}, // point 2 control point TODO: make this better
        {x: ptB[0], y: ptB[1]}  // point 2
    )
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
        trackR
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
}