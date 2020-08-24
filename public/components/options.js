import html from '../libs/nanohtml.mjs'
import { flags } from '../flags.js'
import { setPlaylist, setVolume } from '../audio.js'

const options = (app, id) => {
    app.use((state, emitter) => {

    })

    const graphicsChange = (e) => {
        flags.graphics = e.target.value === "true"
        e.stopPropagation()
    }

    const musicChange = (e) => {
        setPlaylist(e.target.value)
        e.stopPropagation()
    }

    const volumeChange = (e) => {
        setVolume(parseFloat(e.target.value))
        localStorage.setItem('volume', e.target.value)
        e.stopPropagation()
    }

    const preventDefault = (e) => {
        e.stopPropagation()
    }

    const initialVolume = localStorage.getItem('volume') ?? 0.1

    // TODO persist option selection to localstorage
    return (state, emit) => {
        return html`
            <div>
                <div>
                    <label for="graphics">graphics: </label>
                    <select id="graphics" onchange=${graphicsChange}>
                        <option value="false">lowkey minimalist aesthetic</option>
                        <option value="true">i have a nice graphics card</option>
                    </select>
                </div>
                <div>
                    <label for="music">bg music: </label>
                    <select id="music" onchange=${musicChange}>
                        <option value="rotate">rotate</option>
                        <option value="track 1">bg music 1</option>
                        <option value="track 2">bg music 2</option>
                        <option value="track 3">bg music 3</option>
                    </select>
                    <input type="range" min="0" max="0.2" step="0.01" value="${initialVolume}"
                        onmousedown=${preventDefault} oninput=${volumeChange}>
                </div>
                <div>
                    <label for="clearsave">clear save data: </label>
                    <button>press</button>
                </div>
            </div>
        `
    }
}

export default options