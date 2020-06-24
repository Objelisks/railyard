/* globals Choo, Peer */

import regl from './regl.js'
import { train } from './primitives/train.js'
import { camera } from './camera.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import { connect } from './network.js'
import Bezier from './libs/bezier-js.mjs'
import { makeRenderTrack } from './primitives/track.js'


const curve = new Bezier({x: 0, y: 0}, {x: 0, y: 5}, {x: 5, y: 5})

const allTrains = [
    {
        id: uuid(),
        position: vec3.create(),
        rotation: quat.create()
    }
]

const renderTrack = makeRenderTrack({
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    curve,
    color: [.55, .55, .55]
})

const render = () => {
    regl.poll()

    const delta = (regl.now()/2 % 1.0) / 1.0
    const point = curve.get(delta)
    const tangent = curve.derivative(delta)

    vec3.set(allTrains[0].position, point.x, 0, point.y)
    quat.rotationTo(allTrains[0].rotation, [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))

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

        renderTrack()
    })

    requestAnimationFrame(render)
}
render()
connect('objelisks')

console.log('hello world');