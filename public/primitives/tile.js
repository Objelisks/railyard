import { meshes } from './meshes.js'

export const drawTile = (kind) => (props) => meshes['tile']({texture: kind, ...props})