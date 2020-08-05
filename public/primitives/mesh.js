import regl from '../regl.js'
import { drawPbr } from './pbr.js'
import { setUniforms } from './model.js'
import { drawFlat } from './flat.js'
import { flags } from '../flags.js'

export const buildMesh = ({position, normal, uv, elements}) => regl({
  attributes: {
    position,
    normal,
    uv
  },
  elements
})

export const drawMesh = (mesh, texture) => (props) =>
    setUniforms(props, () => 
      mesh(() => 
      (flags.graphics ? drawPbr : drawFlat)({ texture })
      )
    )
