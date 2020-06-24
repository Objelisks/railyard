import { model } from '../model.js'
import { drawLines } from './lines.js'

// props: { position, rotation, scale, curve, color }
export const makeRenderTrack = (props) => {
    const trackL = props.curve.offset(-0.2).flatMap(curve => curve.getLUT().map(p => [p.x, -0.5, p.y]))
    const trackR = props.curve.offset(+0.2).flatMap(curve => curve.getLUT().map(p => [p.x, -0.5, p.y]))

    return () => model({
        ...props,
    }, () => {
        drawLines({
            color: props.color,
            points: trackL
        })
        drawLines({
            color: props.color,
            points: trackR
        })
    })
}
