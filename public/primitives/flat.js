import regl from '../regl.js'
import { reglArg } from '../utils.js'
import { mat3, mat4 } from '../libs/gl-matrix.mjs'

export const drawFlat = regl({
  frag: `
    precision mediump float;
    varying vec3 vPos;
    varying vec3 vNormal;
    uniform vec3 color;
    uniform vec3 camPos;
    void main () {
        vec3 lightColor = vec3(1.0, 1.0, 1.0);
        vec3 lightPos = vec3(100.0, 100.0, 100.0);

        vec3 lightDir = normalize(lightPos - vPos);
        
        vec3 ambient = 0.3 * lightColor;

        float diffuseContribution = max(dot(vNormal, lightDir), 0.0);
        vec3 diffuse = 0.7 * diffuseContribution * lightColor;
        
        vec3 viewDir = normalize(camPos - vPos);
        vec3 reflectDir = reflect(-lightDir, vNormal);

        float specularContribution = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = 0.2 * specularContribution * lightColor;

        vec3 result = color * (ambient + diffuse + specular);

        gl_FragColor = vec4(result, 1.0);
    }`,
  vert: `
    precision mediump float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 projection, model, view;
    uniform mat3 normalMatrix;
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
        vPos = vec3(model * vec4(position, 1.0));
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projection * view * model * vec4(position, 1.0);
    }`,
  uniforms: {
      color: (context, props) => reglArg('color', [1, 0, 0], context, props),
      normalMatrix: (context) => mat3.fromMat4([], mat4.transpose([], mat4.invert([], context.model))),
      camPos: (context) => context.eye,
  }
})