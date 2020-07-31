import regl from './regl.js'
import { vec3, mat4 } from './libs/gl-matrix.mjs'
import { keysPressed } from './keyboard.js'
import { getTrains } from './railyard.js'
import { clamp } from './math.js'
import { flags } from './flags.js'
import { scrollStack } from './mouse.js'


const editCameraTarget = [10, 0, 10]
const editCameraLookDirection = vec3.normalize([], [-1, -1, -1])
const baseCameraMoveSpeed = 0.2
let editCameraDistance = 50
const getCameraMoveSpeed = () => baseCameraMoveSpeed * editCameraDistance/20

let scrollVelocity = 0
scrollStack.push((e) => scrollVelocity += e.deltaY * 0.2)

export const CAMERA_MODE = {
    KITE: 'kite',
    CONDUCTOR: 'conductor',
    TOWER: 'tower',
    BIRD: 'bird'
}

let cameraMode = CAMERA_MODE.TOWER
export const setCameraMode = (mode) => {
    cameraMode = mode
    if(cameraMode === CAMERA_MODE.CONDUCTOR) {
        flags.tiltShiftEnabled = false
    } else {
        flags.tiltShiftEnabled = true
    }
}
export const getCameraMode = () => cameraMode

const kitePosition = [0, 10, 0]

const v1 = [], v2 = [], v3 = []
export const getCameraPos = () => {
    const train = getTrains()[0]
    switch(cameraMode) {
        case CAMERA_MODE.KITE:
            return kitePosition
        case CAMERA_MODE.CONDUCTOR:
            return vec3.add(v1, vec3.add(v1, train.position, [0, 1, 0]), vec3.transformQuat(v2, [-1, 0, 0], train.rotation))
        case CAMERA_MODE.TOWER:
            return [10, 10, 10]
        case CAMERA_MODE.BIRD:
            return vec3.scaleAndAdd(v3, editCameraTarget, editCameraLookDirection, -editCameraDistance)
    }
}

export const getCameraTarget = () => {
    const train = getTrains()[0]
    switch(cameraMode) {
        case CAMERA_MODE.KITE:
            return train.position
        case CAMERA_MODE.CONDUCTOR:
            return vec3.add([], vec3.add([], train.position, [0, 1, 0]), vec3.transformQuat([], [1, 0, 0], train.rotation))
        case CAMERA_MODE.TOWER:
            return train.position
        case CAMERA_MODE.BIRD:
            return editCameraTarget
    }
}


// This scoped command sets up the camera parameters
export const camera = regl({
    context: {
        projection: (context) => {
            return mat4.perspective([],
                Math.PI / 4,
                context.viewportWidth / context.viewportHeight,
                0.1,
                200.0)
        },

        view: (context, props) => {
            return mat4.lookAt([],
                props.eye,
                props.target,
                [0, 1, 0])
        },

        eye: regl.prop('eye'),
        target: regl.prop('target'),
        lightPos: (context) => {
            const train = getTrains()[0]
            if(!train) return [0, 0, 0]
            const pos = [...train.position]
            const facing3d = vec3.transformQuat([], [1, 0, 0], train.rotation)
            return vec3.add(pos, pos, vec3.scale([], facing3d, 2.5))
        }
    },

    uniforms: {
        view: regl.context('view'),
        model:  () => mat4.create(),
        invView: (context) => mat4.invert([], context.view),
        projection: regl.context('projection')
    }
})

export const cameraControlTool = {
    activate: () => {
        scrollVelocity = 0
    },
    preupdate: () => {
        const cameraRight = vec3.cross([], editCameraLookDirection, [0, 1, 0])
        const cameraForward = vec3.cross([], [0, 1, 0], cameraRight)
        const moveSpeed = getCameraMoveSpeed()
        if(keysPressed()['a']) {
            vec3.add(editCameraTarget, editCameraTarget, vec3.scale([], cameraRight, -moveSpeed))
        }
        if(keysPressed()['d']) {
            vec3.add(editCameraTarget, editCameraTarget, vec3.scale([], cameraRight, moveSpeed))
        }
        if(keysPressed()['w']) {
            vec3.add(editCameraTarget, editCameraTarget, vec3.scale([], cameraForward, moveSpeed))
        }
        if(keysPressed()['s']) {
            vec3.add(editCameraTarget, editCameraTarget, vec3.scale([], cameraForward, -moveSpeed))
        }

        editCameraDistance += scrollVelocity
        editCameraDistance = clamp(editCameraDistance, 1, 100)
        scrollVelocity *= 0.8

        const train = getTrains()[0]
        const distance = vec3.distance(train.position, kitePosition)
        vec3.lerp(kitePosition, kitePosition, vec3.add([], train.position, [0, 10, 0]), 0.001 * distance)
    }
}