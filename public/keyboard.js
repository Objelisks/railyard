import regl from './regl.js'

const keysPressedStore = {}

window.addEventListener('keydown', (e) => keysPressedStore[e.key] = regl.now())
window.addEventListener('keyup', (e) => delete keysPressedStore[e.key])

export const keysPressed = () => keysPressedStore