import trains from './components/trains.js'
import regl from './regl.js'
import intro from './components/intro.js'
import choo from './libs/choo.mjs'
import { vec3 } from './libs/gl-matrix.mjs'
import { toggleTurnout, drawTurnout } from './primitives/turnout.js'
import { drawTrain, moveTrain } from './primitives/train.js'
import { drawDebugPoints, drawDebugArrows } from './primitives/debug.js'
import { camera, getCameraPos, getCameraDir, cameraControlTool } from './camera.js'
import { createTrackTool } from './tools/createTrack.js'
import { playModeTool } from './tools/playMode.js'
import { getTracks, getTurnouts, getTrains } from './railyard.js'
import { mouseListenerTool } from './mouse.js'
import { networkedTrainTool } from './network.js'
import { flags } from './flags.js'
import { WIDTH, HEIGHT } from './constants.js'
import { floor } from './primitives/floor.js'

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

// setup tools
let toolset = new Set()

export const colorBuf1 = regl.texture({
    width: WIDTH,
    height: HEIGHT,
})

export const depthBuf1 = regl.texture({
    width: WIDTH,
    height: HEIGHT,
    format: 'depth stencil', 
    type: 'depth stencil'
})

export const colorBuf2 = regl.texture({
    width: WIDTH,
    height: HEIGHT,
})

export const depthBuf2 = regl.texture({
    width: WIDTH,
    height: HEIGHT,
    format: 'depth stencil', 
    type: 'depth stencil'
})

export const fbo1 = regl.framebuffer({
    width: WIDTH,
    height: HEIGHT,
    color: colorBuf1,
    depthStencil: depthBuf1,
})

export const fbo2 = regl.framebuffer({
    width: WIDTH,
    height: HEIGHT,
    color: colorBuf2,
    depthStencil: depthBuf2,
})

const frame1 = {
    fbo: fbo1,
    color: colorBuf1,
    depth: depthBuf1
}
const frame2 = {
    fbo: fbo2,
    color: colorBuf2,
    depth: depthBuf2
}

const copyToScreen = regl({
    frag: `
    precision mediump float;
    uniform sampler2D texture;
    varying vec2 pos;
    void main () {
        gl_FragColor = texture2D(texture, pos).rgba;
    }`,
    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 pos;
    void main() {
        pos = position;
        gl_Position = vec4(position, 0.0, 1.0);
    }`,
    attributes: {
      position: [[-1, -1],  [-1, 1],  [1, -1],  [1, 1]]
    },
    uniforms: {
        texture: (context, props) => props.texture
    },
    elements: [[0, 1, 2],  [2, 1, 3]],
    framebuffer: null,
})

const tiltShiftEffect = regl({
    frag: `
    precision mediump float;
    uniform sampler2D color;
    uniform sampler2D depth;

    float PI = 3.1415;
    vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.411764705882353) * direction;
        vec2 off2 = vec2(3.2941176470588234) * direction;
        vec2 off3 = vec2(5.176470588235294) * direction;
        color += texture2D(image, uv) * 0.1964825501511404;
        color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
        color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
        color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
        color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
        color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
        color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
        return color;
      }

    void main () {
        vec2 resolution = vec2(800.0, 600.0);
        float focusDepth = texture2D(depth, vec2(0.0, 0.0)).r;
        float blurAmount = texture2D(depth, gl_FragCoord.xy / resolution).r;
        float screenBlur = cos((gl_FragCoord.y / resolution.y) * (1.0 * PI));
        gl_FragColor = blur13(color, gl_FragCoord.xy / resolution, resolution, vec2(2.0*screenBlur*screenBlur, 0.0));
    }`,
    vert: `
    precision mediump float;
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }`,
    attributes: {
        position: [[-10, -10],  [-10, 10],  [10, -10],  [10, 10]]
    },
    uniforms: {
        color: (context, props) => props.color,
        depth: (context, props) => props.depth,
    },
    elements: [[0, 1, 2],  [2, 1, 3]],
    depth: {
        enable: false
    }
})

let flip = false
const getFbo = () => flip ? frame2 : frame1

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

    /// update time
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
            // TODO: process network events
            getTrains().forEach(train => moveTrain(train))

            window.dispatchEvent(new CustomEvent('postupdate', {detail: context}))

            /// drawing time

            window.dispatchEvent(new CustomEvent('prerender', {detail: context}))

            regl.clear({
                color: [.46, .62, .79, 1],
                depth: 1,
                stencil: 0
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
    
    getFbo().fbo.use(() => {
        draw()
    })
    // draw()
    regl.clear({
        color: [.46, .62, .79, 1],
        depth: 1,
        stencil: 0
    })
    tiltShiftEffect({
        color: getFbo().color,
        depth: getFbo().depth
    })
    //flip = !flip


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
