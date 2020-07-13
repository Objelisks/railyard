import createREGL from './libs/regl.mjs'

const regl = createREGL({
    canvas: document.body.querySelector('#canvas'),
    extensions: [
        'OES_standard_derivatives',
        'WEBGL_depth_texture',
        'OES_texture_float',
        'OES_texture_float_linear',
        'WEBGL_color_buffer_float'
    ],
    attributes: {
        preserveDrawingBuffer: false,
        antialias: false
    }
})

export default regl