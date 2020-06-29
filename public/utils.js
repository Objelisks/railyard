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