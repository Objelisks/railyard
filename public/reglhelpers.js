import regl from './regl.js'

export const setColor = regl({
    context: {
        color: (context, props) => props.color
    }
})