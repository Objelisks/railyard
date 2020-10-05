import html from '../libs/nanohtml.mjs'
import { playEffect } from '../audio.js'

const flipper = (app, id, label, callback, initialState=false) => {
    // setup listener for flipper adjustments
    app.use((state, emitter) => {
        state.events.FLIPPER = 'flipper'
        state.components[id] = initialState
        emitter.on(state.events.FLIPPER, ({ id: eventId, data }) => {
            state.components[eventId] = data
            if(id === eventId && callback) {
                callback(data)
            }
            emitter.emit('render')
        })
    })

    const click = (state, emit) => (e) => {
        const newValue = !e.target.closest('.flipper').classList.contains('flipped')
        emit(state.events.FLIPPER, { id, data: newValue})
        playEffect(newValue ? 'pushButtonDown' : 'pushButtonUp')
        e.stopPropagation()
    }

    // render knob with rotation based on state
    return (state, emit) => {
        return html`<div class="flipper${state.components[id] ? ' flipped' : ''}" id="${id}">
            <div class="indicator" onmousedown=${click(state, emit)}></div>
            <div class="label">${label}</div>
        </div>`
    }
}

export default flipper