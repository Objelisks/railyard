import regl from './regl.js'
import { mat4 } from './libs/gl-matrix.mjs'

// This scoped command sets up the camera parameters
export const camera = regl({
    context: {
        projection: (context) => {
            return mat4.perspective([],
                Math.PI / 4,
                context.viewportWidth / context.viewportHeight,
                0.01,
                1000.0)
        },

        view: (context, props) => {
            return mat4.lookAt([],
                props.eye,
                props.target,
                [0, 1, 0])
        },

        eye: regl.prop('eye')
    },

    uniforms: {
        view: regl.context('view'),
        model:  () => mat4.create(),
        invView: (context) => mat4.invert([], context.view),
        projection: regl.context('projection')
    }
})