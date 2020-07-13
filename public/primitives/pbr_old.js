import regl from '../regl.js'
import resl from '../libs/resl.mjs'
import { reglArg, log1s } from '../utils.js'
import { textures, loadEnvironment } from '../reglhelpers.js'

const maps = {}

const textureNames = ['table', 'dirtypaint', 'shinything', 'mirror']

const loadTexture = (name) => {
    const textureSize = 512
    const init = { shape: [textureSize, textureSize], wrapS: 'repeat', wrapT: 'repeat' }
    maps[name] = {
        albedoMap: regl.texture(init),
        normalMap: regl.texture(init),
        metallicMap: regl.texture(init),
        roughnessMap: regl.texture(init),
        aoMap: regl.texture(init)
    }
    resl({
        manifest: {
            albedo: {
                type: 'image',
                src: `/materials/${name}/${name}_basecolor.png`
            },
            normal: {
                type: 'image',
                src: `/materials/${name}/${name}_normal.png`
            },
            metallic: {
                type: 'image',
                src: `/materials/${name}/${name}_metallic.png`
            },
            roughness: {
                type: 'image',
                src: `/materials/${name}/${name}_roughness.png`
            },
            ao: {
                type: 'image',
                src: `/materials/${name}/${name}_ambientocclusion.png`
            }
        },
        onDone: (assets) => {
            maps[name].albedoMap({
                ...init,
                data: assets.albedo
            })
            maps[name].normalMap({
                ...init,
                data: assets.normal
            })
            maps[name].metallicMap({
                ...init,
                data: assets.metallic
            })
            maps[name].roughnessMap({
                ...init,
                data: assets.roughness
            })
            maps[name].aoMap({
                ...init,
                data: assets.ao
            })
        }
    })
}

textureNames.forEach((textureName) => loadTexture(textureName))

loadEnvironment('arches')

export const drawPbr = regl({
  frag: `
  #extension WEBGL_color_buffer_float : enable
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
  
  uniform samplerCube irradianceMap;

  // lights
  uniform vec3 lightPositions[4];
  uniform vec3 lightColors[4];

  uniform vec3 camPos;
  uniform vec3 color;
  
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
      vec3 albedo     = pow(texture2D(albedoMap, TexCoords).rgb * color, vec3(2.2));
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
      vec3 ambient = vec3(0.13) * albedo * ao;
      
      // ambient lighting (we now use IBL as the ambient term)
    //   vec3 kS = fresnelSchlick(max(dot(N, V), 0.0), F0);
    //   vec3 kD = 1.0 - kS;
    //   kD *= 1.0 - metallic;	  
    //   vec3 irradiance = textureCube(irradianceMap, N).rgb;
    //   vec3 diffuse      = irradiance * albedo;
    //   vec3 ambient = (kD * diffuse) * ao;
    //   vec3 ambient = vec3(0.002);
      
      vec3 outcolor = ambient + Lo;
  
      // HDR tonemapping
      outcolor = outcolor / (outcolor + vec3(1.0));
      // gamma correct
      outcolor = pow(outcolor, vec3(1.0/2.2)); 
  
      gl_FragColor = vec4(outcolor, 1.0);
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
  uniforms: {
    color: (context, props) => reglArg('color', [1.0, 1.0, 1.0], context, props),
    albedoMap: (context, props) => maps[props.texture].albedoMap,
    normalMap: (context, props) => maps[props.texture].normalMap,
    metallicMap: (context, props) => maps[props.texture].metallicMap,
    roughnessMap: (context, props) => maps[props.texture].roughnessMap,
    aoMap: (context, props) => maps[props.texture].aoMap,
    irradianceMap: (context, props) => textures['arches'].irradianceMap,
    camPos: (context) => context.eye,
    'lightPositions[0]': (context) => context.lightPos,
    'lightColors[0]': [40, 30, 10],
    'lightPositions[1]': (context) => [Math.sin(context.time)*10, 3, Math.cos(context.time)*10],
    'lightColors[1]': [255, 255, 255],
    'lightPositions[2]': [-10, 10, -0],
    'lightColors[2]': [255, 255, 255],
    'lightPositions[3]': [-10, 10, -10],
    'lightColors[3]': [255, 255, 255],
  }
})
