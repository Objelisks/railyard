import regl from '../regl.js'
import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import calcNormals from '../libs/normals.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { setUniforms } from './model.js'
import { drawLines } from './lines.js'
import { buildMesh } from './mesh.js'
import { LINE_POINTS, TRACK_GAUGE } from '../constants.js'
import { to_vec2 } from '../math.js'
import { drawMesh } from './mesh.js'
import { setColor } from '../reglhelpers.js'
import { flags } from '../flags.js'

export const trackRail = (curve, offset, height=0) => {
    const curvePoints = []
    for(let i=0; i<LINE_POINTS-1; i++) {
        curvePoints.push(curve.offset(i/(LINE_POINTS-1), offset))
    }
    curvePoints.push(curve.offset(1, offset))
    const points = curvePoints
        .map(p => [p.x, height, p.y])
    return points
}

const track = (trackL, trackR, length) => {
    const drawTrackL = drawLines(trackL, length)
    const drawTrackR = drawLines(trackR, length)
    return (props) => setUniforms(props, () => {
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

const gravelOffsets = [
    [-0.75,-0.35],
    [-0.25,-0.145],
    [0, -0.150],
    [0.25,-0.145],
    [0.75,-0.35]
]

const railOffsets = [
    [-0.45,-0.3],
    [-0.355,-0.2],
    [-0.335,-.105],
    [-0.3125,-0.1],
    [-0.25,-0.105],
    [-0.23,-0.2],
    [0, -0.3],
    [0.23,-0.2],
    [0.25,-0.105],
    [0.3125,-0.1],
    [0.335,-0.105],
    [0.355,-0.2], 
    [0.45,-0.3]
]

const railUvs = (points, curve, offsets) => {
    const uvs = []
    const totalLength = curve.length()
    let u = 0, v = 0
    for(let i = 0; i < offsets.length; i++) {
        const distance = i === offsets.length-1 ? 0 : vec2.distance(offsets[i], offsets[i+1])
        v = 0
        for(let j = 0; j < LINE_POINTS; j++) {
            uvs.push([u, v])
            const a = j/LINE_POINTS
            const b = (j+1)/LINE_POINTS
            const arcLength = (b-a) * totalLength * 0.5
            v += arcLength
        }
        u += distance
    }
    return uvs
}

const gravelUvs = (points, curve, offsets) => {
    const uvs = []
    for(let i = 0; i < offsets.length; i++) {
        for(let j = 0; j < LINE_POINTS; j++) {
            const point = points[i*LINE_POINTS+j]
            uvs.push([point[0], point[2]])
        }
    }
    return uvs
}

export const track3dRail = (curve, offsets, uvsFunc) => {
    const points = offsets
        .flatMap(([x, y]) => trackRail(curve, x, y-0.3))

    const elements = []
    for(let i = 0; i < offsets.length-1; i++) {
        for(let j = 0; j < LINE_POINTS-1; j++) {
            const idx = i*LINE_POINTS+j
            elements.push([idx, idx+LINE_POINTS, idx+1], [idx+1, idx+LINE_POINTS, idx+LINE_POINTS+1])
        }
    }

    const trackMeshData = {
        position: points,
        normal: calcNormals.vertexNormals(elements, points),
        uv: uvsFunc(points, curve, offsets),
        elements: elements,
    }
    return trackMeshData
}

export const make3dTrack = ([x0, y0], [x1, y1], [x2, y2], [x3, y3]) => {
    const curve = new Bezier(x0, y0, x1, y1, x2, y2, x3, y3)
    const gravelData = track3dRail(curve, gravelOffsets, gravelUvs)
    const gravelMesh = drawMesh(buildMesh(gravelData), 'gravel')
    const railData = track3dRail(curve, railOffsets, railUvs)
    const railMesh = drawMesh(buildMesh(railData), 'rail')
    return {
        id: uuid(),
        position: [0, 0.1, 0],
        rotation: [0, 0, 0, 1],
        curve: curve,
        draw: (props) => {
            setColor({ color: [.81, .81, .77]}, () => gravelMesh(props))
            setColor({ color: [.95, .95, .94]}, () => railMesh(props))
        },
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