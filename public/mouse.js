import { vec2, vec3 } from './libs/gl-matrix.mjs'
import { intersectGround, getMouseRay } from './utils.js'
import { to_vec2, inBox2 } from './math.js'
import { SNAP_THRESHOLD } from './constants.js'
import { intersectTracks } from './raycast.js'

export const mousePosition = [0, 0]
export const lastMousePosition = [0, 0]
export const mousePressed = {
    left: false,
    right: false,
}
export const scrollStack = []
export let justLeftClicked = false
export let justRightClicked = false
let justMoved = false
let mouse3d = [0, 0, 0]
let lastMouse3d = [0, 0, 0]
let mouseRay = [0, 0, 0]
let lastMouseRay = [0, 0, 0]
let snappedPoint = null
let snappedAxis = null
let dragItem = null

window.addEventListener('mousemove', (e) => {
    mousePosition[0] = e.clientX
    mousePosition[1] = e.clientY
    justMoved = true
})
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('canvas')) {
        if (e.button === 0) {
            justLeftClicked = true
            mousePressed['left'] = true
        }
        if (e.button === 2) {
            justRightClicked = true
            mousePressed['right'] = true
        }
    }
    e.preventDefault()
})
window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        mousePressed['left'] = false
    }
    if (e.button === 2) {
        mousePressed['right'] = false
    }
    e.preventDefault()
})
window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
})
window.addEventListener('wheel', (e) => {
    if (scrollStack.length > 0) {
        scrollStack[scrollStack.length - 1](e)
    }
})

export const getMouse3d = () => mouse3d
export const getLastMouse3d = () => lastMouse3d
export const getRay = () => mouseRay
export const getLastRay = () => lastMouseRay
export const getSnappedPoint = () => snappedPoint
export const getSnappedAxis = () => snappedAxis
export const justMovedMouse = () => justMoved

export const getDragItem = () => dragItem
export const setDragItem = (item) => (dragItem = item)

export const mouseListenerTool = {
    prerender: ({ detail: context }) => {
        const rayDirection = getMouseRay(mousePosition, context)
        mouseRay = rayDirection
        const hit = intersectGround(context.eye, rayDirection)
        mouse3d = hit.collision ? hit.point : [0, 0, 0]

        const point2d = [mouse3d[0], mouse3d[2]]
        const box = [
            point2d[0] - SNAP_THRESHOLD,
            point2d[0] + SNAP_THRESHOLD,
            point2d[1] - SNAP_THRESHOLD,
            point2d[1] + SNAP_THRESHOLD,
        ]

        // find nearby snap points (currently just track endpoints)
        const intersectedTracks = intersectTracks({
            minX: box[0],
            maxX: box[1],
            minY: box[2],
            maxY: box[3],
        })
        const potentialSnapPoints = intersectedTracks
            .map((entry) => entry.track)
            .flatMap((track) => [
                {
                    point: to_vec2(track.curve.get(0)),
                    tangent: vec2.normalize([], to_vec2(track.curve.derivative(0))),
                },
                {
                    point: to_vec2(track.curve.get(1)),
                    tangent: vec2.normalize([], to_vec2(track.curve.derivative(1))),
                },
            ])
            .filter((snapPoint) => inBox2(snapPoint.point, box))

        // snap to endpoints
        const snap =
            potentialSnapPoints.length > 0
                ? potentialSnapPoints.reduce((nearest, current) =>
                      vec2.distance(current.point, point2d) < vec2.distance(nearest.point, point2d)
                          ? current
                          : nearest
                  )
                : null
        snappedPoint = (snap && snap.point) || null
        snappedAxis = (snap && snap.tangent) || null
    },

    postrender: () => {
        // reset per-frame input tracking
        justLeftClicked = false
        justRightClicked = false
        justMoved = false
        vec3.copy(lastMouse3d, mouse3d)
        vec2.copy(lastMousePosition, mousePosition)
    },
}
