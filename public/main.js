/* globals Choo, Peer */

import regl from './regl.js'
import { train } from './primitives/train.js'
import { camera } from './camera.js'

import { quat, vec3 } from '../libs/gl-matrix.js'
import { v4 as uuid } from '../libs/uuid.js'

const allTrains = [
    {
        id: uuid(),
        position: vec3.create(),
        rotation: quat.create()
    }
]

const render = () => {
    regl.poll()

    // set up camera
    camera({
        eye: [10, 10, 10],
        target: [0, 0, 0]
    }, (context) => {
        // render scene
        allTrains.forEach((trainData) => train({
            position: trainData.position,
            rotation: trainData.rotation
        }))
    })

    requestAnimationFrame(render)
}
render()