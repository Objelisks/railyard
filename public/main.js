import regl from './regl.js'
import { quat, vec3, vec2 } from './libs/gl-matrix.mjs'
import { train, moveTrain, makeTrain } from './primitives/train.js'
import { makeTrack, loadToBush, addToBush, updateTrack, intersectTracks } from './primitives/track.js'
import { model } from './primitives/model.js'
import { drawCube } from './primitives/cube.js'
import { floor } from './primitives/floor.js'
import { camera } from './camera.js'
import intro from './components/intro.js'
import trains from './components/trains.js'
import choo from './libs/choo.mjs'
import { intersectGround, getMouseRay, to_vec2, inBox2, projectOnLine, box2Around, log, log1s, log100ms } from './utils.js'
import { makeTurnout, toggleTurnout, intersectTurnouts, addTrackToTurnout, FROG_SIZE } from './primitives/turnout.js'
import { debugPoint, drawDebugPoints, debugArrow, drawDebugArrows } from './primitives/debug.js'

let editMode = false
const EPSILON = 0.001

const placeTrainOnTrack = (train, track) => {
    const curve = track.curve
    const point = curve.get(0.1)
    const tangent = curve.derivative(0.1)
    train.position = [point.x, 0, point.y]
    train.rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    train.speed = 0
}

const allTracks = [
    makeTrack([0, 10], [-10, 0], 7.1),
    makeTrack([0, 10], [10, 0], -7.1),
    makeTrack([10, 0], [0, -10], -7.1),
    makeTrack([0, -10], [-10, 0], -7.1),
    makeTrack([0, -10], [-20, -10], 0),
    makeTrack([-20, -10], [-30, 0], -7.1),
    makeTrack([-30, 0], [-20, 10], -7.1),
    makeTrack([0, 10], [-20, 10], 0),
]
loadToBush(allTracks)

const allTurnouts = [
    makeTurnout([allTracks[3], allTracks[4]], to_vec2(allTracks[3].curve.get(0))),
    makeTurnout([allTracks[0],  allTracks[7]], to_vec2(allTracks[0].curve.get(0)))
]
const generateDebugArrowsForTurnout = (turnout) => {
    const track = turnout.tracks[turnout.open]
    const t1 = turnout.endpoints[turnout.open] === 0 ? 0.01 : 0.6
    const t2 = turnout.endpoints[turnout.open] === 0 ? 0.4 : 0.99
    const direction = turnout.endpoints[turnout.open] === 0 ? 1 : 0
    debugArrow(`turnout-${turnout.id}`, track.curve.split(t1, t2), direction, [1, .7, .28])
}
allTurnouts.forEach(turnout => generateDebugArrowsForTurnout(turnout))

window.addEventListener('keypress', (e) => {
    if(e.key === '1') {
        allTurnouts.forEach(turnout => {
            toggleTurnout(turnout)
            generateDebugArrowsForTurnout(turnout)
        })
    }
})

const allTrains = [
    makeTrain(),
    //makeTrain()
]
allTrains[0].powered = true
placeTrainOnTrack(allTrains[0], allTracks[0])
//placeTrainOnTrack(allTrains[1], allTracks[2])


const drawFloor = floor()
const drawTrains = train()
const setColor = regl({
    context: {
        color: (context, props) => props.color
    }
})
const box = model(() => drawCube())
const drawBox = (props) => setColor(props, () => box(props))

const trackCreateSteps = {
    FIRST_PLACED: 'first',
    SECOND_PLACED: 'second',
    THIRD_PLACED: 'third'
}
let trackCreateState = null
let trackCreateTrack = null
let trackCreateStartAxis = null
let trackCreateEndAxis = null
const SNAP_THRESHOLD = 1

const editCameraPos = [10, 10, 10]
const cameraLookDir = [-10, -10, -10]
const cameraMoveSpeed = 1
let lastFrameTime = regl.now()

// setup camera controls
const keysPressed = {}
const mousePosition = [0, 0]
let justClicked = false
let justMoved = false

window.addEventListener('keydown', (e) => keysPressed[e.key] = regl.now())
window.addEventListener('keyup', (e) => delete keysPressed[e.key])
window.addEventListener('mousemove', (e) => {
    mousePosition[0] = e.clientX
    mousePosition[1] = e.clientY
    justMoved = true
})
window.addEventListener('mousedown', (e) => {
    if(e.target.closest('#canvas')) {
        justClicked = true
    }
})

const render = () => {
    regl.poll()

    const delta = regl.now() - lastFrameTime
    lastFrameTime = regl.now()

    // move all trains
    allTrains.forEach(train => moveTrain(train, delta))
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
            const point2d = [hit.point[0], hit.point[2]]
            const box = [
                point2d[0] - SNAP_THRESHOLD, point2d[0] + SNAP_THRESHOLD,
                point2d[1] - SNAP_THRESHOLD, point2d[1] + SNAP_THRESHOLD
            ]
            const intersectedTurnouts = intersectTurnouts({
                minX: box[0], maxX: box[1],
                minY: box[2], maxY: box[3]
            }).map(entry => entry.turnout)
                .filter(turnout => inBox2(vec2.add([], turnout.point, turnout.facing), box))
            intersectedTurnouts.forEach(turnout => turnout.visible = true)
            const intersectedTracks = intersectTracks({
                minX: box[0], maxX: box[1],
                minY: box[2], maxY: box[3]
            })
            const trackEndpoints = intersectedTracks.map(entry => entry.track)
                .flatMap(track => [
                    {point: to_vec2(track.curve.get(0)), tangent: vec2.normalize([], to_vec2(track.curve.derivative(0))), track},
                    {point: to_vec2(track.curve.get(1)), tangent: vec2.normalize([], to_vec2(track.curve.derivative(1))), track}
                ])
                .filter(snapPoint => inBox2(snapPoint.point, box))
            const snappedPoint = trackEndpoints.length > 0 ? trackEndpoints.reduce((nearest, current) =>
                vec2.distance(current.point, point2d) < vec2.distance(nearest.point, point2d) ?
                    current : nearest) : null
            debugPoint('ray', snappedPoint ? [snappedPoint.point[0], 0, snappedPoint.point[1]] : hit.point, [1, .7, .28])
            
            if(!editMode && justClicked) {
                intersectedTurnouts.forEach(turnout => {
                    toggleTurnout(turnout)
                    generateDebugArrowsForTurnout(turnout)
                })
            }

            if(editMode && justClicked) {
                switch(trackCreateState) {
                    default: { // first click: create track and make it tiny
                        const usePoint = snappedPoint ? snappedPoint.point : point2d
                        const newTrack = makeTrack(usePoint, usePoint)
                        trackCreateTrack = allTracks.push(newTrack) - 1
                        trackCreateState = trackCreateSteps.FIRST_PLACED
                        if(snappedPoint) {
                            trackCreateStartAxis = snappedPoint
                        }
                        break
                    }
                    case trackCreateSteps.FIRST_PLACED: { // second point clicked, set the end
                        const usePoint = snappedPoint ? snappedPoint.point : point2d
                        updateTrack(allTracks[trackCreateTrack], {end: usePoint})
                        trackCreateState = trackCreateSteps.SECOND_PLACED
                        if(snappedPoint) {
                            trackCreateEndAxis = snappedPoint
                        }

                        const getEnds = (curve) => [
                            {
                                point: to_vec2(curve.get(0)),
                                facing: to_vec2(curve.derivative(0))
                            },
                            {
                                point: to_vec2(curve.get(1)),
                                facing: vec2.negate([], to_vec2(curve.derivative(1)))
                            }
                        ]
                        const track = allTracks[trackCreateTrack]
                        const endpoints = getEnds(track.curve)
                        endpoints.forEach(endpoint => {
                            const hitbox = box2Around(endpoint.point, 0.1)
                            const turnout = intersectTurnouts(hitbox).map(entry => entry.turnout)
                                .find(turnout => vec2.distance(turnout.point, endpoint.point) < EPSILON && vec2.dot(turnout.facing, endpoint.facing) > 0)
                            if(turnout) {
                                // we simply add the track
                                addTrackToTurnout(turnout, track)
                            } else {
                                // find some track friends to create a turnout with
                                const tracks = intersectTracks(hitbox).map(entry => entry.track).filter(otherTrack => {
                                    const otherEnds = getEnds(otherTrack.curve)
                                    // there is some end on this track that matches our endpoint
                                    return otherEnds.some(otherEnd =>
                                        vec2.distance(otherEnd.point, endpoint.point) < EPSILON && vec2.dot(otherEnd.facing, endpoint.facing) > 0)
                                })
                                if(tracks.length > 0) {
                                    // create turnout with this endpoint
                                    const newTurnout = makeTurnout([...tracks, track], endpoint.point)
                                    allTurnouts.push(newTurnout)
                                    generateDebugArrowsForTurnout(newTurnout)
                                }
                            }
                        })
                        break
                    }
                    case trackCreateSteps.SECOND_PLACED: { // third point clicked, set the control point for the first point
                        const axisProjected = trackCreateStartAxis ? projectOnLine(point2d, trackCreateStartAxis) : point2d
                        updateTrack(allTracks[trackCreateTrack], {control1: axisProjected})
                        trackCreateState = trackCreateSteps.THIRD_PLACED
                        break
                    }
                    case trackCreateSteps.THIRD_PLACED: { // fourth point clicked, set the control point for the end, finish track
                        const axisProjected = trackCreateEndAxis ? projectOnLine(point2d, trackCreateEndAxis) : point2d
                        updateTrack(allTracks[trackCreateTrack], {control2: axisProjected})
                        addToBush(allTracks[trackCreateTrack]) // finalized, so it shouldn't change anymore

                        // to create a switch
                        // for each endpoint
                        // find all tracks that share the endpoint with the new track
                        //     (any number of tracks, all of these tracks should overlap our current track)
                        // find any switches that contain all but our new track
                        // add to the found switch or create a new switch

                        trackCreateState = null
                        trackCreateTrack = null
                        trackCreateStartAxis = null
                        trackCreateEndAxis = null
                    }
                }
            } else if(editMode && trackCreateTrack !== null && justMoved) {
                switch(trackCreateState) {
                    case trackCreateSteps.FIRST_PLACED: {
                        const usePoint = snappedPoint ? snappedPoint.point : point2d
                        const startPoint = allTracks[trackCreateTrack].curve.points[0]
                        const newControl = [(startPoint.x + usePoint[0]) / 2, (startPoint.y + usePoint[1]) / 2]
                        const axisProjected = trackCreateStartAxis ? projectOnLine(newControl, trackCreateStartAxis) : newControl
                        updateTrack(allTracks[trackCreateTrack], {control1: axisProjected, control2: axisProjected, end: usePoint})
                        break
                    }
                    case trackCreateSteps.SECOND_PLACED: {
                        const axisProjected = trackCreateStartAxis ? projectOnLine(point2d, trackCreateStartAxis) : point2d
                        updateTrack(allTracks[trackCreateTrack], {control1: axisProjected})
                        break
                    }
                    case trackCreateSteps.THIRD_PLACED: {
                        const axisProjected = trackCreateEndAxis ? projectOnLine(point2d, trackCreateEndAxis) : point2d
                        updateTrack(allTracks[trackCreateTrack], {control2: axisProjected})
                        break
                    }
                }
            }
        }
        justClicked = false
        justMoved = false

        //drawFloor()
        regl.clear({
            color: [.46, .62, .79, 1]
        })

        // render trains
        drawTrains(allTrains)

        // render tracks
        allTracks.forEach(track => track.draw(track))
        
        allTurnouts.forEach(turnout => drawBox({
            position: vec3.add([], [turnout.point[0], -1, turnout.point[1]], [turnout.facing[0], 0, turnout.facing[1]]),
            scale: [2, 1, 2],
            color: turnout.visible ? [0.99, 0.99, 0.58] : [0.58, 0.58, 0.58]
        }))

        // render debug
        drawDebugPoints()
        drawDebugArrows()
    })
    allTurnouts.forEach(turnout => turnout.visible = false)

    requestAnimationFrame(render)
}

// TODO: knob to value
const ktov = (x) => x * .25

const setupChoo = () => {
    const app = choo()
    app.route('/trains', trains(app))
    app.route('*', intro(app))
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