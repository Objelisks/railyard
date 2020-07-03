import regl from '../regl.js'
import { model } from './model.js'
import { drawLines } from './lines.js'
import { trackRail } from './track.js'

const SMOOTHNESS = 10

const reverse = (array) => array.reduceRight((acc, val) => acc.concat([val]), [])

const generatePoints = (curve, towardsEndpoint, height) => {
    const inset = towardsEndpoint === 0 ? 0.1 : 0.9
    let arrowPoints = [curve.offset(inset, 0.3), curve.offset(inset, -0.3), curve.get(towardsEndpoint)]
        .map(p => [p.x, height, p.y])
    arrowPoints = towardsEndpoint === 0 ? reverse(arrowPoints) : arrowPoints
    const railPoints = trackRail(curve, 0, height)
    const points3d = towardsEndpoint === 0 ? arrowPoints.concat(railPoints) : railPoints.concat(arrowPoints)
    return points3d
}

export const arrow = (curve, towardsEndpoint, height) => {
    const points = generatePoints(curve, towardsEndpoint, height)
    const buffer = regl.buffer({
        usage: 'dynamic',
        type: 'float',
        data: points
    })
    const drawArrow = drawLines(buffer, points.length)
    return {
        buffer,
        height,
        towardsEndpoint,
        draw: model(() => {
            drawArrow()
        })
    }
}

export const updateArrow = (arrow, curve, towardsEndpoint, height) => {
    arrow.towardsEndpoint = towardsEndpoint || arrow.towardsEndpoint
    arrow.height = height || arrow.height
    const points = generatePoints(curve, arrow.towardsEndpoint, arrow.height)
    arrow.buffer.subdata(Float32Array.from(points.flat()))
}