import html from '../libs/nanohtml.mjs'

const moveListener = (e) => {
    console.log('move')
}

const releaseHandle = (e) => {
    console.log('release')

    window.removeEventListener('mousemove', moveListener)
    window.removeEventListener('mouseup', releaseHandle)
    document.body.classList.remove('grabbing')
}

const grabHandle = (e) => {
    console.log('grab')
    
    window.addEventListener('mousemove', moveListener)
    window.addEventListener('mouseup', releaseHandle)
    document.body.classList.add('grabbing')
}

const knob = (state, emit) => {
    return html`<div class="knob">
        <svg width="80px" height="80px" viewBox="-20 -20 140 140" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tick-vis">
                    <stop offset="0%" stop-color="none" />
                    <stop offset="20%" stop-color="none" />
                    <stop offset="20%" stop-color="black" />
                    <stop offset="80%" stop-color="black" />
                    <stop offset="80%" stop-color="none" />
                    <stop offset="100%" stop-color="none" />
                </linearGradient>
            </defs>
            <circle class="ticks" cx="50" cy="50" r="50" />
            <g class="handle-group">
                <circle class="handle" cx="50" cy="50" r="40" onmousedown=${grabHandle}/>
                <line class="handle-mark" x1="50" y1="0" x2="50" y2="10"/>
            </g>
        </svg>
    </div>`
}

export default knob