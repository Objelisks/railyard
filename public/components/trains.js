import html from '../libs/nanohtml.mjs'
import knob from './knob.js'
import { connect } from '../network.js'
import flipper from './flipper.js'

// TODO: what if nanohooks


const trains = (app) => {
    const knob1 = knob(app, 'knob1')
    const flipper1 = flipper(app, 'flipper1', 'edit mode')
    
    app.use((state, emitter) => {
        emitter.once('connect', (roomName) => {
            connect(roomName)
            emitter.emit('render')
        })
    })

    return (state, emit) => {
        emit('connect', state.query.room)
        return html`<div class="dialog">
            room: ${state.query.room}
            ${knob1(state, emit)}
            ${flipper1(state, emit)}
        </div>`
    }
}

export default trains