import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STAGGER_DURATION, RAPTOR_HP } from '../../lib/constants';
import { lerpAngle } from '../shared/AnimatedCharacter';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload('/models/island2animals/Velociraptor.glb');

const RAPTOR_AGGRO       = 26;
const RAPTOR_ATTACK_DIST = 2.0;
const RAPTOR_WALK_SPEED  = 4.5;
const RAPTOR_RUN_SPEED   = 11.0;
const RAPTOR_DAMAGE      = 22;
const RAPTOR_ATTACK_CD   = 1.2;
const RAPTOR_PATROL_R    = 30;
const RAPTOR_PAUSE_TIME  = 1.5;
const ALERT_DURATION     = 0.8; // Velociraptor_Jump plays once on first spot

interface VelociraptorEnemyProps {
    id: string;
    position: [number, number, number];
    packAggroRef: React.MutableRefObject<boolean>; // shared flag — any raptor seeing player alerts whole pack
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function VelociraptorEnemy({ id, position, packAggroRef, playerPosRef }: VelociraptorEnemyProps) {
    const { scene, animations } = useGLTF('/models/island2animals/Velociraptor.glb');
    const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
    const { actions, names } = useAnimations(animations, clone);

    const groupRef     = useRef<THREE.Group>(null!);
    const pos          = useRef(new THREE.Vector3(...position));
    const spawnPos     = useRef(new THREE.Vector3(...position));
    const rotY         = useRef(0);
    const curAnim      = useRef('');
    const hp           = useRef(RAPTOR_HP);
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
        const r = 5 + Math.random() * RAPTOR_PATROL_R;
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
        const idle = actions['Velociraptor_Idle'];
        if (idle) { idle.reset().setLoop(THREE.LoopRepeat, Infinity).play(); curAnim.current = 'Velociraptor_Idle'; }
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
                playRef.current('Velociraptor_Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x, 0.2, pos.current.z], id: `loot-${id}` });
                addResource('gold', 25);
                setTimeout(() => removeEnemy(id), 3000);
            }
            return;
        }

        if (staggerTimer.current > 0) {
            staggerTimer.current -= dt;
            if (curAnim.current !== 'Velociraptor_Jump') {
                playRef.current('Velociraptor_Jump', true);
            }
            return;
        }

        const dist = playerPos ? pos.current.distanceTo(playerPos) : Infinity;
        if (attackTimer.current > 0) attackTimer.current -= dt;
        if (alertTimer.current > 0)  alertTimer.current  -= dt;

        // Pack aggro — any raptor seeing player alerts the whole pack
        const inOwnAggro = dist <= RAPTOR_AGGRO;
        if (inOwnAggro) packAggroRef.current = true;
        const aggro = packAggroRef.current && dist < RAPTOR_AGGRO * 2.5;

        // Alert screech on first aggro
        if (aggro && !wasAggro.current) {
            wasAggro.current = true;
            alertTimer.current = ALERT_DURATION;
            playRef.current('Velociraptor_Jump', true);
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
        if (dist <= RAPTOR_ATTACK_DIST && playerPos) {
            const toPlayer = playerPos.clone().sub(pos.current);
            rotY.current = lerpAngle(rotY.current, Math.atan2(toPlayer.x, toPlayer.z), 10 * dt);
            playRef.current('Velociraptor_Attack');
            if (attackTimer.current <= 0) {
                attackTimer.current = RAPTOR_ATTACK_CD;
                takeDamage(RAPTOR_DAMAGE);
            }

        // ── Chase ─────────────────────────────────────────────────────────────
        } else if (aggro && playerPos) {
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, RAPTOR_RUN_SPEED * dt);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);
            playRef.current('Velociraptor_Run');

        // ── Patrol ───────────────────────────────────────────────────────────
        } else {
            if (!aggro) packAggroRef.current = false;
            if (pauseTimer.current > 0) {
                pauseTimer.current -= dt;
                playRef.current('Velociraptor_Idle');
            } else if (isWalking.current) {
                const toTarget = patrolTarget.current.clone().sub(pos.current);
                if (toTarget.length() < 1.5) {
                    isWalking.current = false;
                    pauseTimer.current = RAPTOR_PAUSE_TIME + Math.random() * 2;
                    playRef.current('Velociraptor_Idle');
                } else {
                    const dir = toTarget.normalize();
                    pos.current.addScaledVector(dir, RAPTOR_WALK_SPEED * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 4 * dt);
                    playRef.current('Velociraptor_Walk');
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
                else staggerTimer.current = STAGGER_DURATION * 0.5;
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={clone} scale={1.0} />
        </group>
    );
}
