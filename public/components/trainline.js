import html from '../libs/nanohtml.mjs'
import { setTrainColors } from '../railyard.js'
import { hexToRgb } from '../utils.js'
import { playEffect } from '../audio.js'

const edit = (app, id) => {
    const editColor1 = (e) => {
        setTrainColors({color1: hexToRgb(e.target.value)})
    }
    const editColor2 = (e) => {
        setTrainColors({color2: hexToRgb(e.target.value)})
    }
    const keypress = (e) => {
        playEffect('textEntry')
        e.stopPropagation()
    }

    return (state, emit) => {
        const initColor1 = localStorage.getItem('color1') ?? '#ffaaaa'
        const initColor2 = localStorage.getItem('color2') ?? '#ffaaaa'
        setTrainColors({
            color1: hexToRgb(initColor1),
            color2: hexToRgb(initColor2)
        })
        return html`
            <div>
                <div>
                    <label>train line name: </label><input type="text" oninput=${keypress} 
                        onmousedown=${(e) => e.stopPropagation()}
                        onkeyup=${(e) => e.stopPropagation()}
                        onkeydown=${(e) => e.stopPropagation()}></input>
                </div>
                <div>
                    <label>primary color: </label><input type="color"
                        value="${initColor1}" oninput=${editColor1}></input>
                </div>
                <div>
                    <label>secondary color: </label><input type="color"
                        value="${initColor2}" oninput=${editColor2}></input>
                </div>
            </div>
        `
    }
}

export default edit