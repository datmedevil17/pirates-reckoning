import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTERS } from '../../lib/assets';
import { AGGRO_RANGE, ATTACK_RANGE, STAGGER_DURATION, ENEMY_PATROL_SPEED, ENEMY_CHASE_SPEED, SHARKY_HP } from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload(CHARACTERS.sharky);

interface SharkyProps {
    id: string;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function Sharky({ id, position, waypoints, playerPosRef }: SharkyProps) {
    const { scene, animations } = useGLTF(CHARACTERS.sharky);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(0);
    const curAnim = useRef('');
    const aiState = useRef<AIState>('patrol');
    const hp = useRef(SHARKY_HP);
    const staggerTimer = useRef(0);
    const attackTimer = useRef(0);
    const waypointIdx = useRef(0);
    const isDead = useRef(false);
    const lootSpawned = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        if (!actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.15);
        const a = actions[name]!;
        a.reset().fadeIn(0.15);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
    };

    useEffect(() => {
        curAnim.current = '';
        const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
        if (idle) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
        }
        if (groupRef.current) groupRef.current.position.copy(pos.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, names]);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        const dt = Math.min(delta, 0.05);
        const playerPos = playerPosRef.current;

        if (isDead.current) {
            if (!lootSpawned.current) {
                lootSpawned.current = true;
                playRef.current('Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}` });
                addResource('gold', 25);
                setTimeout(() => removeEnemy(id), 3000);
            }
            return;
        }

        if (staggerTimer.current > 0) { staggerTimer.current -= dt; playRef.current('HitReact'); return; }
        if (!playerPos) return;

        const dist = pos.current.distanceTo(playerPos);
        if (attackTimer.current > 0) attackTimer.current -= dt;

        if (dist < ATTACK_RANGE) {
            aiState.current = 'attack';
            playRef.current('Punch');
            if (attackTimer.current <= 0) { attackTimer.current = 1.5; takeDamage(15); }
        } else if (dist < AGGRO_RANGE) {
            aiState.current = 'chase';
            playRef.current('Run');
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, ENEMY_CHASE_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 10 * dt);
        } else {
            aiState.current = 'patrol';
            playRef.current('Walk');
            if (waypoints.length > 0) {
                const wp = new THREE.Vector3(...waypoints[waypointIdx.current]!);
                const dir = wp.clone().sub(pos.current);
                if (dir.length() < 0.4) {
                    waypointIdx.current = (waypointIdx.current + 1) % waypoints.length;
                } else {
                    dir.normalize();
                    pos.current.addScaledVector(dir, ENEMY_PATROL_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 6 * dt);
                }
            }
        }

        group.position.copy(pos.current);
        group.rotation.y = rotY.current;
    });

    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.userData.takHit = (damage: number) => {
                if (isDead.current) return;
                hp.current -= damage;
                if (hp.current <= 0) isDead.current = true;
                else staggerTimer.current = STAGGER_DURATION;
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene.clone(true)} />
        </group>
    );
}
