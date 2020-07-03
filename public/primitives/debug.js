import regl from '../regl.js'
import { arrow, updateArrow } from './arrow.js'
import { drawCube } from './cube.js'
import { model } from './model.js'

const debugPoints = {}
export const debugPoint = (key, position, color) => {
    debugPoints[key] = {position, color}
}
const drawPoint = model(() => drawCube())
const setupPoint = regl({
    context: {
        position: (context, props) => props.position,
        scale: [0.2, 0.2, 0.2],
        color: (context, props) => props.color || [0.5, 0.5, 0.5]
    }
})
export const drawDebugPoints = () => setupPoint(Object.values(debugPoints), drawPoint)


const debugArrows = {}
export const debugArrow = (key, curve, towardsEndpoint, color) => {
    if(debugArrows[key]) {
        debugArrows[key].curve = curve
        debugArrows[key].color = color
        updateArrow(debugArrows[key].arrow, curve, towardsEndpoint)
    } else {
        debugArrows[key] = {curve, color, arrow: arrow(curve, towardsEndpoint, 1.0)}
    }
}
const setupArrow = regl({
    context: {
        color: (context, props) => props.color || [0.5, 0.5, 0.5]
    }
})
export const drawDebugArrows = () => {
    setupArrow(Object.values(debugArrows), (context, props) => props.arrow.draw())
}


