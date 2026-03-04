import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTERS } from '../../lib/assets';
import { usePlayerStore } from '../../store/playerStore';

useGLTF.preload(CHARACTERS.tentacle);

interface TentacleProps {
    id: string;
    position: [number, number, number];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function Tentacle({ id, position, playerPosRef }: TentacleProps) {
    const { scene, animations } = useGLTF(CHARACTERS.tentacle);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const groupRef = useRef<THREE.Group>(null!);
    const curAnim = useRef('');
    const attackTimer = useRef(3); // start with a delay
    const hp = useRef(80);
    const isDead = useRef(false);
    const pos = new THREE.Vector3(...position);

    const takeDamage = usePlayerStore(s => s.takeDamage);

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
        const idle = names.includes('Tentacle_Idle') ? 'Tentacle_Idle' : (names[0] ?? '');
        if (idle) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
        }
        if (groupRef.current) groupRef.current.position.copy(pos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, names]);

    // Tentacle 'finished' event — after attack, return to idle
    useEffect(() => {
        const onFinished = () => {
            const idle = names.includes('Tentacle_Idle') ? 'Tentacle_Idle' : (names[0] ?? '');
            if (idle) {
                actions[curAnim.current]?.fadeOut(0.2);
                actions[idle]?.reset().fadeIn(0.2).setLoop(THREE.LoopRepeat, Infinity).play();
                curAnim.current = idle;
            }
        };
        mixer.addEventListener('finished', onFinished);
        return () => mixer.removeEventListener('finished', onFinished);
    }, [mixer, actions, names]);

    useFrame((_, delta) => {
        if (isDead.current || !groupRef.current) return;
        const dt = Math.min(delta, 0.05);
        attackTimer.current -= dt;

        const playerPos = playerPosRef.current;
        if (!playerPos) return;

        const dist = pos.distanceTo(playerPos);

        if (attackTimer.current <= 0 && dist < 6) {
            attackTimer.current = 4;
            // Choose attack animation
            const atk = names.includes('Tentacle_Attack') ? 'Tentacle_Attack'
                : names.includes('Tentacle_Poke') ? 'Tentacle_Poke'
                    : 'Tentacle_Attack2';
            if (actions[atk]) {
                actions[curAnim.current]?.fadeOut(0.2);
                actions[atk]!.reset().fadeIn(0.1).setLoop(THREE.LoopOnce, 1).play();
                (actions[atk]!).clampWhenFinished = true;
                curAnim.current = atk;
                // Deal sweep damage if player close enough
                if (dist < 4) takeDamage(25);
            }
        }
    });

    // Hit handler via userData
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.userData.takHit = (damage: number) => {
                if (isDead.current) return;
                hp.current -= damage;
                if (hp.current <= 0) {
                    isDead.current = true;
                    // play poke as death twitch
                    const p = names.includes('Tentacle_Poke') ? 'Tentacle_Poke' : names[0] ?? '';
                    if (p && actions[p]) {
                        actions[curAnim.current]?.fadeOut(0.15);
                        actions[p]!.reset().setLoop(THREE.LoopOnce, 1).play();
                    }
                }
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef} position={position}>
            <primitive object={scene.clone(true)} />
            {/* Water splash ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.8, 1.2, 16]} />
                <meshStandardMaterial color="#4080ff" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}
