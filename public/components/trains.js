import html from '../libs/nanohtml.mjs'
import knob from './knob.js'
import { connect } from '../network.js'

// TODO: what if nanohooks

const trains = (state, emit) => {
    const roomName = state.query.room
    connect(roomName)

    return html`<div class="dialog">
        room: ${roomName}
        ${knob(state, emit)}
    </div>`
}

export default trains