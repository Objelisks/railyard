import createREGL from './libs/regl.mjs'

const regl = createREGL({
    canvas: document.body.querySelector('#canvas'),
    extensions: ['OES_standard_derivatives'],
})

export default regl