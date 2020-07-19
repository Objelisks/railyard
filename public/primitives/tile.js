import regl from '../regl.js'
import { model } from './model.js'
import { drawPbr } from './pbr.js'

import { parse } from '../libs/loaders.gl-core.mjs'
import { GLTFLoader } from '../libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './mesh.js'


let drawLoadedMesh = () => {}
export const drawTile = (props) => drawLoadedMesh(props)
parse(fetch('./models/tile.gltf'), GLTFLoader).then(data => {
    const meshData = data.meshes[0].primitives[0]
    const mesh = buildMesh({
        position: meshData.attributes.POSITION.value,
        normal: meshData.attributes.NORMAL.value,
        uv: meshData.attributes.TEXCOORD_0.value,
        elements: meshData.indices.value
    })
    drawLoadedMesh = drawMesh(mesh, 'grass')
})
