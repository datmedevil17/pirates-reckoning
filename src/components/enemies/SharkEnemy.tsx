import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ATTACK_RANGE, STAGGER_DURATION, ENEMY_CHASE_SPEED, SHARK_HP } from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload('/models/Characters_Shark.gltf');

const SHARK_AGGRO = 18;  // large detection radius for the big shark

interface SharkEnemyProps {
    id: string;
    position: [number, number, number];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function SharkEnemy({ id, position, playerPosRef }: SharkEnemyProps) {
    const { scene, animations } = useGLTF('/models/Characters_Shark.gltf');
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef     = useRef<THREE.Group>(null!);
    const pos          = useRef(new THREE.Vector3(...position));
    const rotY         = useRef(0);
    const curAnim      = useRef('');
    const aiState      = useRef<AIState>('patrol');
    const hp           = useRef(SHARK_HP);
    const staggerTimer = useRef(0);
    const attackTimer  = useRef(0);
    const isDead       = useRef(false);
    const lootSpawned  = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage  = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    // Shark animations: Swim (idle), Swim_Fast (chase), Swim_Bite (attack)
    const resolveAnim = (name: string) => {
        if (actions[name]) return name;
        return names[0] ?? '';
    };

    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        const target = resolveAnim(name);
        if (!target || !actions[target] || curAnim.current === target) return;
        actions[curAnim.current]?.fadeOut(0.20);
        const a = actions[target]!;
        a.reset().fadeIn(0.20);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = target;
    };

    useEffect(() => {
        curAnim.current = '';
        const idle = resolveAnim('Swim');
        if (idle && actions[idle]) {
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

        // ── Dead ─────────────────────────────────────────────────────────────
        if (isDead.current) {
            if (!lootSpawned.current) {
                lootSpawned.current = true;
                playRef.current('Swim', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x - 0.5, 0.2, pos.current.z], id: `loot-${id}-gold` });
                addLootDrop({ type: 'gemBlue', position: [pos.current.x + 0.5, 0.2, pos.current.z], id: `loot-${id}-gem` });
                addResource('gold', 40);
                setTimeout(() => removeEnemy(id), 3500);
            }
            return;
        }

        if (staggerTimer.current > 0) { staggerTimer.current -= dt; return; }
        if (!playerPos) return;

        const dist = pos.current.distanceTo(playerPos);
        if (attackTimer.current > 0) attackTimer.current -= dt;

        // ── Simple AI: out of range → swim idle, in range → swim fast, close → bite ──
        if (dist <= ATTACK_RANGE * 1.5) {
            aiState.current = 'attack';
        } else if (dist <= SHARK_AGGRO) {
            aiState.current = 'chase';
        } else {
            aiState.current = 'patrol';
        }

        if (aiState.current === 'attack') {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 8 * dt);
            playRef.current('Swim_Bite');
            if (attackTimer.current <= 0) {
                attackTimer.current = 2.0;
                takeDamage(20);
            }
        } else if (aiState.current === 'chase') {
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, ENEMY_CHASE_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);
            playRef.current('Swim_Fast');
        } else {
            // Out of range — slow idle swim in place
            playRef.current('Swim');
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
            <group scale={1.3}>
                <primitive object={clone} />
            </group>
        </group>
    );
}
