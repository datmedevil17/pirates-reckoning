import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
    AGGRO_RANGE, STAGGER_DURATION,
    ENEMY_PATROL_SPEED, ENEMY_CHASE_SPEED,
    MANTARAY_HP,
} from '../../lib/constants';
import type { AIState } from '../../lib/types';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

const MANTA_PATH = '/models/underwater/MantaRay.glb';
useGLTF.preload(MANTA_PATH);

const MANTA_ATTACK_RANGE = 5;
const MANTA_RETREAT_DIST = 2;
const MANTA_AGGRO = AGGRO_RANGE * 1.8;

interface MantaRayEnemyProps {
    id: string;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

function MantaLabel() {
    return (
        <Html position={[0, 8, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
            <div style={{
                color: '#00ccff',
                fontSize: 52,
                fontWeight: 900,
                fontFamily: '"Georgia", serif',
                textShadow: '0 0 16px #00eeff, 0 0 32px #0088cc, 3px 3px 0 #000, -1px -1px 0 #000',
                letterSpacing: 6,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
                lineHeight: 1,
            }}>
                〜 MANTA RAY 〜
            </div>
        </Html>
    );
}

export function MantaRayEnemy({ id, position, waypoints, playerPosRef }: MantaRayEnemyProps) {
    const { scene, animations } = useGLTF(MANTA_PATH);
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(0);
    const curAnim = useRef('');
    const aiState = useRef<AIState>('patrol');
    const [dead, setDead] = useState(false);

    const hp = useRef(MANTARAY_HP);
    const attackDmg = 22;
    const attackCooldown = 2.0;
    const chaseSpeedMult = 1.3;

    const staggerTimer = useRef(0);
    const attackTimer = useRef(0);
    const waypointIdx = useRef(0);
    const waypointPause = useRef(0);
    const alertDone = useRef(false);
    const alertTimer = useRef(0);
    const isDead = useRef(false);
    const lootSpawned = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    // Try exact name, then first available
    const resolveAnim = (name: string): string => {
        if (actions[name]) return name;
        const prefixed = `Manta_${name}`;
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
                playRef.current('Death', true);
                addLootDrop({ type: 'goldBag',  position: [pos.current.x - 0.5, 0.2, pos.current.z],      id: `loot-${id}-gold1` });
                addLootDrop({ type: 'gemBlue',  position: [pos.current.x + 0.5, 0.2, pos.current.z],      id: `loot-${id}-gem`   });
                addLootDrop({ type: 'bottle1',  position: [pos.current.x,       0.2, pos.current.z + 0.5], id: `loot-${id}-pot`   });
                addResource('gold', 35);
                addResource('gemBlue', 1);
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

        // ── State transitions ─────────────────────────────────────────────────
        if (dist < MANTA_ATTACK_RANGE) {
            aiState.current = 'attack';
        } else if (dist < MANTA_AGGRO) {
            if (aiState.current === 'patrol' && !alertDone.current) {
                alertDone.current = true;
                alertTimer.current = 0.8;
                aiState.current = 'alert';
            } else if (aiState.current !== 'alert') {
                aiState.current = 'chase';
            }
        } else {
            aiState.current = 'patrol';
            if (dist > MANTA_AGGRO + 10) alertDone.current = false;
        }

        // ── Alert ─────────────────────────────────────────────────────────────
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

        // ── Execute state ─────────────────────────────────────────────────────
        if (aiState.current === 'attack') {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 8 * dt);

            if (dist < MANTA_RETREAT_DIST) {
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
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, ENEMY_CHASE_SPEED * chaseSpeedMult * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);
            if (dist > 20) {
                playRef.current('Jump');
                pos.current.addScaledVector(dir, ENEMY_CHASE_SPEED * chaseSpeedMult * dt * 1.5);
            } else {
                playRef.current('Walk');
            }
        } else {
            // ── Patrol ───────────────────────────────────────────────────────
            if (waypoints.length > 0) {
                const wp = new THREE.Vector3(...waypoints[waypointIdx.current]!);
                const dir = wp.clone().sub(pos.current);
                const d = dir.length();
                if (waypointPause.current > 0) {
                    waypointPause.current -= dt;
                    playRef.current('Idle');
                } else if (d < 0.5) {
                    waypointIdx.current = (waypointIdx.current + 1) % waypoints.length;
                    waypointPause.current = 1.5 + Math.random() * 2.0;
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
            {!dead && <MantaLabel />}
        </group>
    );
}
