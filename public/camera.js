import regl from './regl.js'
import { vec3, mat4 } from './libs/gl-matrix.mjs'
import { keysPressed } from './keyboard.js'

const editCameraPosition = [10, 10, 10]
const editCameraLookDirection = [-10, -10, -10]
const cameraMoveSpeed = 0.01

export const getCameraPos = () => editCameraPosition
export const getCameraDir = () => editCameraLookDirection

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

        eye: regl.prop('eye'),
        target: regl.prop('target')
    },

    uniforms: {
        view: regl.context('view'),
        model:  () => mat4.create(),
        invView: (context) => mat4.invert([], context.view),
        projection: regl.context('projection')
    },
})

export const cameraControlTool = {
    preupdate: () => {
        const cameraRight = vec3.cross([], editCameraLookDirection, [0, 1, 0])
        const cameraForward = vec3.cross([], [0, 1, 0], cameraRight)
        if(keysPressed()['a']) {
            vec3.add(editCameraPosition, editCameraPosition, vec3.scale([], cameraRight, -cameraMoveSpeed ))
        }
        if(keysPressed()['d']) {
            vec3.add(editCameraPosition, editCameraPosition, vec3.scale([], cameraRight, cameraMoveSpeed))
        }
        if(keysPressed()['w']) {
            vec3.add(editCameraPosition, editCameraPosition, vec3.scale([], cameraForward, cameraMoveSpeed))
        }
        if(keysPressed()['s']) {
            vec3.add(editCameraPosition, editCameraPosition, vec3.scale([], cameraForward, -cameraMoveSpeed))
        }
    }
}