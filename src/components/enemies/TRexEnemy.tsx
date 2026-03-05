import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STAGGER_DURATION, TREX_HP } from '../../lib/constants';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload('/models/island2animals/Trex.glb');

const TREX_AGGRO       = 30;
const TREX_ATTACK_DIST = 3.5;
const TREX_WALK_SPEED  = 3.5;
const TREX_RUN_SPEED   = 8.0;
const TREX_DAMAGE      = 40;
const TREX_ATTACK_CD   = 2.2;
const TREX_PATROL_R    = 45;
const TREX_PAUSE_TIME  = 2.5;
const ROAR_DURATION    = 1.4; // seconds TRex_Jump plays on first aggro

interface TRexEnemyProps {
    id: string;
    position: [number, number, number];
    zoneRadius?: number;
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function TRexEnemy({ id, position, zoneRadius = TREX_PATROL_R, playerPosRef }: TRexEnemyProps) {
    const { scene, animations } = useGLTF('/models/island2animals/Trex.glb');
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef     = useRef<THREE.Group>(null!);
    const pos          = useRef(new THREE.Vector3(...position));
    const spawnPos     = useRef(new THREE.Vector3(...position));
    const rotY         = useRef(0);
    const curAnim      = useRef('');
    const hp           = useRef(TREX_HP);
    const staggerTimer = useRef(0);
    const attackTimer  = useRef(0);
    const roarTimer    = useRef(0);   // plays TRex_Jump when TRex first spots player
    const wasAggro     = useRef(false);
    const isDead       = useRef(false);
    const lootSpawned  = useRef(false);

    // Patrol
    const patrolTarget = useRef(new THREE.Vector3(...position));
    const pauseTimer   = useRef(0);
    const isWalking    = useRef(false);

    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const takeDamage  = usePlayerStore(s => s.takeDamage);
    const addResource = useGameStore(s => s.addResource);

    const pickPatrolTarget = () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * zoneRadius;
        patrolTarget.current.set(
            spawnPos.current.x + Math.cos(angle) * r,
            0,
            spawnPos.current.z + Math.sin(angle) * r,
        );
        isWalking.current = true;
    };

    // ── Animation helper ──────────────────────────────────────────────────────
    // Always resolves via the ref so useFrame never has stale closures
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

    // Start idle + pick first patrol target once animations are ready
    useEffect(() => {
        if (names.length === 0) return;
        curAnim.current = '';
        Object.values(actions).forEach(a => a?.stop());
        const idle = actions['TRex_Idle'];
        if (idle) { idle.reset().setLoop(THREE.LoopRepeat, Infinity).play(); curAnim.current = 'TRex_Idle'; }
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
                playRef.current('TRex_Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x - 1.5, 0.2, pos.current.z], id: `loot-${id}-gold` });
                addLootDrop({ type: 'gemBlue', position: [pos.current.x + 1.5, 0.2, pos.current.z], id: `loot-${id}-gem` });
                addResource('gold', 80);
                setTimeout(() => removeEnemy(id), 4500);
            }
            return;
        }

        if (staggerTimer.current > 0) { staggerTimer.current -= dt; return; }

        const dist = playerPos ? pos.current.distanceTo(playerPos) : Infinity;
        if (attackTimer.current > 0) attackTimer.current -= dt;
        if (roarTimer.current > 0)   roarTimer.current   -= dt;

        const inAggro = dist <= TREX_AGGRO;

        // Trigger roar animation the moment TRex first spots the player
        if (inAggro && !wasAggro.current) {
            wasAggro.current = true;
            roarTimer.current = ROAR_DURATION;
            playRef.current('TRex_Jump', true);
        }
        if (!inAggro) wasAggro.current = false;

        // ── Roar / aggro entry (TRex_Jump plays, TRex pauses briefly) ────────
        if (roarTimer.current > 0) {
            if (playerPos) {
                const toPlayer = playerPos.clone().sub(pos.current);
                rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 4 * dt);
            }
            group.position.copy(pos.current);
            group.rotation.y = rotY.current;
            return; // stand still while roaring
        }

        // ── Attack ────────────────────────────────────────────────────────────
        if (dist <= TREX_ATTACK_DIST && playerPos) {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 8 * dt);
            playRef.current('TRex_Attack');
            if (attackTimer.current <= 0) {
                attackTimer.current = TREX_ATTACK_CD;
                takeDamage(TREX_DAMAGE);
            }

        // ── Chase (TRex_Run) ──────────────────────────────────────────────────
        } else if (inAggro && playerPos) {
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, TREX_RUN_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 5 * dt);
            playRef.current('TRex_Run');

        // ── Patrol (TRex_Walk / TRex_Idle) ───────────────────────────────────
        } else {
            if (pauseTimer.current > 0) {
                pauseTimer.current -= dt;
                playRef.current('TRex_Idle');
            } else if (isWalking.current) {
                const toTarget = patrolTarget.current.clone().sub(pos.current);
                if (toTarget.length() < 2.0) {
                    isWalking.current = false;
                    pauseTimer.current = TREX_PAUSE_TIME + Math.random() * 3;
                    playRef.current('TRex_Idle');
                } else {
                    const dir = toTarget.normalize();
                    pos.current.addScaledVector(dir, TREX_WALK_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 3 * dt);
                    playRef.current('TRex_Walk');
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
                else staggerTimer.current = STAGGER_DURATION * 0.3;
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <group scale={0.8}>
                <primitive object={clone} />
            </group>
        </group>
    );
}
