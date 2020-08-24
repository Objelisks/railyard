import { parse } from '../libs/loaders.gl-core.mjs'
import { GLTFLoader } from '../libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './mesh.js'

const meshNames = [
    { name: 'smallrock', material: 'rockcliff' },
    { name: 'berkshire', material: 'berkshire' },
    { name: 'caboose', material: 'tm8' },
    { name: 'p70', material: 'p70' },
    { name: 'g43', material: 'g43' },
    { name: 'p42', material: 'p42' },
    { name: 'tm8', material: 'tm8' },
    { name: 'sw1', material: 'sw1' },
    { name: 'bogie', material: 'bogie' },
    { name: 'x36', material: 'x36' },
    { name: 'tile', material: 'grass' },
    { name: 'tree', material: 'rockcliff' },
]

export const meshes = Object.fromEntries(meshNames.map(name => [name.name, () => {}]))
meshNames.forEach(name => {
    parse(fetch(`./models/${name.name}.gltf`), GLTFLoader, {baseUri: `${window.location.origin}/models/`}).then(data => {
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