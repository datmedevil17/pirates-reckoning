import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTERS } from '../../lib/assets';
import {
    AGGRO_RANGE, ATTACK_RANGE, STAGGER_DURATION,
    ENEMY_PATROL_SPEED, ENEMY_CHASE_SPEED,
    SKELETON_HP, SKELETON_HL_HP,
} from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

// Preload
useGLTF.preload(CHARACTERS.skeleton);
useGLTF.preload(CHARACTERS.skeletonHL);

interface SkeletonProps {
    id: string;
    position: [number, number, number];
    waypoints: [number, number, number][];
    headless?: boolean;
    playerPosRef: React.RefObject<THREE.Vector3>;
    onHit?: (enemyId: string, damage: number) => void;
}

export function Skeleton({
    id,
    position,
    waypoints,
    headless = false,
    playerPosRef,
    onHit,
}: SkeletonProps) {
    const path = headless ? CHARACTERS.skeletonHL : CHARACTERS.skeleton;
    const { scene, animations } = useGLTF(path);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(0);
    const curAnim = useRef('');
    const aiState = useRef<AIState>('patrol');
    const hp = useRef(headless ? SKELETON_HL_HP : SKELETON_HP);
    const staggerTimer = useRef(0);
    const attackTimer = useRef(0);
    const waypointIdx = useRef(0);
    const isDead = useRef(false);
    const lootSpawned = useRef(false);
    const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        // Graceful fallback for Jump_Idlea typo on skeletons
        const resolved = name === 'Jump_Idlea' ? 'Jump_Idle' : name;
        const target = actions[resolved] ? resolved : name;
        if (!actions[target] || curAnim.current === target) return;
        actions[curAnim.current]?.fadeOut(0.15);
        const a = actions[target]!;
        a.reset().fadeIn(0.15);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = target;
    };

    // Init
    useEffect(() => {
        curAnim.current = '';
        const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
        if (idle) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
        }
        if (groupRef.current) {
            groupRef.current.position.copy(pos.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, actions, names]);

    // Register hit from player attack
    useEffect(() => {
        if (!onHit) return;
        // onHit is called by parent (IslandScene) comparing hit sphere to enemy pos
    }, [onHit]);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;

        const dt = Math.min(delta, 0.05);
        const playerPos = playerPosRef.current;

        // ── Dead ────────────────────────────────────────────────────────────
        if (isDead.current) {
            if (!lootSpawned.current) {
                lootSpawned.current = true;
                playRef.current('Death', true);
                // Drop loot
                const roll = Math.random();
                if (headless) {
                    if (roll < 0.5) {
                        addLootDrop({ type: 'goldBag', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-gold` });
                        addResource('gold', 20);
                    } else if (roll < 0.8) {
                        addLootDrop({ type: 'bottle2', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-pot` });
                    } else {
                        addLootDrop({ type: 'skull', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-skull` });
                    }
                } else {
                    if (roll < 0.7) {
                        addLootDrop({ type: 'coins', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-coins` });
                        addResource('gold', 5);
                    } else if (roll < 0.9) {
                        addLootDrop({ type: 'bottle1', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-pot` });
                    } else {
                        addLootDrop({ type: 'skull', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}-skull` });
                    }
                }
                removeTimer.current = setTimeout(() => removeEnemy(id), 3000);
            }
            return;
        }

        // ── Stagger ─────────────────────────────────────────────────────────
        if (staggerTimer.current > 0) {
            staggerTimer.current -= dt;
            playRef.current('HitReact');
            return;
        }

        if (!playerPos) return;

        const dist = pos.current.distanceTo(playerPos);

        // ── Attack cooldown ──────────────────────────────────────────────────
        if (attackTimer.current > 0) attackTimer.current -= dt;

        // ── State transitions ─────────────────────────────────────────────────
        if (dist < ATTACK_RANGE) {
            aiState.current = 'attack';
        } else if (dist < AGGRO_RANGE) {
            aiState.current = 'chase';
        } else {
            aiState.current = 'patrol';
        }

        // ── Execute state ─────────────────────────────────────────────────────
        if (aiState.current === 'attack') {
            playRef.current(Math.random() < 0.5 ? 'Punch' : 'Sword');
            if (attackTimer.current <= 0) {
                attackTimer.current = headless ? 1.2 : 1.8;
                const dmg = headless ? 20 : 12;
                takeDamage(dmg);
            }
        } else if (aiState.current === 'chase') {
            playRef.current('Run');
            const speed = (headless ? ENEMY_CHASE_SPEED * 1.3 : ENEMY_CHASE_SPEED) * dt;
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, speed);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 10 * dt);
        } else {
            // Patrol between waypoints
            playRef.current('Walk');
            if (waypoints.length > 0) {
                const wp = new THREE.Vector3(...waypoints[waypointIdx.current]!);
                const dir = wp.clone().sub(pos.current);
                const d = dir.length();
                if (d < 0.4) {
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

    // Expose hit handler via ref imperative handle pattern
    // Parent calls takHit(damage) on this enemy
    useEffect(() => {
        // Exported as a side-channel via the group's userData
        if (groupRef.current) {
            groupRef.current.userData.takHit = (damage: number) => {
                if (isDead.current) return;
                hp.current -= damage;
                if (hp.current <= 0) {
                    isDead.current = true;
                } else {
                    staggerTimer.current = STAGGER_DURATION;
                }
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
