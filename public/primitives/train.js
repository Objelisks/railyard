import regl from "../regl.js"
import { model } from '../model.js'
import { drawCube } from './cube.js'
import { intersectTracks } from './track.js'
import { vec2, vec3 } from '../libs/gl-matrix.mjs'
import { to_vec2 } from '../utils.js'

const DERAILMENT_FACTOR = 0.1
const BOGIE_SIZE = 1
const FROG_SIZE = 1

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

// TODO: weird stuff at very slow speeds
export const moveBogie = (bogie, direction, speed) => {
    const newBogie = vec3.add([], bogie, vec3.scale([], direction, speed))

    const tracks = intersectTracks({
        minX: newBogie[0] - BOGIE_SIZE,
        minY: newBogie[2] - BOGIE_SIZE,
        maxX: newBogie[0] + BOGIE_SIZE,
        maxY: newBogie[2] + BOGIE_SIZE
    }).map(entry => entry.track)

    const curves = tracks.filter(track => {
        if(track.open) return true

        // it is closed, check to see if we're moving in the closed direction
        // assume tracks always face out in the relevant open direction
        const entranceDirection = to_vec2(track.curve.derivative(0))
        const normalizedDirection = vec2.normalize([], entranceDirection)
        const entrance = to_vec2(track.curve.get(0))
        const nearEntrance = vec2.distance([newBogie[0], newBogie[2]], entrance) < FROG_SIZE
        const isMovementDirection = vec2.dot(normalizedDirection, [direction[0], direction[2]]) > 0
        const shouldFilterOutClosedPath = nearEntrance && isMovementDirection
        return !shouldFilterOutClosedPath
    }).map(track => track.curve)

    // find the nearest one, but also TODO: the one that is most along the axis of movement
    const projected = curves.map(curve => curve.project({x: newBogie[0], y: newBogie[2]}))
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
