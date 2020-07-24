import html from '../libs/nanohtml.mjs'
import knob from './knob.js'
import flipper from './flipper.js'
import booper from './booper.js'
import { getTracks, getTrains } from '../railyard.js'
import { placeTrainOnTrack } from '../railyardhelpers.js'

const trains = (app, id) => {
    const ux = [
        knob(app, 'knob1', (data) => {
            let newSpeed = data * 0.3
            getTrains()[0].poweredTargetSpeed = newSpeed
        }),
        flipper(app, 'flipper2', 'powered', (data) => {
            getTrains()[0].powered = data
        }),
        booper(app, 'booper1', 'reset train', (data) => {
            placeTrainOnTrack(getTrains()[0], getTracks()[0])
        })
    ]

    return (state, emit) => {
        return html`
            <div class="control-layout">
                ${ux.map(ui => ui(state, emit))}
            </div>
        `
    }
}

export default trains