import { model } from '../model.js'
import { drawCube } from './cube.js'

export const train = (props) => model({
        ...props,
        scale: [2, 1, 1]
    }, () => 
    drawCube({
        color: [1.0, .412, .38]
    }))
