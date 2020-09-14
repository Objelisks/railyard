
const trackNames = [
    './music/honey-lavender-line.mp3',
    './music/number2.mp3',
    './music/number3.mp3',
    './music/number4.mp3',
]
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
        return audioElement
    }).map(audioElement => {
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

window.addEventListener('click', function audioListener () {
    context.resume().then(() => {
        tracks.forEach(track => track.source.mediaElement.play())
        currentTrack.gain.gain.setValueAtTime(0.001, context.currentTime)
        currentTrack.gain.gain.exponentialRampToValueAtTime(currentVolume, context.currentTime + fadeTime)
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