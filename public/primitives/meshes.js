import { parse } from '../libs/loaders.gl-core.mjs'
import { GLTFLoader } from '../libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './mesh.js'

const meshNames = [
    { name: 'smallrock', material: 'rockcliff' },
]

export const meshes = Object.fromEntries(meshNames.map(name => [name.name, () => {}]))
meshNames.forEach(name => {
    parse(fetch(`./models/${name.name}.glb`), GLTFLoader).then(data => {
        const meshData = data.meshes[0].primitives[0]
        const mesh = buildMesh({
            position: meshData.attributes.POSITION.value,
            normal: meshData.attributes.NORMAL.value,
            uv: meshData.attributes.TEXCOORD_0.value,
            elements: meshData.indices.value
        })
        meshes[name.name] = drawMesh(mesh, name.material)
    })
})