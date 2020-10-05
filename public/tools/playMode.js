import { vec3 } from '../libs/gl-matrix.mjs'
import createRay from '../libs/ray-aabb.mjs'
import { toggleTurnout } from '../primitives/turnout.js'
import { getRay, justLeftClicked } from '../mouse.js'
import { getTurnouts, getTrains } from '../railyard.js'
import { CONNECTOR_OFFSET } from '../constants.js'
import { debugPoint } from '../primitives/debug.js'
import { disconnect } from '../primitives/train.js'

export const playModeTool = {
    update: ({ detail: context }) => {
        const rayDirection = getRay()
        const ray = createRay(context.eye, rayDirection)
        let nearestHit = null
        let nearestDistance = Infinity
        let nearestType = null
        getTurnouts().forEach((turnout) => {
            const turnoutPosition = vec3.add(
                [],
                [turnout.point[0], -1, turnout.point[1]],
                [turnout.facing[0], 0, turnout.facing[1]]
            )
            const box = [
                [turnoutPosition[0] - 1, turnoutPosition[1] - 0.5, turnoutPosition[2] - 1],
                [turnoutPosition[0] + 1, turnoutPosition[1] + 0.5, turnoutPosition[2] + 1],
            ]
            const normal = [0, 0, 0]
            const hit = ray.intersects(box, normal)
            if (hit !== false) {
                if (hit < nearestDistance) {
                    nearestDistance = hit
                    nearestHit = turnout
                    nearestType = 'turnout'
                }
            }
        })
        const trains = getTrains()
        trains.forEach((train) => {
            const box = [
                [
                    train.position[0] - train.length / 2,
                    train.position[1] - 0.5,
                    train.position[2] - 0.5,
                ],
                [
                    train.position[0] + train.length / 2,
                    train.position[1] + 0.5,
                    train.position[2] + 0.5,
                ],
            ]
            const normal = [0, 0, 0]
            const hit = ray.intersects(box, normal)
            if (hit !== false) {
                if (hit < nearestDistance) {
                    nearestDistance = hit
                    nearestHit = train
                    nearestType = 'train'
                }
            }
        })
        if (nearestHit !== null) {
            const point = vec3.scaleAndAdd([], context.eye, rayDirection, nearestDistance)
            debugPoint('playClick', point, [1, 0, 0])
            switch (nearestType) {
                case 'turnout':
                    nearestHit.visible = true
                    if (justLeftClicked()) {
                        toggleTurnout(nearestHit)
                    }
                    break
                case 'train':
                    const train = nearestHit
                    train.visible = true

                    if (justLeftClicked()) {
                        // disconnect cars artificial intelligence algorithm
                        // if it only has one connection, disconnect that one, else:
                        // figure out the point of clicking and disconnect the side nearest to the click
                        const facing3d = vec3.transformQuat([], [1, 0, 0], train.rotation)
                        if (train.connectionFront && !train.connectionBack) {
                            disconnect(train, 'connectionFront')
                        } else if (!train.connectionFront && train.connectionBack) {
                            disconnect(train, 'connectionBack')
                        } else if (train.connectionFront && train.connectionBack) {
                            const frontConnector = vec3.scaleAndAdd(
                                [],
                                train.position,
                                facing3d,
                                CONNECTOR_OFFSET
                            )
                            const backConnector = vec3.scaleAndAdd(
                                [],
                                train.position,
                                facing3d,
                                -CONNECTOR_OFFSET
                            )
                            if (
                                vec3.distance(point, frontConnector) <
                                vec3.distance(point, backConnector)
                            ) {
                                disconnect(train, 'connectionFront')
                            } else {
                                disconnect(train, 'connectionBack')
                            }
                        } else {
                            // make a cute sound effect
                        }
                    }
                    break
            }
        } else {
            debugPoint('playClick', [0, 999, 0], [1, 0, 0])
        }
    },
    postrender: () => {
        getTurnouts().forEach((turnout) => (turnout.visible = false))
        getTrains().forEach((train) => (train.visible = false))
    },
}
