import html from '../libs/nanohtml.mjs'
import regl from '../regl.js'
import { setUniforms } from '../primitives/model.js'
import { drawCube } from '../primitives/cube.js'
import { camera } from '../camera.js'
import { setDragItem } from '../mouse.js'

import { mat4, quat } from '../libs/gl-matrix.mjs'

const BUTTON_SIZE = 64

const drawThumbnails = regl({
    viewport: {
        x: (context, props) => props.y,
        y: (context, props) => props.y,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
    }
})

const setColor = regl({
    context: {
        color: (context, props) => props.color || undefined
    }
})

const fbo = regl.framebuffer({    
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    colorFormat: 'rgba',
    colorType: 'uint8'
})

const moveListener = (id, state, emit) => (e) => {
}

const releaseDialog = (id, state, emit) => (e) => {
    const isOverDialog = e.target && e.target.closest('.dialog')
    if(!isOverDialog) {
        emit('dropDragged')
    } else {
        emit('setDragItem', null)
    }

    state.components[id].release()
    document.body.classList.remove('grabbing')
}

const grabButton = (state, emit, id, item) => (e) => {
    const targetId = e.target.closest('div[id]').id
    if(targetId !== id) return

    const onmove = moveListener(id, state, emit)
    const onrelease = releaseDialog(id, state, emit)

    setDragItem(item)
    emit('setDragItem', item)

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    document.body.classList.add('grabbing')
    e.stopPropagation()
}

const thumbnailButton = (id, item) => {
    const {name, model} = item
    let hoverRequest = null

    const buttonCanvas = document.createElement('canvas')
    buttonCanvas.setAttribute('width', BUTTON_SIZE)
    buttonCanvas.setAttribute('height', BUTTON_SIZE)
    const buf = new Uint8Array(64*64*4)

    const updateThumbnail = () => {
        fbo.use(() => {
            regl.clear({
                color: [1, 1, 0.5, 1],
                depth: 1
            })

            drawThumbnails({
                    x: 0,
                    y: 0,
                }, () => 
                camera({
                    eye: [3, -3, 3],
                    target: [0, 0, 0]
                }, () => setUniforms({
                    position: [0, Math.sin(regl.now()*10.0)/5.0, 0],
                    rotation: quat.fromEuler([], 0, regl.now()*100.0, 0)
                }, model))
            )

            regl.read({
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                data: buf,
            })
        })
        const pixelData = new ImageData(Uint8ClampedArray.from(buf), 64, 64)
        const context = buttonCanvas.getContext('2d')
        context.putImageData(pixelData, 0, 0, 0, 0, BUTTON_SIZE, BUTTON_SIZE)
    }

    const onHover = (e) => {
        const hoverUpdate = () => {
            updateThumbnail()
            hoverRequest = requestAnimationFrame(hoverUpdate)
        }
        hoverRequest = requestAnimationFrame(hoverUpdate)
    }

    const onLeave = (e) => {
        cancelAnimationFrame(hoverRequest)
        hoverRequest = null
    }

    return (state, emit) => {
        cancelAnimationFrame(hoverRequest)
        hoverRequest = null

        updateThumbnail()

        state.components[id] = {}

        return html`
            <div id=${id} class="thumbnail" data-tooltip="${name}"
                onmousedown=${grabButton(state, emit, id, item)} onmouseenter=${onHover} onmouseleave=${onLeave}>
                ${buttonCanvas}
            </div>
        `
    }
}

const edit = (app, id) => {
    const objects = [
        {
            name: 'red candy', // tooltip
            model: () => setColor({ color: [1, 0, 0] }, () => drawCube()), // thumbnail
        },
        {
            name: 'green candy',
            model: () => setColor({ color: [0, 1, 0] }, () => drawCube()),
        },
        {
            name: 'blue candy',
            model: () => setColor({ color: [0, 0, 1] }, () => drawCube()),
        },
        {
            name: 'yellow candy',
            model: () => setColor({ color: [1, 1, 0] }, () => drawCube()),
        },
        {
            name: 'pink candy',
            model: () => setColor({ color: [1, 0, 1] }, () => drawCube()),
        },
        {
            name: 'green candy',
            model: () => setColor({ color: [0, 1, 0] }, () => drawCube()),
        },
        {
            name: 'blue candy',
            model: () => setColor({ color: [0, 0, 1] }, () => drawCube()),
        },
        {
            name: 'yellow candy',
            model: () => setColor({ color: [1, 1, 0] }, () => drawCube()),
        },
        {
            name: 'pink candy',
            model: () => setColor({ color: [1, 0, 1] }, () => drawCube()),
        },
        {
            name: 'green candy',
            model: () => setColor({ color: [0, 1, 0] }, () => drawCube()),
        },
        {
            name: 'blue candy',
            model: () => setColor({ color: [0, 0, 1] }, () => drawCube()),
        },
        {
            name: 'yellow candy',
            model: () => setColor({ color: [1, 1, 0] }, () => drawCube()),
        },
        {
            name: 'pink candy',
            model: () => setColor({ color: [1, 0, 1] }, () => drawCube()),
        },
        {
            name: 'green candy',
            model: () => setColor({ color: [0, 1, 0] }, () => drawCube()),
        },
        {
            name: 'blue candy',
            model: () => setColor({ color: [0, 0, 1] }, () => drawCube()),
        },
        {
            name: 'yellow candy',
            model: () => setColor({ color: [1, 1, 0] }, () => drawCube()),
        },
        {
            name: 'pink candy',
            model: () => setColor({ color: [1, 0, 1] }, () => drawCube()),
        }
    ]
    const buttons = objects.map((obj, i) => thumbnailButton(`thumb-${i}`, obj))

    return (state, emit) => {
        return html`
            <div class="buttonCorral">
                ${buttons.map(button => button(state, emit))}
            </div>
        `
    }
}

export default edit