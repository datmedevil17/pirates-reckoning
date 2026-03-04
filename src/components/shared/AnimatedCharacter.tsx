import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shortest-path angular lerp */
export function lerpAngle(from: number, to: number, t: number): number {
    let d = ((to - from) % (Math.PI * 2));
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return from + d * Math.min(1, t);
}

// ─── WeaponInHand ─────────────────────────────────────────────────────────────

/**
 * Uses R3F createPortal to render the weapon into the LowerArm.R bone's
 * Three.js object so it follows animations correctly.
 */
export function WeaponInHand({ characterScene, weaponPath }: {
    characterScene: THREE.Group;
    weaponPath: string;
}) {
    const { scene: weaponScene } = useGLTF(weaponPath);
    const [handBone, setHandBone] = useState<THREE.Object3D | null>(null);

    useEffect(() => {
        let bone: THREE.Object3D | null = null;
        characterScene.traverse(obj => { if (obj.name === 'LowerArm.R') bone = obj; });
        setHandBone(bone);
    }, [characterScene]);

    const weaponClone = useMemo(() => weaponScene.clone(true), [weaponScene]);
    if (!handBone) return null;

    return createPortal(
        <primitive
            object={weaponClone}
            position={[0, 0.25, 0]}
            rotation={[0, 0, 0]}
        />,
        handBone,
    ) as React.JSX.Element;
}

// ─── AnimatedCharacter ────────────────────────────────────────────────────────

export interface AnimatedCharacterRef {
    play: (name: string, once?: boolean) => void;
    names: string[];
    scene: THREE.Group;
}

interface AnimatedCharacterProps {
    path: string;
    weaponPath?: string | null;
    groupRef?: React.RefObject<THREE.Group | null>;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    onReady?: (ref: AnimatedCharacterRef) => void;
}

export function AnimatedCharacter({
    path,
    weaponPath,
    groupRef,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    onReady,
}: AnimatedCharacterProps) {
    const { scene, animations } = useGLTF(path);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const curAnim = useRef('');
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    // play() in a ref so event listeners always call the latest version
    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        if (!actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
    };

    useEffect(() => {
        curAnim.current = '';
        const idle = names.includes('Idle') ? 'Idle'
            : names.includes('Swim') ? 'Swim'
                : (names[0] ?? '');
        if (idle) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
        }
        onReadyRef.current?.({
            play: (n, once) => playRef.current(n, once),
            names,
            scene,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, actions, names]);

    useFrame((_, delta) => {
        mixer.update(delta);
    });

    return (
        <group
            ref={groupRef as React.RefObject<THREE.Group>}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            <primitive object={scene} />
            {weaponPath && <WeaponInHand characterScene={scene} weaponPath={weaponPath} />}
        </group>
    );
}
