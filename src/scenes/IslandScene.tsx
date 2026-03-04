import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Environment, Html, useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Player } from '../components/player/Player';
import { Skeleton } from '../components/enemies/Skeleton';
import { Sharky } from '../components/enemies/Sharky';
import { Tentacle } from '../components/enemies/Tentacle';
import { Barbarossa } from '../components/enemies/Barbarossa';
import { SnakeEnemy } from '../components/enemies/SnakeEnemy';
import { SpiderEnemy } from '../components/enemies/SpiderEnemy';
import { IslandProps, IslandTerrain } from '../components/environment/IslandProps';
import { Island2Animals } from '../components/environment/IslandAnimals';
import { IslandSeaTentacles } from '../components/environment/SeaTentacles';
import { LootDropsManager, Chest } from '../components/items/LootAndChests';
import { HUD } from '../components/ui/HUD';
import { Ship } from '../components/ocean/ShipController';
import { getIsland } from '../lib/islands';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { useRunStore } from '../store/runStore';

// ─── Decorative multiplayer ships ─────────────────────────────────────────────

useGLTF.preload('/models/Ship_Large.gltf');
useGLTF.preload('/models/Ship_Small.gltf');

const SAILOR_CONFIGS = [
    { model: '/models/Ship_Large.gltf', radius: 195, speed:  0.040, angle: 0.3,  flagColor: '#e74c3c', name: 'RedPete'     },
    { model: '/models/Ship_Large.gltf', radius: 265, speed: -0.028, angle: 2.1,  flagColor: '#3498db', name: 'IronJaw'     },
    { model: '/models/Ship_Large.gltf', radius: 320, speed:  0.022, angle: 4.0,  flagColor: '#f39c12', name: 'Saltbeard'   },
    { model: '/models/Ship_Small.gltf', radius: 168, speed: -0.055, angle: 1.2,  flagColor: '#2ecc71', name: 'Duchess'     },
    { model: '/models/Ship_Small.gltf', radius: 232, speed:  0.048, angle: 3.5,  flagColor: '#9b59b6', name: 'Blackfin'    },
    { model: '/models/Ship_Small.gltf', radius: 288, speed: -0.032, angle: 5.2,  flagColor: '#1abc9c', name: 'Morwenna'    },
    { model: '/models/Ship_Small.gltf', radius: 182, speed:  0.062, angle: 0.8,  flagColor: '#e67e22', name: 'Cutlass Cal' },
] as const;

interface SailingShipProps {
    model: string;
    radius: number;
    speed: number;
    startAngle: number;
    flagColor: string;
    name: string;
}

function SailingShip({ model, radius, speed, startAngle, flagColor, name }: SailingShipProps) {
    const { scene } = useGLTF(model);
    const clone = useMemo(() => {
        const c = scene.clone(true);
        c.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        return c;
    }, [scene]);

    const groupRef  = useRef<THREE.Group>(null!);
    const angleRef  = useRef(startAngle);
    const flagHeight = model.includes('Large') ? 10 : 6.5;

    useFrame((_, delta) => {
        const ship = groupRef.current;
        if (!ship) return;
        const dt = Math.min(delta, 0.05);
        angleRef.current += speed * dt;
        const a = angleRef.current;
        const t = performance.now() * 0.001;
        ship.position.set(
            Math.cos(a) * radius,
            Math.sin(t * 0.6 + startAngle) * 0.25,
            Math.sin(a) * radius,
        );
        // Face movement tangent: model's +X is forward, yaw formula derived from ShipController
        ship.rotation.y = (speed > 0 ? 1 : -1) * Math.PI / 2 - a;
        ship.rotation.z = Math.sin(t * 0.45 + startAngle * 1.3) * 0.038;
        ship.rotation.x = Math.sin(t * 0.35 + startAngle * 0.9) * 0.022;
    });

    return (
        <group ref={groupRef}>
            <primitive object={clone} />
            {/* Colored pennant flag on mast */}
            <mesh position={[0, flagHeight, 0.1]}>
                <boxGeometry args={[2.0, 0.9, 0.08]} />
                <meshStandardMaterial color={flagColor} emissive={flagColor} emissiveIntensity={0.35} />
            </mesh>
            {/* Player name label */}
            <Html position={[0, flagHeight + 2.5, 0]} center distanceFactor={90}>
                <div style={{
                    color: flagColor, fontFamily: 'monospace', fontSize: 11, fontWeight: 900,
                    background: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: 4,
                    border: `1px solid ${flagColor}`, letterSpacing: 1, whiteSpace: 'nowrap',
                    textShadow: `0 0 6px ${flagColor}`,
                }}>
                    ⚓ {name}
                </div>
            </Html>
        </group>
    );
}

function DecorativeShips() {
    return (
        <>
            {SAILOR_CONFIGS.map((cfg, i) => (
                <SailingShip
                    key={i}
                    model={cfg.model}
                    radius={cfg.radius}
                    speed={cfg.speed}
                    startAngle={cfg.angle}
                    flagColor={cfg.flagColor}
                    name={cfg.name}
                />
            ))}
        </>
    );
}

// ─── Lighting per preset ───────────────────────────────────────────────────────

function IslandLighting({ preset }: { preset: string }) {
    type Cfg = {
        ambient: number; dirIntensity: number; dirColor: string;
        dirPos: [number, number, number]; hemiSky: string; hemiGround: string;
        hemiIntensity: number; fogColor: string; fogNear?: number; fogFar?: number;
    };
    const configs: Record<string, Cfg> = {
        day:     { ambient: 0.70, dirIntensity: 1.2, dirColor: '#fff5e0', dirPos: [20, 30, 10],  hemiSky: '#87ceeb', hemiGround: '#3a5a28', hemiIntensity: 0.30, fogColor: '#87ceeb',  fogFar: 420 },
        overcast:{ ambient: 0.50, dirIntensity: 0.8, dirColor: '#c0d0d8', dirPos: [10, 20, 5],   hemiSky: '#8898b0', hemiGround: '#2a3a28', hemiIntensity: 0.20, fogColor: '#888ea0',  fogFar: 380 },
        sunset:  { ambient: 0.50, dirIntensity: 1.1, dirColor: '#ff9060', dirPos: [-20, 15, 5],  hemiSky: '#d06030', hemiGround: '#2a1a10', hemiIntensity: 0.25, fogColor: '#803820',  fogFar: 400 },
        // Bone Shore — dark moonlit night, cold blue light
        night:   { ambient: 0.18, dirIntensity: 0.6, dirColor: '#2a4070', dirPos: [5, 20, -5],   hemiSky: '#0d1628', hemiGround: '#060a06', hemiIntensity: 0.10, fogColor: '#080e18',  fogNear: 25, fogFar: 260 },
        storm:   { ambient: 0.18, dirIntensity: 0.5, dirColor: '#5070a0', dirPos: [0, 25, 0],    hemiSky: '#202838', hemiGround: '#101810', hemiIntensity: 0.10, fogColor: '#151e28',  fogFar: 280 },
        jungle:  { ambient: 0.55, dirIntensity: 1.0, dirColor: '#d4f0a0', dirPos: [12, 32, 8],   hemiSky: '#a8e070', hemiGround: '#1a4010', hemiIntensity: 0.45, fogColor: '#0d2010',  fogNear: 30, fogFar: 100 },
    };
    const cfg = configs[preset] ?? configs.day!;
    return (
        <>
            <ambientLight intensity={cfg.ambient} />
            <directionalLight
                position={cfg.dirPos}
                intensity={cfg.dirIntensity}
                color={cfg.dirColor}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <hemisphereLight args={[cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity]} />
            <fog attach="fog" args={[cfg.fogColor, cfg.fogNear ?? 40, cfg.fogFar ?? 420]} />
        </>
    );
}

// ─── Island 3D Scene contents ─────────────────────────────────────────────────

function IslandSceneContents({ islandId, onInDockRange }: { islandId: string; onInDockRange: (inRange: boolean) => void }) {
    const island = getIsland(islandId);
    const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const keysRef = useRef<Set<string>>(new Set());
    const cameraYawRef = useRef(Math.PI); // start facing toward island
    const cameraPitchRef = useRef(0.35);
    const setComplete = useRunStore(s => s.setComplete);

    // Key listeners
    useEffect(() => {
        const MOVE_KEYS = new Set(['w', 'a', 's', 'd']);
        const onDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (MOVE_KEYS.has(key)) { e.preventDefault(); keysRef.current.add(key); }
        };
        const onUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            keysRef.current.delete(key);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, []);

    if (!island) return null;

    // Separate interactive props from static environment props
    const staticProps = island.props.filter(p => !p.interactive && !p.destructible);
    const interactChests = island.props.filter(p => p.interactive);

    // Generate stable enemy IDs
    const enemyEntries = island.enemySpawns.map((spawn, i) => ({
        ...spawn,
        id: `${islandId}-enemy-${i}`,
    }));

    return (
        <Physics gravity={[0, -9.81, 0]}>
            <IslandLighting preset={island.lightingPreset} />
            <IslandTerrain />
            <Environment preset={
                island.lightingPreset === 'jungle'  ? 'forest'    :
                island.lightingPreset === 'night'   ? 'night'     :
                island.lightingPreset === 'storm'   ? 'warehouse' :
                'sunset'
            } />

            {/* Static environment props */}
            <Suspense fallback={null}>
                <IslandProps props={staticProps} />
            </Suspense>

            {/* Chests */}
            <Suspense fallback={null}>
                {interactChests.map((chest, i) => {
                    const isGold = chest.model.includes('Chest_Gold');
                    return (
                        <Chest
                            key={`chest-${i}`}
                            id={`${islandId}-chest-${i}`}
                            position={chest.position}
                            isGold={isGold}
                            playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            onOpen={isGold ? () => setComplete() : undefined}
                        />
                    );
                })}
            </Suspense>

            {/* Enemies */}
            <Suspense fallback={null}>
                {enemyEntries.map(spawn => {
                    if (spawn.type === 'skeleton' || spawn.type === 'skeleton_headless') {
                        return (
                            <Skeleton
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                waypoints={spawn.waypoints ?? [spawn.position]}
                                headless={spawn.type === 'skeleton_headless'}
                                boss={spawn.boss}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    if (spawn.type === 'sharky') {
                        return (
                            <Sharky
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                waypoints={spawn.waypoints ?? [spawn.position]}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    if (spawn.type === 'tentacle') {
                        return (
                            <Tentacle
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    if (spawn.type === 'barbarossa') {
                        return (
                            <Barbarossa
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    if (spawn.type === 'snake') {
                        return (
                            <SnakeEnemy
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                waypoints={spawn.waypoints ?? [spawn.position]}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    if (spawn.type === 'spider') {
                        return (
                            <SpiderEnemy
                                key={spawn.id}
                                id={spawn.id}
                                position={spawn.position}
                                waypoints={spawn.waypoints ?? [spawn.position]}
                                playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>}
                            />
                        );
                    }
                    return null;
                })}
            </Suspense>

            {/* Island 2 ambient animals */}
            {islandId === 'crumbling-fortress' && (
                <Suspense fallback={null}>
                    <Island2Animals playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>} />
                </Suspense>
            )}

            {/* Loot drops (managed by runStore) */}
            <LootDropsManager playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>} />

            {/* Sea tentacles lurking at the water's edge — attack if player wades in */}
            <Suspense fallback={null}>
                <IslandSeaTentacles playerPosRef={playerPosRef as React.RefObject<THREE.Vector3>} />
            </Suspense>

            {/* Decorative ships sailing in the sea (multiplayer look) */}
            <Suspense fallback={null}>
                <DecorativeShips />
            </Suspense>

            {/* Ship at dock — pushed further into water (Z+20) to prevent clipping with sand */}
            <Suspense fallback={null}>
                <Ship
                    position={[island.dockPosition[0], island.dockPosition[1], island.dockPosition[2] + 20]}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            {/* Player */}
            <Suspense fallback={null}>
                <Player
                    spawnPosition={island.dockPosition}
                    keysRef={keysRef}
                    cameraYawRef={cameraYawRef}
                    cameraPitchRef={cameraPitchRef}
                    onPositionUpdate={(pos) => { playerPosRef.current.copy(pos); }}
                />
            </Suspense>

            {/* Dock Board Sensor */}
            <RigidBody type="fixed" colliders={false} position={island.dockPosition}>
                <CuboidCollider
                    args={[10, 5, 10]}
                    sensor
                    onIntersectionEnter={() => onInDockRange(true)}
                    onIntersectionExit={() => onInDockRange(false)}
                />
            </RigidBody>
        </Physics>
    );
}

// ─── IslandScene ──────────────────────────────────────────────────────────────

export function IslandScene() {
    const { id: islandId = 'traders-cove' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [canvasKey, setCanvasKey] = useState(0);
    const [fading, setFading] = useState(false);
    const [showBoardButton, setShowBoardButton] = useState(false);

    const setScene = useGameStore(s => s.setScene);
    const incrementRun = useGameStore(s => s.incrementRun);
    const saveToStorage = useGameStore(s => s.saveToStorage);
    const resetPlayer = usePlayerStore(s => s.reset);
    const maxHp = useGameStore(s => s.upgrades.maxHp);
    const resetRun = useRunStore(s => s.reset);
    const isComplete = useRunStore(s => s.isComplete);

    const island = getIsland(islandId);

    // Initialize run on mount
    useEffect(() => {
        resetPlayer(maxHp);
        const enemyIds = (island?.enemySpawns ?? []).map((_, i) => `${islandId}-enemy-${i}`);
        resetRun(islandId, enemyIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [islandId]);

    const handleReturnToShip = () => {
        if (fading) return;
        setFading(true);
        incrementRun();
        saveToStorage();
        setTimeout(() => {
            setScene('ocean');
            navigate('/ocean');
        }, 600);
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111' }}>
            {/* Board Ship Prompt */}
            {showBoardButton && !isComplete && (
                <div style={{
                    position: 'absolute', bottom: 120, left: '50%',
                    transform: 'translateX(-50%)', zIndex: 30,
                    animation: 'slideUp 0.3s ease',
                }}>
                    <button
                        onClick={handleReturnToShip}
                        style={{
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: 12, padding: '12px 32px',
                            color: '#fff', fontWeight: 900, fontSize: 16,
                            cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}
                    >
                        ⚓ Board Ship
                    </button>
                    <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
                </div>
            )}
            {/* Fade overlay */}
            <div style={{
                position: 'absolute', inset: 0, background: '#000',
                opacity: fading ? 1 : 0,
                transition: 'opacity 0.6s ease',
                pointerEvents: 'none', zIndex: 40,
            }} />

            {/* HUD */}
            <HUD
                islandName={island?.name}
                difficulty={island?.difficulty}
                onReturnToShip={handleReturnToShip}
            />

            {/* E-key prompt for chests (simple overlay) */}
            <div style={{
                position: 'absolute', bottom: 70, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10, pointerEvents: 'none',
                color: '#ffe080', fontFamily: 'monospace', fontSize: 13,
                background: 'rgba(0,0,0,0.5)', padding: '4px 12px',
                borderRadius: 6, opacity: 0.7, letterSpacing: 1,
            }}>
                💡 Walk into chests to collect · Click chests to open
            </div>

            {/* Canvas */}
            <Canvas
                key={canvasKey}
                frameloop="always"
                shadows
                camera={{ position: [0, 4, 10], fov: 55, near: 0.1, far: 650 }}
                style={{ width: '100%', height: '100%' }}
                onCreated={({ gl }) => {
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        setTimeout(() => setCanvasKey(k => k + 1), 500);
                    });
                }}
            >
                <color attach="background" args={['#0a1020']} />
                <IslandSceneContents islandId={islandId} onInDockRange={setShowBoardButton} />
            </Canvas>
        </div>
    );
}
