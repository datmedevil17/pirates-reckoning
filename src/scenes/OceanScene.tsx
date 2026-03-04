import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OceanWater } from '../components/ocean/OceanWater';
import { ShipController } from '../components/ocean/ShipController';
import { KrakenTentacles } from '../components/environment/SeaTentacles';
import { ISLANDS } from '../lib/islands';
import { useGameStore } from '../store/gameStore';
import type { IslandDef } from '../lib/types';

// ─── Island Marker (3D) ────────────────────────────────────────────────────────

function IslandMarker({ island }: { island: IslandDef }) {
    const [ox, , oz] = island.oceanPosition;
    const isHome = island.difficulty === 1;
    const glowColor = isHome ? '#40ff80'
        : island.difficulty <= 2 ? '#ffe080'
            : island.difficulty <= 4 ? '#ff9040'
                : '#ff3030';

    const flagRef = useRef<THREE.Group>(null!);
    useFrame(({ clock }) => {
        if (flagRef.current) {
            flagRef.current.rotation.y = clock.getElapsedTime() * 0.5;
        }
    });

    return (
        <group position={[ox, 0, oz]}>
            {/* Sandy base */}
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[14, 16, 2, 24]} />
                <meshStandardMaterial color="#c8a96e" roughness={0.9} />
            </mesh>
            {/* Grassy top */}
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[10, 13, 1.2, 24]} />
                <meshStandardMaterial color="#4e8040" roughness={0.85} />
            </mesh>
            {/* Palm trunk */}
            <mesh position={[0, 4.2, 0]}>
                <cylinderGeometry args={[0.3, 0.5, 5.5, 7]} />
                <meshStandardMaterial color="#6b4c2a" roughness={0.9} />
            </mesh>
            {/* Palm foliage */}
            <mesh position={[0, 7.5, 0]}>
                <sphereGeometry args={[3, 10, 8]} />
                <meshStandardMaterial color="#2d7022" roughness={0.8} />
            </mesh>
            {/* Second palm */}
            <mesh position={[5, 3.5, 2]}>
                <cylinderGeometry args={[0.25, 0.4, 4.5, 6]} />
                <meshStandardMaterial color="#6b4c2a" roughness={0.9} />
            </mesh>
            <mesh position={[5, 6.2, 2]}>
                <sphereGeometry args={[2.5, 8, 6]} />
                <meshStandardMaterial color="#3a8028" roughness={0.8} />
            </mesh>
            {/* Rock hint */}
            <mesh position={[-6, 1.5, -3]}>
                <dodecahedronGeometry args={[2.5, 0]} />
                <meshStandardMaterial color="#888a80" roughness={0.95} />
            </mesh>
            {/* Glow beacon */}
            <pointLight position={[0, 10, 0]} intensity={isHome ? 4 : 2.5} distance={35} color={glowColor} />
            {/* Home flag */}
            {isHome && (
                <group ref={flagRef} position={[0, 9, 0]}>
                    <mesh>
                        <cylinderGeometry args={[0.08, 0.08, 3, 5]} />
                        <meshStandardMaterial color="#8b6030" />
                    </mesh>
                    <mesh position={[0.6, 0.8, 0]}>
                        <boxGeometry args={[1.2, 0.8, 0.05]} />
                        <meshStandardMaterial color="#40cc60" />
                    </mesh>
                </group>
            )}
        </group>
    );
}

// ─── Scene lighting ────────────────────────────────────────────────────────────

function OceanLighting() {
    return (
        <>
            <ambientLight intensity={0.55} />
            <directionalLight
                position={[50, 80, 30]}
                intensity={1.4}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={400}
                shadow-camera-left={-150}
                shadow-camera-right={150}
                shadow-camera-top={150}
                shadow-camera-bottom={-150}
                color="#fff5e0"
            />
            <hemisphereLight args={['#87ceeb', '#1a3a5c', 0.4]} />
        </>
    );
}

// ─── Mini compass / island list ────────────────────────────────────────────────

function IslandList({ nearIsland, runNumber }: { nearIsland: IslandDef | null; runNumber: number }) {
    return (
        <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '12px 16px',
            backdropFilter: 'blur(8px)',
            minWidth: 200,
        }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>
                Islands · Run #{runNumber}
            </div>
            {ISLANDS.map(island => {
                const stars = '★'.repeat(island.difficulty) + '☆'.repeat(5 - island.difficulty);
                const isNear = nearIsland?.id === island.id;
                const isHome = island.difficulty === 1;
                const starColor = isHome ? '#40cc60'
                    : island.difficulty <= 2 ? '#ffe080'
                        : island.difficulty <= 4 ? '#ff9040'
                            : '#ff4040';
                return (
                    <div key={island.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: isNear ? 'rgba(255,220,80,0.12)' : 'transparent',
                        border: isNear ? '1px solid rgba(255,220,80,0.4)' : '1px solid transparent',
                        marginBottom: 4,
                        transition: 'all 0.3s',
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: isNear ? '#ffe080' : starColor,
                            boxShadow: isNear ? `0 0 8px ${starColor}` : 'none',
                        }} />
                        <div>
                            <div style={{ color: isNear ? '#ffe080' : '#fff', fontSize: 13, fontWeight: 700 }}>
                                {isHome ? '🏠 ' : ''}{island.name}
                            </div>
                            <div style={{ color: starColor, fontSize: 10 }}>{stars}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── OceanScene ───────────────────────────────────────────────────────────────

export function OceanScene() {
    const navigate = useNavigate();
    const [nearIsland, setNearIsland] = useState<IslandDef | null>(null);
    const [fading, setFading] = useState(false);
    const { shipPosition, shipYaw, setScene, runNumber } = useGameStore();

    // Real-time ship position shared with KrakenTentacles
    const shipPosRef    = useRef<THREE.Vector3>(new THREE.Vector3(...shipPosition));
    // Active kraken tentacle positions for ship collision
    const activePosRef  = useRef<Map<string, THREE.Vector3>>(new Map());
    const [krakenWarning, setKrakenWarning] = useState(false);

    const handleAnchorDrop = () => {
        if (!nearIsland || fading) return;
        setFading(true);
        setTimeout(() => {
            setScene('island', nearIsland.id);
            navigate(`/island/${nearIsland.id}`);
        }, 600);
    };

    const stars = nearIsland
        ? '★'.repeat(nearIsland.difficulty) + '☆'.repeat(5 - nearIsland.difficulty)
        : '';
    const isHome = nearIsland?.difficulty === 1;

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a1628' }}>
            {/* Fade overlay */}
            <div style={{
                position: 'absolute', inset: 0, background: '#000',
                opacity: fading ? 1 : 0,
                transition: 'opacity 0.6s ease',
                pointerEvents: 'none',
                zIndex: 20,
            }} />

            {/* Controls hint */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                color: 'rgba(255,255,255,0.65)', fontSize: 12,
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 14px', borderRadius: 10,
                fontFamily: 'monospace', lineHeight: 1.7,
                backdropFilter: 'blur(8px)',
            }}>
                <div>⬆ <b>W</b> — Sail forward</div>
                <div>⬇ <b>S</b> — Brake / reverse</div>
                <div>◀ <b>A</b> · ▶ <b>D</b> — Steer</div>
                <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.3)' }}>⚓ Approach island to anchor</div>
            </div>

            {/* Island list (top-right) */}
            <IslandList nearIsland={nearIsland} runNumber={runNumber} />

            {/* Island proximity prompt */}
            {nearIsland && (
                <div style={{
                    position: 'absolute', bottom: 60, left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center', zIndex: 10,
                    animation: 'slideUp 0.3s ease',
                }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.8)',
                        border: `1px solid ${isHome ? 'rgba(64,200,100,0.7)' : 'rgba(255,220,80,0.6)'}`,
                        borderRadius: 16, padding: '16px 32px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: `0 8px 32px ${isHome ? 'rgba(40,160,80,0.3)' : 'rgba(240,180,40,0.2)'}`,
                    }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: isHome ? '#40ff80' : '#ffe080', letterSpacing: 2 }}>
                            {isHome ? '🏠 ' : '🏝️ '}{nearIsland.name}
                        </div>
                        <div style={{ fontSize: 12, color: isHome ? '#30cc60' : '#f0c040', margin: '5px 0 14px', letterSpacing: 2 }}>
                            {isHome ? 'HOME BASE · SAFE ZONE' : `DIFFICULTY · ${stars}`}
                        </div>
                        <button
                            onClick={handleAnchorDrop}
                            style={{
                                background: isHome
                                    ? 'linear-gradient(135deg, #1a8040, #30c060)'
                                    : 'linear-gradient(135deg, #c8860a, #f0b030)',
                                border: 'none', borderRadius: 10,
                                padding: '12px 36px',
                                color: '#fff', fontWeight: 900, fontSize: 15,
                                cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                            }}
                        >
                            ⚓ {isHome ? 'Go Ashore' : 'Drop Anchor'}
                        </button>
                    </div>
                    <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
                </div>
            )}

            {/* Canvas */}
            <Canvas
                frameloop="always"
                shadows
                camera={{ fov: 60, near: 0.5, far: 1000 }}
                style={{ width: '100%', height: '100%' }}
            >
                <OceanLighting />
                <fog attach="fog" args={['#0a1628', 100, 500]} />

                <Suspense fallback={null}>
                    <OceanWater size={900} />

                    <ShipController
                        islands={ISLANDS}
                        onNearIsland={setNearIsland}
                        initialPosition={shipPosition}
                        initialYaw={shipYaw}
                        posRef={shipPosRef}
                        tentaclesRef={activePosRef}
                    />

                    {ISLANDS.map(island => (
                        <IslandMarker key={island.id} island={island} />
                    ))}

                    {/* Kraken clusters — 6 tentacles surround ship when it sails into zone */}
                    <KrakenTentacles
                        shipPosRef={shipPosRef}
                        activePosRef={activePosRef}
                        onZoneChange={setKrakenWarning}
                    />
                </Suspense>
            </Canvas>

            {/* Kraken warning overlay */}
            {krakenWarning && (
                <div style={{
                    position: 'absolute', top: '18%', left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 25, pointerEvents: 'none',
                    animation: 'krakenPulse 1.1s ease-in-out infinite',
                }}>
                    <div style={{
                        color: '#ff2200', fontFamily: 'monospace',
                        fontSize: 28, fontWeight: 900, letterSpacing: 4,
                        textAlign: 'center', textTransform: 'uppercase',
                        textShadow: '0 0 18px #ff4400, 0 0 40px #ff2200',
                        background: 'rgba(0,0,0,0.72)',
                        padding: '14px 36px', borderRadius: 12,
                        border: '2px solid #ff2200',
                        boxShadow: '0 0 32px rgba(255,34,0,0.4)',
                    }}>
                        ⚠️ &nbsp;KRAKEN APPROACHING&nbsp; ⚠️
                    </div>
                    <div style={{
                        color: '#ff6644', fontFamily: 'monospace', fontSize: 13,
                        textAlign: 'center', marginTop: 8, letterSpacing: 2,
                        textShadow: '0 0 8px #ff4400',
                    }}>
                        Sail away or be dragged to the deep
                    </div>
                </div>
            )}
            <style>{`
                @keyframes krakenPulse {
                    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    50%       { opacity: 0.65; transform: translateX(-50%) scale(1.04); }
                }
            `}</style>
        </div>
    );
}
