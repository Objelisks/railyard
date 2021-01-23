import regl from '../regl.js'
import { drawTile } from '../primitives/tile.js'
import { drawCube } from '../primitives/cube.js'
import { meshes } from '../primitives/meshes.js'
import { setUniforms } from '../primitives/model.js'
import { getSnappedPoint, getSnappedAxis } from '../mouse.js'
import { make3dTrack } from '../primitives/track.js'

const TILE_SCALE = 10

const placeholderTrack = make3dTrack([0, 0], [0, 0.25], [0, 3.75], [0, 4])

const setColor = regl({
    context: {
        color: (context, props) => props.color || undefined
    }
})


// each entry corresponds to one box in the edit menu
// categories:
// { 
//   name: category name,
//   items: [items] 
// }
// items:
// {
//     name: item name
//     model: draw function
//     placer: modifier for the positioning (i.e. snap to grid or point)
//     post: function to call after placement
//     zoom: thumbnail zoom factor
// }
export default [
    {
        name: 'track',
        items: [
            {
                name: 'track',
                model: () => setUniforms(() => placeholderTrack.draw()),
                placer: (position) => {
                    const snappedPoint = getSnappedPoint()
                    if(snappedPoint) {
                        return [snappedPoint[0], 0.5, snappedPoint[1]]
                    } else {
                        return position
                    }
                },
                create: (item) => {
                    item.track = make3dTrack([0, 0], [0, 0.25], [0, 3.75], [0, 4])
                },
                post: () => window.dispatchEvent(new CustomEvent('starttrackcreate', { }))
            },
        ]
    },
    {
        name: 'tiles',
        items: [
            {
                name: 'grass',
                model: (() => {const grass = drawTile('grass'); return () => grass()})(),
                placer: (position) => [
                    Math.round(position[0]/TILE_SCALE)*TILE_SCALE,
                    position[1],
                    Math.round(position[2]/TILE_SCALE)*TILE_SCALE],
                zoom: 4
            },
            {
                name: 'gravel',
                model: (() => {const gravel = drawTile('gravel'); return () => gravel()})(),
                placer: (position) => [
                    Math.round(position[0]/TILE_SCALE)*TILE_SCALE,
                    position[1],
                    Math.round(position[2]/TILE_SCALE)*TILE_SCALE],
                zoom: 4
            },
        ]
    },
    {
        name: 'scenery',
        items: [
            {
                name: 'small rock',
                model: () => meshes['smallrock'](),
                zoom: 1.5
            },
            {
                name: 'tunnel',
                model: () => meshes['rocktunnel'](),
                zoom: 3
            },
            {
                name: 'train house',
                model: () => meshes['trainhouse'](),
                zoom: 4
            },
            {
                name: 'station platform',
                model: () => meshes['platform'](),
                zoom: 4
            },
        ]
    }
]