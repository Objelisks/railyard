import regl from "../regl.js"
import Bezier from '../libs/bezier-js.mjs'
import { v4 as uuid } from '../libs/uuid.mjs'
import { vec2 } from '../libs/gl-matrix.mjs'
import { model } from '../model.js'
import { drawLines } from './lines.js'


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
        curve: curve
    }
}

// maybe ?
const memo = (func) => {
    let prevArgs = null
    let store = null
    return (...args) => {
        if(args !== prevArgs) {
            store = func(args)
        }
        return store
    }
}

const trackRail = (curve, offset) => curve.offset(offset).flatMap(curve => curve.getLUT(10).map(p => [p.x, -0.5, p.y]))

// TODO: make this efficient (don't recreate rails each render)
const drawTrack = regl({
    context: {
        position: regl.prop('position'),
        rotation: regl.prop('rotation'),
        trackL: (context, props) => drawLines(trackRail(props.curve, -0.2)),
        trackR: (context, props) => drawLines(trackRail(props.curve, +0.2)),
        color: [.5, .5, .5]
    }
})

export const track = (array) =>
    drawTrack(array, (context) => {
        model(() => {
            context.trackL()
            context.trackR()
        })
    })