import html from '../libs/nanohtml.mjs'
import { connect, disconnect, getPlayers } from '../network.js'
import { playEffect } from '../audio.js'

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

        const keypress = (e) => {
            playEffect('textEntry')
            e.stopPropagation()
        }

        return html`
            <div>
                <span class="title">🚂 multiplayer 🚂</span>
            </div>
            <div class="section">
                <input id="input" type="text" oninput=${keypress} 
                    onmousedown=${(e) => e.stopPropagation()}
                    onkeyup=${(e) => e.stopPropagation()}
                    onkeydown=${(e) => e.stopPropagation()} />
                <button onclick=${connectClick}>connect!</button>
                <button onclick=${disconnectClick}>disconnect!</button>
            </div>
            <div class="section">
                <span>players:</span>
                <ul>
                    ${getPlayers().map(player => html`<li>${player.name}</li>`)}
                </ul>
            </div>
        `
    }
}

export default multiplayer