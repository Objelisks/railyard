import regl from './regl.js'
import resl from '../libs/resl.mjs'
import parsedds from '../libs/parse-dds.mjs'

export const setColor = regl({
    context: {
        color: (context, props) => props.color
    }
})

export const textures = {}

export const loadTexture = (name) => {
    const textureSize = 512
    const init = { shape: [textureSize, textureSize], wrapS: 'repeat', wrapT: 'repeat' }
    textures[name] = {
        albedoMap: regl.texture(init),
        normalMap: regl.texture(init),
        metallicMap: regl.texture(init),
        roughnessMap: regl.texture(init),
        aoMap: regl.texture(init)
    }
    resl({
        manifest: {
            albedo: {
                type: 'image',
                src: `/materials/${name}/${name}_basecolor.png`
            },
            normal: {
                type: 'image',
                src: `/materials/${name}/${name}_normal.png`
            },
            metallic: {
                type: 'image',
                src: `/materials/${name}/${name}_metallic.png`
            },
            roughness: {
                type: 'image',
                src: `/materials/${name}/${name}_roughness.png`
            },
            ao: {
                type: 'image',
                src: `/materials/${name}/${name}_ambientocclusion.png`
            }
        },
        onDone: (assets) => {
            textures[name].albedoMap({
                ...init,
                data: assets.albedo
            })
            textures[name].normalMap({
                ...init,
                data: assets.normal
            })
            textures[name].metallicMap({
                ...init,
                data: assets.metallic
            })
            textures[name].roughnessMap({
                ...init,
                data: assets.roughness
            })
            textures[name].aoMap({
                ...init,
                data: assets.ao
            })
        }
    })
}

export const loadCubeMap = (name, file) => {
    if(textures[name][file]) return
    const textureSize = 512
    textures[name] = textures[name] || {}
    textures[name][file] = regl.cube(textureSize)
    resl({
        manifest: {
            cube: {
                type: 'binary',
                src: `/materials/${name}/${name}_${file}.dds`
            }
        },
        onDone: (assets) => {
            const cubeDds = parsedds(assets.cube)
            const cubeFaces = []
            cubeDds.images.forEach((image, i) => {
                if(image.shape[0] !== textureSize) return
                cubeFaces.push(new Float32Array(assets.cube, image.offset, image.length/4))
            })
            textures[name][file]({
                shape: cubeDds.shape,
                format: 'rgba',
                type: 'float',
                min : 'nearest',
                mag : 'linear',
                faces: cubeFaces
            })

        }
    })
}
// WebGL warning: tex(Sub)Image[23]D: ArrayBufferView type Uint8 not compatible with `type` FLOAT.

export const loadEnvironment = (name) => {
    if(textures[name] && textures[name].irradianceMap) return
    const textureSize = 512
    textures[name] = textures[name] || {}
    textures[name].irradianceMap = regl.cube(128)
    textures[name].prefilterMap = regl.cube(256)
    textures[name].brdfLUT = regl.texture(textureSize)
    resl({
        manifest: {
            irradianceMap: {
                type: 'binary',
                src: `/materials/${name}/${name}_iem.dds`
            },
            prefilterMap: {
                type: 'binary',
                src: `/materials/${name}/${name}_pmrem.dds`
            },
            brdfLUT: {
                type: 'image',
                src: `/materials/ibl_brdf_lut.png`
            }
        },
        onDone: (assets) => {
            const preDds = parsedds(assets.prefilterMap)
            const numMipmaps = 9
            const faces = preDds.images.reduce((acc, image, i) => {
                if(image.shape[0] === 256) {
                    acc.push({image, i})
                }
                return acc
            }, [])
            const mipmaps = faces.map(face => {
                return preDds.images.slice(face.i, face.i+numMipmaps)
            }).map(listOfImages =>
                ({mipmap: listOfImages
                    .map(image => new Float32Array(assets.prefilterMap, image.offset, image.length/4))}))
            textures[name].prefilterMap({
                shape: preDds.shape,
                format: 'rgba',
                type: 'float',
                min : 'mipmap',
                mag : 'linear',
                faces: mipmaps,
            })

            const irrDds = parsedds(assets.irradianceMap)
            const irrFaces = []
            irrDds.images.forEach((image, i) => {
                if(image.shape[0] !== 128) return
                irrFaces.push(new Float32Array(assets.irradianceMap, image.offset, image.length/4))
            })
            textures[name].irradianceMap({
                shape: irrDds.shape,
                format: 'rgba',
                type: 'float',
                min : 'nearest',
                mag : 'linear',
                faces: irrFaces
            })

            textures[name].brdfLUT(assets.brdfLUT)
        }
    })
}
