import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */`
uniform float uTime;
varying float vElevation;
varying vec2 vUv;

void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);
    float e = sin(mp.x * 0.4 + uTime * 1.0)  * 0.4
            + sin(mp.z * 0.3 + uTime * 0.7)  * 0.25
            + sin((mp.x + mp.z) * 0.2 + uTime * 0.5) * 0.15;
    mp.y += e;
    vElevation = e;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * mp;
}
`;

const fragmentShader = /* glsl */`
uniform float uTime;
varying float vElevation;

void main() {
    vec3 deep    = vec3(0.03, 0.18, 0.38);
    vec3 shallow = vec3(0.12, 0.42, 0.62);
    float mixF   = clamp((vElevation + 0.5), 0.0, 1.0);
    vec3 color   = mix(deep, shallow, mixF);
    // Subtle foam highlights at wave peaks
    float foam   = smoothstep(0.3, 0.5, vElevation);
    color        = mix(color, vec3(0.7, 0.85, 0.95), foam * 0.25);
    gl_FragColor = vec4(color, 0.92);
}
`;

interface OceanWaterProps {
    size?: number;
}

export function OceanWater({ size = 600 }: OceanWaterProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
    }), []);

    useFrame(({ clock }) => {
        if (materialRef.current) {
            if (materialRef.current.uniforms['uTime']) {
                materialRef.current.uniforms['uTime'].value = clock.getElapsedTime();
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.5, 0]}
            receiveShadow
        >
            <planeGeometry args={[size, size, 128, 128]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
