import regl from '../regl.js'
import { setUniforms } from './model.js'
import { drawPbr } from './pbr.js'
import { drawFlat } from './flat.js'
import { flags } from '../flags.js'

export const cubePosition = [
  [-0.5, 0, -0.5], [+0.5, 0, -0.5], [+0.5, 0, +0.5], [-0.5, 0, +0.5], // top face
]

export const cubeNormal = [
[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], // top face
]

const tile = 2.0
export const cubeUv = [
  [0.0, 0.0], [tile, 0.0], [tile, tile], [0.0, tile], // top face
]

export const cubeElements = [
  [2, 1, 0], [2, 0, 3],       // top face.
]

const drawPlane = regl({
  attributes: {
    position: cubePosition,
    normal: cubeNormal,
    uv: cubeUv
  },
  elements: cubeElements
})

const setFloorContext = regl({
    context: {
        position: [0, -1.01, 0],
        rotation: [0, 0, 0, 1],
        scale: [50, 50, 50],
        color: [.51, .41, .32]
    },
})

export const drawFloor = () =>
  setFloorContext(() =>
  setUniforms(() =>
  (flags.graphics ? drawPbr : drawFlat)({ texture: 'table' }, () =>
  drawPlane())))