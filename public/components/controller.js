import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'
import trains from './trains.js'
import edit from './edit.js'
import multiplayer from './multiplayer.js'
import trainline from './trainline.js'
import { CAMERA_MODE, setCameraMode } from '../camera.js'

const controller = (app, id) => {
    const dialog1 = dialog(app, id)
    const trainPage = trains(app, 'trains')
    const editPage = edit(app, 'edit')
    const multiplayerPage = multiplayer(app, 'multiplayer')
    const trainlinePage = trainline(app, 'trainline')

    const pageTabs = [
        { label: 'operate', page: trainPage },
        { label: 'edit', page: editPage },
        { label: 'multiplayer', page: multiplayerPage },
        { label: 'train line', page: trainlinePage },
    ]
    let activePage = pageTabs[0]
    const cameraTabs = [
        {label: 'kite', camera: CAMERA_MODE.KITE },
        {label: 'conductor', camera: CAMERA_MODE.CONDUCTOR },
        {label: 'tower', camera: CAMERA_MODE.TOWER },
        {label: 'bird', camera: CAMERA_MODE.BIRD },
    ]
    let activeCamera = cameraTabs[2]

    //let contentQueue = [pageTabs[activePage]]
    
    app.use((state, emitter) => {

    })


    return (state, emit) => {
        const setPage = (tab) => (e) => {
            //contentQueue = [tab, ...contentQueue]
            activePage = tab
            e.stopPropagation()
            emit('render')
        }

        const setCamera = (tab) => (e) => {
            activeCamera = tab
            setCameraMode(tab.camera)
            e.stopPropagation()
            emit('render')
        }

        return dialog1(state, emit, html`
            <div class="button-column left">
                ${pageTabs.map((tab, i) => html`<div class="side-button${tab === activePage ? ' active' : ''}" 
                    data-tooltip="${tab.label}" onmousedown=${setPage(tab)}></div>`)}
            </div>
            <div class="content">
                <div class="scrollable">
                    ${activePage.page(state, emit)}
                </div>
            </div>
            <div class="button-column right">
                ${cameraTabs.map((tab, i) => html`<div class="side-button${tab === activeCamera ? ' active' : ''}" 
                    data-tooltip="${tab.label}" onmousedown=${setCamera(tab)}></div>`)}
            </div>
        `)
    }
}

export default controller

/*

${contentQueue.map((tab, i) => html`
                    <div class="slider ${i === 0 ? 'in' : 'out'}">
                        ${tab.page(state, emit)}
                    </div>
                `)}

*/