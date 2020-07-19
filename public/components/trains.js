import html from '../libs/nanohtml.mjs'
import knob from './knob.js'
import { connect } from '../network.js'
import flipper from './flipper.js'
import booper from './booper.js'
import { getTracks, getTrains } from '../railyard.js'
import { placeTrainOnTrack } from '../railyardhelpers.js'

const moveListener = (id, state, emit) => (e) => {
    state.components[id].offset.x += e.movementX
    state.components[id].offset.y += e.movementY
    emit('render')
}

const releaseDialog = (id, state, emit) => (e) => {
    state.components[id].mouseDown = null
    state.components[id].release()
    document.body.classList.remove('grabbing')
}

const grabDialog = (state, emit, id) => (e) => {
    const targetId = e.target.closest('div[id]').id
    if(targetId !== id) return

    const onmove = moveListener(id, state, emit)
    const onrelease = releaseDialog(id, state, emit)

    state.components[id].mouseDown = { x: e.clientX, y: e.clientY }

    state.components[id].release = () => {
        window.removeEventListener('mousemove', onmove)
        window.removeEventListener('mouseup', onrelease)
    }
    
    window.addEventListener('mousemove', onmove)
    window.addEventListener('mouseup', onrelease)
    document.body.classList.add('grabbing')
}

const trains = (app, id) => {
    const knob1 = knob(app, 'knob1', (data) => {
        let newSpeed = data * 0.3
        getTrains()[0].poweredTargetSpeed = newSpeed
    })
    const flipper1 = flipper(app, 'flipper1', 'edit mode')
    const flipper2 = flipper(app, 'flipper2', 'powered', (data) => {
        getTrains()[0].powered = data
    })
    const booper1 = booper(app, 'booper1', 'reset train', (data) => {
        placeTrainOnTrack(getTrains()[0], getTracks()[0])
    })
    
    app.use((state, emitter) => {
        state.components[id] = {
            offset: { x: 8, y: 8 }
        }
        emitter.once('connect', (roomName) => {
            connect(roomName)
            emitter.emit('render')
        })
    })

    return (state, emit) => {
        emit('connect', state.query.room)
        const x = state.components[id].offset.x
        const y = state.components[id].offset.y
        return html`<div id="${id}" class="dialog" onmousedown=${grabDialog(state, emit, id)} style="transform: translate(${x}px, ${y}px)">
            ${knob1(state, emit)}
            ${booper1(state, emit)}
            ${flipper1(state, emit)}
            ${flipper2(state, emit)}
        </div>`
    }
}

export default trains