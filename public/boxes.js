import planck from './libs/planck-js.mjs'
import { vec2, vec3, quat } from './libs/gl-matrix.mjs'
import { to_vec2 } from './math.js'


const AIR_FRICTION = 1
const FORWARD = [1, 0, 0]

const world = planck.World()
const frictionBody = world.createBody({
    type: 'static'
})

let i = 0

export const boxTrain = (train, powered) => {
    const pos2d = [train.position[0]*10, train.position[2]*10]
    const facing3d = vec3.transformQuat([], FORWARD, train.rotation)
    const facing = [facing3d[0], facing3d[2]]

    const bogieFrontPos = vec2.add([], pos2d, vec2.scale([], facing, train.bogieOffset*10))
    const bogieBackPos = vec2.add([], pos2d, vec2.scale([], facing, -train.bogieOffset*10))

    const bogieFront = boxBogie(train, bogieFrontPos)
    const bogieBack = boxBogie(train, bogieBackPos)
    world.createJoint(planck.DistanceJoint({
        bodyA: bogieFront,
        bodyB: bogieBack,
    }))
    train.bogieFront = bogieFront
    train.bogieBack = bogieBack
}

export const boxBogie = (train, position) => {
    const pos = planck.Vec2(position[0], position[1])
    const bogie = world.createDynamicBody({
        position: pos,
        userData: {
            id: i++,
            train: train
        }
    })
    bogie.createFixture(planck.Box(train.length*2.2, 10))
    world.createJoint(planck.FrictionJoint({
        bodyA: bogie,
        bodyB: frictionBody,
        maxForce: AIR_FRICTION
    }))
    return bogie
}

export const connectBogies = (bodyA, bodyB) => {
    // TODO: tune joint length
    const trainA = bodyA.getUserData().train
    const trainB = bodyB.getUserData().train
    const idealBogieDistance = (trainA.length/2-trainA.bogieOffset + trainB.length/2-trainB.bogieOffset)*10
    world.createJoint(planck.RopeJoint({
        bodyA,
        bodyB,
        maxLength: idealBogieDistance+1
    }))
    world.createJoint(planck.DistanceJoint({
        bodyA,
        bodyB,
        length: idealBogieDistance
    }))
}

export const disconnectBogies = (bodyA, bodyB) => {
    ;[bodyA, bodyB].forEach(body => {
        let joint = body.getJointList()
        if(joint === null) return
        const startJoint = joint
        do {
            if(joint.other === bodyA || joint.other === bodyB) {
                world.destroyJoint(joint.joint)
            }
            joint = joint.next
        } while(joint !== null && joint !== startJoint)
    })
}

export const syncTrainToBox = (train) => {
    const pos1 = to_vec2(train.bogieFront.getPosition())
    const pos2 = to_vec2(train.bogieBack.getPosition())
    const avgPos = vec2.scale([], vec2.add([], pos1, pos2), 0.5)
    train.position = [avgPos[0]/10, 0, avgPos[1]/10]
    train.rotation = quat.rotationTo([], FORWARD, vec3.normalize([], vec3.sub([], [pos1[0], 0, pos1[1]], [pos2[0], 0, pos2[1]])))
}

export const stepWorld = (delta) => {
    world.step(delta)
}
