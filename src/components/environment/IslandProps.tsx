import React, { Suspense, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { PropPlacement } from '../../lib/types';

function StaticProp({ model, position, rotation = [0, 0, 0], scale = 1 }: PropPlacement) {
    const { scene } = useGLTF(model);
    const clone = useMemo(() => scene.clone(true), [scene]);

    // Apply shadow support to clones
    useEffect(() => {
        clone.traverse((child: any) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [clone]);

    return (
        <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
            <primitive object={clone} scale={scale} />
        </RigidBody>
    );
}

// ─── IslandProps ──────────────────────────────────────────────────────────────

interface IslandPropsProps {
    props: PropPlacement[];
    /** Chests / interactive props are rendered by IslandScene separately */
    skipInteractive?: boolean;
    skipDestructible?: boolean;
}

export function IslandProps({ props, skipInteractive = false, skipDestructible = false }: IslandPropsProps) {
    const filtered = props.filter(p => {
        if (skipInteractive && p.interactive) return false;
        if (skipDestructible && p.destructible) return false;
        return true;
    });

    return (
        <>
            {filtered.map((p, i) => (
                <Suspense key={`${p.model}-${i}`} fallback={null}>
                    <StaticProp {...p} />
                </Suspense>
            ))}
        </>
    );
}

// ─── Realistic Island Water Shader ───────────────────────────────────────────
const waterVertexShader = /* glsl */`
uniform float uTime;
varying float vElevation;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);
    // Wave composition: primary, secondary, and fine noise
    float e = sin(mp.x * 0.3 + uTime * 0.8)  * 0.35
            + sin(mp.z * 0.2 + uTime * 0.6)  * 0.2
            + sin((mp.x + mp.z) * 1.5 + uTime * 1.2) * 0.05;
    
    mp.y += e;
    vElevation = e;
    vUv = uv;
    vWorldPos = mp.xyz;
    gl_Position = projectionMatrix * viewMatrix * mp;
}
`;

const waterFragmentShader = /* glsl */`
uniform float uTime;
varying float vElevation;
varying vec3 vWorldPos;

void main() {
    // Tropical colors
    vec3 shallow = vec3(0.0, 0.7, 0.8);  // Turquoise
    vec3 deep    = vec3(0.02, 0.15, 0.35); // Deep navy

    // Distance from shore (0,0 is center of island)
    float dist = length(vWorldPos.xz);

    // Mix based on distance (shallower towards island) and elevation
    float depthFactor = smoothstep(0.0, 130.0, dist);
    float colorMix = clamp(depthFactor + vElevation * 0.4, 0.0, 1.0);
    vec3 color = mix(shallow, deep, colorMix);

    // Foam near shore and at wave peaks
    float shoreFoam = smoothstep(100.0, 82.0, dist) * 0.6;
    float peakFoam  = smoothstep(0.25, 0.45, vElevation) * 0.3;
    float foam = clamp(shoreFoam + peakFoam, 0.0, 1.0);

    color = mix(color, vec3(0.9, 0.95, 1.0), foam);

    // Add specular sparkle
    float sparkle = pow(max(0.0, vElevation + 0.4), 10.0) * 0.4;
    color += vec3( sparkle * 0.8, sparkle, sparkle * 1.2 );

    // Transparency (clearer near shore)
    float alpha = mix(0.6, 0.95, depthFactor);

    gl_FragColor = vec4(color, alpha);
}
`;

function AnimatedWater() {
    const materialRef = React.useRef<THREE.ShaderMaterial>(null!);
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
    }), []);

    useFrame((state) => {
        if (materialRef.current && materialRef.current.uniforms.uTime) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -1.2, 0]}
            receiveShadow
        >
            <planeGeometry args={[1000, 1000, 128, 128]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={waterVertexShader}
                fragmentShader={waterFragmentShader}
                uniforms={uniforms}
                transparent={true}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// ─── IslandTerrain ────────────────────────────────────────────────────────────

export function IslandTerrain() {
    return (
        <>
            {/* ── Big sand base ── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <circleGeometry args={[130, 64]} />
                <meshStandardMaterial color="#c8a96e" roughness={0.95} metalness={0} />
            </mesh>

            {/* ── Grass (centre island) ── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[82, 64]} />
                <meshStandardMaterial color="#5a8a3c" roughness={0.9} metalness={0} />
            </mesh>

            {/* ── Inner grass highlight ── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                <circleGeometry args={[68, 48]} />
                <meshStandardMaterial color="#67a044" roughness={0.85} metalness={0} />
            </mesh>

            {/* ── Beach / sand transition ring ── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <ringGeometry args={[78, 96, 64]} />
                <meshStandardMaterial color="#d4b47a" roughness={0.95} metalness={0} />
            </mesh>

            {/* ── Wet sand at water edge ── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
                <ringGeometry args={[116, 130, 64]} />
                <meshStandardMaterial color="#b8955a" roughness={0.98} metalness={0} />
            </mesh>

            {/* ── Water system ── */}
            <AnimatedWater />

            {/* ── Ground collider (Rapier) ── */}
            <RigidBody type="fixed" position={[0, -1, 0]} friction={0.7} restitution={0}>
                <CuboidCollider args={[200, 1, 200]} />
            </RigidBody>
        </>
    );
}
