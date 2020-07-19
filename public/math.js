export const rand = (max) => Math.random() * max*2 - max

export const to_vec2 = (pt) => [pt.x, pt.y]
export const to_vec3 = (pt) => [pt.x, pt.y, pt.z]

export const clamp = (a, min, max) => Math.max(Math.min(a, max), min)
export const sign = (a) => a > 0 ? 1 : a < 0 ? -1 : 0


export const inBox2 = (vec, box) => (vec[0] > box[0]) && (vec[0] < box[1]) && (vec[1] > box[2]) && (vec[1] < box[3])
export const project2 = (vecA, vecB) => vec2.scale([], vecB, vec2.dot(vecA, vecB) / vec2.dot(vecB, vecB))
export const project3 = (vecA, vecB) => vec3.scale([], vecB, vec3.dot(vecA, vecB) / vec3.dot(vecB, vecB))

export const projectOnLine = (point, {point: axisPoint, tangent}) =>
    vec2.add([], project2(vec2.sub([], point, axisPoint), tangent), axisPoint)
