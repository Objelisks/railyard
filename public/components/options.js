import html from '../libs/nanohtml.mjs'
import { flags } from '../flags.js'
import { setPlaylist, setVolumeMusic, setVolumeSfx } from '../audio.js'
import { setTrainColors, deleteAll } from '../railyard.js'
import { hexToRgb } from '../utils.js'

const options = (app, id) => {
    app.use((state, emitter) => {

    })

    const musicChange = (e) => {
        console.log('music change')
        setPlaylist(e.target.value)
        e.stopPropagation()
    }

    const volumeChangeMusic = (e) => {
        const newVolume = parseFloat(e.target.value)
        setVolumeMusic(newVolume)
        localStorage.setItem('volumemusic', newVolume)
        e.stopPropagation()
    }

    const volumeChangeSfx = (e) => {
        const newVolume = parseFloat(e.target.value)
        setVolumeSfx(newVolume)
        localStorage.setItem('volumesfx', newVolume)
        e.stopPropagation()
    }

    const clearData = (e) => {
        localStorage.clear()
    }

    const clearWorld = (e) => {
        deleteAll()
    }

    const preventDefault = (e) => {
        e.stopPropagation()
    }

    const editColor1 = (e) => {
        setTrainColors({color1: hexToRgb(e.target.value)})
    }
    const editColor2 = (e) => {
        setTrainColors({color2: hexToRgb(e.target.value)})
    }

    // TODO persist option selection to localstorage
    return (state, emit) => {
        const initColor1 = localStorage.getItem('color1') ?? '#ffaaaa'
        const initColor2 = localStorage.getItem('color2') ?? '#ffaaaa'
        setTrainColors({
            color1: hexToRgb(initColor1),
            color2: hexToRgb(initColor2)
        })
        const initialVolumeMusic = localStorage.getItem('volumemusic') ?? 0.1
        const initialVolumeSfx = localStorage.getItem('volumesfx') ?? 0.1
    
        return html`
            <div>
                <div class="section">
                    <label for="music">bg music: </label>
                    <select id="music" onmousedown=${preventDefault} onchange=${musicChange}>
                        <option value="rotate">rotate</option>
                        <option value="track 1">bg music 1</option>
                        <option value="track 2">bg music 2</option>
                        <option value="track 3">bg music 3</option>
                        <option value="track 4">bg music 4</option>
                    </select>
                    <input type="range" min="0" max="0.2" step="0.01" value="${initialVolumeMusic}"
                        onmousedown=${preventDefault} oninput=${volumeChangeMusic} onmouseup=${volumeChangeMusic}>
                </div>
                <div class="section">
                    <label>sfx volume: </label>
                    <input type="range" min="0" max="0.2" step="0.01" value="${initialVolumeSfx}"
                        onmousedown=${preventDefault} oninput=${volumeChangeSfx} onmouseup=${volumeChangeSfx}>
                </div>
                <div class="section">
                    <label>primary color: </label><input type="color"
                        value="${initColor1}" oninput=${editColor1}></input>
                </div>
                <div class="section">
                    <label>secondary color: </label><input type="color"
                        value="${initColor2}" oninput=${editColor2}></input>
                </div>
                <div class="section">
                    <label>clear world</label>
                    <button onmousedown=${preventDefault} onclick=${clearWorld}>boop</button>
                </div>
                <div class="section">
                    <label for="clearsave">clear save data: </label>
                    <button onmousedown=${preventDefault} onclick=${clearData}>press</button>
                </div>
            </div>
        `
    }
}

export default options