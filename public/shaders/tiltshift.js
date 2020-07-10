import regl from '../regl.js'
import { WIDTH, HEIGHT } from '../constants.js'

// blur from https://github.com/Jam3/glsl-fast-gaussian-blur
export const tiltShiftEffect = regl({
    frag: `
    precision mediump float;
    uniform sampler2D color;
    uniform sampler2D depth;
    uniform vec2 bias;

    float PI = 3.1415;
    vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.411764705882353) * direction;
        vec2 off2 = vec2(3.2941176470588234) * direction;
        vec2 off3 = vec2(5.176470588235294) * direction;
        color += texture2D(image, uv) * 0.1964825501511404;
        color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
        color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
        color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
        color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
        color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
        color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
        return color;
      }

    float linearize_depth(float original_depth) {
        float near = 0.1;
        float far = 100.0;
        return (2.0 * near) / (far + near - original_depth * (far - near));
    }

    void main () {
        vec2 resolution = vec2(${WIDTH}.0, ${HEIGHT}.0);
        float focusDepth = linearize_depth(texture2D(depth, vec2(0.5, 0.5)).r);
        float coordDepth = linearize_depth(texture2D(depth, gl_FragCoord.xy / resolution).r);
        float blurAmount = coordDepth > 0.9999 ? 0.0 : abs(focusDepth - coordDepth) * 10.0;
        gl_FragColor = blur13(color, gl_FragCoord.xy / resolution, resolution, bias*blurAmount);
    }`,
    vert: `
    precision mediump float;
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }`,
    attributes: {
        position: [[-10, -10],  [-10, 10],  [10, -10],  [10, 10]]
    },
    uniforms: {
        color: (context, props) => props.color,
        depth: (context, props) => props.depth,
        bias: (context, props) => props.bias
    },
    elements: [[0, 1, 2],  [2, 1, 3]],
    depth: {
        enable: false
    }
})