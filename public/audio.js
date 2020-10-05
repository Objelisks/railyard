
const trackNames = [
    './music/honey-lavender-line.mp3',
    './music/number2.mp3',
    './music/number3.mp3',
    './music/number4.mp3',
]
const soundEffects = {
    'holding': './music/sfx/Floating Object.mp3',//
    'genericButton': './music/sfx/Focus Button.mp3',
    'textEntry': './music/sfx/Focus Text.mp3',
    'leftColumnButton': './music/sfx/MenuButtA_ON.mp3',
    'rightColumnButton': './music/sfx/MenubuttLeft_ON.mp3',
    'columnButtonRelease': './music/sfx/MenubuttRight_OFF.mp3',
    'pushButtonDown': './music/sfx/PowerButton_ON.mp3',
    'pushButtonUp': './music/sfx/PowerButton_OFF.mp3',
    'editHover': './music/sfx/Slide Out.mp3',
    'editLeave': './music/sfx/Slide Back.mp3',
    'trackChange': './music/sfx/Track Change.mp3',//
    'trainAttachA': './music/sfx/Train Attach A.mp3',//
    'trainAttachB': './music/sfx/Train Attach B.mp3',//
    'trainMoving': './music/sfx/Train Moving.mp3'//
}
const context = new AudioContext()

const fadeTime = 3
const initialVolume = localStorage.getItem('volume') ?? 0.1
let currentVolume = initialVolume

let rotatorInterval = null
const rotateInterval = 60 * 1000

const tracks = trackNames.map(trackName => {
        const audioElement = document.createElement('audio')
        audioElement.src = trackName
        audioElement.loop = true
        const source = context.createMediaElementSource(audioElement)
        const gain = context.createGain()
        gain.gain.setValueAtTime(0, context.currentTime)
        source.connect(gain)
        gain.connect(context.destination)
        return {
            name: audioElement.src,
            source,
            gain
        }
    })
let currentTrack = tracks[0]


const effectsGain = context.createGain()
effectsGain.gain.setValueAtTime(0.5, context.currentTime)
effectsGain.connect(context.destination)

const effects = {}
Object.entries(soundEffects).forEach(([key, value]) => {
    fetch(value).then((response) => response.arrayBuffer()).then((arrayBuffer) => {
        context.decodeAudioData(arrayBuffer, (buffer) => {
            effects[key] = buffer
        })
    })
})

export const setVolume = (value, track=currentTrack) => {
    currentVolume = value
    if(value === 0) {
        value = 0.001
    }
    if(track.gain.gain.value <= 0) {
        track.gain.gain.setValueAtTime(0.001, context.currentTime)
    }
    track.gain.gain.exponentialRampToValueAtTime(value, context.currentTime + 0.5)
}

const fadeTo = (track) => {
    if(currentTrack !== track) {
        currentTrack.gain.gain.cancelScheduledValues(context.currentTime)
        currentTrack.gain.gain.linearRampToValueAtTime(currentVolume, context.currentTime)
        currentTrack.gain.gain.linearRampToValueAtTime(0, context.currentTime + fadeTime)
        track.gain.gain.cancelScheduledValues(context.currentTime)
        track.gain.gain.linearRampToValueAtTime(0, context.currentTime + fadeTime-1)
        track.gain.gain.linearRampToValueAtTime(currentVolume, context.currentTime + fadeTime-1 + fadeTime)
        currentTrack = track
    }
}

export const playlistNames = [
    'rotate',
    'track 1',
    'track 2',
    'track 3',
    'track 4'
]

const scheduleTrackSwitch = () => {
    clearTimeout(rotatorInterval)
    rotatorInterval = setTimeout(() => {
        const newTrack = Math.floor(Math.random()*tracks.length)
        fadeTo(tracks[newTrack])
        scheduleTrackSwitch()
    }, rotateInterval)
}

export const setPlaylist = (playlistName) => {
    switch(playlistName) {
        case 'rotate': {
            scheduleTrackSwitch()
            break
        }
        case 'track 1': {
            clearTimeout(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[0])
            break
        }
        case 'track 2': {
            clearTimeout(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[1])
            break
        }
        case 'track 3': {
            clearTimeout(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[2])
            break
        }
        case 'track 4': {
            clearTimeout(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[3])
            break
        }
    }
}

export const playEffect = (effectName, delay=0) => {
    const effect = effects[effectName]
    if(effect) {
        const source = context.createBufferSource()
        source.buffer = effects[effectName]
        source.connect(effectsGain)
        source.start(context.currentTime + delay / 1000)
    }
}

window.addEventListener('click', function audioListener () {
    context.resume().then(() => {
        tracks.forEach(track => track.source.mediaElement.play())
        currentTrack.gain.gain.setValueAtTime(0.001, context.currentTime)
        currentTrack.gain.gain.linearRampToValueAtTime(currentVolume, context.currentTime + fadeTime)
        setPlaylist('rotate')
    })
    window.removeEventListener('click', audioListener)
})

/*
snd fx

train whistle - choo/ choo/
steam engine goin' - chugga chugga chugga chugga
wheels sets over bumps - d'dch' d'dch'
steam release - p'tsssssh psssss shhhhhhhh
connecting cars - tink tink
ui sounds:
    side button press: *softly* boop
    dial tick: t'ck
    on/off button: bomp/ bomp\
    drag from edit page: fffwp
*/