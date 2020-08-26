import regl from '../regl.js'
import { reglArg, log1s } from '../utils.js'
import { loadTexture, loadEnvironment, textures } from '../reglhelpers.js'

const cubeMapNames = ['artist']
cubeMapNames.forEach((textureName) => loadEnvironment(textureName))

const textureNames = [
    {name: 'table'},
    {name: 'dirtypaint'},
    {name: 'grass'},
    {name: 'gravel'},
    {name: 'rail'},
    {name: 'rockcliff'},
    {name: 'caboose', painter: true},
    {name: 'p70', painter: true, colorSwap: 1.0},
    {name: 'g43', painter: true},
    {name: 'tm8', painter: true},
    {name: 'sw1', painter: true, colorSwap: 1.0},
    {name: 'bogie', painter: true},
    {name: 'x36', painter: true, colorSwap: 1.0},
    {name: 'p42', painter: true, colorSwap: 1.0},
    {name: 'berkshire', painter: true, colorSwap: 1.0},
    {name: 'trainhouse', painter: true},
    {name: 'platform', painter: true},
    {name: 'rocktunnel', painter: true}
]
textureNames.forEach(({name, painter, colorSwap}) => loadTexture(name, painter, colorSwap))

const zeroTexture = regl.texture([[0]])
const oneTexture = regl.texture([[255]])

export const drawPbr = regl({
  frag: `
  #extension OES_texture_float : enable
  #extension OES_texture_float_linear : enable
  #extension WEBGL_color_buffer_float : enable
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;

  varying vec2 TexCoords;
  varying vec3 WorldPos;
  varying vec3 Normal;

  uniform vec3 color1;
  uniform vec3 color2;
  
  // material parameters
  uniform sampler2D albedoMap;
  uniform sampler2D normalMap;
  uniform sampler2D metallicMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D aoMap;
  uniform sampler2D heightMap;
  
  // IBL
  uniform samplerCube irradianceMap;
  uniform samplerCube prefilterMap;
  uniform sampler2D brdfLUT;
  
  // lights
  uniform vec3 lightPositions[4];
  uniform vec3 lightColors[4];
  
  uniform vec3 camPos;
  uniform float colorSwap;

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
  vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
  {
      return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
  }   
  // ----------------------------------------------------------------------------

  void main()
  {		
      // material properties
      vec3 textureColor = texture2D(albedoMap, TexCoords).rgb;
      float metallic = texture2D(metallicMap, TexCoords).r;
      float roughness = texture2D(roughnessMap, TexCoords).r;
      float ao = texture2D(aoMap, TexCoords).r;
    
      vec3 baseColor = textureColor;
      if(colorSwap > 0.0) {
        baseColor = mix(mix(color2, color1, textureColor.r), textureColor.rgb, max(0.0, metallic-(1.0-distance(textureColor, vec3(1.0, 0.0, 0.0)))));
      }
      vec3 albedo = pow(baseColor, vec3(2.2));

      // input lighting data
      vec3 N = getNormalFromMap();
      vec3 V = normalize(camPos - WorldPos);
      vec3 R = reflect(-V, N); 
  
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
          Lo += (kD * albedo / PI + specular) * radiance * NdotL; // note that we already multiplied the BRDF by the Fresnel (kS) so we won't multiply by kS again
      }   
      
      // ambient lighting (we now use IBL as the ambient term)
      vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
      
      vec3 kS = F;
      vec3 kD = 1.0 - kS;
      kD *= 1.0 - metallic;	  
      
      vec3 irradiance = textureCube(irradianceMap, N).rgb;
      vec3 diffuse      = irradiance * albedo;
      
      // sample both the pre-filter map and the BRDF lut and combine them together as per the Split-Sum approximation to get the IBL specular part.
      const float MAX_REFLECTION_LOD = 4.0;
      vec3 prefilteredColor = textureCube(prefilterMap, R,  roughness * MAX_REFLECTION_LOD).rgb;    
      vec2 brdf  = texture2D(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
      vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);
  
      vec3 ambient = (kD * diffuse + specular) * ao;
      
      vec3 color = ambient + Lo;
  
      // HDR tonemapping
      color = color / (color + vec3(1.0));
      // gamma correct
      color = pow(color, vec3(1.0/2.2)); 
  
      gl_FragColor = vec4(color, 1.0);
    //   gl_FragColor = vec4(fract(TexCoords), 0.0, 1.0); // uvs
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
  uniform sampler2D heightMap;
  
  void main()
  {
      TexCoords = uv;
      vec3 height = vec3(0, texture2D(heightMap, uv).r, 0);
      vec3 mappedPos = position + height * vec3(0, position.y, 0);
      WorldPos = vec3(model * vec4(mappedPos, 1.0));
      Normal = mat3(model) * normal;
  
      gl_Position =  projection * view * vec4(WorldPos, 1.0);
  }`,
  uniforms: {
    color1: (context, props) => reglArg('color1', reglArg('color', [1.0, 1.0, 1.0], context, props), context, props),
    color2: (context, props) => reglArg('color2', reglArg('color', [1.0, 1.0, 1.0], context, props), context, props),
    albedoMap: (context, props) => textures[props.texture].albedoMap,
    normalMap: (context, props) => textures[props.texture].normalMap,
    metallicMap: (context, props) => textures[props.texture].metallicMap,
    roughnessMap: (context, props) => textures[props.texture].roughnessMap,
    aoMap: (context, props) => textures[props.texture].aoMap,
    heightMap: (context, props) => textures[props.texture].heightMap ?? zeroTexture,
    irradianceMap: () => textures['artist'].irradianceMap,
    prefilterMap: () => textures['artist'].prefilterMap,
    brdfLUT: () => textures['artist'].brdfLUT,
    camPos: (context) => context.eye,
    colorSwap: (context, props) => textures[props.texture].colorSwap,
    'lightPositions[0]': (context) => context.lightPos,
    'lightColors[0]': [40, 30, 10],
    'lightPositions[1]': (context) => [Math.sin(context.time*0)*10, 5, Math.cos(context.time)*10],
    'lightColors[1]': [255, 255, 255],
    'lightPositions[2]': [-10, 10, -0],
    'lightColors[2]': [255, 255, 255],
    'lightPositions[3]': [-10, 10, -10],
    'lightColors[3]': [255, 255, 255],
  },
  cull: {
      enable: true,
      face: 'back'
  }
})
