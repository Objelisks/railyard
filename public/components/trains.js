import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'
import knob from './knob.js'
import { connect } from '../network.js'
import flipper from './flipper.js'
import booper from './booper.js'
import { getTracks, getTrains } from '../railyard.js'
import { placeTrainOnTrack } from '../railyardhelpers.js'

const trains = (app, id) => {
    const dialog1 = dialog(app, id)
    const ux = [
        knob(app, 'knob1', (data) => {
            let newSpeed = data * 0.3
            getTrains()[0].poweredTargetSpeed = newSpeed
        }),
        flipper(app, 'flipper1', 'edit mode'),
        flipper(app, 'flipper2', 'powered', (data) => {
            getTrains()[0].powered = data
        }),
        booper(app, 'booper1', 'reset train', (data) => {
            placeTrainOnTrack(getTrains()[0], getTracks()[0])
        })
    ]
    
    app.use((state, emitter) => {
        // TODO: if we've already connected, click back, and try to connect again, it doesn't connect
        emitter.once('connect', (roomName) => {
            connect(roomName)
            emitter.emit('render')
        })
    })

    return (state, emit) => {
        emit('connect', state.query.room)
        return dialog1(state, emit, html`
            ${ux.map(ui => ui(state, emit))}
        `)
    }
}

export default trains