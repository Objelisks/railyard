import regl from './regl.js'
import choo from './libs/choo.mjs'
import { vec3 } from './libs/gl-matrix.mjs'
import trains from './components/trains.js'
import intro from './components/intro.js'
import { drawDebugPoints, drawDebugArrows } from './primitives/debug.js'
import { toggleTurnout, drawTurnout } from './primitives/turnout.js'
import { drawTrain, moveTrain } from './primitives/train.js'
import { floor } from './primitives/floor.js'
import { createTrackTool } from './tools/createTrack.js'
import { playModeTool } from './tools/playMode.js'
import { tiltShiftEffect } from './shaders/tiltshift.js'
import { getTracks, getTurnouts, getTrains, placeTrainOnTrack } from './railyard.js'
import { camera, getCameraPos, getCameraDir, cameraControlTool } from './camera.js'
import { networkedTrainTool } from './network.js'
import { mouseListenerTool } from './mouse.js'
import { WIDTH, HEIGHT } from './constants.js'
import { flags } from './flags.js'


// debug keyboard listener
window.addEventListener('keypress', (e) => {
    if(e.key === '1') {
        getTurnouts().forEach(turnout => {
            toggleTurnout(turnout)
        })
    }
    if(e.key === '2') {
        getTracks().forEach((track, i) => {
            console.log(`track ${i}`, JSON.stringify(track.points))
        })
        getTurnouts().forEach((turnout, i) => {
            console.log(`turnout ${i}`, JSON.stringify(turnout.tracks.map(track => getTracks().findIndex(search => search.id === track.id))))
        })
    }
    if(e.key === '3') {
        flags.stepMode = !flags.stepMode
    }
    if(e.key === '4') {
        render()
    }
})


// set up frame buffers
const makeFrameBuffer = () => {
    const color = regl.texture({
        width: WIDTH,
        height: HEIGHT,
    })
    const depth = regl.texture({
        width: WIDTH,
        height: HEIGHT,
        format: 'depth', 
        type: 'uint32'
    })
    return {
        fbo: regl.framebuffer({
            width: WIDTH,
            height: HEIGHT,
            color: color,
            depth: depth,
            depthTexture: true
        }),
        color,
        depth
    }
}

const frame1 = makeFrameBuffer()
const frame2 = makeFrameBuffer()

let flip = false
const getFbo = () => flip ? frame2 : frame1


// setup tools
let toolset = new Set()

const setTool = (tool, active) => {
    if(active) {
        toolset.add(tool)
        Object.entries(tool).forEach(([key, callback]) => {
            window.addEventListener(key, callback)
        })
    } else {
        toolset.delete(tool)
        Object.entries(tool).forEach(([key, callback]) => {
            window.removeEventListener(key, callback)
        })
    }
}
const toggleTool = (tool) => setTool(tool, !toolset.has(tool))
setTool(mouseListenerTool, true)
setTool(playModeTool, true)
setTool(cameraControlTool, false)
setTool(networkedTrainTool, true)

const drawFloor = floor()

const render = (delta=1/60) => {
    regl.poll()

    /// update time ///

    window.dispatchEvent(new CustomEvent('preupdate'))

    // set up camera
    const draw = () => {
        camera({
            eye: getCameraPos(),
            target: toolset.has(createTrackTool) ? vec3.add([], getCameraPos(), getCameraDir()) : getTrains()[0].position
        }, (context) => {

            window.dispatchEvent(new CustomEvent('update', {detail: context}))

            // move all trains
            // TODO: process collision
            getTrains().forEach(train => moveTrain(train))

            window.dispatchEvent(new CustomEvent('postupdate', {detail: context}))

            /// drawing time ///

            window.dispatchEvent(new CustomEvent('prerender', {detail: context}))

            regl.clear({
                color: [.46, .62, .79, 1],
                depth: 1,
                stencil: 1
            })

            window.dispatchEvent(new CustomEvent('render', {detail: context}))
            drawFloor()

            // render trains
            drawTrain(getTrains())

            // render tracks
            getTracks().forEach(track => track.draw(track))
            
            // render turnouts
            getTurnouts().forEach(turnout => drawTurnout({
                position: vec3.add([], [turnout.point[0], -1, turnout.point[1]], [turnout.facing[0], 0, turnout.facing[1]]),
                scale: [2, 1, 2],
                color: turnout.visible ? [0.99, 0.99, 0.58] : [0.58, 0.58, 0.58]
            }))

            // render debug
            drawDebugPoints()
            drawDebugArrows()

            window.dispatchEvent(new CustomEvent('postrender', {detail: context}))
        })
    }
    
    // render the scene normally offscreen on the first buffer
    const renderFbo = getFbo()
    renderFbo.fbo.use(() => {
        draw()
    })
    flip = !flip
    // switch to the second buffer and render the tiltshift blur one way from the first buffer
    getFbo().fbo.use(() => tiltShiftEffect({
        color: renderFbo.color,
        depth: renderFbo.depth,
        bias: [1, 0]
    }))
    // switch to the screen and render the tiltshift blur the other way from the second buffer
    tiltShiftEffect({
        color: getFbo().color,
        depth: getFbo().depth,
        bias: [0, 1]
    })

    if(!flags.stepMode) {
        requestAnimationFrame(render)
    }
}


// setup choo routing
const setupChoo = () => {
    const app = choo({
        href: false
    })

    // initialize
    app.route('/trains', trains(app))
    app.route('*', intro(app))
    app.mount('#choo')

    // setup event handlers for controls
    app.use((state, emitter) => {
        // initialize state here?

        // listen to the button event
        emitter.on(state.events.FLIPPER, ({id, data}) => {
            if(id === 'flipper1') {
                setTool(createTrackTool, data)
                setTool(cameraControlTool, data)
            }
        })
    })
}


// start
setupChoo()
render()

console.log('hello world')
