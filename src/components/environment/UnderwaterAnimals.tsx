import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { UNDERWATER } from '../../lib/assets';

// Preload all ambient creatures
useGLTF.preload(UNDERWATER.fish1);
useGLTF.preload(UNDERWATER.fish2);
useGLTF.preload(UNDERWATER.fish3);
useGLTF.preload(UNDERWATER.dolphin);
useGLTF.preload(UNDERWATER.whale);
useGLTF.preload(UNDERWATER.mantaRay);

// ─── Generic orbit swimmer ─────────────────────────────────────────────────────

interface SwimmerProps {
    modelPath: string;
    scale?: number;
    orbitRadius: number;
    orbitSpeed: number;    // rad/s — positive = CCW
    startAngle: number;
    heightBase?: number;
    heightAmp?: number;
    heightFreq?: number;   // multiplier on orbit angle
    clockwise?: boolean;
}

function AmbientSwimmer({
    modelPath,
    scale = 1,
    orbitRadius,
    orbitSpeed,
    startAngle,
    heightBase = 2.0,
    heightAmp = 0.5,
    heightFreq = 2,
    clockwise = false,
}: SwimmerProps) {
    const { scene, animations } = useGLTF(modelPath);
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);
    const groupRef = useRef<THREE.Group>(null!);
    const angleRef = useRef(startAngle);
    const dir = clockwise ? -1 : 1;

    // Play first available animation (swim)
    useEffect(() => {
        if (names.length > 0) {
            const a = actions[names[0]!];
            if (a) a.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        }
    }, [actions, names]);

    useFrame((_, delta) => {
        angleRef.current += orbitSpeed * dir * delta;
        const a = angleRef.current;
        const x = Math.cos(a) * orbitRadius;
        const z = Math.sin(a) * orbitRadius;
        const y = heightBase + Math.sin(a * heightFreq) * heightAmp;

        // Tangent direction = velocity vector normalised
        const vx = -Math.sin(a) * dir;
        const vz =  Math.cos(a) * dir;

        if (groupRef.current) {
            groupRef.current.position.set(x, y, z);
            groupRef.current.rotation.y = Math.atan2(vx, vz);
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={clone} scale={scale} />
        </group>
    );
}

// ─── UnderwaterAnimals — harmless ambient life for Sunken Depths ───────────────

export function UnderwaterAnimals() {
    return (
        <>
            {/* ── Fish1 — tiny quick school, inner ring, well above ground ── */}
            <AmbientSwimmer modelPath={UNDERWATER.fish1} scale={0.22} orbitRadius={9}  orbitSpeed={0.70} startAngle={0.0}  heightBase={4.5} heightAmp={0.6} heightFreq={3} />
            <AmbientSwimmer modelPath={UNDERWATER.fish1} scale={0.18} orbitRadius={10} orbitSpeed={0.68} startAngle={2.1}  heightBase={5.0} heightAmp={0.5} heightFreq={3} />
            <AmbientSwimmer modelPath={UNDERWATER.fish1} scale={0.20} orbitRadius={8}  orbitSpeed={0.72} startAngle={4.3}  heightBase={3.8} heightAmp={0.7} heightFreq={3} />

            {/* ── Fish2 — small, mid ring ── */}
            <AmbientSwimmer modelPath={UNDERWATER.fish2} scale={0.25} orbitRadius={15} orbitSpeed={0.50} startAngle={1.0}  heightBase={4.0} heightAmp={0.8} heightFreq={2} />
            <AmbientSwimmer modelPath={UNDERWATER.fish2} scale={0.22} orbitRadius={17} orbitSpeed={0.48} startAngle={3.8}  heightBase={5.2} heightAmp={0.6} heightFreq={2} clockwise />

            {/* ── Fish3 — small, opposite orbit variety ── */}
            <AmbientSwimmer modelPath={UNDERWATER.fish3} scale={0.24} orbitRadius={12} orbitSpeed={0.60} startAngle={4.5}  heightBase={4.2} heightAmp={0.5} heightFreq={3} clockwise />
            <AmbientSwimmer modelPath={UNDERWATER.fish3} scale={0.20} orbitRadius={13} orbitSpeed={0.55} startAngle={1.8}  heightBase={4.8} heightAmp={0.6} heightFreq={3} />

            {/* ── Dolphin — graceful mid-outer loops ── */}
            <AmbientSwimmer modelPath={UNDERWATER.dolphin} scale={1.2} orbitRadius={21} orbitSpeed={0.28} startAngle={1.5} heightBase={3.5} heightAmp={1.2} heightFreq={1.5} />
            <AmbientSwimmer modelPath={UNDERWATER.dolphin} scale={1.1} orbitRadius={24} orbitSpeed={0.25} startAngle={4.6} heightBase={4.0} heightAmp={1.0} heightFreq={1.5} clockwise />

            {/* ── Whale — slow outer sweep ── */}
            <AmbientSwimmer modelPath={UNDERWATER.whale} scale={1.8} orbitRadius={33} orbitSpeed={0.10} startAngle={0.8} heightBase={2.5} heightAmp={0.6} heightFreq={1} />

            {/* ── Manta Ray — harmless glide, wide outer orbit ── */}
            <AmbientSwimmer modelPath={UNDERWATER.mantaRay} scale={2.0} orbitRadius={28} orbitSpeed={0.18} startAngle={0.3}  heightBase={3.0} heightAmp={0.8} heightFreq={1} />
            <AmbientSwimmer modelPath={UNDERWATER.mantaRay} scale={1.8} orbitRadius={30} orbitSpeed={0.15} startAngle={3.4}  heightBase={4.0} heightAmp={0.6} heightFreq={1} clockwise />
        </>
    );
}
