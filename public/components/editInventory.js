import regl from '../regl.js'
import { drawTile } from '../primitives/tile.js'
import { drawCube } from '../primitives/cube.js'
import { meshes } from '../primitives/meshes.js'
import { setUniforms } from '../primitives/model.js'
import { getSnappedPoint, getSnappedAxis } from '../mouse.js'
import { make3dTrack } from '../primitives/track.js'
import { makeTrain, drawTrain, closestPointOnRail } from '../primitives/train.js'

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

export const objects = {
    // track
    "track": {
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
    
    // trains
    "berkshire": {
        name: 'berkshire engine',
        model: () => { 
            const train = makeTrain({type: 'berkshire'})
            drawTrain(train)
        },
        placer: (position) => {
            const snappedPoint = closestPointOnRail(position)
            if(snappedPoint) {
                return [snappedPoint[0], 0.5, snappedPoint[1]]
            } else {
                return position
            }
        }
    },


    // tiles
    "grass": {
        name: 'grass',
        model: (() => {const grass = drawTile('grass'); return () => grass()})(),
        placer: (position) => [
            Math.round(position[0]/TILE_SCALE)*TILE_SCALE,
            position[1],
            Math.round(position[2]/TILE_SCALE)*TILE_SCALE],
        zoom: 4
    },
    "gravel": {
        name: 'gravel',
        model: (() => {const gravel = drawTile('gravel'); return () => gravel()})(),
        placer: (position) => [
            Math.round(position[0]/TILE_SCALE)*TILE_SCALE,
            position[1],
            Math.round(position[2]/TILE_SCALE)*TILE_SCALE],
        zoom: 4
    },

    // scenery
    'small rock': {
        name: 'small rock',
        model: () => meshes['smallrock'](),
        zoom: 1.5
    },
    'tunnel': {
        name: 'tunnel',
        model: () => meshes['rocktunnel'](),
        zoom: 3
    },
    'train house': {
        name: 'train house',
        model: () => meshes['trainhouse'](),
        zoom: 4
    },
    'station platform': {
        name: 'station platform',
        model: () => meshes['platform'](),
        zoom: 4
    },
}

export const inventory = [
    {
        name: 'track',
        items: [
            objects['track']
        ]
    },
    {
        name: 'trains',
        items: [
            objects['berkshire']
        ]
    },
    {
        name: 'tiles',
        items: [
            objects['grass'],
            objects['gravel']
        ]
    },
    {
        name: 'scenery',
        items: [
            objects['small rock'],
            objects['tunnel'],
            objects['train house'],
            objects['station platform'],
        ]
    }
]