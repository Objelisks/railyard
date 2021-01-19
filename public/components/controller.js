import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'
import trains from './trains.js'
import edit from './edit.js'
import multiplayer from './multiplayer.js'
import options from './options.js'
import { CAMERA_MODE, setCameraMode, getCameraMode } from '../camera.js'
import { playEffect } from '../audio.js'

const controller = (app, id) => {
    const dialog1 = dialog(app, id)
    const trainPage = trains(app, 'trains')
    const editPage = edit(app, 'edit')
    const multiplayerPage = multiplayer(app, 'multiplayer')
    const optionsPage = options(app, 'options')

    const pageTabs = [
        { label: 'operate', page: trainPage },
        { label: 'edit', page: editPage },
        { label: 'multiplayer', page: multiplayerPage },
        { label: 'options', page: optionsPage },
    ]
    let activePage = pageTabs[0]
    const cameraTabs = [
        { label: 'kite', camera: CAMERA_MODE.KITE },
        { label: 'conductor', camera: CAMERA_MODE.CONDUCTOR },
        { label: 'tower', camera: CAMERA_MODE.TOWER },
        { label: 'bird', camera: CAMERA_MODE.BIRD },
    ]
    let activeCamera = cameraTabs.find(x => x.camera === getCameraMode())


    return (state, emit) => {

        const leftColumnButtonDown = (tab) => (e) => {
            playEffect('leftColumnButton')
            activePage = tab
            emit('render')
            e.stopPropagation()
        }

        const rightColumnButtonDown = (tab) => (e) => {
            playEffect('rightColumnButton')
            activeCamera = tab
            setCameraMode(tab.camera)
            emit('render')
            e.stopPropagation()
        }

        const columnButtonUp = (e) => {
            playEffect('columnButtonRelease', 100)
        }

        return dialog1(state, emit, html`
            <div class="button-column left">
                ${pageTabs.map((tab, i) => html`<div class="side-button${tab === activePage ? ' active' : ''}" 
                    data-tooltip="${tab.label}" onmousedown=${leftColumnButtonDown(tab)} onmouseup=${columnButtonUp}></div>`)}
            </div>
            <div class="content">
                <div class="scrollable">
                    ${activePage.page(state, emit)}
                </div>
            </div>
            <div class="button-column right">
                ${cameraTabs.map((tab, i) => html`<div class="side-button${tab === activeCamera ? ' active' : ''}" 
                    data-tooltip="${tab.label}" onmousedown=${rightColumnButtonDown(tab)} onmouseup=${columnButtonUp}></div>`)}
            </div>
        `)
    }
}

export default controller
