import createREGL from './libs/regl.mjs'

const regl = createREGL({
    container: document.body.querySelector('#render'),
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