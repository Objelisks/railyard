import regl from "../regl.js"
import { model } from '../model.js'
import { drawCube } from './cube.js'
import { intersectTracks } from './track.js'
import { vec2, vec3 } from '../libs/gl-matrix.mjs'

const DERAILMENT_FACTOR = 0.1
const BOGIE_SIZE = 1

const drawTrain = regl({
    context: {
        position: regl.prop('position'),
        rotation: regl.prop('rotation'),
        scale: [2, 1, 1]
    }
})

export const train = () => {
    const draw = model(() => drawCube())
    return (props) => drawTrain(props, draw)
}

export const moveBogie = (bogie, direction, speed) => {
    const newBogie = vec3.add([], bogie, vec3.scale([], direction, speed))
    const curves = intersectTracks({
        minX: newBogie[0] - BOGIE_SIZE,
        minY: newBogie[2] - BOGIE_SIZE,
        maxX: newBogie[0] + BOGIE_SIZE,
        maxY: newBogie[2] + BOGIE_SIZE
    }).map(entry => entry.track.curve)
    const projected = curves.map(curve => curve.project({x: newBogie[0], y: newBogie[2]}))
    // find the nearest one, but also the one that is most along the axis of movement
    projected.sort((a, b) => vec2.distance([a.x, a.y], [newBogie[0], newBogie[2]])
        - vec2.distance([b.x, b.y], [newBogie[0], newBogie[2]]))
    const nearestProjectedPoint = projected[0]
    if(nearestProjectedPoint) {
        let actualBogie = [nearestProjectedPoint.x, 0, nearestProjectedPoint.y]
        const error = vec3.dist(newBogie, actualBogie)
        if(error > DERAILMENT_FACTOR) {
            actualBogie = newBogie
        }
        return actualBogie
    }
    return newBogie
}
