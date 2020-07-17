import { vec2, vec3, mat4, vec4 } from "./libs/gl-matrix.mjs"

// inline log for returning values and logging them
export const log = (...args) => {
    console.log(...args)
    return args[0]
}

// run a function once at the end of delay after the last time it is called
export const debounce = (func, delay) => {
    let timeoutId = null
    return (...args) => {
        if(timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => { 
            func(...args)
            timeoutId = null
        }, delay)
    }
}

// run a function at most once per delay (return cached value otherwise)
export const throttle = (func, delay) => {
    let timeoutId = null
    let cache = undefined
    return (...args) => {
        if(timeoutId !== null) {
            return cache
        } else {
            timeoutId = setTimeout(() => { timeoutId = null }, delay)
            cache = func(...args)
            return cache
        }
    }
}

export const log1s = throttle(log, 1000)
export const log100ms = throttle(log, 100)

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

export const clamp = (a, min, max) => Math.max(Math.min(a, max), min)
export const sign = (a) => a > 0 ? 1 : a < 0 ? -1 : 0


//TODO: refactor
export const box2Around = (pt, size=1) => ({
    minX: pt[0] - size,
    maxX: pt[0] + size,
    minY: pt[1] - size,
    maxY: pt[1] + size
})

export const inBox2 = (vec, box) => (vec[0] > box[0]) && (vec[0] < box[1]) && (vec[1] > box[2]) && (vec[1] < box[3])
export const project2 = (vecA, vecB) => vec2.scale([], vecB, vec2.dot(vecA, vecB) / vec2.dot(vecB, vecB))
export const project3 = (vecA, vecB) => vec3.scale([], vecB, vec3.dot(vecA, vecB) / vec3.dot(vecB, vecB))

export const projectOnLine = (point, {point: axisPoint, tangent}) =>
    vec2.add([], project2(vec2.sub([], point, axisPoint), tangent), axisPoint)

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
