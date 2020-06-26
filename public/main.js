/* globals Choo, Peer */

import regl from './regl.js'
import { quat, vec3 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import { drawCube } from './primitives/cube.js'
import { train } from './primitives/train.js'
import { track, makeTrack } from './primitives/track.js'
import { camera } from './camera.js'
import { connect } from './network.js'
import { model } from './model.js'
import { rand } from './utils.js'

let reset = 25
const debugPoints = {}
const debugPoint = (key, pt, col) => {
    debugPoints[key] = {pos: pt, col}
}

const allTracks = [
    makeTrack([-10, 0, 0], [0, 0, 10], -7.5),
    makeTrack([0, 0, 10], [10, 0, 0], -7.5),
    makeTrack([10, 0, 0], [0, 0, -10], -7.5),
    makeTrack([0, 0, -10], [-10, 0, 0], -7.5)
]

let curve = allTracks[0].curve

let point = curve.get(0.1)
let tangent = curve.derivative(0.1)

const allTrains = [
    {
        id: uuid(),
        position: [point.x, 0, point.y],
        rotation: quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y])),
        speed: 0,
    }
]
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
    curve = newTrack.curve
    point = curve.get(0.1)
    tangent = curve.derivative(0.1)
    allTracks[0] = newTrack
    allTrains[0].position = [point.x, 0, point.y]
    allTrains[0].rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    allTrains[0].speed = 0
}

const moveTruck = (truck, direction, speed, curve, i) => {
    const newTruck = vec3.add([], truck, vec3.scale([], direction, speed))
    const projected = curve.project({x: newTruck[0], y: newTruck[2]})
    let actualTruck = [projected.x, 0, projected.y]
    debugPoint(5+i, actualTruck, [0, 0.8, 0])
    const error = vec3.dist(newTruck, actualTruck)
    if(error > 0.1) {
        actualTruck = newTruck
    }
    return actualTruck
}


const render = () => {
    regl.poll()

    // safemode
    // const delta = (regl.now()/2 % 1.0) / 1.0
    // const point = curve.get(delta)
    // const tangent = curve.derivative(delta)
    // vec3.set(allTrains[0].position, point.x, 0, point.y)
    // quat.rotationTo(allTrains[0].rotation, [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))


    // add velocity * speed to front and back truck
    // project each point onto curve
    // set position based on midpoint between trucks
    // set rotation based on angle between trucks


    // TODO: make this respond to multiple tracks
    // TODO: move this somewhere else
    allTrains.forEach(trainData => {
        const direction = vec3.transformQuat([], [1, 0, 0], trainData.rotation)
        const front = vec3.add([], trainData.position, vec3.scale([], direction, 0.5))
        const back = vec3.add([], trainData.position, vec3.scale([], direction, -0.5))
        debugPoint(0, front, [0, 0.6, 0.4])
        debugPoint(1, back, [0, 0.6, 0.4])
        
        const newFront = moveTruck(front, direction, trainData.speed, curve, 0)
        const newBack = moveTruck(back, direction, trainData.speed, curve, 1)

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

render()
connect('objelisks')

console.log('hello world');