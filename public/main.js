import regl from './regl.js'
import { quat, vec3, mat4, vec4 } from './libs/gl-matrix.mjs'
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
import { intersectGround, getMouseRay } from './utils.js'

let editMode = false

const debugPoints = {}
const debugPoint = (key, position, color) => {
    debugPoints[key] = {position, color}
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
    if(e.key === '1') {
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


// TODO: move all debug primitives into own file
const drawFloor = floor()
const drawTrains = train()
const drawPoint = model(() => drawCube())
const setupPoint = regl({
    context: {
        position: (context, props) => props.position,
        scale: [0.2, 0.2, 0.2],
        color: (context, props) => props.color || [0.5, 0.5, 0.5]
    }
})
const drawDebugPoints = (props) => setupPoint(props, drawPoint)
const setupArrow = regl({
    context: {
        color: (context, props) => props.color || [0.5, 0.5, 0.5]
    }
})
const drawDebugArrows = (props) => setupArrow(props, (context, props) => props.draw())

const editCameraPos = [10, 10, 10]
const cameraLookDir = [-10, -10, -10]
const cameraMoveSpeed = 1
// setup camera controls
const keysPressed = {}
const mousePosition = [0, 0]
window.addEventListener('keydown', (e) => keysPressed[e.key] = regl.now())
window.addEventListener('keyup', (e) => delete keysPressed[e.key])
window.addEventListener('mousemove', (e) => {
    mousePosition[0] = e.clientX
    mousePosition[1] = e.clientY
})

let lastFrameTime = regl.now()

const render = () => {
    regl.poll()

    const delta = regl.now() - lastFrameTime
    lastFrameTime = regl.now()

    // move all trains
    allTrains.forEach(train => moveTrain(train))
    // TODO: process collision
    
    // process camera movement
    if(editMode) {
        const cameraRight = vec3.cross([], cameraLookDir, [0, 1, 0])
        const cameraForward = vec3.cross([], [0, 1, 0], cameraRight)
        if(keysPressed['a']) {
            vec3.add(editCameraPos, editCameraPos, vec3.scale([], cameraRight, -cameraMoveSpeed * delta))
        }
        if(keysPressed['d']) {
            vec3.add(editCameraPos, editCameraPos, vec3.scale([], cameraRight, cameraMoveSpeed * delta))
        }
        if(keysPressed['w']) {
            vec3.add(editCameraPos, editCameraPos, vec3.scale([], cameraForward, cameraMoveSpeed * delta))
        }
        if(keysPressed['s']) {
            vec3.add(editCameraPos, editCameraPos, vec3.scale([], cameraForward, -cameraMoveSpeed * delta))
        }
    }


    // set up camera
    camera({
        eye: editCameraPos,
        target: editMode ? vec3.add([], editCameraPos, cameraLookDir) : allTrains[0].position
    }, (context) => {
        const rayDirection = getMouseRay(mousePosition, context)
        const hit = intersectGround(editCameraPos, rayDirection)
        if(hit.collision) {
            debugPoint('ray', hit.point, [255, 0, 0])
        }

        //drawFloor()

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
const ktov = (x) => x * 0.25

const setupChoo = () => {
    const app = choo()
    app.route('/intro', intro(app))
    app.route('/trains', trains(app))
    app.route('*', (state, emit) => {
        emit('pushState', '/intro')
    })
    app.mount('#choo')

    app.use((state, emitter) => {
        emitter.on(state.events.KNOB, ({id, data}) => {
            const newSpeed = ktov(data)
            allTrains[0].speed = newSpeed
        })
        emitter.on(state.events.FLIPPER, ({id, data}) => {
            editMode = data
        })
    })
}

setupChoo()
render()

console.log('hello world')