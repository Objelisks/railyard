import regl from '../regl.js'
import { textures, loadCubeMap, loadEnvironment } from '../reglhelpers.js'

export const cubePosition = [
  [-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5], // positive z face.
  [+0.5, +0.5, +0.5], [+0.5, +0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], // positive x face
  [+0.5, +0.5, -0.5], [-0.5, +0.5, -0.5], [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], // negative z face
  [-0.5, +0.5, -0.5], [-0.5, +0.5, +0.5], [-0.5, -0.5, +0.5], [-0.5, -0.5, -0.5], // negative x face.
  [-0.5, +0.5, -0.5], [+0.5, +0.5, -0.5], [+0.5, +0.5, +0.5], [-0.5, +0.5, +0.5], // top face
  [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]  // bottom face
]

export const cubeNormal = [
  [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], // positive z face.
  [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], // positive x face
  [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], // negative z face
  [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], // negative x face.
  [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], // top face
  [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0] // bottom face
]

export const cubeUv = [
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive z face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive x face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative z face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative x face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // top face
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]  // bottom face
]

export const cubeElements = [
  [2, 1, 0], [2, 0, 3],       // positive z face.
  [6, 5, 4], [6, 4, 7],       // positive x face.
  [10, 9, 8], [10, 8, 11],    // negative z face.
  [14, 13, 12], [14, 12, 15], // negative x face.
  [18, 17, 16], [18, 16, 19], // top face.
  [20, 21, 22], [23, 20, 22]  // bottom face
]

const names = ['arches']
names.forEach((textureName) => loadEnvironment(textureName, 'skybox'))

export const cubeAttributes = regl({
  frag: `
  #extension OES_texture_float_linear : enable
  #extension WEBGL_color_buffer_float : enable
  precision mediump float;
  varying vec2 vUv;
  varying vec3 vPos;
  uniform vec3 color;
  uniform samplerCube map;
  void main () {
    vec3 mapcolor = textureCube(map, vPos, 0.0).rgb;
    gl_FragColor = vec4(mapcolor, 1.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  varying vec3 vPos;
  uniform mat4 projection, model, view;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projection * view * model * vec4(position, 1.0);
  }`,
  attributes: {
    position: cubePosition,
    normal: cubeNormal,
    uv: cubeUv
  },
  elements: cubeElements,
  uniforms: {
      color: [1, 0, 0],
      map: textures['arches'].irradianceMap
  }
})

export const drawSimple = (props) => cubeAttributes(props)