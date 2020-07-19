import createREGL from './libs/regl.mjs'

const regl = createREGL({
    container: document.body.querySelector('#render'),
    extensions: [
        'WEBGL_depth_texture',
        'WEBGL_color_buffer_float',
        'OES_standard_derivatives',
        'OES_texture_float',
        'OES_texture_float_linear',
    ],
    attributes: {
        preserveDrawingBuffer: false,
        antialias: false
    }
})

export default regl