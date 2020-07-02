import regl from '../regl.js'
import { reglArg } from '../utils.js'

export const drawLines = (points, length) => regl({
  frag: `
  precision mediump float;
  uniform vec3 color;
  void main () {
    gl_FragColor = vec4(color, 1.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec3 position;
  uniform mat4 projection, model, view;
  void main() {
    gl_Position = projection * view * model * vec4(position, 1.0);
  }`,
  attributes: {
    position: points
  },
  uniforms: {
    color: reglArg('color', [0, 0, 0])
  },
  primitive: 'line strip',
  count: length
})