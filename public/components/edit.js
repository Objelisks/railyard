import html from '../libs/nanohtml.mjs'
import regl from '../regl.js'
import { setUniforms } from '../primitives/model.js'
import { drawCube } from '../primitives/cube.js'
import { camera } from '../camera.js'

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

const thumbnailButton = (name, model) => {
    let hoverRequest = null

    const buttonCanvas = document.createElement('canvas')
    buttonCanvas.setAttribute('width', BUTTON_SIZE)
    buttonCanvas.setAttribute('height', BUTTON_SIZE)

    const updateThumbnail = () => {
        // const offscreenCanvas = offscreenContext.canvas
        // offscreenContext.finish()
        // offscreenContext.flush()

        const buf = new Uint8Array(64*64*4)
    
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
                }, (context) => setUniforms({
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
        console.log('button render')

        cancelAnimationFrame(hoverRequest)
        hoverRequest = null

        updateThumbnail()

        return html`
            <div class="thumbnail" data-tooltip="${name}" onmouseenter=${onHover} onmouseleave=${onLeave}>
                ${buttonCanvas}
            </div>
        `
    }
}

const edit = (app, id) => {
    const objects = [
        {
            name: 'cliff rock', // tooltip
            model: () => setColor({ color: [1, 0, 0] }, () => drawCube()), // thumbnail
        },
        {
            name: 'cliff rock 2',
            model: () => setColor({ color: [0, 1, 0] }, () => drawCube()),
        },
        {
            name: 'cliff rock 3',
            model: () => setColor({ color: [0, 0, 1] }, () => drawCube()),
        },
        {
            name: 'cliff rock 4',
            model: () => setColor({ color: [1, 1, 0] }, () => drawCube()),
        },
        {
            name: 'cliff rock 5',
            model: () => setColor({ color: [1, 0, 1] }, () => drawCube()),
        }
    ]
    const buttons = objects.map(obj => thumbnailButton(obj.name, obj.model))

    return (state, emit) => {
        return html`
            <div class="buttonCorral">
                ${buttons.map(button => button(state, emit))}
            </div>
        `
    }
}

export default edit