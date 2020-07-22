import html from '../libs/nanohtml.mjs'
import { connect, disconnect, getPlayers } from '../network.js'

const multiplayer = (app, id) => {
    return (state, emit) => {
        const connectClick = () => {
            const roomName = document.body.querySelector('#input').value
            emit('pushState', `/?room=${roomName}`)
            connect(roomName)
        }

        const disconnectClick = () => {
            const roomName = document.body.querySelector('#input').value
            emit('pushState', `/`)
            disconnect()
        }

        return html`
            <div>
                <span class="title">🚂 multiplayer 🚂</span>
            </div>
            <div>
                <input id="input" type="text"/>
                <button onclick=${connectClick}>connect!</button>
                <button onclick=${disconnectClick}>disconnect!</button>
            </div>
            <div>
                <span>players:</span>
                <ul>
                    ${getPlayers().map(player => html`<li>${player.name}</li>`)}
                </ul>
            </div>
        `
    }
}

export default multiplayer