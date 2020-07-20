import html from '../libs/nanohtml.mjs'
import dialog from './dialog.js'

const edit = (app, id) => {
    const dialog1 = dialog(app, id)
    
    app.use((state, emitter) => {

    })

    return (state, emit) => {
        return dialog1(state, emit, html`
        `)
    }
}

export default edit