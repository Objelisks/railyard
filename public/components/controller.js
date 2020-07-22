import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'
import trains from './trains.js'
import edit from './edit.js'
import multiplayer from './multiplayer.js'
import trainline from './trainline.js'
// import { kite, conductor, bird, tower } from './camera.js'

const controller = (app, id) => {
    const dialog1 = dialog(app, id)
    const trainPage = trains(app, 'trains')
    const editPage = edit(app, 'edit')
    const multiplayerPage = multiplayer(app, 'multiplayer')
    // const trainlinePage = trainline(app, 'trainline')

    const pageTabs = [
        { label: 'operate', page: trainPage },
        { label: 'edit', page: editPage },
        { label: 'multiplayer', page: multiplayerPage },
        // trainlinePage
    ]
    let activePage = pageTabs[0]
    const cameraTabs = [
        //{label: 'kite', camera: kite },
        //{label: 'conductor', camera: conductor },
        //{label: 'bird', camera: bird },
        //{label: 'tower', camera: tower },
    ]

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
            e.stopPropagation()
            emit('render')
        }

        return dialog1(state, emit, html`
            <div class="button-column left">
                ${pageTabs.map((tab, i) => html`<div class="side-button" 
                    data-tooltip="${tab.label}" onmousedown=${setPage(tab)}></div>`)}
            </div>
            <div class="content">
                ${activePage.page(state, emit)}
            </div>
            <div class="button-column right">
                ${cameraTabs.map((tab, i) => html`<div class="side-button" 
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