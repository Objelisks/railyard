import trains from './components/trains.js'
import regl from './regl.js'
import intro from './components/intro.js'
import choo from './libs/choo.mjs'
import { vec3 } from './libs/gl-matrix.mjs'
import { toggleTurnout, drawTurnout } from './primitives/turnout.js'
import { drawTrain, moveTrain } from './primitives/train.js'
import { drawDebugPoints, drawDebugArrows, generateDebugArrowsForTurnout } from './primitives/debug.js'
import { camera, getCameraPos, getCameraDir, cameraControlTool } from './camera.js'
import { createTrackTool } from './tools/createTrack.js'
import { playModeTool } from './tools/playMode.js'
import { getTracks, getTurnouts, getTrains } from './railyard.js'
import { mouseListenerTool } from './mouse.js'
import { networkedTrainTool } from './network.js'

// debug keyboard listener
window.addEventListener('keypress', (e) => {
    if(e.key === '1') {
        getTurnouts().forEach(turnout => {
            toggleTurnout(turnout)
            generateDebugArrowsForTurnout(turnout)
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
})

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

const render = () => {
    regl.poll()

    /// update time
    window.dispatchEvent(new CustomEvent('preupdate'))

    // set up camera
    camera({
        eye: getCameraPos(),
        target: toolset.has(createTrackTool) ? vec3.add([], getCameraPos(), getCameraDir()) : getTrains()[0].position
    }, (context) => {

        window.dispatchEvent(new CustomEvent('update', {detail: context}))
        // move all trains
        // TODO: process collision
        // TODO: process network events
        getTrains().forEach(train => moveTrain(train))

        window.dispatchEvent(new CustomEvent('postupdate', {detail: context}))

        /// drawing time

        window.dispatchEvent(new CustomEvent('prerender', {detail: context}))

        regl.clear({
            color: [.46, .62, .79, 1]
        })

        window.dispatchEvent(new CustomEvent('render', {detail: context}))

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

    // reset turnout visibility
    getTurnouts().forEach(turnout => turnout.visible = false)

    requestAnimationFrame(render)
}

// setup choo routing
const setupChoo = () => {
    const app = choo({
        href: false
    })

    let activeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

    // initialize
    app.route('/trains', trains(app))
    app.route('*', intro(app))
    app.mount('#choo')

    // setup event handlers for controls
    app.use((state, emitter) => {
        // initialize state

        emitter.on(state.events.KNOB, ({id, data}) => {
            const newSpeed = data * 0.25
            getTrains()[0].speed = newSpeed
        })
        emitter.on(state.events.FLIPPER, ({id, data}) => {
            setTool(createTrackTool, data)
            setTool(cameraControlTool, data)
        })
    })
}

// start
setupChoo()
render()

console.log('hello world')