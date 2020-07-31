import regl from '../regl.js'
import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { model } from './model.js'
import { drawLines } from './lines.js'
import { buildMesh } from './mesh.js'
import { LINE_POINTS, TRACK_GAUGE } from '../constants.js'
import { to_vec2 } from '../math.js'
import { drawMesh } from './mesh.js'

export const trackRail = (curve, offset, height=-0.5) => {

    /// AS A RECORD OF HUBRIS
    // console.log('track rail')
    // // guarantee we always generate the same number of points, no matter how many 'simple' segments are created from offset
    // const totalLength = curve.length()
    // let lengthSoFar = 0
    // let pointsUsed = 0
    // const offsets = offset === 0 ? [curve] : curve.offset(offset)
    // const rail = offsets
    //     .flatMap((innerCurve, i) => {
    //         const innerLength = innerCurve.length()
    //         let pointsUsedThisSegment = 
    //             i === offsets.length-1 ?
    //                 LINE_POINTS - pointsUsed : // last segment, use all remaining points
    //                 Math.floor(LINE_POINTS * (innerLength)/totalLength) // earlier segment, estimate points used by length
    //         const points = innerCurve.getLUT(pointsUsedThisSegment+1)
    //         const sliced = points.slice(0, -1)
    //         pointsUsed += sliced.length
    //         lengthSoFar += innerLength
    //         console.log(pointsUsedThisSegment, points.length, sliced.length)
    //         return sliced
    //     })
    //     .map(p => [p.x, height, p.y])
    // console.log('final', lengthSoFar, totalLength, pointsUsed, rail.length)
    // console.log(curve.getLUT(LINE_POINTS))
    // console.log(curve.offset(offset).map(c => c.getLUT(2)))
    // return rail
    /// END RECORD OF HUBRIS

    const curvePoints = []
    for(let i=0; i<LINE_POINTS; i++) {
        curvePoints.push(curve.offset(i/LINE_POINTS, offset))
    }
    const points = curvePoints
        .map(p => [p.x, height, p.y])
    return points
}

const track = (trackL, trackR, length) => {
    const drawTrackL = drawLines(trackL, length)
    const drawTrackR = drawLines(trackR, length)
    return model(() => {
        drawTrackL()
        drawTrackR()
    })
}


/*
12345678901
|   | ||     || |   |
|   | ||     || |   |
|   | ||     || |   |
|   | ||     || |   |
|   | ||     || |   |
|   | ||     || |   |

      ..       ..
    . ..   .   .. .
.                     .

gravel, rail, wood

      ___
n+1 B|\  |D n+LINEPOINTS+1
     | \ |
n+0 A|__\|C n+LINEPOINTS+0

[A, B, C], [C, B, D]

*/

const gravel = (x) => x * 0.7
const rail = (x) => x * 0.3 + 0.7

const offsets = [[-1,-0.25],[-0.5,-0.125],[-0.375,-0.125],[-0.375,-0.125],[-0.375,0],[-0.25,0],[-0.25,-0.125],[0.25,-0.125],[0.25,0],[0.375,0],[0.375,-0.125],[0.5,-0.125],[1,-0.25]]
const mats = [gravel, gravel, gravel, rail, rail, gravel, gravel, gravel, rail, rail, gravel, gravel, gravel]

export const track3dRail = (curve) => {
    const points = offsets
        .flatMap(([x, y]) => trackRail(curve, x, y))
    const elements = []
    for(let i = 0; i < offsets.length-1; i++) {
        for(let j = 0; j < LINE_POINTS-1; j++) {
            const idx = i*LINE_POINTS+j
            elements.push([idx, idx+1, idx+LINE_POINTS], [idx+1, idx+LINE_POINTS+1, idx+LINE_POINTS])
        }
    }
    
    const totalLength = curve.length()/3 // magic: tiling factor
    const uvs = []
    for(let i = 0; i < offsets.length; i++) {
        for(let j = 0; j < LINE_POINTS; j++) {
            const innerLength = curve.split(j/LINE_POINTS).left.length()
            // const stripMat = mats[i]aa
            const elPoint = offsets[i]
            uvs.push([(elPoint[0]+1)/2, innerLength/totalLength])
        }
    }
    const normals = points.map(point => [0, 1, 0])
    const trackMesh = buildMesh({
        position: points,
        normal: normals,
        uv: uvs,
        elements: elements,
    })
    return trackMesh
}


export const make3dTrack = ([x0, y0], [x1, y1], [x2, y2], [x3, y3]) => {
    const curve = new Bezier(x0, y0, x1, y1, x2, y2, x3, y3)
    const mesh = track3dRail(curve)
    return {
        id: uuid(),
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        curve: curve,
        draw: drawMesh(mesh, 'shinything'),
        points: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
    }
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


// normals
// cdt2d
// geom-traingulate

/*





*/