import { vec2, vec3, quat } from './libs/gl-matrix.mjs'
    // // flatten positions (just in case)
    // const pos1 = to_vec2(train.bogieFront.getPosition())
    // const pos2 = to_vec2(train.bogieBack.getPosition())

    // const avgPos = vec2.scale([], vec2.add([], pos1, pos2), 0.5)
    // train.position = [avgPos[0]/10, 0, avgPos[1]/10]
    
    // // almost works except for when the quaternions are facing the same direction
    // // const trainVec = vec3.normalize([], vec3.sub([], [pos1[0], 0, pos1[1]], [pos2[0], 0, pos2[1]]))
    // // train.rotation = quat.rotationTo([], FORWARD, trainVec)

    // // doesn't work because angle is giving the shortest angle
    // // const angleBetweenBogies = vec2.angle([1, 0], vec2.normalize([], vec2.sub([], pos1, pos2)))
    // // train.rotation = quat.setAxisAngle([], [0, 1, 0], angleBetweenBogies)
    
    // // doesn't work
    // const trainAxis = vec3.normalize([], vec3.sub([], [pos1[0], 0, pos1[1]], [pos2[0], 0, pos2[1]]))
    // const right = vec3.normalize([], vec3.cross([], trainAxis, UP))
    // train.rotation = quat.setAxes([], trainAxis, right, UP)

const FORWARD = [1, 0, 0]
const UP = [0, 1, 0]

const assert = (bool, desc, data) => {
    console.log(bool ? '✔️' : '❌', desc, !bool ? data : ' ')
}

const rotationToMethod = (p1, p2) => {
    const moveAxis = vec3.sub([], p2, p1)
    const rotation = quat.rotationTo([], FORWARD, moveAxis)
    return rotation
}

const rotationToMethod2 = (p1, p2) => {
    // doesn't work because angle is always positive
    const facingVec = vec2.normalize([], vec2.sub([], p2, p1))
    const angleBetweenBogies = Math.atan2(facingVec[1], facingVec[0])
    console.log(angleBetweenBogies)
    return quat.setAxisAngle([], UP, angleBetweenBogies)
}

const trainFacingForward = () => {
    const p1 = [0, 0]
    const p2 = [0, 1]

    const rotation = rotationToMethod2(p1, p2)

    const dir = vec3.transformQuat([], FORWARD, rotation)

    assert(vec3.equals(dir, [0, 0, 1]), 'should rotate towards train facing', dir)
}