import html from '../libs/nanohtml.mjs'
import { inventory as editInventory } from './editInventory.js'
import { thumbnailButton } from './editThumbnail.js'

const edit = (app, id) => {
    const sections = editInventory.map((section, j) => ({
        name: section.name,
        items: section.items.map((item, i) => thumbnailButton(`thumb-${i}-${j}`, item))
    }))
        
    return (state, emit) => {
        return html`
            <div class="section buttonCorral">
                ${sections.map(section => html`
                <span class="sectionTitle">${section.name}</span>
                <div class="buttonSection">
                    ${section.items.map((item, i) => item(state, emit))}
                </div>`)}
            </div>
        `
    }
}

export default edit