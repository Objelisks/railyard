import { EPSILON } from '../constants.js'
import { justClickedMouse, justMovedMouse, getMouse3d, getSnappedPoint, getSnappedAxis } from '../mouse.js'
import { makeTurnout, intersectTurnouts, addTrackToTurnout } from '../primitives/turnout.js'
import { makeTrack, updateTrack, intersectTracks, addToBush } from '../primitives/track.js'
import { to_vec2, box2Around, projectOnLine } from '../utils.js'
import { vec2 } from '../libs/gl-matrix.mjs'
import { generateDebugArrowsForTurnout } from '../primitives/debug.js'
import { addTrack, addTurnout, getTracks } from '../railyard.js'

const trackCreateSteps = {
    FIRST_PLACED: 'first',
    SECOND_PLACED: 'second',
    THIRD_PLACED: 'third'
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
        if(justClickedMouse()) {
            switch(trackCreateState) {
                default: { // first click: create track and make it tiny
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    const newTrack = makeTrack(usePoint, usePoint)
                    trackCreateTrack = addTrack(newTrack) // id
                    trackCreateState = trackCreateSteps.FIRST_PLACED
                    if(snappedPoint) {
                        trackCreateStartAxis = {point: snappedPoint, tangent: snappedAxis}
                    }
                    break
                }
                case trackCreateSteps.FIRST_PLACED: { // second point clicked, set the end
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    updateTrack(getTracks()[trackCreateTrack], {end: usePoint})
                    trackCreateState = trackCreateSteps.SECOND_PLACED
                    if(snappedPoint) {
                        trackCreateEndAxis = {point: snappedPoint, tangent: snappedAxis}
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
                    const track = getTracks()[trackCreateTrack]
                    const endpoints = getEnds(track.curve)
                    endpoints.forEach(endpoint => {
                        const hitbox = box2Around(endpoint.point, 0.1)
                        const turnout = intersectTurnouts(hitbox)
                            .map(entry => entry.turnout)
                            .find(turnout => vec2.distance(turnout.point, endpoint.point) < EPSILON && vec2.dot(turnout.facing, endpoint.facing) > 0)
                        if(turnout) {
                            // we simply add the track
                            addTrackToTurnout(turnout, track)
                        } else {
                            // find some track friends to create a turnout with
                            const tracks = intersectTracks(hitbox)
                                .map(entry => entry.track)
                                .filter(otherTrack => {
                                    const otherEnds = getEnds(otherTrack.curve)
                                    // there is some end on this track that matches our endpoint
                                    return otherEnds.some(otherEnd =>
                                        vec2.distance(otherEnd.point, endpoint.point) < EPSILON &&
                                        vec2.dot(otherEnd.facing, endpoint.facing) > 0)
                                })
                            if(tracks.length > 0) {
                                // create turnout with this endpoint
                                const newTurnout = makeTurnout([...tracks, track], endpoint.point)
                                addTurnout(newTurnout)
                                generateDebugArrowsForTurnout(newTurnout)
                            }
                        }
                    })
                    break
                }
                case trackCreateSteps.SECOND_PLACED: { // third point clicked, set the control point for the first point
                    const axisProjected = trackCreateStartAxis ? projectOnLine(point2d, trackCreateStartAxis) : point2d
                    updateTrack(getTracks()[trackCreateTrack], {control1: axisProjected})
                    trackCreateState = trackCreateSteps.THIRD_PLACED
                    break
                }
                case trackCreateSteps.THIRD_PLACED: { // fourth point clicked, set the control point for the end, finish track
                    const axisProjected = trackCreateEndAxis ? projectOnLine(point2d, trackCreateEndAxis) : point2d
                    updateTrack(getTracks()[trackCreateTrack], {control2: axisProjected})
                    addToBush(getTracks()[trackCreateTrack]) // finalized, so it shouldn't change anymore

                    // done with placement, reset vars
                    trackCreateState = null
                    trackCreateTrack = null
                    trackCreateStartAxis = null
                    trackCreateEndAxis = null
                }
            }
        } else if(trackCreateTrack !== null && justMovedMouse()) {
            // update state on movement
            switch(trackCreateState) {
                case trackCreateSteps.FIRST_PLACED: {
                    const usePoint = snappedPoint ? snappedPoint : point2d
                    const startPoint = getTracks()[trackCreateTrack].curve.points[0]
                    const newControl = [(startPoint.x + usePoint[0]) / 2, (startPoint.y + usePoint[1]) / 2]
                    const axisProjected = trackCreateStartAxis ? projectOnLine(newControl, trackCreateStartAxis) : newControl
                    updateTrack(getTracks()[trackCreateTrack], {control1: axisProjected, control2: axisProjected, end: usePoint})
                    break
                }
                case trackCreateSteps.SECOND_PLACED: {
                    const axisProjected = trackCreateStartAxis ? projectOnLine(point2d, trackCreateStartAxis) : point2d
                    updateTrack(getTracks()[trackCreateTrack], {control1: axisProjected})
                    break
                }
                case trackCreateSteps.THIRD_PLACED: {
                    const axisProjected = trackCreateEndAxis ? projectOnLine(point2d, trackCreateEndAxis) : point2d
                    updateTrack(getTracks()[trackCreateTrack], {control2: axisProjected})
                    break
                }
            }
        }
    }
}