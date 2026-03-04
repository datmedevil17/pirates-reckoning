import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PROPS } from '../../lib/assets';
import type { LootItemType } from '../../lib/types';
import { useRunStore } from '../../store/runStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { RigidBody } from '@react-three/rapier';

// Preload common loot models
useGLTF.preload(PROPS.coins);
useGLTF.preload(PROPS.goldBag);
useGLTF.preload(PROPS.bottle1);
useGLTF.preload(PROPS.bottle2);
useGLTF.preload(PROPS.skull);
useGLTF.preload(PROPS.chestClosed);
useGLTF.preload(PROPS.chestGold);

const LOOT_MODEL_MAP: Partial<Record<LootItemType, string>> = {
    coins: PROPS.coins,
    goldBag: PROPS.goldBag,
    bottle1: PROPS.bottle1,
    bottle2: PROPS.bottle2,
    skull: PROPS.skull,
    gemBlue: '/models/UI_Gem_Blue.gltf',
    gemGreen: '/models/UI_Gem_Green.gltf',
    gemPink: '/models/UI_Gem_Pink.gltf',
};

// ─── Single Loot Drop ─────────────────────────────────────────────────────────

interface LootDropProps {
    id: string;
    type: LootItemType;
    position: [number, number, number];
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function LootDropItem({ id, type, position, playerPosRef }: LootDropProps) {
    const modelPath = LOOT_MODEL_MAP[type];
    const collectLoot = useRunStore(s => s.collectLoot);
    const heal = usePlayerStore(s => s.heal);
    const addResource = useGameStore(s => s.addResource);

    const posVec = useRef(new THREE.Vector3(...position));
    const collected = useRef(false);

    useFrame(() => {
        if (collected.current || !playerPosRef.current) return;
        if (posVec.current.distanceTo(playerPosRef.current) < 1.5) {
            collected.current = true;
            collectLoot(id);
            if (type === 'bottle1') heal(30);
            else if (type === 'bottle2') heal(15);
            else if (type === 'coins') addResource('gold', 5);
            else if (type === 'goldBag') addResource('gold', 20);
            else if (type === 'gemBlue') addResource('gemBlue', 1);
            else if (type === 'gemGreen') addResource('gemGreen', 1);
            else if (type === 'gemPink') addResource('gemPink', 1);
        }
    });

    if (!modelPath) return null;

    return (
        <group position={[position[0], 0.3, position[2]]}>
            <LootModel modelPath={modelPath} />
        </group>
    );
}

function LootModel({ modelPath }: { modelPath: string }) {
    const { scene } = useGLTF(modelPath);
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
        <group>
            <primitive object={clone} scale={0.7} />
        </group>
    );
}

// ─── Loot Drops Manager ───────────────────────────────────────────────────────

interface LootDropsManagerProps {
    playerPosRef: React.RefObject<THREE.Vector3>;
}

export function LootDropsManager({ playerPosRef }: LootDropsManagerProps) {
    const lootDrops = useRunStore(s => s.lootDrops);
    return (
        <>
            {lootDrops.map(drop => (
                <LootDropItem
                    key={drop.id}
                    id={drop.id}
                    type={drop.type}
                    position={drop.position}
                    playerPosRef={playerPosRef}
                />
            ))}
        </>
    );
}

// ─── Chest ────────────────────────────────────────────────────────────────────

interface ChestProps {
    id: string;
    position: [number, number, number];
    isGold?: boolean;
    playerPosRef: React.RefObject<THREE.Vector3>;
    onOpen?: (id: string) => void;
}

export function Chest({ id, position, isGold = false, playerPosRef, onOpen }: ChestProps) {
    const modelPath = isGold ? PROPS.chestGold : PROPS.chestClosed;
    const { scene } = useGLTF(modelPath);
    const clone = scene.clone(true);

    const chestsOpened = useRunStore(s => s.chestsOpened);
    const openChest = useRunStore(s => s.openChest);
    const addLootDrop = useRunStore(s => s.addLootDrop);
    const addResource = useGameStore(s => s.addResource);
    const [promptVisible, setPromptVisible] = useState(false);
    const [opened, setOpened] = useState(false);

    const groupRef = useRef<THREE.Group>(null!);

    useFrame(() => {
        if (opened || !groupRef.current || !playerPosRef.current) return;
        const dist = groupRef.current.position.distanceTo(playerPosRef.current);
        setPromptVisible(dist < 2.5);
    });

    // E key handler
    useFrame(() => {
        if (!promptVisible || opened) return;
    });

    const handleOpen = () => {
        if (opened || chestsOpened.includes(id)) return;
        setOpened(true);
        openChest(id);

        // Spawn loot items around the chest
        const spawnCount = isGold ? 8 : 4;
        const lootTypes: LootItemType[] = isGold
            ? ['goldBag', 'gemBlue', 'gemGreen', 'gemPink', 'coins', 'coins', 'goldBag', 'goldBag']
            : ['coins', 'coins', 'goldBag', 'bottle2'];

        for (let i = 0; i < spawnCount; i++) {
            const angle = (i / spawnCount) * Math.PI * 2;
            const dist = 0.5 + Math.random() * 0.8;
            const px = position[0] + Math.cos(angle) * dist;
            const pz = position[2] + Math.sin(angle) * dist;

            addLootDrop({
                id: `loot-${id}-${i}-${Date.now()}`,
                type: lootTypes[i % lootTypes.length] ?? 'coins',
                position: [px, 0, pz]
            });
        }

        if (isGold) {
            onOpen?.(id);
        }
    };

    return (
        <RigidBody type="fixed" colliders="cuboid" position={position}>
            <group ref={groupRef}>
                <primitive object={clone} scale={1.2} />
                {promptVisible && !opened && !chestsOpened.includes(id) && (
                    <mesh position={[0, 2.5, 0]}>
                        <sphereGeometry args={[0.2]} />
                        <meshBasicMaterial color="#ffff00" />
                    </mesh>
                )}
                {/* Interaction click target */}
                {!chestsOpened.includes(id) && (
                    <mesh
                        visible={false}
                        onClick={handleOpen}
                        onPointerEnter={() => document.body.style.cursor = 'pointer'}
                        onPointerLeave={() => document.body.style.cursor = 'default'}
                    >
                        <boxGeometry args={[1.5, 1.5, 1.5]} />
                        <meshBasicMaterial transparent opacity={0} />
                    </mesh>
                )}
            </group>
        </RigidBody>
    );
}
