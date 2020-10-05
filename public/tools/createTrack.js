import Bezier from '../libs/bezier-js.mjs'
import { makeTrack, updateTrack } from '../primitives/track.js'
import { debugCurve, debugPoint } from '../primitives/debug.js'
import {
    justLeftClicked,
    justMovedMouse,
    getMouse3d,
    getSnappedPoint,
    getSnappedAxis,
} from '../mouse.js'
import { addTrack, getTracks } from '../railyard.js'
import { addToTrackBush } from '../raycast.js'
import { projectOnLine } from '../math.js'

const trackCreateSteps = {
    FIRST_PLACED: 'first',
    SECOND_PLACED: 'second',
    THIRD_PLACED: 'third',
}
let trackCreateState = null
let trackCreateTrack = null
let trackCreateStartAxis = null
let trackCreateEndAxis = null

export const createTrackTool = {
    update: () => {
        const mouse3d = getMouse3d()
        const point2d = [mouse3d[0], mouse3d[2]]
        const snappedPoint = getSnappedPoint()
        const snappedAxis = getSnappedAxis()

        if (snappedPoint) {
            debugPoint('createTrack', [snappedPoint[0], 0, snappedPoint[1]], [1, 0.7, 0.28])
        } else {
            debugPoint('createTrack', mouse3d, [1, 0.7, 0.28])
        }

        if (justLeftClicked()) {
            switch (trackCreateState) {
                default: {
                    // first click: create track and make it tiny
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    const newTrack = makeTrack(usePoint, usePoint, usePoint, usePoint)
                    trackCreateTrack = addTrack(newTrack) // id
                    trackCreateState = trackCreateSteps.FIRST_PLACED
                    if (snappedPoint) {
                        trackCreateStartAxis = {
                            point: snappedPoint,
                            tangent: snappedAxis,
                        }
                    }
                    break
                }
                case trackCreateSteps.FIRST_PLACED: {
                    // second point clicked, set the end
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    updateTrack(getTracks()[trackCreateTrack], { end: usePoint })
                    trackCreateState = trackCreateSteps.SECOND_PLACED
                    if (snappedPoint) {
                        trackCreateEndAxis = { point: snappedPoint, tangent: snappedAxis }
                    }
                    break
                }
                case trackCreateSteps.SECOND_PLACED: {
                    // third point clicked, set the control point for the first point
                    const axisProjected = trackCreateStartAxis
                        ? projectOnLine(point2d, trackCreateStartAxis)
                        : point2d
                    updateTrack(getTracks()[trackCreateTrack], {
                        control1: axisProjected,
                    })
                    trackCreateState = trackCreateSteps.THIRD_PLACED
                    break
                }
                case trackCreateSteps.THIRD_PLACED: {
                    // fourth point clicked, set the control point for the end, finish track
                    const axisProjected = trackCreateEndAxis
                        ? projectOnLine(point2d, trackCreateEndAxis)
                        : point2d
                    const newTrack = getTracks()[trackCreateTrack]
                    updateTrack(newTrack, { control2: axisProjected })
                    addToTrackBush(newTrack) // finalized, so it shouldn't change anymore

                    window.dispatchEvent(new CustomEvent('trackcreate', { detail: newTrack }))

                    // done with placement, reset vars
                    trackCreateState = null
                    trackCreateTrack = null
                    trackCreateStartAxis = null
                    trackCreateEndAxis = null
                    debugCurve('createTrack', null)
                }
            }
        } else if (trackCreateTrack !== null && justMovedMouse()) {
            // update state on movement
            switch (trackCreateState) {
                case trackCreateSteps.FIRST_PLACED: {
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    const startPoint = getTracks()[trackCreateTrack].curve.points[0]
                    const newControl = [
                        (startPoint.x + usePoint[0]) / 2,
                        (startPoint.y + usePoint[1]) / 2,
                    ]
                    const axisProjected = trackCreateStartAxis
                        ? projectOnLine(newControl, trackCreateStartAxis)
                        : newControl
                    updateTrack(getTracks()[trackCreateTrack], {
                        control1: axisProjected,
                        control2: axisProjected,
                        end: usePoint,
                    })
                    break
                }
                case trackCreateSteps.SECOND_PLACED: {
                    const axisProjected = trackCreateStartAxis
                        ? projectOnLine(point2d, trackCreateStartAxis)
                        : point2d
                    const startPoint = getTracks()[trackCreateTrack].curve.points[0]
                    debugCurve(
                        'createTrack',
                        new Bezier(
                            startPoint,
                            {
                                x: (startPoint.x + axisProjected[0]) / 2,
                                y: (startPoint.y + axisProjected[1]) / 2,
                            },
                            { x: axisProjected[0], y: axisProjected[1] }
                        ),
                        1,
                        [1, 0, 0]
                    )
                    updateTrack(getTracks()[trackCreateTrack], {
                        control1: axisProjected,
                    })
                    break
                }
                case trackCreateSteps.THIRD_PLACED: {
                    const axisProjected = trackCreateEndAxis
                        ? projectOnLine(point2d, trackCreateEndAxis)
                        : point2d
                    const startPoint = getTracks()[trackCreateTrack].curve.points[3]
                    debugCurve(
                        'createTrack',
                        new Bezier(
                            startPoint,
                            {
                                x: (startPoint.x + axisProjected[0]) / 2,
                                y: (startPoint.y + axisProjected[1]) / 2,
                            },
                            { x: axisProjected[0], y: axisProjected[1] }
                        ),
                        1,
                        [1, 0, 0]
                    )
                    updateTrack(getTracks()[trackCreateTrack], {
                        control2: axisProjected,
                    })
                    break
                }
            }
        }
    },
}
