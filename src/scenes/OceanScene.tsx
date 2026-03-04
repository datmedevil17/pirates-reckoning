import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { OceanWater } from '../components/ocean/OceanWater';
import { ShipController } from '../components/ocean/ShipController';
import { KrakenTentacles } from '../components/environment/SeaTentacles';
import { ISLANDS } from '../lib/islands';
import { useGameStore } from '../store/gameStore';
import type { IslandDef } from '../lib/types';

// ─── Decorative NPC ships sailing the open ocean ──────────────────────────────

useGLTF.preload('/models/Ship_Large.gltf');
useGLTF.preload('/models/Ship_Small.gltf');

const OCEAN_SHIP_CONFIGS = [
    { model: '/models/Ship_Large.gltf', radius: 160, speed: 0.038, angle: 0.5, flagColor: '#e74c3c', name: 'RedPete' },
    { model: '/models/Ship_Large.gltf', radius: 240, speed: -0.025, angle: 2.3, flagColor: '#3498db', name: 'IronJaw' },
    { model: '/models/Ship_Large.gltf', radius: 310, speed: 0.020, angle: 4.1, flagColor: '#f39c12', name: 'Saltbeard' },
    { model: '/models/Ship_Small.gltf', radius: 130, speed: -0.052, angle: 1.4, flagColor: '#2ecc71', name: 'Duchess' },
    { model: '/models/Ship_Small.gltf', radius: 200, speed: 0.045, angle: 3.7, flagColor: '#9b59b6', name: 'Blackfin' },
    { model: '/models/Ship_Small.gltf', radius: 275, speed: -0.030, angle: 5.4, flagColor: '#1abc9c', name: 'Morwenna' },
    { model: '/models/Ship_Small.gltf', radius: 148, speed: 0.058, angle: 0.9, flagColor: '#e67e22', name: 'Cutlass Cal' },
] as const;

function OceanSailingShip({ model, radius, speed, startAngle, flagColor }: {
    model: string; radius: number; speed: number; startAngle: number; flagColor: string;
}) {
    const { scene } = useGLTF(model);
    const clone = useMemo(() => {
        const c = scene.clone(true);
        c.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        return c;
    }, [scene]);

    const groupRef = useRef<THREE.Group>(null!);
    const angleRef = useRef(startAngle);
    const flagH = model.includes('Large') ? 15 : 10;

    useFrame((_, delta) => {
        const ship = groupRef.current;
        if (!ship) return;
        const dt = Math.min(delta, 0.05);
        angleRef.current += speed * dt;
        const a = angleRef.current;
        const t = performance.now() * 0.001;
        ship.position.set(
            Math.cos(a) * radius,
            Math.sin(t * 0.5 + startAngle) * 0.18,
            Math.sin(a) * radius,
        );
        ship.rotation.y = (speed > 0 ? 1 : -1) * Math.PI / 2 - a;
        ship.rotation.z = Math.sin(t * 0.42 + startAngle * 1.2) * 0.032;
        ship.rotation.x = Math.sin(t * 0.33 + startAngle * 0.8) * 0.018;
    });

    return (
        <group ref={groupRef} scale={1.5}>
            <primitive object={clone} />
            {/* Coloured pennant flag */}
            <mesh position={[0, flagH, 0.1]}>
                <boxGeometry args={[2.0, 0.9, 0.08]} />
                <meshStandardMaterial color={flagColor} emissive={flagColor} emissiveIntensity={0.5} />
            </mesh>
            {/* Glow point so the flag is visible at distance */}
            <pointLight position={[0, flagH + 1, 0]} intensity={1.8} distance={40} color={flagColor} />
        </group>
    );
}

function OceanDecorativeShips() {
    return (
        <>
            {OCEAN_SHIP_CONFIGS.map((cfg, i) => (
                <OceanSailingShip
                    key={i}
                    model={cfg.model}
                    radius={cfg.radius}
                    speed={cfg.speed}
                    startAngle={cfg.angle}
                    flagColor={cfg.flagColor}
                />
            ))}
        </>
    );
}

// ─── Whirlpool Marker (3D) — animated water-spiral shader ────────────────────

const SWIRL_VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const SWIRL_FRAG = /* glsl */`
    uniform float uTime;
    varying vec2 vUv;

    void main() {
        vec2 c = vUv - 0.5;
        float dist = length(c);
        float angle = atan(c.y, c.x);

        // Spiral: tighter toward center, spins over time
        float swirl = angle - dist * 12.0 + uTime * 2.8;
        float bands = sin(swirl * 6.0) * 0.5 + 0.5;

        // Outer edge fade + dark center hole
        float outerFade  = smoothstep(0.50, 0.28, dist);
        float innerHole  = smoothstep(0.06, 0.13, dist);
        float alpha = outerFade * innerHole;

        // Deep purple-black vortex — stands out sharply against bright blue ocean
        float t = smoothstep(0.0, 0.45, dist);
        vec3 outerCol = vec3(0.06, 0.02, 0.22);  // dark purple-indigo
        vec3 innerCol = vec3(0.01, 0.00, 0.05);  // near-black abyss
        vec3 color = mix(innerCol, outerCol, t);

        // High-contrast bands: near-black troughs, brighter crests
        color *= (0.10 + 0.90 * bands);

        // Cyan-white spark on the sharpest crest lines
        float sparks = pow(bands, 8.0);
        color += vec3(0.15, 0.55, 1.0) * sparks * 0.9 * outerFade;

        // Glowing ring just outside the center hole
        float ring = smoothstep(0.12, 0.155, dist) * smoothstep(0.22, 0.17, dist);
        color += vec3(0.3, 0.5, 1.0) * ring * 1.2;

        // Outer fringe — faint purple shimmer at the edge
        float fringe = smoothstep(0.48, 0.45, dist) * smoothstep(0.30, 0.38, dist);
        color += vec3(0.5, 0.2, 1.0) * fringe * 0.45;

        gl_FragColor = vec4(color, alpha * 0.96);
    }
`;

function WhirlpoolMarker({ island }: { island: IslandDef }) {
    const [ox, , oz] = island.oceanPosition;

    const spiralMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: SWIRL_VERT,
        fragmentShader: SWIRL_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), []);

    const centerGlow = useRef<THREE.Mesh>(null!);
    const lightRef   = useRef<THREE.PointLight>(null!);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        spiralMat.uniforms.uTime!.value = t;

        // Center glow pulse
        if (centerGlow.current) {
            centerGlow.current.scale.setScalar(1 + Math.sin(t * 2.4) * 0.08);
        }
        if (lightRef.current) {
            lightRef.current.intensity = 3.8 + Math.sin(t * 1.9) * 1.4;
        }
    });

    return (
        <group position={[ox, 0.05, oz]}>
            {/* Swirling water plane — shader driven */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[52, 52, 1, 1]} />
                <primitive object={spiralMat} attach="material" />
            </mesh>

            {/* Center abyss disc */}
            <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[5.5, 32]} />
                <meshStandardMaterial color="#000610" emissive="#001020" emissiveIntensity={0.5} transparent opacity={0.98} depthWrite={false} />
            </mesh>

            {/* Glowing cyan rim around center hole */}
            <mesh ref={centerGlow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
                <ringGeometry args={[5.5, 6.5, 40]} />
                <meshStandardMaterial color="#00ccff" emissive="#0099dd" emissiveIntensity={1.6} transparent opacity={0.9} roughness={0.05} depthWrite={false} />
            </mesh>

            {/* Pulsing overhead glow + deep below glow */}
            <pointLight ref={lightRef} position={[0, 3, 0]} color="#0055dd" distance={80} castShadow={false} />
            <pointLight position={[0, -1, 0]} color="#00bbff" intensity={2.2} distance={20} />
        </group>
    );
}

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
                                {isHome ? '🏠 ' : island.theme === 'underwater' ? '〜 ' : ''}{island.name}
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
    const shipPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...shipPosition));
    // Active kraken tentacle positions for ship collision
    const activePosRef = useRef<Map<string, THREE.Vector3>>(new Map());
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
    const isWhirlpool = nearIsland?.theme === 'underwater';

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
                        background: isWhirlpool ? 'rgba(0,8,24,0.92)' : 'rgba(0,0,0,0.8)',
                        border: `1px solid ${
                            isHome       ? 'rgba(64,200,100,0.7)' :
                            isWhirlpool  ? 'rgba(0,120,255,0.7)'  :
                                           'rgba(255,220,80,0.6)'
                        }`,
                        borderRadius: 16, padding: '16px 32px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: `0 8px 32px ${
                            isHome       ? 'rgba(40,160,80,0.3)'   :
                            isWhirlpool  ? 'rgba(0,80,220,0.4)'    :
                                           'rgba(240,180,40,0.2)'
                        }`,
                    }}>
                        <div style={{
                            fontSize: 20, fontWeight: 900, letterSpacing: 2,
                            color: isHome ? '#40ff80' : isWhirlpool ? '#44aaff' : '#ffe080',
                        }}>
                            {isHome ? '🏠 ' : isWhirlpool ? '〜 ' : '🏝️ '}{nearIsland.name}
                        </div>
                        <div style={{
                            fontSize: 12, margin: '5px 0 14px', letterSpacing: 2,
                            color: isHome ? '#30cc60' : isWhirlpool ? '#2288dd' : '#f0c040',
                        }}>
                            {isHome ? 'HOME BASE · SAFE ZONE' : isWhirlpool ? `DEPTH · ${stars}` : `DIFFICULTY · ${stars}`}
                        </div>
                        <button
                            onClick={handleAnchorDrop}
                            style={{
                                background: isHome
                                    ? 'linear-gradient(135deg, #1a8040, #30c060)'
                                    : isWhirlpool
                                        ? 'linear-gradient(135deg, #00337a, #0055cc)'
                                        : 'linear-gradient(135deg, #c8860a, #f0b030)',
                                border: 'none', borderRadius: 10,
                                padding: '12px 36px',
                                color: '#fff', fontWeight: 900, fontSize: 15,
                                cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                            }}
                        >
                            {isHome ? '⚓ Go Ashore' : isWhirlpool ? '〜 Descend' : '⚓ Drop Anchor'}
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

                    {/* NPC ships orbiting the open ocean */}
                    <OceanDecorativeShips />

                    <ShipController
                        islands={ISLANDS}
                        onNearIsland={setNearIsland}
                        initialPosition={shipPosition}
                        initialYaw={shipYaw}
                        posRef={shipPosRef}
                        tentaclesRef={activePosRef}
                    />

                    {ISLANDS.map(island => (
                        island.theme === 'underwater'
                            ? <WhirlpoolMarker key={island.id} island={island} />
                            : <IslandMarker key={island.id} island={island} />
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
