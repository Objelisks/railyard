import { quat, vec2, vec3 } from './libs/gl-matrix.mjs'
import { makeTurnout } from './primitives/turnout.js'
import { addTurnout, setTurnouts, getTracks } from './railyard.js'
import { resetTurnoutBush } from './raycast.js'
import { to_vec2 } from './math.js'

const precise = (x) => x.toPrecision(4)
const getKey = (endpoint) => `${precise(endpoint.end[0])},${precise(endpoint.end[1])}:${precise(endpoint.facing[0])},${precise(endpoint.facing[1])}`

export const placeTrainOnTrack = (train, track) => {
    const curve = track.curve
    const point = curve.get(0.1)
    const tangent = curve.derivative(0.1)
    train.position = [point.x, 0, point.y]
    train.rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    train.velocity = [0, 0]
}


export const detectAndFixTurnouts = () => {
    setTurnouts([])
    resetTurnoutBush()

    const turnoutLocations = {}
    const endpoints = getTracks().flatMap(track => [
        {track, end: to_vec2(track.curve.get(0)), facing: vec2.normalize([], to_vec2(track.curve.derivative(0)))},
        {track, end: to_vec2(track.curve.get(1)), facing: vec2.scale([], vec2.normalize([], to_vec2(track.curve.derivative(1))), -1)}
    ])
    endpoints.forEach(endpoint => {
        const key = getKey(endpoint)
        if(turnoutLocations[key]) {
            turnoutLocations[key].push(endpoint)
        } else {
            turnoutLocations[key] = [endpoint]
        }
    })
    let added = 0
    Object.entries(turnoutLocations)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([_, endpoints]) => {
            if(endpoints.length > 1) {
                const turnout = makeTurnout(endpoints.map(endpoint => endpoint.track), endpoints[0].end)
                addTurnout(turnout)
                added += 1
            }
        })
}
