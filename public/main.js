import regl from './regl.js'
import choo from './libs/choo.mjs'
import { vec3, quat } from './libs/gl-matrix.mjs'
import controller from './components/controller.js'
import { drawDebugPoints, drawDebugArrows } from './primitives/debug.js'
import { drawTrain, updateTrain, applyTrainForces } from './primitives/train.js'
import { drawTurnout } from './primitives/turnout.js'
import { drawSkybox } from './primitives/skybox.js'
import { drawFloor } from './primitives/floor.js'
import { playModeTool } from './tools/playMode.js'
import { tiltShiftEffect } from './shaders/tiltshift.js'
import { camera, getCameraPos, getCameraTarget, cameraControlTool } from './camera.js'
import { getTracks, getTurnouts, getTrains, setTrainColors } from './railyard.js'
import { networkedTrainTool, connect } from './network.js'
import { mouseListenerTool, getMouse3d } from './mouse.js'
import { flags } from './flags.js'
import { waitingOn } from './reglhelpers.js'
import { setContext } from './primitives/model.js'
import { hexToRgb } from './utils.js'
import { syncTrainToBox, stepWorld } from './boxes.js'
import { initializeTestData } from './testdata.js'

let dragItem = null
let addedObjects = []

// debug keyboard listener
window.addEventListener('keypress', (e) => {
    if (e.key === '1') {
    }
    if (e.key === '2') {
        getTracks().forEach((track, i) => {
            console.log(`track ${i}`, JSON.stringify(track.points))
        })
        getTurnouts().forEach((turnout, i) => {
            console.log(
                `turnout ${i}`,
                JSON.stringify(
                    turnout.tracks.map((track) =>
                        getTracks().findIndex((search) => search.id === track.id)
                    )
                )
            )
        })
    }
    if (e.key === '3') {
        flags.stepMode = !flags.stepMode
    }
    if (e.key === '4') {
        render()
    }
})

// set up frame buffers
const makeFrameBuffer = (width, height) => {
    const color = regl.texture({
        width: width,
        height: height,
    })
    const depth = regl.texture({
        width: width,
        height: height,
        format: 'depth',
        type: 'uint32',
    })
    return {
        fbo: regl.framebuffer({
            width: width,
            height: height,
            color: color,
            depth: depth,
            depthTexture: true,
        }),
        color,
        depth,
    }
}

let frame1 = makeFrameBuffer(window.innerWidth, window.innerHeight)
let frame2 = makeFrameBuffer(window.innerWidth, window.innerHeight)

let flip = false
const getFbo = () => (flip ? frame2 : frame1)
const getOtherFbo = () => (flip ? frame1 : frame2)

const resizer = () => {
    frame1 = makeFrameBuffer(window.innerWidth, window.innerHeight)
    frame2 = makeFrameBuffer(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', resizer)

// setup tools
let toolset = new Set()

const setTool = (tool, active) => {
    if (active) {
        toolset.add(tool)
        if (tool.activate) tool.activate()
        Object.entries(tool).forEach(([key, callback]) => {
            window.addEventListener(key, callback)
        })
    } else {
        toolset.delete(tool)
        if (tool.deactivate) tool.deactivate()
        Object.entries(tool).forEach(([key, callback]) => {
            window.removeEventListener(key, callback)
        })
    }
}

// TODO: deterministic ordering of tools
const toggleTool = (tool) => setTool(tool, !toolset.has(tool))
setTool(mouseListenerTool, true)
setTool(playModeTool, true)
setTool(cameraControlTool, true)
setTool(networkedTrainTool, true)

const delta = 1 / 60

const render = () => {
    regl.poll()

    /// update time ///

    window.dispatchEvent(new CustomEvent('preupdate'))

    // set up camera
    const draw = () => {
        camera(
            {
                eye: getCameraPos(),
                target: getCameraTarget(),
            },
            (context) => {
                window.dispatchEvent(new CustomEvent('update', { detail: context }))

                // move all trains
                stepWorld(delta)
                getTrains().forEach((train) => {
                    syncTrainToBox(train)
                    applyTrainForces(train, train.bogieFront)
                    applyTrainForces(train, train.bogieBack)
                })
                // post move
                getTrains().forEach((train) => {
                    updateTrain(train)
                })

                window.dispatchEvent(new CustomEvent('postupdate', { detail: context }))

                /// drawing time ///

                window.dispatchEvent(new CustomEvent('prerender', { detail: context }))

                regl.clear({
                    depth: 1,
                    stencil: 1,
                })

                window.dispatchEvent(new CustomEvent('render', { detail: context }))

                // render trains
                getTrains().forEach((train) => drawTrain(train))

                // render tracks
                getTracks().forEach((track) => track.draw(track))

                // render turnouts
                getTurnouts().forEach((turnout) =>
                    drawTurnout({
                        position: vec3.add(
                            [],
                            [turnout.point[0], -1, turnout.point[1]],
                            [turnout.facing[0], 0, turnout.facing[1]]
                        ),
                        scale: [2, 1, 2],
                        color: turnout.visible ? [0.99, 0.99, 0.58] : [0.58, 0.58, 0.58],
                    })
                )

                if (dragItem) {
                    const mouse3d = getMouse3d()
                    let positionMod = dragItem.placer ? dragItem.placer : (pos) => pos

                    setContext(
                        {
                            position: positionMod(vec3.add([], [0, -0.5, 0], mouse3d)),
                            rotation: quat.setAxisAngle([], [0, 1, 0], dragItem.rotation),
                        },
                        () => dragItem.model()
                    )
                }

                addedObjects.forEach((obj) => {
                    let positionMod = obj.placer ? obj.placer : (pos) => pos
                    setContext(
                        {
                            position: positionMod(vec3.add([], [0, -0.5, 0], obj.position)),
                            rotation: quat.setAxisAngle([], [0, 1, 0], obj.rotation),
                        },
                        () => obj.model()
                    )
                })

                // render debug
                drawDebugPoints()
                drawDebugArrows()

                drawFloor()

                drawSkybox()

                window.dispatchEvent(new CustomEvent('postrender', { detail: context }))
            }
        )
    }

    // wait for all resources to load
    // TODO: loading screen

    if (waitingOn.count === 0) {
        const passes = [
            // render the scene normally offscreen on the first buffer
            () => draw(),
        ]
        if (flags.tiltShiftEnabled) {
            passes.push(
                // post process effects
                () =>
                    tiltShiftEffect({
                        color: getOtherFbo().color,
                        depth: getOtherFbo().depth,
                        bias: [1, 0], // vertical blur
                    }),
                () =>
                    tiltShiftEffect({
                        color: getOtherFbo().color,
                        depth: getOtherFbo().depth,
                        bias: [0, 1], // horizontal blur
                    })
                //() => fxaaPass({ color: getOtherFbo().color })
            )
        }

        // render (double buffered) with last frame going to the screen
        passes.forEach((renderPass, i) => {
            if (i !== passes.length - 1) {
                getFbo().fbo.use(renderPass)
                flip = !flip
            } else {
                renderPass()
            }
        })
    }

    if (!flags.stepMode) {
        requestAnimationFrame(render)
    }
}

const loadSavedData = () => {
    const initColor1 = localStorage.getItem('color1') ?? '#ffaaaa'
    const initColor2 = localStorage.getItem('color2') ?? '#ffaaaa'
    setTrainColors({
        color1: hexToRgb(initColor1),
        color2: hexToRgb(initColor2),
    })
}

// setup choo routing
const setupChoo = () => {
    const app = choo({
        href: false,
    })

    // initialize
    app.route('*', controller(app, 'controller'))

    const chooMount = document.createElement('div')
    chooMount.id = 'choo'
    document.body.appendChild(chooMount)
    app.mount('#choo')

    // setup event handlers for controls
    app.use((state, emitter) => {
        // initialize state here?

        if (state.query.room) {
            connect(state.query.room)
        }

        emitter.on('setDragItem', (item) => {
            dragItem = item
        })

        emitter.on('dropDragged', () => {
            const mouse3d = getMouse3d()

            addedObjects.push({ ...dragItem, position: mouse3d })
            emitter.emit('setDragItem', null)
        })
    })
}

// start

// TODO: do some heuristics to figure out whether to turn on high graphics mode

setupChoo()
requestAnimationFrame(render)

console.log('hello world')

initializeTestData()

loadSavedData()
