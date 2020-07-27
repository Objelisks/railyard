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
        preserveDrawingBuffer: true,
        antialias: false
    }
})

// todo: if extensions don't load, assume mobile version, default to lower graphics
// wait to load any textures until we know we can use them

export default regl