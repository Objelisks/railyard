import { model } from '../model.js'
import { drawCube } from './cube.js'
import regl from '../regl.js'
import { vec3 } from '../libs/gl-matrix.mjs'

export const train = (props) => model({
        ...props,
        scale: vec3.fromValues(2, 1, 1)
    }, () => 
    drawCube({
        texture: regl.texture([
            [[0, 255, 0], [255, 0, 0]],
            [[0, 0, 255], [255, 255, 0]]
        ])
    }))
