import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STAGGER_DURATION, BIGSNAKE_HP } from '../../lib/constants';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

// Reuses the same GLB already preloaded by SnakeEnemy
useGLTF.preload('/models/island2animals/Snake.glb');

const SNAKE_AGGRO      = 24;
const SNAKE_ATTACK_DIST = 2.8;
const SNAKE_WALK_SPEED  = 3.0;
const SNAKE_CHASE_SPEED = 6.5;
const SNAKE_DAMAGE      = 30;
const SNAKE_ATTACK_CD   = 2.0;
const SNAKE_PATROL_R    = 55;
const SNAKE_PAUSE_TIME  = 3.0;
const ALERT_DURATION    = 1.2; // Snake_Jump on first spot

interface RoamingSnakeProps {
    id: string;
    position: [number, number, number];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function RoamingSnake({ id, position, playerPosRef }: RoamingSnakeProps) {
    const { scene, animations } = useGLTF('/models/island2animals/Snake.glb');
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef     = useRef<THREE.Group>(null!);
    const pos          = useRef(new THREE.Vector3(...position));
    const spawnPos     = useRef(new THREE.Vector3(...position));
    const rotY         = useRef(0);
    const curAnim      = useRef('');
    const hp           = useRef(BIGSNAKE_HP);
    const staggerTimer = useRef(0);
    const attackTimer  = useRef(0);
    const alertTimer   = useRef(0);
    const wasAggro     = useRef(false);
    const isDead       = useRef(false);
    const lootSpawned  = useRef(false);

    const patrolTarget = useRef(new THREE.Vector3(...position));
    const pauseTimer   = useRef(0);
    const isWalking    = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage  = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    const pickPatrolTarget = () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * SNAKE_PATROL_R;
        patrolTarget.current.set(
            spawnPos.current.x + Math.cos(angle) * r,
            0,
            spawnPos.current.z + Math.sin(angle) * r,
        );
        isWalking.current = true;
    };

    const playRef = useRef((_name: string, _once?: boolean) => {});
    playRef.current = (name: string, once = false) => {
        const target = actions[name] ? name : (names[0] ?? '');
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
        if (names.length === 0) return;
        curAnim.current = '';
        Object.values(actions).forEach(a => a?.stop());
        const idle = actions['Snake_Idle'];
        if (idle) { idle.reset().setLoop(THREE.LoopRepeat, Infinity).play(); curAnim.current = 'Snake_Idle'; }
        if (groupRef.current) groupRef.current.position.copy(pos.current);
        pickPatrolTarget();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [names.length]);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        const dt = Math.min(delta, 0.05);
        const playerPos = playerPosRef.current;

        // ── Dead ─────────────────────────────────────────────────────────────
        if (isDead.current) {
            if (!lootSpawned.current) {
                lootSpawned.current = true;
                playRef.current('Snake_Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x - 1, 0.2, pos.current.z], id: `loot-${id}-gold` });
                addLootDrop({ type: 'gemBlue', position: [pos.current.x + 1, 0.2, pos.current.z], id: `loot-${id}-gem` });
                addResource('gold', 50);
                setTimeout(() => removeEnemy(id), 4000);
            }
            return;
        }

        if (staggerTimer.current > 0) { staggerTimer.current -= dt; return; }

        const dist = playerPos ? pos.current.distanceTo(playerPos) : Infinity;
        if (attackTimer.current > 0) attackTimer.current -= dt;
        if (alertTimer.current > 0)  alertTimer.current  -= dt;

        const aggro = dist <= SNAKE_AGGRO;

        // Alert strike (Snake_Jump) on first spot
        if (aggro && !wasAggro.current) {
            wasAggro.current = true;
            alertTimer.current = ALERT_DURATION;
            playRef.current('Snake_Jump', true);
        }
        if (!aggro) wasAggro.current = false;

        if (alertTimer.current > 0) {
            if (playerPos) {
                const toPlayer = playerPos.clone().sub(pos.current);
                rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 5 * dt);
            }
            group.position.copy(pos.current);
            group.rotation.y = rotY.current;
            return;
        }

        // ── Attack ────────────────────────────────────────────────────────────
        if (dist <= SNAKE_ATTACK_DIST && playerPos) {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 8 * dt);
            playRef.current('Snake_Attack');
            if (attackTimer.current <= 0) {
                attackTimer.current = SNAKE_ATTACK_CD;
                takeDamage(SNAKE_DAMAGE);
            }

        // ── Chase ─────────────────────────────────────────────────────────────
        } else if (aggro && playerPos) {
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, SNAKE_CHASE_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 6 * dt);
            playRef.current('Snake_Walk');

        // ── Patrol ───────────────────────────────────────────────────────────
        } else {
            if (pauseTimer.current > 0) {
                pauseTimer.current -= dt;
                playRef.current('Snake_Idle');
            } else if (isWalking.current) {
                const toTarget = patrolTarget.current.clone().sub(pos.current);
                if (toTarget.length() < 2.0) {
                    isWalking.current = false;
                    pauseTimer.current = SNAKE_PAUSE_TIME + Math.random() * 4;
                    playRef.current('Snake_Idle');
                } else {
                    const dir = toTarget.normalize();
                    pos.current.addScaledVector(dir, SNAKE_WALK_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 3 * dt);
                    playRef.current('Snake_Walk');
                }
            } else {
                pickPatrolTarget();
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
                else staggerTimer.current = STAGGER_DURATION * 0.5;
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <group scale={2.2}>
                <primitive object={clone} />
            </group>
        </group>
    );
}
