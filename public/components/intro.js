import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'

const intro = (app, id) => {
    const dialog1 = dialog(app, id)

    return (state, emit) => {
        const click = () => {
            const roomName = document.body.querySelector('#input').value
            //state.roomName = roomName
            emit('pushState', `/trains?room=${roomName}`)
        }

        return dialog1(state, emit, html`
            <span class="title">🚂 enter a room name pls 🚂</span>
            <input id="input" type="text"/>
            <button onclick=${click}>ok good!</button>
        `)
    }
}

export default intro