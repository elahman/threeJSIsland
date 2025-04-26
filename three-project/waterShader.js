/*
water shader inspired by:
- Three.js Water Shader Example: https://threejs.org/examples/#webgl_shaders_ocean
- GPU Gems Chapter 1 (Effective Water Simulation): https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
- Shadertoy "Simple Water" by Alexander Alekseev: https://www.shadertoy.com/view/Ms2SD1
*/

import * as THREE from 'three';

const WaterShader = {
    uniforms: {
        time: { value: 0 },
        waterTexture: { value: null },
        bumpTexture: { value: null },
        waterColor: { value: new THREE.Color(0x1e90ff) },
        amplitude: { value: 0.08 },
        frequency: { value: 1.5 },
        bumpScale: { value: 0.4 },
        textureScale: { value: 10.0 },
        opacity: { value: 0.6 }
    },

    vertexShader: `
        uniform float time;
        uniform float amplitude;
        uniform float frequency;
        uniform float textureScale;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
            vUv = uv * textureScale * 0.25;
            
            vec3 pos = position;
            float wave1 = sin(pos.x * frequency + time) * 
                         sin(pos.z * frequency + time) * amplitude;
            float wave2 = sin(pos.x * frequency * 1.5 + time * 1.2) * 
                         sin(pos.z * frequency * 1.5 + time * 1.2) * amplitude * 0.5;
            float wave3 = sin(pos.x * frequency * 0.8 - time * 0.9) * 
                         sin(pos.z * frequency * 0.8 - time * 0.9) * amplitude * 0.3;
            
            pos.y += wave1 + wave2 + wave3;
            
            vec3 transformed = pos;
            vec3 objectNormal = normalize(normal + vec3(wave1 + wave3, wave2, wave1 + wave2));
            vNormal = normalMatrix * objectNormal;
            
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,

    fragmentShader: `
        uniform sampler2D waterTexture;
        uniform sampler2D bumpTexture;
        uniform vec3 waterColor;
        uniform float time;
        uniform float bumpScale;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
            vec2 uv = vUv;
            uv.x += sin(time * 0.2) * 0.01 + time * 0.02;
            uv.y += cos(time * 0.2) * 0.01 + time * 0.02;
            
            vec2 bumpUV = vUv;
            bumpUV += vec2(sin(time * 0.2), cos(time * 0.2)) * 0.01;
            
            vec4 texColor = texture2D(waterTexture, uv);
            vec4 bumpVal = texture2D(bumpTexture, bumpUV);
            
            vec3 normal = normalize(vNormal);
            normal = normalize(normal + bumpScale * vec3(bumpVal.r - 0.5, bumpVal.g - 0.5, bumpVal.b - 0.5));
            
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
            
            vec3 finalColor = mix(waterColor, texColor.rgb, 0.4);
            finalColor = mix(finalColor, vec3(1.0), fresnel * 0.5);
            
            gl_FragColor = vec4(finalColor, opacity);
        }
    `
};

export { WaterShader }; 