import html from '../libs/nanohtml.mjs'
import { connect } from '../network.js'

// TODO: what if nanohooks

const trains = (state, emit) => {
    const roomName = state.params.room
    connect(roomName)

    return html`<div class="dialog">
        room: ${roomName}
    </div>`
}

export default trains