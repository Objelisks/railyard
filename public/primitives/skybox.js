import regl from '../regl.js'
import { cubePosition, cubeElements } from './cube.js'
import { loadCubeMap, loadEnvironment, textures } from '../reglhelpers.js'

const names = ['artist']
names.forEach((textureName) => loadCubeMap(textureName, 'skybox'))

export const drawSkybox = regl({
  frag: `
  #extension OES_texture_float_linear : enable
  #extension WEBGL_color_buffer_float : enable
  precision mediump float;
  varying vec3 WorldPos;
  
  uniform samplerCube environmentMap;
  
  void main()
  {		
      vec3 envColor = textureCube(environmentMap, WorldPos).rgb;
      
      // HDR tonemap and gamma correct
      envColor = envColor / (envColor + vec3(1.0));
      envColor = pow(envColor, vec3(1.0/2.2)); 
      
      gl_FragColor = vec4(envColor, 1.0);
  }
  `,
  vert: `
  precision mediump float;
  attribute vec3 position;
  
  uniform mat4 projection;
  uniform mat4 view;
  
  varying vec3 WorldPos;
  
  void main()
  {
      WorldPos = position;
  
      mat4 rotView = mat4(mat3(view));
      vec4 clipPos = projection * rotView * vec4(WorldPos, 1.0);
  
      gl_Position = clipPos.xyww;
  }
  `,
  attributes: {
    position: cubePosition,
  },
  elements: cubeElements,
  uniforms: {
    environmentMap: (context, props) => textures['artist'].skybox,
    view: (context) => context.view,
    projection: (context) => context.projection
  },
  depth: {
      enable: true,
      func: '<='
  }
})
