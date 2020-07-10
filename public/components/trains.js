import html from '../libs/nanohtml.mjs'
import knob from './knob.js'
import { connect } from '../network.js'
import flipper from './flipper.js'
import booper from './booper.js'
import { getTracks, getTrains, placeTrainOnTrack } from '../railyard.js'

const trains = (app) => {
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
            ${booper1(state, emit)}
            ${flipper1(state, emit)}
            ${flipper2(state, emit)}
        </div>`
    }
}

export default trains