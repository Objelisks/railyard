import regl from '../regl.js'
import resl from '../libs/resl.mjs'
import { reglArg } from '../utils.js'
import { model } from './model.js'

export const cubePosition = [
  [-0.5, 0, -0.5], [+0.5, 0, -0.5], [+0.5, 0, +0.5], [-0.5, 0, +0.5], // top face
]

export const cubeNormal = [
[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], // top face
]

const tile = 2.0
export const cubeUv = [
  [0.0, 0.0], [tile, 0.0], [tile, tile], [0.0, tile], // top face
]

export const cubeElements = [
  [2, 1, 0], [2, 0, 3],       // top face.
]

const res = 512
const init = { radius: res, wrapS: 'repeat', wrapT: 'repeat' }
const albedoMap = regl.texture(init)
const normalMap = regl.texture(init)
const metallicMap = regl.texture(init)
const roughnessMap = regl.texture(init)
const aoMap = regl.texture(init)

resl({
    manifest: {
        albedo: {
            type: 'image',
            src: '/materials/table/table_basecolor.png'
        },
        normal: {
            type: 'image',
            src: '/materials/table/table_normal.png'
        },
        metallic: {
            type: 'image',
            src: '/materials/table/table_metallic.png'
        },
        roughness: {
            type: 'image',
            src: '/materials/table/table_roughness.png'
        },
        ao: {
            type: 'image',
            src: '/materials/table/table_ambientocclusion.png'
        }
    },
    onDone: (assets) => {
        albedoMap({
            ...init,
            data: assets.albedo
        })
        normalMap({
            ...init,
            data: assets.normal
        })
        metallicMap({
            ...init,
            data: assets.metallic
        })
        roughnessMap({
            ...init,
            data: assets.roughness
        })
        aoMap({
            ...init,
            data: assets.ao
        })
    }
})


const drawPlane = regl({
  frag: `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  varying vec2 TexCoords;
  varying vec3 WorldPos;
  varying vec3 Normal;
  
  // material parameters
  uniform sampler2D albedoMap;
  uniform sampler2D normalMap;
  uniform sampler2D metallicMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D aoMap;
  
  // lights
  uniform vec3 lightPositions[4];
  uniform vec3 lightColors[4];

  uniform vec3 camPos;
  
  const float PI = 3.14159265359;
  // ----------------------------------------------------------------------------
  // Easy trick to get tangent-normals to world-space to keep PBR code simplified.
  // Don't worry if you don't get what's going on; you generally want to do normal 
  // mapping the usual way for performance anways; I do plan make a note of this 
  // technique somewhere later in the normal mapping tutorial.
  vec3 getNormalFromMap()
  {
      vec3 tangentNormal = texture2D(normalMap, TexCoords).xyz * 2.0 - 1.0;
  
      vec3 Q1  = dFdx(WorldPos);
      vec3 Q2  = dFdy(WorldPos);
      vec2 st1 = dFdx(TexCoords);
      vec2 st2 = dFdy(TexCoords);
  
      vec3 N   = normalize(Normal);
      vec3 T  = normalize(Q1*st2.t - Q2*st1.t);
      vec3 B  = -normalize(cross(N, T));
      mat3 TBN = mat3(T, B, N);
  
      return normalize(TBN * tangentNormal);
  }
  // ----------------------------------------------------------------------------
  float DistributionGGX(vec3 N, vec3 H, float roughness)
  {
      float a = roughness*roughness;
      float a2 = a*a;
      float NdotH = max(dot(N, H), 0.0);
      float NdotH2 = NdotH*NdotH;
  
      float nom   = a2;
      float denom = (NdotH2 * (a2 - 1.0) + 1.0);
      denom = PI * denom * denom;
  
      return nom / denom;
  }
  // ----------------------------------------------------------------------------
  float GeometrySchlickGGX(float NdotV, float roughness)
  {
      float r = (roughness + 1.0);
      float k = (r*r) / 8.0;
  
      float nom   = NdotV;
      float denom = NdotV * (1.0 - k) + k;
  
      return nom / denom;
  }
  // ----------------------------------------------------------------------------
  float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
  {
      float NdotV = max(dot(N, V), 0.0);
      float NdotL = max(dot(N, L), 0.0);
      float ggx2 = GeometrySchlickGGX(NdotV, roughness);
      float ggx1 = GeometrySchlickGGX(NdotL, roughness);
  
      return ggx1 * ggx2;
  }
  // ----------------------------------------------------------------------------
  vec3 fresnelSchlick(float cosTheta, vec3 F0)
  {
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }
  // ----------------------------------------------------------------------------
  void main()
  {		
      vec3 albedo     = pow(texture2D(albedoMap, TexCoords).rgb, vec3(2.2));
      float metallic  = texture2D(metallicMap, TexCoords).r;
      float roughness = texture2D(roughnessMap, TexCoords).r;
      float ao        = texture2D(aoMap, TexCoords).r;
  
      vec3 N = getNormalFromMap();
      vec3 V = normalize(camPos - WorldPos);
  
      // calculate reflectance at normal incidence; if dia-electric (like plastic) use F0 
      // of 0.04 and if it's a metal, use the albedo color as F0 (metallic workflow)    
      vec3 F0 = vec3(0.04); 
      F0 = mix(F0, albedo, metallic);
  
      // reflectance equation
      vec3 Lo = vec3(0.0);
      for(int i = 0; i < 4; ++i)
      {
          // calculate per-light radiance
          vec3 L = normalize(lightPositions[i] - WorldPos);
          vec3 H = normalize(V + L);
          float distance = length(lightPositions[i] - WorldPos);
          float attenuation = 1.0 / (distance * distance);
          vec3 radiance = lightColors[i] * attenuation;
  
          // Cook-Torrance BRDF
          float NDF = DistributionGGX(N, H, roughness);   
          float G   = GeometrySmith(N, V, L, roughness);      
          vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);
             
          vec3 nominator    = NDF * G * F; 
          float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001; // 0.001 to prevent divide by zero.
          vec3 specular = nominator / denominator;
          
          // kS is equal to Fresnel
          vec3 kS = F;
          // for energy conservation, the diffuse and specular light can't
          // be above 1.0 (unless the surface emits light); to preserve this
          // relationship the diffuse component (kD) should equal 1.0 - kS.
          vec3 kD = vec3(1.0) - kS;
          // multiply kD by the inverse metalness such that only non-metals 
          // have diffuse lighting, or a linear blend if partly metal (pure metals
          // have no diffuse light).
          kD *= 1.0 - metallic;	  
  
          // scale light by NdotL
          float NdotL = max(dot(N, L), 0.0);        
  
          // add to outgoing radiance Lo
          Lo += (kD * albedo / PI + specular) * radiance * NdotL;  // note that we already multiplied the BRDF by the Fresnel (kS) so we won't multiply by kS again
      }
      
      // ambient lighting (note that the next IBL tutorial will replace 
      // this ambient lighting with environment lighting).
      vec3 ambient = vec3(0.03) * albedo * ao;
      
      vec3 color = ambient + Lo;
  
      // HDR tonemapping
      color = color / (color + vec3(1.0));
      // gamma correct
      color = pow(color, vec3(1.0/2.2)); 
  
      gl_FragColor = vec4(color, 1.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 normal;
  
  varying vec2 TexCoords;
  varying vec3 WorldPos;
  varying vec3 Normal;
  
  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;
  
  void main()
  {
      TexCoords = uv;
      WorldPos = vec3(model * vec4(position, 1.0));
      Normal = mat3(model) * normal;   
  
      gl_Position =  projection * view * vec4(WorldPos, 1.0);
  }`,
  attributes: {
    position: cubePosition,
    normal: cubeNormal,
    uv: cubeUv
  },
  elements: cubeElements,
  uniforms: {
    color: reglArg('color', [1.0, .412, .38]),
    albedoMap: () => albedoMap,
    normalMap: () => normalMap,
    metallicMap: () => metallicMap,
    roughnessMap: () => roughnessMap,
    aoMap: () => aoMap,
    camPos: (context) => context.eye,
    'lightPositions[0]': (context) => [Math.sin(context.time)*10, 3, Math.cos(context.time)*10],
    'lightColors[0]': [255, 255, 255],
    'lightPositions[1]': [-10, 10, 10],
    'lightColors[1]': [255, 255, 255],
    'lightPositions[2]': [-10, 10, -0],
    'lightColors[2]': [100, 100, 255],
    'lightPositions[3]': [-10, 10, -10],
    'lightColors[3]': [255, 255, 255],
  }
})

const drawFloor = regl({
    context: {
        position: [0, -0.51, 0],
        rotation: [0, 0, 0, 1],
        scale: [50, 50, 50]
    }
})

export const floor = () => {
    const draw = model(() => drawPlane())
    return (props) => drawFloor(props, draw)
}
