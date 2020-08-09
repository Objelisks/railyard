import { vec3, mat4, vec4 } from "./libs/gl-matrix.mjs"

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

export const pickRandom = (arr) => arr.length ? arr[Math.floor(Math.random()*arr.length)] : null

export const log1s = throttle(log, 1000)
export const log100ms = throttle(log, 100)

const findArg = (context, props, name, base) => 
    props?.[name] ??
    context?.[name] ??
    base

export const reglArg = (name, base, context, props) => {
    if(context || props) {
        return findArg(context, props, name, base)
    } else {
        return (context, props) => findArg(context, props, name, base)
    }
}

export const rgbToHex = (rgb) => {
    const toHex = (x) => Math.round(x*255).toString(16)
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`
}

export const hexToRgb = (hex) => {
    hex = hex.replace(/^#/, '')
    const num = parseInt(hex, 16)
	const red = num >> 16
	const green = (num >> 8) & 255
    const blue = num & 255
    return [red/255, green/255, blue/255]
}


//TODO: refactor
export const box2Around = (pt, size=1) => ({
    minX: pt[0] - size,
    maxX: pt[0] + size,
    minY: pt[1] - size,
    maxY: pt[1] + size
})

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
