import regl from "./regl.js"
import { mat4, quat, vec3 } from './libs/gl-matrix.mjs'

export const model =  regl({
    uniforms: {
        view: (context) => context.view,
        model:  (context, props) => mat4.fromRotationTranslationScale([],
            props.rotation || vec3.create(),
            props.position || quat.create(),
            props.scale || vec3.fromValues(1,1,1)),
        invView: (context) => mat4.invert([], context.view),
        projection: (context) => context.projection
    }
})