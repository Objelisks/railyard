import regl from '../regl.js'
import { reglArg } from '../utils.js'
import { vec3 } from '../libs/gl-matrix.mjs'

export const drawNormals = (points, normals) => regl({
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
    position: points.flatMap((point, i) => [point, vec3.add([], point, normals[i])])
  },
  uniforms: {
    color: reglArg('color', [0, 0, 1])
  },
  primitive: 'line',
  count: points.length*2
})