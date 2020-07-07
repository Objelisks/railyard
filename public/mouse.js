import { intersectGround, getMouseRay, to_vec2, inBox2 } from './utils.js'
import { SNAP_THRESHOLD } from './constants.js'
import { intersectTracks } from './primitives/track.js'
import { vec2 } from './libs/gl-matrix.mjs'
import { debugPoint } from './primitives/debug.js'

const mousePosition = [0, 0]
let justClicked = false
let justMoved = false
let mouse3d = [0, 0, 0]
let mouseRay = [0, 0, 0]
let snappedPoint = null
let snappedAxis = null

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

export const getMouse3d = () => mouse3d
export const getRay = () => mouseRay
export const getSnappedPoint = () => snappedPoint
export const getSnappedAxis = () => snappedAxis
export const justClickedMouse = () => justClicked
export const justMovedMouse = () => justMoved

export const mouseListenerTool = {
    prerender: ({detail: context}) => {
        const rayDirection = getMouseRay(mousePosition, context)
        mouseRay = rayDirection
        const hit = intersectGround(context.eye, rayDirection)
        mouse3d = hit.collision ? hit.point : [0, 0, 0]
        
        const point2d = [mouse3d[0], mouse3d[2]]
        const box = [
            point2d[0] - SNAP_THRESHOLD, point2d[0] + SNAP_THRESHOLD,
            point2d[1] - SNAP_THRESHOLD, point2d[1] + SNAP_THRESHOLD
        ]

        // find nearby snap points (currently just track endpoints)
        const intersectedTracks = intersectTracks({
            minX: box[0], maxX: box[1],
            minY: box[2], maxY: box[3]
        })
        const potentialSnapPoints = intersectedTracks.map(entry => entry.track)
            .flatMap(track => [
                { point: to_vec2(track.curve.get(0)), tangent: vec2.normalize([], to_vec2(track.curve.derivative(0))) },
                { point: to_vec2(track.curve.get(1)), tangent: vec2.normalize([], to_vec2(track.curve.derivative(1))) }
            ])
            .filter(snapPoint => inBox2(snapPoint.point, box))
        
        // snap to endpoints
        const snap = potentialSnapPoints.length > 0 ? potentialSnapPoints.reduce((nearest, current) =>
            vec2.distance(current.point, point2d) < vec2.distance(nearest.point, point2d) ?
                current : nearest) : null
        snappedPoint = snap && snap.point || null
        snappedAxis = snap && snap.tangent || null
        
        debugPoint('ray', snappedPoint ? [snappedPoint[0], 0, snappedPoint[1]] : hit.point, [1, .7, .28])
    },

    postrender: () => {
        // reset per-frame input tracking
        justClicked = false
        justMoved = false
    }
}