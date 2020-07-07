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
    if(curve === null) {
        delete debugArrows[key]
        return
    }
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

export const generateDebugArrowsForTurnout = (turnout) => {
    const track = turnout.tracks[turnout.open]
    const t1 = turnout.endpoints[turnout.open] === 0 ? 0.01 : 0.6
    const t2 = turnout.endpoints[turnout.open] === 0 ? 0.4 : 0.99
    const direction = turnout.endpoints[turnout.open] === 0 ? 1 : 0
    debugArrow(`turnout-${turnout.index}`, track.curve.split(t1, t2), direction, [1, .7, .28])
}

