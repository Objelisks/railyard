import { vec2, vec3, mat4, vec4 } from "./libs/gl-matrix.mjs"

export const log = (arg, label) => {
    if(label)
        console.log(label, arg)
    else
        console.log(arg)
    return arg
}

const findArg = (context, props, name, base) => (props && props[name]) || (context && context[name]) || base
export const reglArg = (name, base, context, props) => {
    if(context || props) {
        return findArg(context, props, name, base)
    } else {
        return (context, props) => findArg(context, props, name, base)
    }
}


export const rand = (max) => Math.random() * max*2 - max

export const to_vec2 = (pt) => [pt.x, pt.y]
export const to_vec3 = (pt) => [pt.x, pt.y, pt.z]

export const box2Around = (pt, size=1) => ({
    minX: pt[0] - size,
    maxX: pt[0] + size,
    minY: pt[1] - size,
    maxY: pt[1] + size
})

export const inBox2 = (vec, box) => (vec[0] > box[0]) && (vec[0] < box[1]) && (vec[1] > box[2]) && (vec[1] < box[3])
export const project2 = (vecA, vecB) => vec2.scale([], vecB, vec2.dot(vecA, vecB) / vec2.dot(vecB, vecB))

export const projectOnAxes = (point, axes) => axes
    .reduce((point, {point: axisPoint, tangent}) => 
            vec2.add([], project2(vec2.sub([], point, axisPoint), tangent), axisPoint),
        point)

export const getMouseRay = (mousePosition, context) => {
    const clipCoordinates = [
        (2 * (mousePosition[0]-10+0.5)) / context.viewportWidth - 1,
        1 - (2 * (mousePosition[1]-10+0.5)) / context.viewportHeight,
        -1,
        1]
    const inverseView = mat4.invert([], context.view)
    const inverseProjection = mat4.invert([], context.projection)
    const cameraRayA = vec4.transformMat4([], clipCoordinates, inverseProjection)
    const cameraRay = [cameraRayA[0], cameraRayA[1], -1, 0]
    const rayWorldA = vec4.transformMat4([], cameraRay, inverseView)
    const rayWorld = vec3.normalize([], [rayWorldA[0], rayWorldA[1], rayWorldA[2]])
    return rayWorld
}

export const intersectGround = (eye, dir) => {
    const groundNormal = [0, 1, 0]
    // const t = vec3.dot(vec3.sub([], [0, 0, 0], eye), groundNormal) / vec3.dot(dir, groundNormal)
    const t = -vec3.dot(eye, groundNormal) / vec3.dot(dir, groundNormal)
    return {
        collision: t > 0,
        point: vec3.add([], eye, vec3.scale([], dir, t))
    }
}