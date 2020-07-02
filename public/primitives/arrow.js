import regl from '../regl.js'
import { model } from '../model.js'
import { drawLines } from './lines.js'
import { trackRail } from './track.js'

const SMOOTHNESS = 10

export const arrow = (curve, height) => {
    const points3d = trackRail(curve, 0, height)
        .concat([curve.offset(0.9, 0.3), curve.offset(0.9, -0.3), curve.get(1.0)]
            .map(p => [p.x, height, p.y]))
    const buffer = regl.buffer({
        usage: 'dynamic',
        type: 'float',
        data: points3d
    })
    const drawArrow = drawLines(buffer, points3d.length)
    return {
        buffer,
        height,
        draw: model(() => {
            drawArrow()
        })
    }
}

export const updateArrow = (arrow, curve, height) => {
    const points = trackRail(curve, 0, height || arrow.height)
        .concat([curve.offset(0.9, 0.3), curve.offset(0.9, -0.3), curve.get(1.0)]
            .map(p => [p.x, height || arrow.height, p.y]))
    arrow.buffer.subdata(Float32Array.from(points.flat()))
}