import regl from './regl.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import { drawCube } from './primitives/cube.js'
import { train, moveTrain, makeTrain } from './primitives/train.js'
import { makeTrack, addToBush } from './primitives/track.js'
import { floor } from './primitives/floor.js'
import { arrow } from './primitives/arrow.js'
import { camera } from './camera.js'
import { model } from './model.js'
import intro from './components/intro.js'
import trains from './components/trains.js'
import choo from './libs/choo.mjs'

const debugPoints = {}
const debugPoint = (key, pt, col) => {
    debugPoints[key] = {pos: pt, col}
}
const debugArrows = {}
const debugArrow = (key, curve, propsFunc) => {
    debugArrows[key] = {curve, propsFunc, draw: arrow(curve, 1.0)}
}

const placeTrainOnTrack = (train, track) => {
    const curve = track.curve
    const point = curve.get(0.1)
    const tangent = curve.derivative(0.1)
    train.position = [point.x, 0, point.y]
    train.rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    train.speed = 0
}

const allTracks = [
    makeTrack([0, 0, 10], [-10, 0, 0], 7.1),
    makeTrack([0, 0, 10], [10, 0, 0], -7.1),
    makeTrack([10, 0, 0], [0, 0, -10], -7.1),
    makeTrack([0, 0, -10], [-10, 0, 0], -7.1),
    makeTrack([0, 0, -10], [-20, 0, -10], 0),
    makeTrack([-20, 0, -10], [-30, 0, 0], -7.1),
    makeTrack([-30, 0, 0], [-20, 0, 10], -7.1),
    makeTrack([0, 0, 10], [-20, 0, 10], 0),
]
addToBush(allTracks)
allTracks[4].open = false
allTracks.forEach((track, i) => debugArrow(i, track.curve, () => ({color: track.open ? [0,255,0] : [255,0,0]})))

const close = turnout => {
    turnout.open = false
    return turnout
}

const allTurnouts = [
    {
        id: uuid(),
        tracks: [
            allTracks[3],
            close(allTracks[4])
        ],
        open: 0
    },
    {
        id: uuid(),
        tracks: [
            allTracks[0],
            close(allTracks[7])
        ],
        open: 0
    }
]
const toggleTurnout = (turnout) => {
    turnout.tracks[turnout.open].open = false
    turnout.open = (turnout.open + 1) % turnout.tracks.length
    turnout.tracks[turnout.open].open = true
    return turnout.open
}
window.addEventListener('keypress', (e) => {
    if(e.key === 's') {
        allTurnouts.forEach(turnout => toggleTurnout(turnout))
    }
})

const allTrains = [
    makeTrain(),
    makeTrain()
]
allTrains[0].powered = true
placeTrainOnTrack(allTrains[0], allTracks[0])
placeTrainOnTrack(allTrains[1], allTracks[2])


const drawFloor = floor()
const drawTrains = train()
const drawPoint = model(() => drawCube())
const setupPoint = regl({
    context: {
        position: (context, props) => props.pos,
        scale: [0.2, 0.2, 0.2],
        color: (context, props) => props.col || [0.5, 0.5, 0.5]
    }
})
const drawDebugPoints = (props) => setupPoint(props, drawPoint)
const setupArrow = regl({
    context: {
        color: (context, props) => props.color || [0.5, 0.5, 0.5]
    }
})
const drawDebugArrows = (props) => setupArrow(props, (context, props) => props.draw())


const render = () => {
    regl.poll()

    allTrains.forEach(train => moveTrain(train))

    // set up camera
    camera({
        eye: [10, 10, 10],
        target: allTrains[0].position
    }, () => {
        drawFloor()

        // render trains
        drawTrains(allTrains)

        // render tracks
        allTracks.forEach(track => track.draw(track))

        // render debug points
        drawDebugPoints(Object.values(debugPoints))
        drawDebugArrows(Object.values(debugArrows).map((arrow) => ({
            ...arrow, ...arrow.propsFunc()
        })))
    })

    requestAnimationFrame(render)
}

// TODO: knob to value
const ktov = (x) => x

const setupChoo = () => {
    const app = choo()
    app.route('/intro', intro(app))
    app.route('/trains', trains(app))
    app.route('*', (state, emit) => {
        emit('pushState', '/intro')
    })
    app.mount('#choo')

    app.use((state, emitter) => {
        emitter.on(state.events.KNOB, (data) => {
            const newSpeed = ktov(data.data)
            allTrains[0].speed = newSpeed
        })
    })
}

setupChoo()
render()

console.log('hello world')