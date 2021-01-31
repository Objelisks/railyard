import regl from '../regl.js'
import { quat } from '../libs/gl-matrix.mjs'
import { drawTile } from '../primitives/tile.js'
import { drawCube } from '../primitives/cube.js'
import { meshes } from '../primitives/meshes.js'
import { setUniforms } from '../primitives/model.js'
import { getSnappedPoint, getSnappedAxis } from '../mouse.js'
import { make3dTrack } from '../primitives/track.js'
import { makeTrain, drawTrain, closestPointOnRail } from '../primitives/train.js'
import { addTrain } from '../railyard.js'

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

const gridSnapper = (model) => ({
    ...model,
    position: [
        Math.round(model.position[0]/TILE_SCALE)*TILE_SCALE,
        model.position[1],
        Math.round(model.position[2]/TILE_SCALE)*TILE_SCALE]
})

const trackSnapper = (model) => {
    const {point, track} = closestPointOnRail([model.position[0], model.position[2]])
    if(point) {
        const derivative = track.curve.derivative(point.t)
        return {
            ...model,
            position: [point.x, 0.5, point.y],
            rotation: quat.setAxisAngle([], [0, 1, 0], -Math.atan2(derivative.y, derivative.x))
        }
    } else {
        return model
    }
}

const railEndSnapper = (model) => {
    const snappedPoint = getSnappedPoint()
    if(snappedPoint) {
        return {...model, position: [snappedPoint[0], 0.5, snappedPoint[1]]}
    } else {
        return model
    }
}

const trainPlacer = (type) => (position) => {
    const train = makeTrain({ type })
    const {point, track} = closestPointOnRail([position[0], position[2]])
    if(point) {
        const derivative = track.curve.derivative(point.t)
        train.position = [point.x, 0.5, point.y]
        train.rotation = quat.setAxisAngle([], [0, 1, 0], -Math.atan2(derivative.y, derivative.x))
        train.velocity = [0, 0]
        addTrain(train)
    }
}

export const objects = {
    // track
    "track": {
        name: 'track',
        model: () => setUniforms(() => placeholderTrack.draw()),
        placer: railEndSnapper,
        create: (item) => {
            item.track = make3dTrack([0, 0], [0, 0.25], [0, 3.75], [0, 4])
        },
        post: (pos) => window.dispatchEvent(new CustomEvent('starttrackcreate', { }))
    },
    
    // trains
    "berkshire": {
        name: 'berkshire engine',
        model: () => meshes['berkshire'](),
        placer: trackSnapper,
        post: trainPlacer('berkshire')
    },
    "sw1": {
        name: 'switcher engine',
        model: () => meshes['sw1'](),
        placer: trackSnapper,
        post: trainPlacer('sw1')
    },
    "tm8": {
        name: 'tanker',
        model: () => meshes['tm8'](),
        placer: trackSnapper,
        post: trainPlacer('tm8')
    },
    "g43": {
        name: 'gondola',
        model: () => meshes['g43'](),
        placer: trackSnapper,
        post: trainPlacer('g43')
    },
    "p70": {
        name: 'passenger car',
        model: () => meshes['p70'](),
        placer: trackSnapper,
        post: trainPlacer('p70')
    },
    "x36": {
        name: 'freight car',
        model: () => meshes['x36'](),
        placer: trackSnapper,
        post: trainPlacer('x36')
    },
    "caboose": {
        name: 'caboose',
        model: () => meshes['caboose'](),
        placer: trackSnapper,
        post: trainPlacer('caboose')
    },

    // tiles
    "grass": {
        name: 'grass',
        model: (() => {const grass = drawTile('grass'); return () => grass()})(),
        placer: gridSnapper,
        zoom: 4
    },
    "gravel": {
        name: 'gravel',
        model: (() => {const gravel = drawTile('gravel'); return () => gravel()})(),
        placer: gridSnapper,
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
            objects['berkshire'],
            objects['sw1'],
            objects['tm8'],
            objects['g43'],
            objects['p70'],
            objects['x36'],
            objects['caboose']
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