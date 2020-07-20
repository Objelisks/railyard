import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'
import trains from './trains.js'
import edit from './edit.js'
import multiplayer from './multiplayer.js'
import trainline from './trainline.js'

// import { kite, conductor, bird, tower } from './camera.js'

const setCamera = () => {

}

const tabs = (app, id, content) => (state, emit) => {
    return html`
        ${content}
    `
}

const controller = (app, id) => {
    const dialog1 = dialog(app, id)
    // const trainPage = trains(app, 'trains')
    const editPage = edit(app, 'edit')
    // const multiplayerPage = multiplayer(app, 'multiplayer')
    // const trainlinePage = trainline(app, 'trainline')

    const pageTabs = tabs(app, 'pageTabs', [
        // trainPage,
        editPage,
        // multiplayerPage,
        // trainlinePage
    ])
    const cameraTabs = tabs(app, 'cameraTabs', [
        // setCamera(kite),
        // setCamera(conductor),
        // setCamera(bird),
        // setCamera(tower)
    ])
    
    app.use((state, emitter) => {

    })

    return (state, emit) => {
        return dialog1(state, emit, html`
            ${editPage(state, emit)}
        `)
    }
}

export default controller