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
            if(getTrains()[0]) {
                getTrains()[0].poweredTargetSpeed = newSpeed
            }
        }),
        flipper(app, 'flipper2', 'powered', (data) => {
            if(getTrains()[0]) {
                getTrains()[0].powered = data
                if(!data) {
                    getTrains()[0].unpoweredTargetSpeed = getTrains()[0].poweredTargetSpeed
                }
            }
        }, true),
        booper(app, 'booper1', 'reset train', (data) => {
            if(getTrains()[0]) {
                placeTrainOnTrack(getTrains()[0], getTracks()[0])
            }
        })
    ]

    return (state, emit) => {
        return html`
            <div class="section control-layout">
                ${ux.map(ui => ui(state, emit))}
            </div>
        `
    }
}

export default trains