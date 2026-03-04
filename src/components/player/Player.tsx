import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { WeaponInHand, lerpAngle } from '../shared/AnimatedCharacter';
import { CHARACTERS, WEAPONS } from '../../lib/assets';
import { PLAYER_MOVE_SPEED, PLAYER_ROTATE_SPEED } from '../../lib/constants';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';

// Camera settings
const CAM_DIST = 5.5;
const CAM_HEAD_H = 1.2;
const CAM_SPEED = 0.004;
const CAM_MIN_PITCH = -0.15;
const CAM_MAX_PITCH = 0.75;

// Preload player models
useGLTF.preload(CHARACTERS.anne);
useGLTF.preload(CHARACTERS.henry);
Object.values(WEAPONS).forEach(p => useGLTF.preload(p));

// ─── Third-Person Camera ─────────────────────────────────────────────────────

function PlayerCamera({ rbRef, cameraYawRef, cameraPitchRef }: {
    rbRef: React.RefObject<RapierRigidBody>;
    cameraYawRef: React.RefObject<number>;
    cameraPitchRef: React.RefObject<number>;
}) {
    const { camera, gl } = useThree();

    useEffect(() => {
        const canvas = gl.domElement;
        let dragging = false, lastX = 0, lastY = 0;
        const onDown = (e: MouseEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
        const onMove = (e: MouseEvent) => {
            if (!dragging) return;
            cameraYawRef.current! += (e.clientX - lastX) * CAM_SPEED;
            cameraPitchRef.current! = Math.max(CAM_MIN_PITCH, Math.min(CAM_MAX_PITCH,
                cameraPitchRef.current! + (e.clientY - lastY) * CAM_SPEED));
            lastX = e.clientX; lastY = e.clientY;
        };
        const onUp = () => { dragging = false; };
        const noCtx = (e: Event) => e.preventDefault();
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('contextmenu', noCtx);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            canvas.removeEventListener('mousedown', onDown);
            canvas.removeEventListener('contextmenu', noCtx);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [gl, cameraYawRef, cameraPitchRef]);

    useFrame(() => {
        const rb = rbRef.current;
        if (!rb) return;
        const translation = rb.translation();
        const cp = new THREE.Vector3(translation.x, translation.y, translation.z);

        const yaw = cameraYawRef.current!;
        const pitch = cameraPitchRef.current!;

        camera.position.set(
            cp.x + CAM_DIST * Math.sin(yaw) * Math.cos(pitch),
            cp.y + CAM_HEAD_H + CAM_DIST * Math.sin(pitch),
            cp.z + CAM_DIST * Math.cos(yaw) * Math.cos(pitch),
        );
        camera.lookAt(cp.x, cp.y + CAM_HEAD_H * 0.8, cp.z);
    });
    return null;
}

// ─── Player ───────────────────────────────────────────────────────────────────

type JumpPhase = 'none' | 'up' | 'air' | 'land';

interface PlayerProps {
    spawnPosition?: [number, number, number];
    keysRef: React.RefObject<Set<string>>;
    cameraYawRef: React.RefObject<number>;
    cameraPitchRef: React.RefObject<number>;
    /** Called each frame with the player world position (for enemy AI) */
    onPositionUpdate?: (pos: THREE.Vector3) => void;
    /** Called when player attacks (for hit detection) */
    onAttack?: (pos: THREE.Vector3, dir: THREE.Vector3) => void;
}

export function Player({
    spawnPosition = [0, 0, 0],
    keysRef,
    cameraYawRef,
    cameraPitchRef,
    onPositionUpdate,
    onAttack,
}: PlayerProps) {
    const characterChoice = useGameStore(s => s.characterChoice);
    const weaponPath = usePlayerStore(s => s.equippedRight);
    const isAlive = usePlayerStore(s => s.isAlive);

    // Support any character choice, defaulting to 'anne' if not found
    const modelPath = (CHARACTERS as any)[characterChoice] || CHARACTERS.anne;
    const { scene, animations } = useGLTF(modelPath) as any;
    const { actions, names, mixer } = useAnimations(animations, scene);

    const charGroupRef = useRef<THREE.Group | null>(null);
    const rbRef = useRef<RapierRigidBody>(null!);
    const charRotY = useRef(0);
    const curAnim = useRef('');
    const actionActive = useRef(false);
    const jumpPhase = useRef<JumpPhase>('none');
    const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Action keys
    const actionRef = useRef<string | null>(null);
    const ACTION_MAP: Record<string, string> = {
        ' ': 'Jump', 'e': 'Sword', 'q': 'Punch',
        'f': 'Wave', 'r': 'Duck', 'g': 'HitReact',
        'x': 'Death', 'h': 'Yes', 'n': 'No',
    };

    const playRef = useRef((_name: string, _once: boolean) => { });
    playRef.current = (name: string, once: boolean) => {
        if (!actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
    };

    // Init on model change
    useEffect(() => {
        if (jumpTimer.current) { clearTimeout(jumpTimer.current); jumpTimer.current = null; }
        if (rbRef.current) {
            // Spawn slightly above ground to prevent clipping
            const spawnWithOffset = [spawnPosition[0], spawnPosition[1] + 1, spawnPosition[2]];
            rbRef.current.setTranslation(new THREE.Vector3(...spawnWithOffset), true);
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
        charRotY.current = 0;
        actionActive.current = false;
        jumpPhase.current = 'none';
        curAnim.current = '';
        const runAnim = names.includes('Run') ? 'Run' : names.includes('Walk') ? 'Walk' : '';
        const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
        if (runAnim || idle) {
            Object.values(actions).forEach(a => a?.stop());
            const startAnim = runAnim || idle;
            actions[startAnim]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = startAnim;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelPath, actions, names, spawnPosition]);

    // Jump chain via mixer 'finished'
    useEffect(() => {
        const onFinished = (e: THREE.Event & { action?: THREE.AnimationAction }) => {
            if (jumpPhase.current === 'up' && e.action === actions['Jump']) {
                if (names.includes('Jump_Idle')) {
                    jumpPhase.current = 'air';
                    playRef.current('Jump_Idle', false);
                    jumpTimer.current = setTimeout(() => {
                        jumpPhase.current = 'land';
                        if (names.includes('Jump_Land')) playRef.current('Jump_Land', true);
                        else { jumpPhase.current = 'none'; actionActive.current = false; }
                    }, 350);
                } else if (names.includes('Jump_Land')) {
                    jumpPhase.current = 'land';
                    playRef.current('Jump_Land', true);
                } else {
                    jumpPhase.current = 'none';
                    actionActive.current = false;
                }
            } else if (jumpPhase.current === 'land' && e.action === actions['Jump_Land']) {
                jumpPhase.current = 'none';
                actionActive.current = false;
                const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
                if (idle) playRef.current(idle, false);
            } else if (actionActive.current && jumpPhase.current === 'none') {
                // Attack animation finished — check for hit callback on Sword/Punch
                if (curAnim.current === 'Sword' || curAnim.current === 'Punch') {
                    const grp = charGroupRef.current;
                    if (grp && onAttack) {
                        const dir = new THREE.Vector3(
                            -Math.sin(charRotY.current), 0, -Math.cos(charRotY.current)
                        );
                        onAttack(grp.position.clone(), dir);
                    }
                }
                actionActive.current = false;
                const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
                if (idle) playRef.current(idle, false);
            }
        };
        mixer.addEventListener('finished', onFinished);
        return () => {
            mixer.removeEventListener('finished', onFinished);
            if (jumpTimer.current) clearTimeout(jumpTimer.current);
        };
    }, [mixer, actions, names, onAttack]);

    // Key listener for action keys
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
            if (ACTION_MAP[key]) { e.preventDefault(); actionRef.current = key; }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useFrame((_, delta) => {
        if (!isAlive) return;

        // ── Consume action key ────────────────────────────────────────────────
        const actionKey = actionRef.current;
        if (actionKey !== null) {
            actionRef.current = null;
            if (actionKey === ' ' && names.includes('Jump') && jumpPhase.current === 'none') {
                actionActive.current = true;
                jumpPhase.current = 'up';
                playRef.current('Jump', true);
            } else {
                const anim = ACTION_MAP[actionKey];
                if (anim && names.includes(anim) && jumpPhase.current === 'none') {
                    actionActive.current = true;
                    playRef.current(anim, true);
                }
            }
        }

        // ── Movement ─────────────────────────────────────────────────────────
        const keys = keysRef.current!;
        const rb = rbRef.current;
        if (!rb) return;

        const w = keys.has('w'), s = keys.has('s'), a = keys.has('a'), d = keys.has('d');
        const yaw = cameraYawRef.current!;
        const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
        const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
        let moveX = 0, moveZ = 0;
        if (w) { moveX += fwdX; moveZ += fwdZ; }
        if (s) { moveX -= fwdX; moveZ -= fwdZ; }
        if (a) { moveX -= rgtX; moveZ -= rgtZ; }
        if (d) { moveX += rgtX; moveZ += rgtZ; }

        const isMoving = moveX !== 0 || moveZ !== 0;
        const currentVel = rb.linvel();

        if (isMoving) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= len; moveZ /= len;

            // Set velocity directly for snappy movement
            rb.setLinvel({
                x: moveX * PLAYER_MOVE_SPEED,
                y: currentVel.y,
                z: moveZ * PLAYER_MOVE_SPEED
            }, true);

            const targetRot = Math.atan2(moveX, moveZ);
            charRotY.current = lerpAngle(charRotY.current, targetRot, PLAYER_ROTATE_SPEED * delta);
        } else {
            // Stop movement if no keys pressed
            rb.setLinvel({ x: 0, y: currentVel.y, z: 0 }, true);
        }

        const rbPos = rb.translation();
        const currentPos = new THREE.Vector3(rbPos.x, rbPos.y, rbPos.z);

        onPositionUpdate?.(currentPos);

        const group = charGroupRef.current;
        if (group) {
            group.rotation.y = charRotY.current;
        }

        // ── Animation state machine ───────────────────────────────────────────
        if (!actionActive.current) {
            if (isMoving) {
                const runAnim = names.includes('Run') ? 'Run' : names.includes('Walk') ? 'Walk' : '';
                if (runAnim) playRef.current(runAnim, false);
            } else {
                const idleAnim = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
                if (idleAnim) playRef.current(idleAnim, false);
            }
        }
    });

    return (
        <>
            <RigidBody
                ref={rbRef}
                colliders={false}
                position={spawnPosition}
                enabledRotations={[false, false, false]}
                friction={0.3}
                restitution={0}
                type="dynamic"
                ccd={true}
            >
                <CapsuleCollider args={[0.5, 0.4]} position={[0, 0.9, 0]} />
                <group ref={charGroupRef as React.RefObject<THREE.Group>}>
                    <primitive object={scene} />
                    {weaponPath && <WeaponInHand characterScene={scene} weaponPath={weaponPath} />}
                </group>
            </RigidBody>
            <PlayerCamera
                rbRef={rbRef}
                cameraYawRef={cameraYawRef}
                cameraPitchRef={cameraPitchRef}
            />
        </>
    );
}
