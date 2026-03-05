import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STAGGER_DURATION, WOLF_HP } from '../../lib/constants';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload('/models/island2animals/Wolf.gltf');

const WOLF_AGGRO      = 22;   // detection radius — pack picks this up fast
const WOLF_ATTACK_DIST = 1.8;
const WOLF_WALK_SPEED  = 4.0;
const WOLF_RUN_SPEED   = 9.0;
const WOLF_DAMAGE      = 18;
const WOLF_ATTACK_CD   = 1.4;
const WOLF_PATROL_R    = 28;  // stay near pack spawn
const WOLF_PAUSE_TIME  = 1.8;

interface WolfEnemyProps {
    id: string;
    position: [number, number, number];
    packAggroRef: React.MutableRefObject<boolean>; // shared flag — any wolf seeing player alerts whole pack
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function WolfEnemy({ id, position, packAggroRef, playerPosRef }: WolfEnemyProps) {
    const { scene, animations } = useGLTF('/models/island2animals/Wolf.gltf');
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef     = useRef<THREE.Group>(null!);
    const pos          = useRef(new THREE.Vector3(...position));
    const spawnPos     = useRef(new THREE.Vector3(...position));
    const rotY         = useRef(0);
    const curAnim      = useRef('');
    const hp           = useRef(WOLF_HP);
    const staggerTimer = useRef(0);
    const attackTimer  = useRef(0);
    const alertTimer   = useRef(0); // Gallop_Jump plays once on first aggro
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
        const r = 5 + Math.random() * WOLF_PATROL_R;
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
        actions[curAnim.current]?.fadeOut(0.15);
        const a = actions[target]!;
        a.reset().fadeIn(0.15);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = target;
    };

    useEffect(() => {
        if (names.length === 0) return;
        curAnim.current = '';
        Object.values(actions).forEach(a => a?.stop());
        const idle = actions['Idle'];
        if (idle) { idle.reset().setLoop(THREE.LoopRepeat, Infinity).play(); curAnim.current = 'Idle'; }
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
                playRef.current('Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}` });
                addResource('gold', 20);
                setTimeout(() => removeEnemy(id), 3000);
            }
            return;
        }

        if (staggerTimer.current > 0) {
            staggerTimer.current -= dt;
            // Pick hit react animation
            if (curAnim.current !== 'Idle_HitReact1' && curAnim.current !== 'Idle_HitReact2') {
                playRef.current(Math.random() < 0.5 ? 'Idle_HitReact1' : 'Idle_HitReact2', true);
            }
            return;
        }

        const dist = playerPos ? pos.current.distanceTo(playerPos) : Infinity;
        if (attackTimer.current > 0) attackTimer.current -= dt;
        if (alertTimer.current > 0)  alertTimer.current  -= dt;

        // Pack aggro — if this wolf sees player, flag the whole pack; also respond to pack flag
        const inOwnAggro = dist <= WOLF_AGGRO;
        if (inOwnAggro) packAggroRef.current = true;
        const aggro = packAggroRef.current && dist < WOLF_AGGRO * 2.5;

        // Alert jump on first aggro
        if (aggro && !wasAggro.current) {
            wasAggro.current = true;
            alertTimer.current = 0.9;
            playRef.current('Gallop_Jump', true);
        }
        if (!aggro) wasAggro.current = false;

        // Stand still during alert
        if (alertTimer.current > 0) {
            if (playerPos) {
                const toPlayer = playerPos.clone().sub(pos.current);
                rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 6 * dt);
            }
            group.position.copy(pos.current);
            group.rotation.y = rotY.current;
            return;
        }

        // ── Attack ────────────────────────────────────────────────────────────
        if (dist <= WOLF_ATTACK_DIST && playerPos) {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 10 * dt);
            playRef.current('Attack');
            if (attackTimer.current <= 0) {
                attackTimer.current = WOLF_ATTACK_CD;
                takeDamage(WOLF_DAMAGE);
            }

        // ── Chase (Gallop) ────────────────────────────────────────────────────
        } else if (aggro && playerPos) {
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, WOLF_RUN_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);
            playRef.current('Gallop');

        // ── Patrol ───────────────────────────────────────────────────────────
        } else {
            if (!aggro) packAggroRef.current = false; // reset pack flag when calm
            if (pauseTimer.current > 0) {
                pauseTimer.current -= dt;
                // Occasionally eat during long pauses for atmosphere
                if (pauseTimer.current > 1.5 && curAnim.current !== 'Eating') {
                    playRef.current(Math.random() < 0.3 ? 'Eating' : 'Idle_2');
                } else if (pauseTimer.current <= 1.5) {
                    playRef.current('Idle');
                }
            } else if (isWalking.current) {
                const toTarget = patrolTarget.current.clone().sub(pos.current);
                if (toTarget.length() < 1.5) {
                    isWalking.current = false;
                    pauseTimer.current = WOLF_PAUSE_TIME + Math.random() * 2;
                    playRef.current('Idle');
                } else {
                    const dir = toTarget.normalize();
                    pos.current.addScaledVector(dir, WOLF_WALK_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 4 * dt);
                    playRef.current('Walk');
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
                packAggroRef.current = true; // getting hit alerts the whole pack
                if (hp.current <= 0) isDead.current = true;
                else staggerTimer.current = STAGGER_DURATION * 0.6;
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={clone} scale={1.1} />
        </group>
    );
}
