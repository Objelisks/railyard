import html from '../libs/nanohtml.mjs'
import { playEffect } from '../audio.js'

const booper = (app, id, label, callback) => {
    // setup listener for knob adjustments
    app.use((state, emitter) => {
        state.events.BOOPER = 'booper'
        emitter.on(state.events.BOOPER, ({id: eventId, data}) => {
            if(id === eventId && callback) {
                callback(data)
            }
        })
    })

    const click = (state, emit) => (e) => {
        emit(state.events.BOOPER, { id })
        e.stopPropagation()
        playEffect('genericButton')
    }

    // render booper
    return (state, emit) => {
        return html`<div class="booper" id="${id}">
            <div class="indicator" onclick=${click(state, emit)}></div>
            <div class="label">${label}</div>
        </div>`
    }
}

export default booper