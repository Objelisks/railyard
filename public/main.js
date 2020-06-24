/* globals Choo, Peer */

import regl from './regl.js'
import { train } from './primitives/train.js'
import { camera } from './camera.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import swarm from './libs/webrtc-swarm.mjs'
import signalhub from './libs/signalhub.mjs'


const hub = signalhub('railyard-objelisks', ['127.0.0.1:8081'])
const sw = swarm(hub)
window.addEventListener('beforeunload', () => {
    sw.close()
    hub.close()
})
sw.on('peer', (peer, id) => {
    console.log('connected to peer', id, 'total', sw.peers.length)
    console.log(peer)
})

setInterval(() => {
    console.log(sw.peers)
    sw.peers.forEach((peer) => peer.send({hello: `peer ${peer.id}`}))
}, 1000)


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

console.log('hello world');