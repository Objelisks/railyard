
const trackNames = [
    './music/honey-lavender-line.mp3',
]
const context = new AudioContext()

const fadeTime = 8
let currentVolume = 0.1

let rotatorInterval = null
const rotateInterval = 60

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
    track.gain.gain.exponentialRampToValueAtTime(value, context.currentTime + fadeTime)
}

const fadeTo = (track) => {
    if(currentTrack !== track) {
        currentTrack.gain.gain.linearRampToValueAtTime(0, context.currentTime + fadeTime)
        track.gain.gain.linearRampToValueAtTime(currentVolume, context.currentTime + fadeTime)
        currentTrack = track
    }
}

export const playlistNames = [
    'rotate',
    'track 1',
    'track 2',
    'track 3',
]

export const setPlaylist = (playlistName) => {
    switch(playlistName) {
        case 'rotate': {
            clearInterval(rotatorInterval)
            rotatorInterval = setInterval(() => {
                const newTrack = Math.floor(Math.random()*tracks.length)
                fadeTo(newTrack)
            }, rotateInterval)
        }
        case 'track 1': {
            clearInterval(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[0])
            break
        }
        case 'track 2': {
            clearInterval(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[1])
            break
        }
        case 'track 3': {
            clearInterval(rotatorInterval)
            rotatorInterval = null
            fadeTo(tracks[2])
            break
        }
    }
}

window.addEventListener('click', function audioListener () {
    context.resume().then(() => {
        console.log('Playback resumed successfully')
        tracks.forEach(track => track.source.mediaElement.play())
        setVolume(0.1)
        setPlaylist('rotate')
    })
    window.removeEventListener('click', audioListener)
})