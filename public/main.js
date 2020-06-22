/* globals Choo, createREGL, Peer */

const mat4 = glMatrix.mat4
const regl = createREGL(document.body.querySelector('#canvas'))

// This scoped command sets up the camera parameters
var setupCamera = regl({
    context: {
        projection: (context) => {
            return mat4.perspective([],
                Math.PI / 4,
                context.viewportWidth / context.viewportHeight,
                0.01,
                1000.0)
        },

        view: (context, props) => {
            return mat4.lookAt([],
                props.eye,
                props.target,
                [0, 1, 0])
        },

        eye: regl.prop('eye')
    },

    uniforms: {
        view: regl.context('view'),
        invView: (context) => mat4.invert([], context.view),
        projection: regl.context('projection')
    }
})

const drawBox = regl({
    frag: `
    void main() {
      gl_FragColor = vec4(1, 0, 0, 1);
    }`,
    vert: `
    attribute vec2 position;
    uniform float angle, scale, width, height;
    void main() {
      float aspect = width / height;
      gl_Position = vec4(
        scale * (cos(angle) * position.x - sin(angle) * position.y),
        aspect * scale * (sin(angle) * position.x + cos(angle) * position.y),
        0,
        1.0);
    }`,
    attributes: {
        position: [[0, -1], [-1, 0], [1, 1]]
    },
    uniforms: {
        angle: (context, props, batchId) => {
          return props.speed * context.time + 0.01 * batchId
        },
        scale: regl.prop('scale'),
        width: regl.context('viewportWidth'),
        height: regl.context('viewportHeight'),
    },
    count: 3
})

const render = () => {
    regl.poll()
    setupCamera({
        eye: [10, 0, 0],
        target: [0, 0, 0]
    }, () => {
        drawBox({
            scale: 0.5,
            speed: 2
        })
    })
    requestAnimationFrame(render)
}
render()