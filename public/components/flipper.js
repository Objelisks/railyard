import html from '../libs/nanohtml.mjs'

const flipper = (app, id, label) => {
    // setup listener for knob adjustments
    app.use((state, emitter) => {
        state.events.FLIPPER = 'flipper'
        state.components[id] = false
        emitter.on(state.events.FLIPPER, ({ id, data }) => {
            state.components[id] = data
            emitter.emit('render')
        })
    })

    const click = (state, emit) => (e) => {
        emit(state.events.FLIPPER, { id, data: !e.target.closest('.flipper').classList.contains('flipped')})
    }

    // render knob with rotation based on state
    return (state, emit) => {
        return html`<div class="flipper${state.components[id] ? ' flipped' : ''}" id="${id}">
            <div class="indicator" onclick=${click(state, emit)}></div>
            <div class="label">${label}</div>
        </div>`
    }
}

export default flipper