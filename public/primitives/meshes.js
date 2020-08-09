import { parse } from '../libs/loaders.gl-core.mjs'
import { GLTFLoader } from '../libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './mesh.js'

const meshNames = [
    { name: 'smallrock', material: 'rockcliff' },
    { name: 'classE', material: 'rail' },
    { name: 'sw1', material: 'baltimore' },
    { name: 'caboose', material: 'caboose' },
    { name: 'p70', material: 'p70' },
    { name: 'g43', material: 'g43' },
    { name: 'tm8', material: 'tm8' },
    { name: 'tile', material: 'grass' },
]

export const meshes = Object.fromEntries(meshNames.map(name => [name.name, () => {}]))
meshNames.forEach(name => {
    parse(fetch(`./models/${name.name}.gltf`), GLTFLoader, {baseUri: `${window.location.origin}/models/`}).then(data => {
        if(name.name === 'caboose') {
            console.log(data)
        }
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