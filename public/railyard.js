import { makeTrack, loadToBush } from './primitives/track.js'
import { makeTurnout } from './primitives/turnout.js'
import { makeTrain } from './primitives/train.js'
import { generateDebugArrowsForTurnout } from './primitives/debug.js'
import { quat, vec2, vec3 } from './libs/gl-matrix.mjs'
import { to_vec2 } from './utils.js'

const state = {
    tracks: [],
    turnouts: [],
    trains: []
}

state.tracks = [
    makeTrack([-1.5212394986608633,6.52423288025723],[2.893530308020223,6.583755827756361],[4.072092403155035,5.70237689801801],[6.269056365087525,2.499212173005982]),
    makeTrack([6.269056365087525,2.499212173005982],[7.827018315881437,0.22770984062164468],[7.874056816504318,-1.5243083714642491],[5.753726163243674,-4.7078036330036515]),
    makeTrack([5.753726163243674,-4.7078036330036515],[3.170369268109507,-8.586493224118952],[2.489274181964973,-9.633304998149242],[1.4018238847414608,-13.537345679516598]),
    makeTrack([1.4018238847414608,-13.537345679516598],[-2.072850802011587,-26.01172852371301],[-5.084728168841313,-25.25316713776727],[-6.973599160201271,-23.602191550510433]),
    makeTrack([-6.973599160201271,-23.602191550510433],[-10.669378368154819,-20.37188028196285],[-10.00932208729014,-16.761344649340895],[-7.163600071560495,-12.13800995845753]),
    makeTrack([-7.163600071560495,-12.13800995845753],[-3.8877424678271777,-6.815850584485436],[-3.649980979723612,-5.480705480642484],[-6.069653039512652,-2.764313112114559]),
    makeTrack([-6.069653039512652,-2.764313112114559],[-8.556983621791833,0.028034629545260703],[-9.373416936412468,1.024109559189741],[-8.988862544051113,3.06086885710051]),
    makeTrack([-8.988862544051113,3.06086885710051],[-8.448349063201698,5.923652067054527],[-5.438053028990151,6.4714237200204145],[-1.5212394986608633,6.52423288025723]),
    makeTrack([5.753726163243674,-4.7078036330036515],[3.0261235183497806,-8.803065889401662],[1.2330483601914768,-8.377079176375752],[-0.06416898140664529,-7.442568143863863]),
    makeTrack([-6.069653039512652,-2.764313112114559],[-3.600352336669205,-5.536420000594887],[-1.6006070649634374,-6.33572328925656],[-0.06416898140664529,-7.442568143863863]),
    makeTrack([-1.5212394986608633,6.52423288025723],[1.0454745150757216,6.558839074957058],[1.7709706695293512,5.455190781066316],[2.548408045286844,4.64394587035218]),
    makeTrack([2.548408045286844,4.64394587035218],[4.191371561167776,2.929536668647982],[3.93324328128526,1.9335679981352563],[2.183996395900957,0.7014740697043749]),
    makeTrack([2.183996395900957,0.7014740697043749],[0.392142488992957,-0.5606304038167944],[-1.1844046200627467,0.9779685466192962],[-2.0947999149356615,2.9208035980043867]),
    makeTrack([-2.0947999149356615,2.9208035980043867],[-3.520926002794468,5.964237331450426],[-8.51545673129992,5.568222068918594],[-8.988862544051113,3.06086885710051]),
    makeTrack([-8.988862544051113,3.06086885710051],[-9.650918986784037,-0.4456562073978003],[-10.374701678987527,-0.4183260754123239],[-12.795664698950219,-1.527881620780093]),
    makeTrack([-12.795664698950219,-1.527881620780093],[-14.465751583424934,-2.2933018889275414],[-14.015150306080088,-4.203356856055606],[-16.120564348151643,-5.500092225071322]),
    makeTrack([-16.120564348151643,-5.500092225071322],[-21.39425171460013,-8.748183477695674],[-23.012337708762566,-9.282737100960293],[-23.772916318378087,-6.802874392333617]),
    makeTrack([-23.772916318378087,-6.802874392333617],[-24.61171166387374,-4.067986412094722],[-22.07061041641694,-2.4827043931472943],[-19.757712335507918,-1.8629442377150482]),
    makeTrack([-19.757712335507918,-1.8629442377150482],[-17.646704774389928,-1.2972823155593893],[-16.382977259914764,-3.1719887435097087],[-12.795664698950219,-1.527881620780093]),
    makeTrack([-16.120564348151643,-5.500092225071322],[-19.26121450578462,-7.434434857791851],[-19.342316185350533,-9.606542763028937],[-17.670376517211302,-10.607674055102791]),
    makeTrack([-17.670376517211302,-10.607674055102791],[-14.963213316246009,-12.228680987878956],[-15.305277579085196,-12.101755430438914],[-12.684738499578149,-13.669464582143522]),
    makeTrack([-12.684738499578149,-13.669464582143522],[-8.553739756645378,-16.14078988525413],[-7.459514397155353,-15.770755295400175],[-4.8570301240048845,-14.444579906013143]),
    makeTrack([-4.8570301240048845,-14.444579906013143],[-2.29199355949104,-13.137487140907528],[-1.0126961039602698,-9.888930023377451],[1.0674397909327045,-5.467034644968415]),
    makeTrack([1.0674397909327045,-5.467034644968415],[2.843828234877943,-1.6908372004525019],[2.4591867273867356,-1.036280443693272],[-1.6532493551555927,0.27466308498260794]),
    makeTrack([-1.6532493551555927,0.27466308498260794],[-5.321320352625179,1.4439539481937178],[-7.780588281584277,-0.843568763389037],[-6.069653039512652,-2.764313112114559]),
    makeTrack([2.183996395900957,0.7014740697043749],[0.8051060805168604,-0.26975669237506816],[-0.8263318993270284,0.01106212785905819],[-1.6532493551555927,0.27466308498260794]),
]

const precise = (x) => x.toPrecision(4)
const getKey = (endpoint) => `${precise(endpoint.end[0])},${precise(endpoint.end[1])}:${precise(endpoint.facing[0])},${precise(endpoint.facing[1])}`

const detectAndFixTurnouts = () => {
    const turnoutLocations = {}
    const endpoints = state.tracks.flatMap(track => [
        {track, end: to_vec2(track.curve.get(0)), facing: vec2.normalize([], to_vec2(track.curve.derivative(0)))},
        {track, end: to_vec2(track.curve.get(1)), facing: vec2.scale([], vec2.normalize([], to_vec2(track.curve.derivative(1))), -1)}
    ])
    endpoints.forEach(endpoint => {
        const key = getKey(endpoint)
        if(turnoutLocations[key]) {
            turnoutLocations[key].push(endpoint)
        } else {
            turnoutLocations[key] = [endpoint]
        }
    })
    let added = 0
    Object.values(turnoutLocations).forEach(endpoints => {
        if(endpoints.length > 1) {
            state.turnouts.push(makeTurnout(endpoints.map(endpoint => endpoint.track), endpoints[0].end))
            added += 1
        }
    })
    console.log(`generated ${added} turnouts`)
}

const placeTrainOnTrack = (train, track) => {
    const curve = track.curve
    const point = curve.get(0.1)
    const tangent = curve.derivative(0.1)
    train.position = [point.x, 0, point.y]
    train.rotation = quat.rotationTo([], [1, 0, 0], vec3.normalize([], [tangent.x, 0, tangent.y]))
    train.speed = 0
}

export const addTrack = (track) => {
    return state.tracks.push(track) - 1
}

export const getTracks = () => state.tracks


export const addTurnout = (turnout) => {
    return state.turnouts.push(turnout) - 1
}

export const getTurnouts = () => state.turnouts


export const addTrain = (train) => {
    return state.trains.push(train) - 1
}

export const getTrains = () => state.trains

export const setTrains = (trains) => state.trains = trains

// initialize railyard state
detectAndFixTurnouts()
loadToBush(state.tracks)
state.turnouts.forEach(turnout => generateDebugArrowsForTurnout(turnout))
addTrain(makeTrain())
placeTrainOnTrack(state.trains[0], state.tracks[0])

