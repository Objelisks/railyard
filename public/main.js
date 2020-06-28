import regl from './regl.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import { drawCube } from './primitives/cube.js'
import { train, moveBogie } from './primitives/train.js'
import { makeTrack, addToBush, resetBush } from './primitives/track.js'
import { camera } from './camera.js'
import { model } from './model.js'
import { rand } from './utils.js'
import intro from './components/intro.js'
import trains from './components/trains.js'
import choo from './libs/choo.mjs'

let app = null

const setupChoo = () => {
    app = choo()
    app.route('/intro', intro)
    app.route('/trains', trains)
    app.route('*', (state, emit) => {
        emit('pushState', '/intro')
    })
    app.mount('#choo')
}

let reset = 10
const debugPoints = {}
const debugPoint = (key, pt, col) => {
    debugPoints[key] = {pos: pt, col}
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
    makeTrack([-10, 0, 0], [0, 0, 10], -7.1),
    makeTrack([0, 0, 10], [10, 0, 0], -7.1),
    makeTrack([10, 0, 0], [0, 0, -10], -7.1),
    makeTrack([0, 0, -10], [-10, 0, 0], -7.1)
]
addToBush(allTracks)

const allTrains = [
    {
        id: uuid(),
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        speed: 0,
    }
]
placeTrainOnTrack(allTrains[0], allTracks[0])


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


const resetTrack = () => {
    const ptA = [rand(20), rand(20)]
    const ptB = [rand(20), rand(20)]
    const newTrack = makeTrack([ptA[0], 0, ptA[1]], [ptB[0], 0, ptB[1]], rand(20))
    placeTrainOnTrack(allTrains[0], newTrack)
    allTracks[0] = newTrack
    resetBush()
    addToBush(allTracks)
}


const render = () => {
    regl.poll()

    // safemode
    // const delta = (regl.now()/2 % 1.0) / 1.0
    // const point = curve.get(delta)
    // const tangent = curve.derivative(delta)
    // vec3.set(allTrains[0].position, point.x, 0, point.y)
    // quat.rotationTo(allTrains[0].rotation, [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))


    // add velocity * speed to front and back bogie
    // project each point onto curve
    // set position based on midpoint between bogies
    // set rotation based on angle between bogies


    // TODO: make this respond to multiple tracks
    // TODO: move this somewhere else
    allTrains.forEach(trainData => {
        const direction = vec3.transformQuat([], [1, 0, 0], trainData.rotation)
        const front = vec3.add([], trainData.position, vec3.scale([], direction, 0.5))
        const back = vec3.add([], trainData.position, vec3.scale([], direction, -0.5))
        debugPoint(0, front, [0, 0.6, 0.4])
        debugPoint(1, back, [0, 0.6, 0.4])
        
        const newFront = moveBogie(front, direction, trainData.speed)
        const newBack = moveBogie(back, direction, trainData.speed)

        const midpoint = vec3.scale([], vec3.add([], newFront, newBack), 0.5)
        const newDirection = quat.rotationTo([], [1, 0, 0], vec3.normalize([], vec3.sub([], newFront, newBack)))
        debugPoint(4, midpoint, [0.7, 0.2, 0.2])

        trainData.position = midpoint
        trainData.rotation = newDirection
        trainData.speed = Math.min(trainData.speed + 0.001, 0.6)
    })

    if(regl.now() >= reset) {
        resetTrack()
        reset = regl.now() + 5
    }

    // set up camera
    camera({
        eye: [10, 10, 10],
        target: allTrains[0].position
    }, () => {
        // render trains
        drawTrains(allTrains)

        // render tracks
        allTracks.forEach(track => track.draw(track))

        // render debug points
        drawDebugPoints(Object.values(debugPoints))
    })

    requestAnimationFrame(render)
}

setupChoo()
render()

console.log('hello world')