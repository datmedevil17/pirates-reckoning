import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { CHARACTERS, WEAPONS } from '../lib/assets';

// preload
useGLTF.preload(CHARACTERS.anne);
useGLTF.preload(CHARACTERS.henry);

// ─── Rotating Character Preview ────────────────────────────────────────────────

function RotatingCharacter({ path, weaponPath }: { path: string; weaponPath: string }) {
    const { scene, animations } = useGLTF(path);
    const { actions, names } = useAnimations(animations, scene);
    const groupRef = useRef<THREE.Group>(null!);
    const t = useRef(0);

    useEffect(() => {
        const idle = names.includes('Idle') ? 'Idle' : names[0] ?? '';
        if (idle) {
            Object.values(actions).forEach(a => a?.stop());
            actions[idle]?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        }
    }, [path, actions, names]);

    // slow bobbing rotation
    useFrame((_, delta) => {
        t.current += delta;
        if (groupRef.current) {
            groupRef.current.rotation.y = t.current * 0.4;
            groupRef.current.position.y = Math.sin(t.current * 1.2) * 0.04;
        }
    });

    return (
        <group ref={groupRef} position={[0, -1, 0]}>
            <primitive object={scene} />
        </group>
    );
}

// ─── Character data ────────────────────────────────────────────────────────────

const CHARS = [
    {
        id: 'anne' as const,
        name: 'Anne',
        title: 'The Rogue',
        emoji: '🏹',
        model: CHARACTERS.anne,
        weapon: WEAPONS.dagger,
        description: 'A nimble rogue with lightning-fast reflexes. Her dual daggers and pistol make her deadly at any distance.',
        stats: { speed: 9, power: 5, health: 6 },
        defaultWeapons: 'Dagger + Pistol',
        color: '#a855f7',
        glow: '#7e22ce',
    },
    {
        id: 'henry' as const,
        name: 'Henry',
        title: 'The Warrior',
        emoji: '⚔️',
        model: CHARACTERS.henry,
        weapon: WEAPONS.cutlass,
        description: 'A battle-hardened warrior with iron will. His heavy cutlass cleaves through enemies, and his armor soaks punishment.',
        stats: { speed: 5, power: 9, health: 9 },
        defaultWeapons: 'Cutlass + Axe',
        color: '#f59e0b',
        glow: '#b45309',
    },
];

// ─── Stat Bar ──────────────────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 64, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {label}
            </span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                    width: `${(value / 10) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 3,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
            <span style={{ width: 16, fontSize: 11, color, fontFamily: 'monospace', textAlign: 'right' }}>{value}</span>
        </div>
    );
}

// ─── Floating particle background ─────────────────────────────────────────────

function Particles() {
    const COUNT = 30;
    const particles = Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 8 + 6,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.4 + 0.1,
    }));
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    borderRadius: '50%',
                    background: '#f0c040',
                    opacity: p.opacity,
                    animation: `floatUp ${p.dur}s ${p.delay}s infinite linear`,
                }} />
            ))}
            <style>{`
                @keyframes floatUp {
                    0%   { transform: translateY(0)   rotate(0deg);   opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 0.5; }
                    100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
                }
                @keyframes glow {
                    0%, 100% { text-shadow: 0 0 30px #f0c04066, 0 0 60px #f0c04033; }
                    50%       { text-shadow: 0 0 50px #f0c040aa, 0 0 100px #f0c04066; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.03); }
                }
            `}</style>
        </div>
    );
}

// ─── Start Screen ──────────────────────────────────────────────────────────────

type Screen = 'title' | 'select';

export function StartScreen() {
    const navigate = useNavigate();
    const { characterChoice, setCharacter, loadFromStorage, runNumber, saveToStorage } = useGameStore();

    const [screen, setScreen] = useState<Screen>('title');
    const [selected, setSelected] = useState<typeof CHARS[0]>(
        characterChoice === 'henry' ? CHARS[1]! : CHARS[0]!
    );
    const [transitioning, setTransitioning] = useState(false);
    const [titleVisible, setTitleVisible] = useState(false);
    const hasSave = runNumber > 0;

    useEffect(() => {
        loadFromStorage();
        const t = setTimeout(() => setTitleVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    function goToSelect() {
        setTransitioning(true);
        setTimeout(() => {
            setScreen('select');
            setTransitioning(false);
        }, 400);
    }

    function continueGame() {
        setTransitioning(true);
        setTimeout(() => navigate('/ocean'), 500);
    }

    function startAdventure() {
        setCharacter(selected.id);
        saveToStorage();
        setTransitioning(true);
        setTimeout(() => navigate('/ocean'), 500);
    }

    const char = CHARS.find(c => c.id === selected.id) ?? CHARS[0]!;

    return (
        <div style={{
            width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
            background: 'radial-gradient(ellipse at 30% 70%, #05142a 0%, #010810 60%, #020408 100%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
            {/* Animated sea gradient at bottom */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(to top, #051a3a 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />

            {/* Particles */}
            <Particles />

            {/* Fade overlay for transitions */}
            <div style={{
                position: 'absolute', inset: 0, background: '#000',
                opacity: transitioning ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none', zIndex: 50,
            }} />

            {/* ── TITLE SCREEN ──────────────────────────────────────────────── */}
            {screen === 'title' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: titleVisible ? 1 : 0,
                    transition: 'opacity 1.2s ease',
                    padding: '0 20px',
                }}>
                    {/* Skull icon */}
                    <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 20px #f0c04088)', animation: 'pulse 3s ease-in-out infinite' }}>
                        🏴‍☠️
                    </div>

                    {/* Title */}
                    <h1 style={{
                        fontSize: 'clamp(40px, 8vw, 88px)',
                        fontWeight: 900, letterSpacing: 8,
                        color: '#f0c040',
                        margin: '0 0 4px',
                        textTransform: 'uppercase',
                        animation: 'glow 4s ease-in-out infinite',
                        textAlign: 'center',
                    }}>
                        PIRATE'S
                    </h1>
                    <h1 style={{
                        fontSize: 'clamp(40px, 8vw, 88px)',
                        fontWeight: 900, letterSpacing: 8,
                        color: '#fff',
                        margin: '0 0 12px',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        textShadow: '0 0 40px rgba(255,255,255,0.2)',
                    }}>
                        RECKONING
                    </h1>

                    {/* Tagline */}
                    <p style={{
                        color: 'rgba(255,255,255,0.4)', fontSize: 14,
                        letterSpacing: 5, textTransform: 'uppercase',
                        margin: '0 0 60px',
                        textAlign: 'center',
                    }}>
                        A Roguelite Island Adventure
                    </p>

                    {/* Decorative line */}
                    <div style={{
                        position: 'absolute', top: '50%', left: 0, right: 0,
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0 10%', pointerEvents: 'none', transform: 'translateY(80px)',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(240,192,64,0.3))' }} />
                        <span style={{ color: '#f0c04044', fontSize: 18 }}>⚓</span>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(240,192,64,0.3))' }} />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320, animation: 'slideUp 0.8s 0.5s both' }}>
                        <button
                            onClick={goToSelect}
                            style={{
                                background: 'linear-gradient(135deg, #c8860a, #f0b030)',
                                border: 'none', borderRadius: 12,
                                padding: '18px 0', color: '#1a0a00',
                                fontWeight: 900, fontSize: 18, cursor: 'pointer',
                                letterSpacing: 3, textTransform: 'uppercase',
                                boxShadow: '0 4px 24px #f0b03066',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.03)'; }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                        >
                            ⚓ New Game
                        </button>

                        {hasSave && (
                            <button
                                onClick={continueGame}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 12, padding: '16px 0',
                                    color: '#fff', fontWeight: 700, fontSize: 16,
                                    cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                            >
                                ▶ Continue  <span style={{ opacity: 0.5, fontSize: 13 }}>Run #{runNumber}</span>
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/test')}
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'rgba(255,255,255,0.25)', fontSize: 12,
                                cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                                padding: 8,
                            }}
                        >
                            Dev Sandbox
                        </button>
                    </div>

                    {/* Version */}
                    <div style={{
                        position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.15)',
                        fontSize: 11, letterSpacing: 2,
                    }}>
                        v0.1 — All 72 Assets · 5 Islands
                    </div>
                </div>
            )}

            {/* ── CHARACTER SELECT SCREEN ───────────────────────────────────── */}
            {screen === 'select' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 380px',
                    gridTemplateRows: '80px 1fr 100px',
                    animation: 'fadeIn 0.4s ease',
                }}>
                    {/* ── Header ── */}
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        gap: 16,
                    }}>
                        <button
                            onClick={() => setScreen('title')}
                            style={{
                                position: 'absolute', left: 24,
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                fontSize: 14, letterSpacing: 1,
                            }}
                        >
                            ← Back
                        </button>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' }}>
                            Choose Your Pirate
                        </span>
                    </div>

                    {/* ── 3D Model Preview ── */}
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        {/* Glow behind model */}
                        <div style={{
                            position: 'absolute', bottom: '20%', left: '50%',
                            transform: 'translateX(-50%)',
                            width: 300, height: 300,
                            background: `radial-gradient(circle, ${char.color}22 0%, transparent 70%)`,
                            pointerEvents: 'none',
                            transition: 'background 0.5s',
                        }} />

                        <Canvas
                            camera={{ position: [0, 0.5, 3.5], fov: 45 }}
                            gl={{ antialias: true, powerPreference: 'high-performance' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[3, 5, 3]} intensity={1.5} color={char.color} />
                            <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#4080ff" />
                            <Environment preset="city" />
                            <Suspense fallback={null}>
                                <RotatingCharacter path={char.model} weaponPath={char.weapon} />
                            </Suspense>
                        </Canvas>

                        {/* Character selector tabs at bottom of preview */}
                        <div style={{
                            position: 'absolute', bottom: 24, left: 0, right: 0,
                            display: 'flex', justifyContent: 'center', gap: 12,
                        }}>
                            {CHARS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelected(c)}
                                    style={{
                                        background: selected.id === c.id
                                            ? `linear-gradient(135deg, ${c.color}55, ${c.color}22)`
                                            : 'rgba(0,0,0,0.5)',
                                        border: `2px solid ${selected.id === c.id ? c.color : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: 12,
                                        padding: '10px 24px',
                                        color: selected.id === c.id ? c.color : 'rgba(255,255,255,0.4)',
                                        fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                        letterSpacing: 1, textTransform: 'uppercase',
                                        transition: 'all 0.2s',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    {c.emoji} {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Info Panel ── */}
                    <div style={{
                        borderLeft: '1px solid rgba(255,255,255,0.07)',
                        padding: '40px 32px',
                        display: 'flex', flexDirection: 'column',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(12px)',
                        overflowY: 'auto',
                    }}>
                        {/* Name & title */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, letterSpacing: 4, color: char.color, textTransform: 'uppercase', marginBottom: 6 }}>
                                {char.title}
                            </div>
                            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
                                {char.name}
                            </div>
                        </div>

                        {/* Description */}
                        <p style={{
                            color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7,
                            marginBottom: 32,
                        }}>
                            {char.description}
                        </p>

                        {/* Stats */}
                        <div style={{ marginBottom: 32 }}>
                            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase' }}>
                                Combat Stats
                            </div>
                            <StatBar label="Speed" value={char.stats.speed} color={char.color} />
                            <StatBar label="Power" value={char.stats.power} color={char.color} />
                            <StatBar label="Health" value={char.stats.health} color={char.color} />
                        </div>

                        {/* Default loadout */}
                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, padding: '14px 16px',
                            marginBottom: 'auto',
                        }}>
                            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase' }}>
                                Starting Weapons
                            </div>
                            <div style={{ color: char.color, fontWeight: 700, fontSize: 14 }}>
                                ⚔ {char.defaultWeapons}
                            </div>
                        </div>
                    </div>

                    {/* ── Footer / CTA ── */}
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.07)',
                        gap: 16, padding: '0 32px',
                        background: 'rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                            Playing as <span style={{ color: char.color, fontWeight: 700 }}>{char.name}</span>
                        </div>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={startAdventure}
                            style={{
                                background: `linear-gradient(135deg, ${char.glow}, ${char.color})`,
                                border: 'none', borderRadius: 12,
                                padding: '16px 48px', color: '#0a0500',
                                fontWeight: 900, fontSize: 17, cursor: 'pointer',
                                letterSpacing: 3, textTransform: 'uppercase',
                                boxShadow: `0 4px 24px ${char.color}55`,
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => {
                                const el = e.target as HTMLElement;
                                el.style.transform = 'scale(1.04)';
                                el.style.boxShadow = `0 8px 32px ${char.color}88`;
                            }}
                            onMouseLeave={e => {
                                const el = e.target as HTMLElement;
                                el.style.transform = 'scale(1)';
                                el.style.boxShadow = `0 4px 24px ${char.color}55`;
                            }}
                        >
                            ⚓ SET SAIL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
