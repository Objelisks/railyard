import { getMouse3d, justClickedMouse } from '../mouse.js'
import { SNAP_THRESHOLD } from '../constants.js'
import { toggleTurnout, intersectTurnouts } from '../primitives/turnout.js'
import { generateDebugArrowsForTurnout } from '../primitives/debug.js'
import { inBox2 } from '../utils.js'
import { vec2 } from '../libs/gl-matrix.mjs'

export const playModeTool = {
    update: () => {
        if(justClickedMouse()) {
            const mouse3d = getMouse3d()
            const point2d = [mouse3d[0], mouse3d[2]]
            const box = [
                point2d[0] - SNAP_THRESHOLD, point2d[0] + SNAP_THRESHOLD,
                point2d[1] - SNAP_THRESHOLD, point2d[1] + SNAP_THRESHOLD
            ]
            const intersectedTurnouts = intersectTurnouts({
                minX: box[0], maxX: box[1],
                minY: box[2], maxY: box[3]
            })
                .map(entry => entry.turnout)
                .filter(turnout => inBox2(vec2.add([], turnout.point, turnout.facing), box))
            intersectedTurnouts.forEach(turnout => {
                toggleTurnout(turnout)
                generateDebugArrowsForTurnout(turnout)
            })
        }
    }
}