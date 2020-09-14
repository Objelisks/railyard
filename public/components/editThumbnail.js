import regl from '../regl.js'
import html from '../libs/nanohtml.mjs'
import { setContext } from '../primitives/model.js'
import { camera } from '../camera.js'
import { getMouse3d, scrollStack } from '../mouse.js'
import { vec3, quat } from '../libs/gl-matrix.mjs'

const BUTTON_SIZE = 64

const drawThumbnails = regl({
    viewport: {
        x: (context, props) => props.x,
        y: (context, props) => props.y,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
    }
})

const fbo = regl.framebuffer({    
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    colorFormat: 'rgba',
    colorType: 'uint8'
})

const moveListener = (id, state, emit, item) => (e) => {
    const mouse3d = getMouse3d()
    item.position = vec3.clone(mouse3d)
}

const releaseDialog = (id, state, emit) => (e) => {
    const isOverDialog = e.target && e.target.closest && e.target.closest('.dialog')
    if(!isOverDialog) {
        emit('dropDragged')
    } else {
        emit('setDragItem', null)
    }

    state.components[id].release()
    document.body.classList.remove('grabbing')
}

const rotateObject = (id, state, emit, item) => (e) => {
    item.rotation += e.deltaY / 10.0
}

const grabButton = (state, emit, id, item) => (e) => {
    const targetId = e.target.closest('div[id]').id
    if(targetId !== id) return

    const dragItem = {
        ...item,
        position: [0, 0, 0],
        rotation: 0
    }

    const onmove = moveListener(id, state, emit, dragItem)
    const onrelease = releaseDialog(id, state, emit, dragItem)
    scrollStack.push(rotateObject(id, state, emit, dragItem))

    emit('setDragItem', dragItem)

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
        scrollStack.pop()
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    window.addEventListener('wheel', onscroll)
    document.body.classList.add('grabbing')
    e.stopPropagation()
}

export const thumbnailButton = (id, item) => {
    const { name, model, zoom=1 } = item
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
                    eye: [3*zoom, 3*zoom, 3*zoom],
                    target: [0, zoom, 0],
                    flip: true
                }, () => setContext({
                    position: [0, Math.sin(regl.now()*10.0)/5.0, 0],
                    rotation: quat.setAxisAngle([], [0, 1, 0], regl.now())
                }, () => model()))
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
        context.putImageData(pixelData, 0, 0)
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
