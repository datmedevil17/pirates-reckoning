import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
    AGGRO_RANGE, STAGGER_DURATION,
    ENEMY_PATROL_SPEED, ENEMY_CHASE_SPEED,
    SPIDER_HP,
} from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

const SPIDER_PATH = '/models/island2animals/Spider.glb';
useGLTF.preload(SPIDER_PATH);

// Distance constants for ranged-boss behaviour
const SPIDER_ATTACK_RANGE = 9;   // trigger Attack anim
const SPIDER_RETREAT_DIST = 3.5; // back away if player this close
const SPIDER_AGGRO = AGGRO_RANGE * 1.6;

const FIDGET_ANIMS = ['Idle', 'Idle', 'Walk'] as const;

interface SpiderEnemyProps {
    id: string;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

function SpiderBossLabel() {
    return (
        <Html position={[0, 10, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
            <div style={{
                color: '#cc44ff',
                fontSize: 56,
                fontWeight: 900,
                fontFamily: '"Georgia", serif',
                textShadow: '0 0 18px #aa00ff, 0 0 36px #aa00ff, 3px 3px 0 #000, -1px -1px 0 #000',
                letterSpacing: 8,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
                lineHeight: 1,
            }}>
                ☠ ARACHNIS ☠
            </div>
        </Html>
    );
}

export function SpiderEnemy({
    id,
    position,
    waypoints,
    playerPosRef,
}: SpiderEnemyProps) {
    const { scene, animations } = useGLTF(SPIDER_PATH);
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(0);
    const curAnim = useRef('');
    const aiState = useRef<AIState>('patrol');
    const [dead, setDead] = useState(false);

    const hp = useRef(SPIDER_HP);
    const attackDmg = 32;
    const attackCooldown = 2.0;
    const chaseSpeedMult = 1.5;

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
        const prefixed = `Spider_${name}`;
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
                addLootDrop({ type: 'gemPink',  position: [pos.current.x,       0.2, pos.current.z - 0.5], id: `loot-${id}-gem`   });
                addLootDrop({ type: 'bottle2',  position: [pos.current.x,       0.2, pos.current.z + 0.5], id: `loot-${id}-pot`   });
                addResource('gold', 60);
                addResource('gemPink', 1);
                setTimeout(() => removeEnemy(id), 5000);
            }
            return;
        }

        // ── Stagger ──────────────────────────────────────────────────────────
        if (staggerTimer.current > 0) {
            staggerTimer.current -= dt;
            playRef.current('Idle');
            return;
        }

        if (!playerPos) return;

        const dist = pos.current.distanceTo(playerPos);

        if (attackTimer.current > 0) attackTimer.current -= dt;

        // ── State transitions ─────────────────────────────────────────────
        if (dist < SPIDER_ATTACK_RANGE) {
            aiState.current = 'attack';
        } else if (dist < SPIDER_AGGRO) {
            if (aiState.current === 'patrol' && !alertDone.current) {
                alertDone.current = true;
                alertTimer.current = 1.0;
                aiState.current = 'alert';
            } else if (aiState.current !== 'alert') {
                aiState.current = 'chase';
            }
        } else {
            aiState.current = 'patrol';
            if (dist > SPIDER_AGGRO + 10) alertDone.current = false;
        }

        // ── Alert ────────────────────────────────────────────────────────
        if (aiState.current === 'alert') {
            playRef.current('Idle');
            const dir = playerPos.clone().sub(pos.current).normalize();
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 5 * dt);
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
            if (dist < SPIDER_RETREAT_DIST) {
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

            // Jump burst when far
            if (dist > 20) {
                playRef.current('Jump');
                pos.current.addScaledVector(dir, speed * 1.8);
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
            <group scale={2.8}>
                <primitive object={clone} />
            </group>
            {!dead && <SpiderBossLabel />}
        </group>
    );
}
