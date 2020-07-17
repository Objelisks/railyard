import html from '../libs/nanohtml.mjs'

const moveListener = (id, state, emit) => (e) => {
    const newValue = state.components[id].startValue + (e.clientX - state.components[id].mouseDown) / 100.0

    const clampedValue = Math.min(Math.max(newValue, -1), 1)

    emit(state.events.KNOB, { id: id, data: clampedValue })
    e.stopPropagation()
}

const releaseHandle = (id, state, emit) => (e) => {
    const newValue = state.components[id].startValue + (e.clientX - state.components[id].mouseDown) / 100.0
    let clampedValue = Math.min(Math.max(newValue, -1), 1)
    if(Math.abs(clampedValue) < 0.07) clampedValue = 0
    emit(state.events.KNOB, { id: id, data: clampedValue })

    state.components[id].release()
    document.body.classList.remove('grabbing')
    e.stopPropagation()
}

const grabHandle = (state, emit) => (e) => {
    const id = e.target.closest('div[id]').id

    const onmove = moveListener(id, state, emit)
    const onrelease = releaseHandle(id, state, emit)

    state.components[id].startValue = state.components[id].data
    state.components[id].mouseDown = e.clientX

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    document.body.classList.add('grabbing')
    e.stopPropagation()
}

const knob = (app, id, callback) => {
    // setup listener for knob adjustments
    app.use((state, emitter) => {
        state.events.KNOB = 'knob'
        state.components[id] = { data: 0 }
        emitter.on(state.events.KNOB, ({ id: eventId, data }) => {
            state.components[id].data = data
            if(id === eventId && callback) {
                callback(data)
            }
            emitter.emit('render')
        })
    })

    // render knob with rotation based on state
    return (state, emit) => {
        return html`<div class="knob"  id="${id}">
            <svg width="80px" height="80px" viewBox="-20 -20 140 140" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="tick-vis">
                        <stop offset="0%" stop-color="none" />
                        <stop offset="20%" stop-color="none" />
                        <stop offset="20%" stop-color="black" />
                        <stop offset="80%" stop-color="black" />
                        <stop offset="80%" stop-color="none" />
                        <stop offset="100%" stop-color="none" />
                    </linearGradient>
                </defs>
                <circle class="ticks" cx="50" cy="50" r="50" />
                <g class="handle-group" style="transform: rotate(${state.components[id].data*0.33}turn)" onmousedown=${grabHandle(state, emit)}>
                    <circle class="handle" cx="50" cy="50" r="40"/>
                    <line class="handle-mark" x1="50" y1="0" x2="50" y2="10"/>
                </g>
            </svg>
        </div>`
    }
}

export default knob