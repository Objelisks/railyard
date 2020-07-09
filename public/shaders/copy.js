import regl from '../regl.js'

export const copyToScreen = regl({
    frag: `
    precision mediump float;
    uniform sampler2D texture;
    varying vec2 pos;
    void main () {
        gl_FragColor = texture2D(texture, pos).rgba;
    }`,
    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 pos;
    void main() {
        pos = position;
        gl_Position = vec4(position, 0.0, 1.0);
    }`,
    attributes: {
      position: [[-1, -1],  [-1, 1],  [1, -1],  [1, 1]]
    },
    uniforms: {
        texture: (context, props) => props.texture
    },
    elements: [[0, 1, 2],  [2, 1, 3]],
})