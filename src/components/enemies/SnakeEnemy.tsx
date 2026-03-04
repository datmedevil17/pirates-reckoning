import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
    AGGRO_RANGE, STAGGER_DURATION,
    ENEMY_PATROL_SPEED, ENEMY_CHASE_SPEED,
    SNAKE_HP,
} from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

const SNAKE_PATH = '/models/island2animals/Snake.glb';
useGLTF.preload(SNAKE_PATH);

// Distance constants for ranged-boss behaviour
const SNAKE_ATTACK_RANGE = 7;  // trigger Attack anim
const SNAKE_RETREAT_DIST = 3;  // back away if player this close
const SNAKE_AGGRO = AGGRO_RANGE * 1.5;

const FIDGET_ANIMS = ['Idle', 'Idle', 'Walk'] as const;

interface SnakeEnemyProps {
    id: string;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

function SnakeBossLabel() {
    return (
        <Html position={[0, 9, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
            <div style={{
                color: '#00dd44',
                fontSize: 56,
                fontWeight: 900,
                fontFamily: '"Georgia", serif',
                textShadow: '0 0 18px #00ff55, 0 0 36px #00ff55, 3px 3px 0 #000, -1px -1px 0 #000',
                letterSpacing: 8,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
                lineHeight: 1,
            }}>
                ☠ SERPENT ☠
            </div>
        </Html>
    );
}

export function SnakeEnemy({
    id,
    position,
    waypoints,
    playerPosRef,
}: SnakeEnemyProps) {
    const { scene, animations } = useGLTF(SNAKE_PATH);
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(0);
    const curAnim = useRef('');
    const aiState = useRef<AIState>('patrol');
    const [dead, setDead] = useState(false);

    const hp = useRef(SNAKE_HP);
    const attackDmg = 28;
    const attackCooldown = 1.8;
    const chaseSpeedMult = 1.2;

    const staggerTimer = useRef(0);
    const attackTimer = useRef(0);

    const waypointIdx = useRef(0);
    const waypointPause = useRef(0);
    const fidgetTimer = useRef(0.2);
    const fidgetStep = useRef(0);

    const alertDone = useRef(false);
    const alertTimer = useRef(0);

    const isDead = useRef(false);
    const lootSpawned = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    // Resolve animation name — try exact, then prefixed
    const resolveAnim = (name: string): string => {
        if (actions[name]) return name;
        const prefixed = `Snake_${name}`;
        if (actions[prefixed]) return prefixed;
        return names[0] ?? '';
    };

    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        const target = resolveAnim(name);
        if (!target || !actions[target] || curAnim.current === target) return;
        actions[curAnim.current]?.fadeOut(0.15);
        const a = actions[target]!;
        a.reset().fadeIn(0.15);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = target;
    };

    useEffect(() => {
        curAnim.current = '';
        const idle = resolveAnim('Idle');
        if (idle && actions[idle]) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
        }
        if (groupRef.current) {
            groupRef.current.position.copy(pos.current);
        }
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
                playRef.current('Death', true);
                // Boss loot
                addLootDrop({ type: 'goldBag',  position: [pos.current.x - 0.5, 0.2, pos.current.z],      id: `loot-${id}-gold1` });
                addLootDrop({ type: 'goldBag',  position: [pos.current.x + 0.5, 0.2, pos.current.z],      id: `loot-${id}-gold2` });
                addLootDrop({ type: 'gemGreen', position: [pos.current.x,       0.2, pos.current.z - 0.5], id: `loot-${id}-gem`   });
                addLootDrop({ type: 'bottle2',  position: [pos.current.x,       0.2, pos.current.z + 0.5], id: `loot-${id}-pot`   });
                addResource('gold', 50);
                addResource('gemGreen', 1);
                setTimeout(() => removeEnemy(id), 5000);
            }
            return;
        }

        // ── Stagger ──────────────────────────────────────────────────────────
        if (staggerTimer.current > 0) {
            staggerTimer.current -= dt;
            playRef.current('HitReact');
            return;
        }

        if (!playerPos) return;

        const dist = pos.current.distanceTo(playerPos);

        if (attackTimer.current > 0) attackTimer.current -= dt;

        // ── State transitions ─────────────────────────────────────────────
        if (dist < SNAKE_ATTACK_RANGE) {
            aiState.current = 'attack';
        } else if (dist < SNAKE_AGGRO) {
            if (aiState.current === 'patrol' && !alertDone.current) {
                alertDone.current = true;
                alertTimer.current = 0.9;
                aiState.current = 'alert';
            } else if (aiState.current !== 'alert') {
                aiState.current = 'chase';
            }
        } else {
            aiState.current = 'patrol';
            if (dist > SNAKE_AGGRO + 10) alertDone.current = false;
        }

        // ── Alert ────────────────────────────────────────────────────────
        if (aiState.current === 'alert') {
            playRef.current('Idle');
            const dir = playerPos.clone().sub(pos.current).normalize();
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 6 * dt);
            alertTimer.current -= dt;
            if (alertTimer.current <= 0) aiState.current = 'chase';
            group.position.copy(pos.current);
            group.rotation.y = rotY.current;
            return;
        }

        // ── Execute state ─────────────────────────────────────────────────
        if (aiState.current === 'attack') {
            const toPlayer = playerPos.clone().sub(pos.current);
            const faceAngle = Math.atan2(toPlayer.x, toPlayer.z);
            rotY.current = lerpAngle(rotY.current, faceAngle, 8 * dt);

            // Retreat if too close
            if (dist < SNAKE_RETREAT_DIST) {
                playRef.current('Walk');
                const awayDir = pos.current.clone().sub(playerPos).normalize();
                pos.current.addScaledVector(awayDir, ENEMY_CHASE_SPEED * chaseSpeedMult * dt);
            } else {
                playRef.current('Attack');
                if (attackTimer.current <= 0) {
                    attackTimer.current = attackCooldown;
                    takeDamage(attackDmg);
                }
            }
        } else if (aiState.current === 'chase') {
            const speed = ENEMY_CHASE_SPEED * chaseSpeedMult * dt;
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, speed);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);

            // Use Jump when far away for a burst of speed
            if (dist > 18) {
                playRef.current('Jump');
                pos.current.addScaledVector(dir, speed * 2);
            } else {
                playRef.current('Walk');
            }
        } else {
            // ── Patrol with waypoint pause & fidget ──────────────────────
            if (waypoints.length > 0) {
                const wp = new THREE.Vector3(...waypoints[waypointIdx.current]!);
                const dir = wp.clone().sub(pos.current);
                const d = dir.length();

                if (waypointPause.current > 0) {
                    waypointPause.current -= dt;
                    fidgetTimer.current -= dt;
                    if (fidgetTimer.current <= 0) {
                        const anim = FIDGET_ANIMS[fidgetStep.current % FIDGET_ANIMS.length]!;
                        playRef.current(anim);
                        fidgetStep.current++;
                        fidgetTimer.current = 1.5 + Math.random() * 2.0;
                    }
                } else if (d < 0.5) {
                    waypointIdx.current = (waypointIdx.current + 1) % waypoints.length;
                    waypointPause.current = 2.0 + Math.random() * 2.5;
                    fidgetTimer.current = 0.1;
                    fidgetStep.current = Math.floor(Math.random() * FIDGET_ANIMS.length);
                } else {
                    playRef.current('Walk');
                    dir.normalize();
                    pos.current.addScaledVector(dir, ENEMY_PATROL_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 5 * dt);
                }
            } else {
                playRef.current('Idle');
            }
        }

        group.position.copy(pos.current);
        group.rotation.y = rotY.current;
    });

    // Expose hit handler
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.userData.takHit = (damage: number) => {
                if (isDead.current) return;
                hp.current -= damage;
                if (hp.current <= 0) {
                    isDead.current = true;
                    setDead(true);
                } else {
                    staggerTimer.current = STAGGER_DURATION;
                }
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <group scale={2.5}>
                <primitive object={clone} />
            </group>
            {!dead && <SnakeBossLabel />}
        </group>
    );
}
