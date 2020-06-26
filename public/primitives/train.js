import regl from "../regl.js"
import { model } from '../model.js'
import { drawCube } from './cube.js'

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