import { parse } from '../libs/loaders.gl-core.mjs'
import { GLTFLoader, postProcessGLTF } from '../libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './mesh.js'
import { log1s } from '../utils.js'

const meshNames = [
    { name: 'smallrock', material: 'rockcliff' },
    { name: 'classE', material: 'rail' },
    { name: 'sw1', material: 'baltimore' },
    { name: 'caboose', material: 'caboose' },
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