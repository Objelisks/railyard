import regl from './regl.js'
import resl from '../libs/resl.mjs'
import parsedds from '../libs/parse-dds.mjs'

export const setColor = regl({
    context: {
        color: (context, props) => props.color
    }
})

export const textures = {}

export const waitingOn = {
    count: 0
}

const suffixes = {
    'albedo': ['basecolor', 'Base_Color'],
    'normal': ['normal', 'Normal_OpenGL'],
    'metallic': ['metallic', 'Metallic'],
    'roughness': ['roughness', 'Roughness'],
    'ao': ['ambientocclusion', 'Mixed_AO'],
    'height': ['height', 'Height']
}

const texName = (name, type, painter=false) => {
    return `/materials/${name}/${name}_${suffixes[type][painter? 1 : 0]}.png`
}

export const loadTexture = (name, painter=false, colorSwap=0) => {
    const init = { wrapS: 'repeat', wrapT: 'repeat', mag: 'linear', min: 'mipmap', mipmap: true }
    textures[name] = {
        albedoMap: regl.texture(),
        normalMap: regl.texture(),
        metallicMap: regl.texture(),
        roughnessMap: regl.texture(),
        aoMap: regl.texture(),
        heightMap: regl.texture(),
        colorSwap
    }
    waitingOn.count += 1
    resl({
        manifest: {
            height: {
                type: 'image',
                src: texName(name, 'height', painter)
            }
        },
        onDone: (assets) => {
            textures[name].heightMap({
                ...init,
                data: assets.height
            })
        },
        onError: () => {}
    })
    resl({
        manifest: {
            albedo: {
                type: 'image',
                src: texName(name, 'albedo', painter)
            },
            normal: {
                type: 'image',
                src: texName(name, 'normal', painter)
            },
            metallic: {
                type: 'image',
                src: texName(name, 'metallic', painter)
            },
            roughness: {
                type: 'image',
                src: texName(name, 'roughness', painter)
            },
            ao: {
                type: 'image',
                src: texName(name, 'ao', painter)
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
            waitingOn.count -= 1
        }
    })
}

export const loadCubeMap = (name, file) => {
    if(textures[name][file]) return
    const textureSize = 512
    textures[name] = textures[name] || {}
    textures[name][file] = regl.cube()
    waitingOn.count += 1
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

            waitingOn.count -= 1
        }
    })
}

export const loadEnvironment = (name) => {
    if(textures[name] && textures[name].irradianceMap) return
    textures[name] = textures[name] || {}
    textures[name].irradianceMap = regl.cube()
    textures[name].prefilterMap = regl.cube()
    textures[name].brdfLUT = regl.texture()
    waitingOn.count += 1
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
            waitingOn.count -= 1
        }
    })
}
