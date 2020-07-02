
import { model } from '../model.js'
import { drawLines } from './lines.js'

const SMOOTHNESS = 10

const trackRail = (curve, offset=0, height=1.0) => {
    return curve.offset(offset).flatMap(curve => curve.getLUT(SMOOTHNESS))
}

export const arrow = (curve, height, color) => {
    const points = trackRail(curve, 0, height)
    points.push(curve.offset(0.9, 0.3), curve.offset(0.9, -0.3), curve.get(1.0))
    const drawArrow = drawLines(points.map(p => [p.x, height, p.y]), points.length)
    return model(() => {
        drawArrow()
    })
}
