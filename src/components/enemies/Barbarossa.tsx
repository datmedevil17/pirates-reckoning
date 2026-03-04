import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTERS, WEAPONS } from '../../lib/assets';
import { BARBAROSSA_HP, ATTACK_RANGE, AGGRO_RANGE, STAGGER_DURATION, ENEMY_CHASE_SPEED } from '../../lib/constants';
import { lerpAngle, WeaponInHand } from '../shared/AnimatedCharacter';
import { usePlayerStore } from '../../store/playerStore';
import { useRunStore } from '../../store/runStore';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload(CHARACTERS.barbarossa);

interface BarbarossaProps {
    id: string;
    position: [number, number, number];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function Barbarossa({ id, position, playerPosRef }: BarbarossaProps) {
    const { scene, animations } = useGLTF(CHARACTERS.barbarossa);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const groupRef = useRef<THREE.Group>(null!);
    const pos = useRef(new THREE.Vector3(...position));
    const rotY = useRef(Math.PI);
    const curAnim = useRef('');
    const hp = useRef(BARBAROSSA_HP);
    const phase = useRef(1); // 1 = solo, 2 = summon
    const staggerTimer = useRef(0);
    const attackTimer = useRef(2);
    const isDead = useRef(false);
    const lootSpawned = useRef(false);

    const takeDamage = usePlayerStore(s => s.takeDamage);
    const removeEnemy = useRunStore(s => s.removeEnemy);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const addResource = useGameStore(s => s.addResource);
    const setPhase = useRunStore(s => s.setPhase);

    const playRef = useRef((_name: string, _once?: boolean) => { });
    playRef.current = (name: string, once = false) => {
        if (!actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2);
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

    // Mixer finished — return to idle after one-shot
    useEffect(() => {
        const onFinished = () => {
            if (!isDead.current) {
                const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
                if (idle) playRef.current(idle, false);
            }
        };
        mixer.addEventListener('finished', onFinished);
        return () => mixer.removeEventListener('finished', onFinished);
    }, [mixer, actions, names]);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        const dt = Math.min(delta, 0.05);
        const playerPos = playerPosRef.current;

        if (isDead.current) {
            if (!lootSpawned.current) {
                lootSpawned.current = true;
                playRef.current('Death', true);
                addLootDrop({ type: 'goldBag', position: [pos.current.x, 0.3, pos.current.z], id: `loot-${id}-bag` });
                addLootDrop({ type: 'gemBlue', position: [pos.current.x + 0.5, 0.3, pos.current.z], id: `loot-${id}-gem` });
                addResource('gold', 100);
                addResource('gemBlue', 3);
                setTimeout(() => removeEnemy(id), 4000);
            }
            return;
        }

        if (staggerTimer.current > 0) { staggerTimer.current -= dt; playRef.current('HitReact'); return; }
        if (!playerPos) return;

        // Phase 2 trigger at 50% HP
        if (hp.current < BARBAROSSA_HP * 0.5 && phase.current === 1) {
            phase.current = 2;
            setPhase(2);
            // Taunt wave animation
            playRef.current('Wave', true);
        }

        const dist = pos.current.distanceTo(playerPos);
        if (attackTimer.current > 0) attackTimer.current -= dt;

        if (dist < ATTACK_RANGE * 1.3) {
            // Phase 2 is more aggressive
            const combo = phase.current === 2 ? 'Sword' : (Math.random() < 0.5 ? 'Sword' : 'Punch');
            playRef.current(combo);
            if (attackTimer.current <= 0) {
                attackTimer.current = phase.current === 2 ? 0.9 : 1.4;
                // Phase 2 deals more damage
                takeDamage(phase.current === 2 ? 28 : 18);
            }
        } else if (dist < AGGRO_RANGE * 1.5) {
            playRef.current('Run');
            const speed = (phase.current === 2 ? ENEMY_CHASE_SPEED * 1.4 : ENEMY_CHASE_SPEED) * dt;
            const dir = playerPos.clone().sub(pos.current).normalize();
            pos.current.addScaledVector(dir, speed);
            rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 8 * dt);
        } else {
            playRef.current('Idle');
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
                else staggerTimer.current = STAGGER_DURATION * 0.5; // boss staggers briefly
            };
            groupRef.current.userData.enemyId = id;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene.clone(true)} />
            <WeaponInHand characterScene={scene} weaponPath={WEAPONS.cutlass} />
            {/* Phase 2 aura */}
            {phase.current === 2 && (
                <pointLight color="#ff4400" intensity={3} distance={8} decay={2} />
            )}
        </group>
    );
}
