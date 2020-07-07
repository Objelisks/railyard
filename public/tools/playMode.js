import { getRay, justClickedMouse } from '../mouse.js'
import { toggleTurnout } from '../primitives/turnout.js'
import { getTurnouts } from '../railyard.js'
import createRay from '../libs/ray-aabb.mjs'
import { vec3 } from '../libs/gl-matrix.mjs'

export const playModeTool = {
    update: ({detail: context}) => {
        const rayDirection = getRay()
        const ray = createRay(context.eye, rayDirection)
        let nearestHit = null
        let nearest = Infinity
        getTurnouts().forEach(turnout => {
            const turnoutPosition = vec3.add([], [turnout.point[0], -1, turnout.point[1]], [turnout.facing[0], 0, turnout.facing[1]])
            const box = [
                [turnoutPosition[0]-1, turnoutPosition[1]-0.5, turnoutPosition[2]-1],
                [turnoutPosition[0]+1, turnoutPosition[1]+0.5, turnoutPosition[2]+1],
            ]
            const normal = [0, 0, 0]
            const hit = ray.intersects(box, normal)
            if(hit !== false) {
                if(hit < nearest) {
                    nearest = hit
                    nearestHit = turnout
                }
            }
        })
        if(nearestHit !== null) {
            nearestHit.visible = true
            if(justClickedMouse()) {
                toggleTurnout(nearestHit)
            }
        }
    },
    postrender: () => {
        getTurnouts().forEach(turnout => turnout.visible = false)
    }
}