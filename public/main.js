import regl from './regl.js'
import choo from './libs/choo.mjs'
import { vec3 } from './libs/gl-matrix.mjs'
import controller from './components/controller.js'
import intro from './components/intro.js'
import { drawDebugPoints, drawDebugArrows } from './primitives/debug.js'
import { drawTrain, attemptConnections, gatherForces, applyForces, makeTrain } from './primitives/train.js'
import { drawTurnout } from './primitives/turnout.js'
import { drawSkybox } from './primitives/skybox.js'
import { makeTrack } from './primitives/track.js'
import { floor } from './primitives/floor.js'
import { createTrackTool } from './tools/createTrack.js'
import { playModeTool } from './tools/playMode.js'
import { tiltShiftEffect } from './shaders/tiltshift.js'
import { camera, getCameraPos, getCameraDir, getCameraDistance, cameraControlTool } from './camera.js'
import { addTrack, getTracks, getTurnouts, addTrain, getTrains } from './railyard.js'
import { placeTrainOnTrack, detectAndFixTurnouts } from './railyardhelpers.js'
import { networkedTrainTool } from './network.js'
import { mouseListenerTool, getMouse3d, getDragItem } from './mouse.js'
import { loadToTrackBush } from './raycast.js'
import { flags } from './flags.js'
import { waitingOn } from './reglhelpers.js'
import { drawTile } from './primitives/tile.js'
import { setUniforms, model } from './primitives/model.js'


import { parse } from './libs/loaders.gl-core.mjs'
import { GLTFLoader } from './libs/loaders.gl-gltf.mjs'
import { drawMesh, buildMesh } from './primitives/mesh.js'

let drawCliff = () => {}
parse(fetch('./models/cliff.gltf'), GLTFLoader).then(data => {
    const meshData = data.meshes[0].primitives[0]
    const mesh = buildMesh({
        position: meshData.attributes.POSITION.value,
        normal: meshData.attributes.NORMAL.value,
        uv: meshData.attributes.TEXCOORD_0.value,
        elements: meshData.indices.value
    })
    drawCliff = drawMesh(mesh, 'rockcliff')
})

let dragItem = null
let addedObjects = []

// debug keyboard listener
window.addEventListener('keypress', (e) => {
    if(e.key === '1') {
        // getTurnouts().forEach(turnout => {
        //     toggleTurnout(turnout)
        // })
    }
    if(e.key === '2') {
        getTracks().forEach((track, i) => {
            console.log(`track ${i}`, JSON.stringify(track.points))
        })
        getTurnouts().forEach((turnout, i) => {
            console.log(`turnout ${i}`, JSON.stringify(turnout.tracks.map(track => getTracks().findIndex(search => search.id === track.id))))
        })
    }
    if(e.key === '3') {
        flags.stepMode = !flags.stepMode
    }
    if(e.key === '4') {
        render()
    }
})


// set up frame buffers
const makeFrameBuffer = (width, height) => {
    const color = regl.texture({
        width: width,
        height: height,
    })
    const depth = regl.texture({
        width: width,
        height: height,
        format: 'depth', 
        type: 'uint32'
    })
    return {
        fbo: regl.framebuffer({
            width: width,
            height: height,
            color: color,
            depth: depth,
            depthTexture: true
        }),
        color,
        depth
    }
}

let frame1 = makeFrameBuffer(window.innerWidth, window.innerHeight)
let frame2 = makeFrameBuffer(window.innerWidth, window.innerHeight)

let flip = false
const getFbo = () => flip ? frame2 : frame1
const getOtherFbo = () => flip ? frame1 : frame2


const resizer = () => {
    frame1 = makeFrameBuffer(window.innerWidth, window.innerHeight)
    frame2 = makeFrameBuffer(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', resizer)

// setup tools
let toolset = new Set()

const setTool = (tool, active) => {
    if(active) {
        toolset.add(tool)
        if(tool.activate) tool.activate()
        Object.entries(tool).forEach(([key, callback]) => {
            window.addEventListener(key, callback)
        })
    } else {
        toolset.delete(tool)
        if(tool.deactivate) tool.deactivate()
        Object.entries(tool).forEach(([key, callback]) => {
            window.removeEventListener(key, callback)
        })
    }
}

// TODO: deterministic ordering of tools
const toggleTool = (tool) => setTool(tool, !toolset.has(tool))
setTool(mouseListenerTool, true)
setTool(playModeTool, true)
setTool(cameraControlTool, false)
setTool(networkedTrainTool, true)

const drawFloor = floor()

const delta = 1/60

const render = () => {
    regl.poll()

    /// update time ///

    window.dispatchEvent(new CustomEvent('preupdate'))

    // set up camera
    const draw = () => {
        const cameraTarget = toolset.has(createTrackTool) ? vec3.add([], getCameraPos(), getCameraDir()) : getTrains()[0].position
        const cameraPos = toolset.has(createTrackTool) ? vec3.add([], cameraTarget, vec3.scale([], vec3.normalize([], vec3.sub([], getCameraPos(), cameraTarget)), getCameraDistance())) : getCameraPos()
        camera({
            eye: cameraPos,
            target: cameraTarget
        }, (context) => {

            window.dispatchEvent(new CustomEvent('update', {detail: context}))

            // move all trains
            // TODO: process collision
            getTrains().forEach(train => {
                train.force = [0, 0]
                gatherForces(train, delta)
            })
            getTrains().forEach(train => {
                applyForces(train, delta)
                attemptConnections(train)
            })

            window.dispatchEvent(new CustomEvent('postupdate', {detail: context}))

            /// drawing time ///

            window.dispatchEvent(new CustomEvent('prerender', {detail: context}))

            regl.clear({
                depth: 1,
                stencil: 1
            })

            window.dispatchEvent(new CustomEvent('render', {detail: context}))

            // render trains
            drawTrain(getTrains())

            // render tracks
            getTracks().forEach(track => track.draw(track))
            
            // render turnouts
            getTurnouts().forEach(turnout => drawTurnout({
                position: vec3.add([], [turnout.point[0], -1, turnout.point[1]], [turnout.facing[0], 0, turnout.facing[1]]),
                scale: [2, 1, 2],
                color: turnout.visible ? [0.99, 0.99, 0.58] : [0.58, 0.58, 0.58]
            }))

            // drawCliff({
            //     position: [-10, -1, 0],
            //     rotation: [0, 0, 0, 1]
            // })

            if(dragItem) {
                const mouse3d = getMouse3d()
                
                setUniforms({
                    position: mouse3d
                }, () =>
                    dragItem.model())
            }

            addedObjects.forEach(obj => 
                setUniforms({
                    position: obj.position
                }, () => obj.model())
            )

            // render debug
            drawDebugPoints()
            drawDebugArrows()

            drawFloor()

            // drawTile({
            //     scale: [10, 1, 10]
            // })
            // drawTile({
            //     position: [20, 0, 0],
            //     scale: [10, 1, 10]
            // })

            drawSkybox()

            window.dispatchEvent(new CustomEvent('postrender', {detail: context}))
        })
    }
    
    // wait for all resources to load
    // TODO: loading screen
    if(waitingOn.count === 0) {
        const passes = [
            // render the scene normally offscreen on the first buffer
            () => draw(),

            // post process effects
            () => tiltShiftEffect({
                color: getOtherFbo().color,
                depth: getOtherFbo().depth,
                bias: [1, 0] // vertical blur
            }),
            () => tiltShiftEffect({
                color: getOtherFbo().color,
                depth: getOtherFbo().depth,
                bias: [0, 1] // horizontal blur
            }),
            //() => fxaaPass({ color: getOtherFbo().color })
        ]

        // render (double buffered) with last frame going to the screen
        passes.forEach((renderPass, i) => {
            if(i !== passes.length-1) {
                getFbo().fbo.use(renderPass)
                flip = !flip
            } else {
                renderPass()
            }
        })
    }

    if(!flags.stepMode) {
        requestAnimationFrame(render)
    }
}


// setup choo routing
const setupChoo = () => {
    const app = choo({
        href: false
    })

    // initialize
    app.route('/trains', controller(app, 'controller'))
    app.route('*', intro(app, 'intro'))

    const chooMount = document.createElement('div')
    chooMount.id = 'choo'
    document.body.appendChild(chooMount)
    app.mount('#choo')

    // setup event handlers for controls
    app.use((state, emitter) => {
        // initialize state here?

        // listen to the button event
        emitter.on('flipper', ({id, data}) => {
            if(id === 'flipper1') {
                setTool(createTrackTool, data)
                setTool(cameraControlTool, data)
            }
        })

        emitter.on('setDragItem', (item) => {
            dragItem = item
        })

        emitter.on('dropDragged', () => {
            const mouse3d = getMouse3d()
            
            addedObjects.push({...dragItem, position: mouse3d})
            emitter.emit('setDragItem', null)
        })
    })
}


// start
setupChoo()
requestAnimationFrame(render)

console.log('hello world')


// initialize railyard state
addTrack(makeTrack([-1.5212394986608633,6.52423288025723],[2.893530308020223,6.583755827756361],[4.072092403155035,5.70237689801801],[6.269056365087525,2.499212173005982]))
addTrack(makeTrack([6.269056365087525,2.499212173005982],[7.827018315881437,0.22770984062164468],[7.874056816504318,-1.5243083714642491],[5.753726163243674,-4.7078036330036515]))
addTrack(makeTrack([5.753726163243674,-4.7078036330036515],[3.170369268109507,-8.586493224118952],[2.489274181964973,-9.633304998149242],[1.4018238847414608,-13.537345679516598]))
addTrack(makeTrack([1.4018238847414608,-13.537345679516598],[-2.072850802011587,-26.01172852371301],[-5.084728168841313,-25.25316713776727],[-6.973599160201271,-23.602191550510433]))
addTrack(makeTrack([-6.973599160201271,-23.602191550510433],[-10.669378368154819,-20.37188028196285],[-10.00932208729014,-16.761344649340895],[-7.163600071560495,-12.13800995845753]))
addTrack(makeTrack([-7.163600071560495,-12.13800995845753],[-3.8877424678271777,-6.815850584485436],[-3.649980979723612,-5.480705480642484],[-6.069653039512652,-2.764313112114559]))
addTrack(makeTrack([-6.069653039512652,-2.764313112114559],[-8.556983621791833,0.028034629545260703],[-9.373416936412468,1.024109559189741],[-8.988862544051113,3.06086885710051]))
addTrack(makeTrack([-8.988862544051113,3.06086885710051],[-8.448349063201698,5.923652067054527],[-5.438053028990151,6.4714237200204145],[-1.5212394986608633,6.52423288025723]))
addTrack(makeTrack([5.753726163243674,-4.7078036330036515],[3.0261235183497806,-8.803065889401662],[1.2330483601914768,-8.377079176375752],[-0.06416898140664529,-7.442568143863863]))
addTrack(makeTrack([-6.069653039512652,-2.764313112114559],[-3.600352336669205,-5.536420000594887],[-1.6006070649634374,-6.33572328925656],[-0.06416898140664529,-7.442568143863863]))
addTrack(makeTrack([-1.5212394986608633,6.52423288025723],[1.0454745150757216,6.558839074957058],[1.7709706695293512,5.455190781066316],[2.548408045286844,4.64394587035218]))
addTrack(makeTrack([2.548408045286844,4.64394587035218],[4.191371561167776,2.929536668647982],[3.93324328128526,1.9335679981352563],[2.183996395900957,0.7014740697043749]))
addTrack(makeTrack([2.183996395900957,0.7014740697043749],[0.392142488992957,-0.5606304038167944],[-1.1844046200627467,0.9779685466192962],[-2.0947999149356615,2.9208035980043867]))
addTrack(makeTrack([-2.0947999149356615,2.9208035980043867],[-3.520926002794468,5.964237331450426],[-8.51545673129992,5.568222068918594],[-8.988862544051113,3.06086885710051]))
addTrack(makeTrack([-8.988862544051113,3.06086885710051],[-9.650918986784037,-0.4456562073978003],[-10.374701678987527,-0.4183260754123239],[-12.795664698950219,-1.527881620780093]))
addTrack(makeTrack([-12.795664698950219,-1.527881620780093],[-14.465751583424934,-2.2933018889275414],[-14.015150306080088,-4.203356856055606],[-16.120564348151643,-5.500092225071322]))
addTrack(makeTrack([-16.120564348151643,-5.500092225071322],[-21.39425171460013,-8.748183477695674],[-23.012337708762566,-9.282737100960293],[-23.772916318378087,-6.802874392333617]))
addTrack(makeTrack([-23.772916318378087,-6.802874392333617],[-24.61171166387374,-4.067986412094722],[-22.07061041641694,-2.4827043931472943],[-19.757712335507918,-1.8629442377150482]))
addTrack(makeTrack([-19.757712335507918,-1.8629442377150482],[-17.646704774389928,-1.2972823155593893],[-16.382977259914764,-3.1719887435097087],[-12.795664698950219,-1.527881620780093]))
addTrack(makeTrack([-16.120564348151643,-5.500092225071322],[-19.26121450578462,-7.434434857791851],[-19.342316185350533,-9.606542763028937],[-17.670376517211302,-10.607674055102791]))
addTrack(makeTrack([-17.670376517211302,-10.607674055102791],[-14.963213316246009,-12.228680987878956],[-15.305277579085196,-12.101755430438914],[-12.684738499578149,-13.669464582143522]))
addTrack(makeTrack([-12.684738499578149,-13.669464582143522],[-8.553739756645378,-16.14078988525413],[-7.459514397155353,-15.770755295400175],[-4.8570301240048845,-14.444579906013143]))
addTrack(makeTrack([-4.8570301240048845,-14.444579906013143],[-2.29199355949104,-13.137487140907528],[-1.0126961039602698,-9.888930023377451],[1.0674397909327045,-5.467034644968415]))
addTrack(makeTrack([1.0674397909327045,-5.467034644968415],[2.843828234877943,-1.6908372004525019],[2.4591867273867356,-1.036280443693272],[-1.6532493551555927,0.27466308498260794]))
addTrack(makeTrack([-1.6532493551555927,0.27466308498260794],[-5.321320352625179,1.4439539481937178],[-7.780588281584277,-0.843568763389037],[-6.069653039512652,-2.764313112114559]))
addTrack(makeTrack([2.183996395900957,0.7014740697043749],[0.8051060805168604,-0.26975669237506816],[-0.8263318993270284,0.01106212785905819],[-1.6532493551555927,0.27466308498260794]))

detectAndFixTurnouts()
loadToTrackBush(getTracks())
addTrain(makeTrain({ powered: false }))
addTrain(makeTrain())
addTrain(makeTrain())
addTrain(makeTrain())
getTrains().forEach((train, i) => placeTrainOnTrack(train, getTracks()[i]))