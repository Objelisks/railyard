import html from '../libs/nanohtml.mjs'
console.log(html)

const moveListener = (state, emit, id) => (e) => {
    state.components[id].offset.x = e.pageX - state.components[id].mouseDown.x
    state.components[id].offset.y = e.pageY - state.components[id].mouseDown.y

    const x = state.components[id].offset.x
    const y = state.components[id].offset.y
    const target = state.components[id].element
    if(!target) return
    target.style = `transform: translate(${x}px, ${y}px)`
}

const releaseDialog = (state, emit, id) => (e) => {
    state.components[id].mouseDown = null
    state.components[id].element = null
    state.components[id].release()
    document.body.classList.remove('grabbing')
}

const grabDialog = (state, emit, id) => (e) => {
    const targetId = e.target.closest('.dialog').id
    if(targetId !== id) return

    const onmove = moveListener(state, emit, id)
    const onrelease = releaseDialog(state, emit, id)

    state.components[id].mouseDown = {
        x: e.clientX - state.components[id].offset.x,
        y: e.clientY - state.components[id].offset.y
    }
    state.components[id].element = e.target.closest(`#${id}`)

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    document.body.classList.add('grabbing')
}

const preventScroll = (e) => {
    console.log('wheel', e)
    e.stopPropagation()
}

export default (app, id) => {
    app.use((state, emitter) => {
        state.components[id] = {
            offset: { x: 8, y: 8 }
        }
    })
    // hack because nanomorph doesn't support onwheel
    setTimeout(() => document.querySelector(`#${id}`).onwheel = preventScroll, 25)
    return (state, emit, content) => {
        const x = state.components[id].offset.x
        const y = state.components[id].offset.y
        const el = html`<div id="${id}" class="dialog"
            onmousedown=${grabDialog(state, emit, id)}
            style="transform: translate(${x}px, ${y}px)">
                ${content}
            </div>
        `
        return el
    }
}