import html from '../libs/nanohtml.mjs'

const intro = (app) => (state, emit) => {
    console.log(state)
    const click = () => {
        const roomName = document.body.querySelector('#input').value
        emit('pushState', `/trains?room=${roomName}`)
    }

    return html`<div class="dialog">
        <span class="title">🚂 enter a room name pls 🚂</span>
        <input id="input" type="text"/>
        <button onclick=${click}>ok good!</button>
    </div>`
}

export default intro