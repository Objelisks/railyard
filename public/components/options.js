import html from '../libs/nanohtml.mjs'
import { flags } from '../flags.js'

const options = (app, id) => {
    app.use((state, emitter) => {

    })

    const graphicsChange = (e) => {
        flags.graphics = e.target.value === "true"
    }

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
                    <select id="music">
                        <option>rotate</option>
                        <option>bg music 1</option>
                        <option>bg music 2</option>
                        <option>bg music 3</option>
                    </select>
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