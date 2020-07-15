import regl from '../regl.js'
import { drawPbr } from './pbr.js'
import { setUniforms } from './model.js'
import { log1s } from '../utils.js'

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

export const buildMesh = ({position, normal, uv, elements}) => regl({
  attributes: {
    position,
    normal,
    uv
  },
  elements
})

export const drawMesh = (mesh) => (props) => {
    return setUniforms(props, () => {
        mesh(() => {
            drawPbr({ texture: 'rockcliff' })
        })
    })
}
