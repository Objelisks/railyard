import html from '../libs/nanohtml.mjs'

const moveListener = (id, state, emit) => (e) => {
    state.components[id].offset.x += e.movementX
    state.components[id].offset.y += e.movementY

    const x = state.components[id].offset.x
    const y = state.components[id].offset.y
    const target = state.components[id].element
    if(!target) return
    target.style = `transform: translate(${x}px, ${y}px)`
}

const releaseDialog = (id, state, emit) => (e) => {
    state.components[id].mouseDown = null
    state.components[id].element = null
    state.components[id].release()
    document.body.classList.remove('grabbing')
}

const grabDialog = (state, emit, id) => (e) => {
    const targetId = e.target.closest('.dialog').id
    if(targetId !== id) return

    const onmove = moveListener(id, state, emit)
    const onrelease = releaseDialog(id, state, emit)

    state.components[id].mouseDown = { x: e.clientX, y: e.clientY }
    state.components[id].element = e.target.closest(`#${id}`)

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    document.body.classList.add('grabbing')
}

export default (app, id) => {
    app.use((state, emitter) => {
        state.components[id] = {
            offset: { x: 8, y: 8 }
        }
    })
    return (state, emit, content) => {
        const x = state.components[id].offset.x
        const y = state.components[id].offset.y
        return html`<div id="${id}" class="dialog"
            onmousedown=${grabDialog(state, emit, id)}
            style="transform: translate(${x}px, ${y}px)">
                ${content}
            </div>
        `
    }
}