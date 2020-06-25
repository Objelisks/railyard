import regl from "./regl.js"
import { mat4 } from './libs/gl-matrix.mjs'
import { reglArg } from '../utils.js'

export const model = regl({
    uniforms: {
        view: (context) => context.view,
        model:  (context, props) => mat4.fromRotationTranslationScale([],
            reglArg('rotation', [0, 0, 0, 1], context, props),
            reglArg('position', [0, 0, 0], context, props),
            reglArg('scale', [1, 1, 1], context, props)),
        invView: (context) => mat4.invert([], context.view),
        projection: (context) => context.projection
    }
})