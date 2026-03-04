import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import { SHIPS } from '../../lib/assets';
import {
    SHIP_MAX_SPEED, SHIP_ACCEL, SHIP_DECEL,
    SHIP_ROTATION_SPEED, ISLAND_ANCHOR_DIST,
} from '../../lib/constants';
import type { IslandDef } from '../../lib/types';
import { useGameStore } from '../../store/gameStore';

useGLTF.preload(SHIPS.large);

interface ShipControllerProps {
    islands: IslandDef[];
    onNearIsland: (island: IslandDef | null) => void;
    initialPosition?: [number, number, number];
    initialYaw?: number;
    /** Ref updated every frame with the ship's world position (for external consumers) */
    posRef?: React.RefObject<THREE.Vector3>;
    /** Active kraken tentacle positions — ship collides and bounces off them */
    tentaclesRef?: React.RefObject<Map<string, THREE.Vector3>>;
}

export function ShipController({
    islands,
    onNearIsland,
    initialPosition = [0, 0, 0],
    initialYaw = 0,
    posRef,
    tentaclesRef,
}: ShipControllerProps) {
    const { scene } = useGLTF(SHIPS.large);
    const { camera } = useThree();

    const shipGroupRef = useRef<THREE.Group>(null!);
    const keysRef = useRef<Record<string, boolean>>({});
    const velocityRef = useRef(0);
    const yawRef = useRef(initialYaw);
    const targetYawRef = useRef(initialYaw);      // smooth steering
    const camPosRef = useRef<THREE.Vector3 | null>(null); // smoothed camera pos
    const nearIslandRef = useRef<IslandDef | null>(null);
    const saveTimer = useRef(0);

    const setShipPosition = useGameStore(s => s.setShipPosition);

    // ── Keyboard ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const down = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
        const up = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    // ── Init position ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!shipGroupRef.current) return;
        shipGroupRef.current.position.set(...initialPosition);
        yawRef.current = initialYaw;
        targetYawRef.current = initialYaw;
        shipGroupRef.current.rotation.y = initialYaw;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Wake particles (simple ring mesh that scales then disappears) ─────────
    const wakeRef = useRef<THREE.Mesh>(null!);

    useFrame((_, delta) => {
        const ship = shipGroupRef.current;
        if (!ship) return;

        const keys = keysRef.current;
        const dt = Math.min(delta, 0.05);

        // ── Steering: smooth target yaw ──────────────────────────────────────
        const rotating =
            (keys['KeyA'] || keys['ArrowLeft']) ? 1 :
                (keys['KeyD'] || keys['ArrowRight']) ? -1 : 0;

        // Only allow steering when moving
        const speed = Math.abs(velocityRef.current);
        if (rotating !== 0 && speed > 0.5) {
            // Steering responsiveness scales with speed
            const steerRate = SHIP_ROTATION_SPEED * Math.min(speed / SHIP_MAX_SPEED, 1) * 1.5;
            targetYawRef.current += rotating * steerRate * dt;
        }

        // Smooth yaw lerp (ship turns gradually, not instantly)
        yawRef.current += (targetYawRef.current - yawRef.current) * Math.min(6 * dt, 1);

        // ── Throttle ──────────────────────────────────────────────────────────
        const accel = keys['KeyW'] || keys['ArrowUp'];
        const brake = keys['KeyS'] || keys['ArrowDown'];

        if (accel) {
            velocityRef.current = Math.min(
                SHIP_MAX_SPEED,
                velocityRef.current + SHIP_ACCEL * dt,
            );
        } else if (brake) {
            // Braking + small reverse
            if (velocityRef.current > 0) {
                velocityRef.current = Math.max(0, velocityRef.current - SHIP_ACCEL * 2.5 * dt);
            } else {
                velocityRef.current = Math.max(-SHIP_MAX_SPEED * 0.25,
                    velocityRef.current - SHIP_ACCEL * 0.5 * dt);
            }
        } else {
            // Natural drag (water resistance)
            const drag = SHIP_DECEL * (1 + speed * 0.04);
            if (velocityRef.current > 0)
                velocityRef.current = Math.max(0, velocityRef.current - drag * dt);
            else if (velocityRef.current < 0)
                velocityRef.current = Math.min(0, velocityRef.current + drag * dt);
        }

        // ── Move ship ─────────────────────────────────────────────────────────
        const yaw = yawRef.current;
        ship.rotation.y = yaw;

        // The Ship_Large model faces +X by default, so movement is offset by +PI/2
        const moveYaw = yaw + Math.PI / 2;
        const nextX = ship.position.x - Math.sin(moveYaw) * velocityRef.current * dt;
        const nextZ = ship.position.z - Math.cos(moveYaw) * velocityRef.current * dt;

        // ── Island collision — show prompt at 28m, block at 12m ──────────
        const ISLAND_BLOCK_RADIUS = 12;
        let blocked = false;
        for (const island of islands) {
            const [ix, , iz] = island.oceanPosition;
            const dx = nextX - ix;
            const dz = nextZ - iz;
            if (Math.sqrt(dx * dx + dz * dz) < ISLAND_BLOCK_RADIUS) {
                blocked = true;
                velocityRef.current *= -0.3;
                break;
            }
        }

        if (!blocked) {
            ship.position.x = nextX;
            ship.position.z = nextZ;
        }

        // ── Kraken grip — slow ship when inside tentacle ring, never hard-block ──
        // Ship can always escape by steering, but movement feels sluggish / grabbed
        if (tentaclesRef?.current && tentaclesRef.current.size > 0) {
            let closestDist = Infinity;
            for (const tp of tentaclesRef.current.values()) {
                const dx = ship.position.x - tp.x;
                const dz = ship.position.z - tp.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < closestDist) closestDist = d;
            }
            // Within 20u of any arm → drag kicks in (0% at 20u, 70% drag at 0u)
            if (closestDist < 20) {
                const grip = 1 - (closestDist / 20);  // 0→1 as ship moves closer
                velocityRef.current *= 1 - grip * 0.7 * dt * 12;
            }
        }

        // Gentle roll into turns
        const rollTarget = rotating * -0.06 * Math.min(speed / SHIP_MAX_SPEED, 1);
        ship.rotation.z += (rollTarget - ship.rotation.z) * 5 * dt;

        // Gentle pitch from acceleration / brake
        const pitchTarget = accel ? -0.04 : brake ? 0.04 : 0;
        ship.rotation.x += (pitchTarget - ship.rotation.x) * 4 * dt;

        // Gentle wave bob
        ship.position.y = Math.sin(Date.now() * 0.001) * 0.12;

        // Expose ship position for external consumers (e.g. KrakenTentacles)
        if (posRef?.current) posRef.current.copy(ship.position);

        // ── Camera — smooth follow from behind ────────────────────────────────
        const CAM_DIST = 24;
        const CAM_HEIGHT = 11;

        // Camera sits behind the ship (behind actual movement direction)
        const desiredPos = new THREE.Vector3(
            ship.position.x + Math.sin(moveYaw) * CAM_DIST,
            ship.position.y + CAM_HEIGHT,
            ship.position.z + Math.cos(moveYaw) * CAM_DIST,
        );

        if (!camPosRef.current) camPosRef.current = desiredPos.clone();
        // Gentle camera lag — faster at higher speeds
        const camLerp = Math.min(2.5 + speed * 0.15, 8) * dt;
        camPosRef.current.lerp(desiredPos, camLerp);

        camera.position.copy(camPosRef.current);
        camera.lookAt(
            ship.position.x,
            ship.position.y + 1.5,
            ship.position.z,
        );

        // ── Island proximity ──────────────────────────────────────────────────
        let nearest: IslandDef | null = null;
        for (const island of islands) {
            const [ix, , iz] = island.oceanPosition;
            const dx = ship.position.x - ix;
            const dz = ship.position.z - iz;
            if (Math.sqrt(dx * dx + dz * dz) < ISLAND_ANCHOR_DIST) {
                nearest = island;
                break;
            }
        }
        if (nearest !== nearIslandRef.current) {
            nearIslandRef.current = nearest;
            onNearIsland(nearest);
        }

        // ── Persist ship position (every 2 seconds) ───────────────────────────
        saveTimer.current += dt;
        if (saveTimer.current > 2) {
            saveTimer.current = 0;
            setShipPosition(
                [ship.position.x, ship.position.y, ship.position.z],
                yawRef.current,
            );
        }
    });

    const shipClone = useMemo(() => scene.clone(true), [scene]);

    return (
        <group ref={shipGroupRef}>
            <primitive object={shipClone} />
            {/* Speed lines / wake visual below ship */}
            <mesh ref={wakeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 1]}>
                <ringGeometry args={[1.2, 2.2, 24]} />
                <meshBasicMaterial color="#80c8ff" transparent opacity={0.18} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── Ship standalone component (static or anchored) ───────────────────────────

interface ShipProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
}

export function Ship({ position = [0, 0, 0], rotation = [0, 0, 0] }: ShipProps) {
    const { scene } = useGLTF(SHIPS.large);
    const clone = useMemo(() => scene.clone(true), [scene]);

    useEffect(() => {
        clone.traverse((child: any) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [clone]);

    return (
        <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
            <primitive object={clone} />
        </RigidBody>
    );
}
