import html from '../libs/nanohtml.mjs'

const edit = (app, id) => {
    app.use((state, emitter) => {

    })

    return (state, emit) => {
        return html`
            <div>
                <div>
                    <label>train line name: </label><input type="text"></input>
                </div>
                <div>
                    <label>primary color: </label><input type="color"></input>
                </div>
                <div>
                    <label>secondary color: </label><input type="color"></input>
                </div>
            </div>
        `
    }
}

export default edit