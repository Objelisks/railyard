/* globals Choo, Peer */

import regl from './regl.js'
import { train } from './primitives/train.js'
import { drawCube } from './primitives/cube.js'
import { camera } from './camera.js'
import { quat, vec3, vec2 } from './libs/gl-matrix.mjs'
import { v4 as uuid } from './libs/uuid.mjs'
import { connect } from './network.js'
import Bezier from './libs/bezier-js.mjs'
import { makeRenderTrack } from './primitives/track.js'
import { model } from './model.js'

let reset = 5
const debugPoints = [[0, 0, 0]]
const debugPoint = (i, pt, col) => {
    debugPoints[i] = {pos: pt, col}
}

let curve = new Bezier({x: -5, y: -5}, {x: 15, y: -10}, {x: 5, y: 5})

let point = curve.get(0.1)
let tangent = curve.derivative(0.1)

const allTrains = [
    {
        id: uuid(),
        position: [point.x, 0, point.y],
        rotation: quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y])),
        speed: 0
    }
]

let renderTrack = makeRenderTrack({
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    curve,
    color: [.55, .55, .55]
})

const rand = (max) => Math.random() * max*2 - max

const resetTrack = () => {
    const ptA = [rand(20), rand(20)]
    const ptB = [rand(20), rand(20)]
    const perp = vec2.normalize([], vec2.rotate([], vec2.sub([], ptA, ptB), [0, 0], Math.PI/2))
    const mid = vec2.add([], vec2.scale([], vec2.add([], ptA, ptB), 0.5), vec2.scale([], perp, rand(20)))
    debugPoint(7, [ptA[0], 0, ptA[1]])
    debugPoint(8, [ptB[0], 0, ptB[1]])
    debugPoint(9, [mid[0], 0, mid[1]])
    curve = new Bezier({x: ptA[0], y: ptA[1]}, {x: mid[0], y: mid[1]}, {x: ptB[0], y: ptB[1]})
    point = curve.get(0.1)
    tangent = curve.derivative(0.1)
    renderTrack = makeRenderTrack({
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        curve,
        color: [.55, .55, .55]
    })
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

    allTrains.forEach(trainData => {
        const direction = vec3.transformQuat([], [1, 0, 0], trainData.rotation)
        const front = vec3.add([], trainData.position, vec3.scale([], direction, 0.5))
        const back = vec3.add([], trainData.position, vec3.scale([], direction, -0.5))
        debugPoint(0, front, [0, 0.6, 0.4])
        debugPoint(1, back, [0, 0.6, 0.4])
        
        const newFront = moveTruck(front, direction, trainData.speed, curve, 0)
        const newBack = moveTruck(back, direction, trainData.speed, curve, 1)
        //debugPoint(2, newFront, [0.7, 0.6, 0.2])
        //debugPoint(3, newBack, [0.7, 0.6, 0.2])

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
    }, (context) => {
        // render scene

        allTrains.forEach((trainData) => train({
            position: trainData.position,
            rotation: trainData.rotation
        }))

        debugPoints.forEach((point) => {
            model({
                position: point.pos,
                scale: [0.2, 0.2, 0.2]
            }, () => drawCube({
                color: point.col || [0.5, 0.5, 0.5]
            }))
        })

        renderTrack()
    })

    requestAnimationFrame(render)
}

resetTrack()
render()
connect('objelisks')

console.log('hello world');