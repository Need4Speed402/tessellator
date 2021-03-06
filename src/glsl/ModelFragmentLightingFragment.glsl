precision mediump float;

uniform vec2 window;
uniform vec4 mask;

#ifdef USE_SCISSOR
    uniform vec4 scissor;
#endif

#ifdef USE_TEXTURE
    uniform sampler2D texture;
    
    varying vec2 colorInfo;
#else
    varying vec4 colorInfo;
#endif

#ifdef USE_REFLECTION_CUBE
    uniform float reflectionIntensity;
    uniform samplerCube reflectionCube;
#endif

#ifdef USE_FOG
    uniform vec2 fog;
    uniform vec3 fogColor;
#endif

varying vec4 mvPosition;

#if defined(USE_LIGHTING) || defined(USE_REFLECTION_CUBE)
    varying vec3 lightNormal;
#endif

#ifdef USE_LIGHTING
    #ifdef USE_SPECULAR_REFLECTION
        uniform float specular;
        
        #ifdef USE_SPECULAR_MAP
            uniform sampler2D specularMap;
        #endif
    #endif

    #ifdef USE_NORMAL_MAP
        uniform sampler2D normalTexture;
    #endif

    uniform sampler2D lights, shadowMap;
    
    #ifdef TEXTURE_CUBE_1
        uniform samplerCube cube1;
    #endif
    
    #ifdef TEXTURE_CUBE_2
        uniform samplerCube cube2;
    #endif
    
    #ifdef TEXTURE_CUBE_3
        uniform samplerCube cube3;
    #endif
    
    #ifdef TEXTURE_CUBE_4
        uniform samplerCube cube4;
    #endif
    
    #ifdef TEXTURE_CUBE_5
        uniform samplerCube cube5;
    #endif
    
    #ifdef TEXTURE_CUBE_6
        uniform samplerCube cube6;
    #endif
    
    #ifdef TEXTURE_CUBE_7
        uniform samplerCube cube7;
    #endif
    
    #ifdef TEXTURE_CUBE_8
        uniform samplerCube cube8;
    #endif
    
    float unpackFloat(vec4 value){
        return dot(value, vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0));
    }
    
    vec4 getCube (int cube, vec3 pos){
        #ifdef TEXTURE_CUBE_1
            if (cube == 1) return textureCube(cube1, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_2
            if (cube == 2) return textureCube(cube2, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_3
            if (cube == 3) return textureCube(cube3, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_4
            if (cube == 4) return textureCube(cube4, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_5
            if (cube == 5) return textureCube(cube5, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_6
            if (cube == 6) return textureCube(cube6, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_7
            if (cube == 7) return textureCube(cube7, pos);
        #endif
        
        #ifdef TEXTURE_CUBE_8
            if (cube == 8) return textureCube(cube8, pos);
        #endif
        
        return vec4(0);
    }
    
    #ifdef USE_SPECULAR_REFLECTION
        vec3 getLightMask(vec3 normal, float specular){
    #else
        vec3 getLightMask(vec3 normal){
    #endif
        vec3 lightMask = vec3(0);
        
        for (float i = 0.0; i < 256.; i++){
            vec4 light0 = texture2D(lights ,vec2(0. / 4., i / 256.));
            
            int type = int(light0.x);
            vec3 color = light0.yzw;
            
            if(type == 0){
                lightMask += color;
                
                break;
            }else if(type == 1){
                lightMask += color;
            }else if(type == 2){
                vec3 dir = texture2D(lights, vec2(1./4., i/256.)).xyz;
                float intensity = max(0., dot(normal, dir));
                vec4 shadow = texture2D(lights, vec2(3./4., i/256.));
                
                if(shadow.x > .5){
                    vec2 view = shadow.ww * vec2(0.1, 2);
                    
                    vec3 u = dir, r, b;
                    
                    if (abs(dir[0]) > abs(dir[2])){
                        r = normalize(cross(u, vec3(0, 0, 1)));
                    }else{
                        r = normalize(cross(u, vec3(1, 0, 0)));
                    }
                    
                    b = cross(r, u);
                    vec2 norm = (mvPosition.xyz * mat3(b.x, r.x, u.x, b.y, r.y, u.y, b.z, r.z, u.z)).xy;
                    
                    float depthMap = unpackFloat(texture2D(shadowMap, -norm / shadow.yz / 2. + .5));
                    float depth = (dot(dir, mvPosition.xyz + dir * shadow.w) - view.x) / (view.y - view.x) - 0.07 / (shadow.w / 100.);
                    
                    //lightMask = vec3(depth);
                    
                    //intensity = depth - depthMap;
                    
                    if (depthMap >= depth){
                        intensity = 0.;
                    }
                }
                
                lightMask += color * intensity;
            }else if(type == 3){
                vec3 pos = texture2D(lights, vec2(1./4.,i/256.)).xyz;
                vec4 shadow = texture2D(lights, vec2(3./4.,i/256.));
                
                vec3 dist = pos - mvPosition.xyz;
                float len = length(dist);
                vec3 npos = dist / len;
                float angle = max(0.0, dot(normal, npos));
                
                float intensity = angle;
                
                #ifdef USE_SPECULAR_REFLECTION
                    intensity += pow(max(0., dot(reflect(-npos, normal), normalize(-mvPosition.xyz))), specular);
                #endif
                
                if (shadow.x > .5){
                    float mapLen = unpackFloat(getCube(int(shadow.x), npos * vec3(1, -1, 1)));
                    float thisLen = (len - shadow.y) / (shadow.z - shadow.y);
                    
                    if (thisLen >= mapLen + shadow.w / angle){
                        intensity *= 0.0;
                    }
                }
                
                lightMask += color * intensity;
            }else if(type == 4){
                vec4 light1 = texture2D(lights, vec2(1./4., i/256.));
                vec4 shadow = texture2D(lights, vec2(3./4., i/256.));
                
                vec3 pos = light1.xyz;
                float range = light1.w;
                
                vec3 dist = pos - mvPosition.xyz;
                float len = length(dist);
                
                if(range >= len){
                    vec3 npos = dist / len;
                    float angle = max(0.0, dot(normal, npos));
                    
                    float intensity = angle;
                    
                    #ifdef USE_SPECULAR_REFLECTION
                        intensity += pow(max(0., dot(reflect(-npos, normal), normalize(-mvPosition.xyz))), specular);
                    #endif
                    
                    if (shadow.x > .5){
                        float mapLen = unpackFloat(getCube(int(shadow.x), npos * vec3(1, -1, 1)));
                        float thisLen = (len - shadow.y) / (shadow.z - shadow.y);
                        
                        if (thisLen >= mapLen + shadow.w / angle){
                            intensity *= 0.0;
                        }
                    }
                    
                    lightMask += color * intensity * ((range - len) / range);
                }
            }else if(type == 5){
                vec4 light1 = texture2D(lights, vec2(1./4., i/256.));
                vec4 light2 = texture2D(lights, vec2(2./4., i/256.));
                
                vec3 pos = light1.xyz;
                vec3 npos = normalize(pos - mvPosition.xyz);
                vec3 vec = light2.xyz;
                float size = light2.w;
                
                if(dot(vec, npos) > size){
                    vec3 look = normalize(-mvPosition.xyz);
                    vec3 reflection = reflect(-npos, normal);
                    
                    float specularLight = 0.0;
                    
                    #ifdef USE_SPECULAR_REFLECTION
                        specularLight = pow(max(0., dot(reflect(-npos, normal), normalize(-mvPosition.xyz))), specular);
                    #endif
                    
                    float intensity = max(0., dot(normal, npos)) + specularLight;
                    
                    lightMask += color * intensity;
                }
            }else if(type == 6){
                vec4 light1 = texture2D(lights, vec2(1./4., i/256.));
                vec4 light2 = texture2D(lights, vec2(2./4., i/256.));
                
                vec3 pos= light1.xyz;
                float range = light1.w;
                vec3 dist = pos - mvPosition.xyz;
                float length = length(dist);
                
                vec3 npos = dist /length;
                vec3 vec = light2.xyz;
                
                float size = light2.w;
                
                if(range > length && dot(vec, npos) > size){
                    vec3 look = normalize(-mvPosition.xyz);
                    
                    vec3 reflection = reflect(-npos, normal);
                    
                    float specularLight = 0.0;
                    
                    #ifdef USE_SPECULAR_REFLECTION
                        specularLight = pow(max(0., dot(reflect(-npos, normal), normalize(-mvPosition.xyz))), specular);
                    #endif
                    
                    float intensity = max(0., dot(normal, npos)) + specularLight;
                    
                    lightMask += color * intensity * ((range - length) / range);
                }
            }
        }
        
        return lightMask;
    }
#endif

void main(void){
    #ifdef USE_SCISSOR
        vec2 area = gl_FragCoord.xy / window;
        
        if(area.x < scissor.x || area.y < scissor.y || scissor.x + scissor.z < area.x || scissor.y + scissor.w < area.y){
            discard;
        }
    #endif
    
    #ifdef USE_TEXTURE
        vec2 tex = mod(colorInfo, 1.);
        vec4 mainColor = texture2D(texture, tex);
    #else
        vec4 mainColor = colorInfo;
    #endif
    
    mainColor *= mask;
    
    if(mainColor.w == 0.0){
        discard;
    }else{
        #ifdef USE_LIGHTING
            vec3 normal = lightNormal;
            
            #ifdef USE_NORMAL_MAP
                vec3 z = normalize(texture2D(normalTexture, tex).xyz * 2. - 1.);
                vec3 x = normalize(cross(z, vec3(0, -1, 0)));
                vec3 y = normalize(cross(z, x));
                
                normal *= mat3 (
                    x.x, y.x, z.x,
                    x.y, y.y, z.y,
                    x.z, y.z, z.z
                );
            #endif
            
            #ifdef USE_SPECULAR_REFLECTION
                float reflection = specular;
                
                #ifdef USE_SPECULAR_MAP
                    reflection *= texture2D(specularMap, tex).x;
                #endif
                
                mainColor.xyz *= getLightMask(normal, reflection);
            #else
                mainColor.xyz *= getLightMask(normal);
            #endif
            
            #ifdef USE_REFLECTION_CUBE
                mainColor = mainColor * (1. - reflectionIntensity) + textureCube(reflectionCube, reflect(-normalize(mvPosition.xyz), normal)) * reflectionIntensity;
            #endif
        #elif defined(USE_REFLECTION_CUBE)
            mainColor = mainColor * (1. - reflectionIntensity) + textureCube(reflectionCube, reflect(normalize(mvPosition.xyz), lightNormal * vec3(-1, 1, 1))) * reflectionIntensity;
        #endif
        
        #ifdef USE_FOG
            float fogLerp = clamp((length(mvPosition.xyz) - fog.x) / (fog.y - fog.x), 0., 1.);
            
            mainColor.xyz = mainColor.xyz * (1. - fogLerp) + fogColor * fogLerp;
        #endif
        
        gl_FragColor = mainColor;
    }
}