import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { CHARACTERS, WEAPONS } from '../lib/assets';

// ─── Weapon catalogue ──────────────────────────────────────────────────────────

const WEAPON_LIST = [
    { key: 'dagger', path: WEAPONS.dagger, name: 'Dagger', emoji: '🗡️', tier: 'common', desc: 'Lightning fast. Low damage, high attack speed.' },
    { key: 'pistol', path: WEAPONS.pistol, name: 'Pistol', emoji: '🔫', tier: 'common', desc: 'Ranged shot with medium reload time.' },
    { key: 'cutlass', path: WEAPONS.cutlass, name: 'Cutlass', emoji: '⚔️', tier: 'common', desc: 'Balanced blade. The pirate staple.' },
    { key: 'axe', path: WEAPONS.axe, name: 'Axe', emoji: '🪓', tier: 'uncommon', desc: 'Heavy swing that cleaves through armor.' },
    { key: 'sword1', path: WEAPONS.sword1, name: 'Longsword', emoji: '🗡️', tier: 'uncommon', desc: 'Extended reach with moderate damage.' },
    { key: 'sword2', path: WEAPONS.sword2, name: 'Broadsword', emoji: '⚔️', tier: 'uncommon', desc: 'Wide sweep that hits multiple enemies.' },
    { key: 'rifle', path: WEAPONS.rifle, name: 'Rifle', emoji: '🎯', tier: 'rare', desc: 'Long-range precision. One shot, one kill.' },
    { key: 'doubleAxe', path: WEAPONS.doubleAxe, name: 'Double Axe', emoji: '⚒️', tier: 'rare', desc: 'Spin attack that crushes everything nearby.' },
    { key: 'axeRifle', path: WEAPONS.axeRifle, name: 'Axe Rifle', emoji: '💥', tier: 'epic', desc: 'Melee and ranged in one brutal hybrid weapon.' },
    { key: 'doubleShotgun', path: WEAPONS.doubleShotgun, name: 'Double Shotgun', emoji: '💣', tier: 'epic', desc: 'Devastating spread at close range.' },
    { key: 'lute', path: WEAPONS.lute, name: 'Lute', emoji: '🎸', tier: 'legendary', desc: 'Stuns enemies with sonic blasts. Very rare.' },
] as const;

type Weapon = typeof WEAPON_LIST[number];

const TIER_COLORS: Record<string, string> = {
    common: 'rgba(255,255,255,0.5)',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#c084fc',
    legendary: '#fbbf24',
};

// Preload all weapon models so they snap in without delay
Object.values(WEAPONS).forEach(p => useGLTF.preload(p));
useGLTF.preload(CHARACTERS.anne);
useGLTF.preload(CHARACTERS.henry);

// ─── Rotating Character Preview ────────────────────────────────────────────────

function RotatingCharacter({ path }: { path: string }) {
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

// ─── Rotating Weapon Preview ───────────────────────────────────────────────────

function WeaponAutoFit({ scene }: { scene: THREE.Group }) {
    const { camera } = useThree();
    useEffect(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        // center the model
        scene.position.sub(center);
        // move camera so the weapon fills the view nicely
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
        camera.position.set(0, 0, dist);
        camera.lookAt(0, 0, 0);
    }, [scene, camera]);
    return null;
}

function RotatingWeapon({ path }: { path: string }) {
    const { scene } = useGLTF(path);
    const groupRef = useRef<THREE.Group>(null!);
    const t = useRef(0);

    // Clone so multiple renders don't share the same scene object
    const cloned = useRef<THREE.Group>(scene.clone());
    useEffect(() => {
        cloned.current = scene.clone();
    }, [scene]);

    useFrame((_, delta) => {
        t.current += delta;
        if (groupRef.current) {
            groupRef.current.rotation.y = t.current * 0.55;
            groupRef.current.rotation.x = Math.sin(t.current * 0.4) * 0.15;
            groupRef.current.position.y = Math.sin(t.current * 1.1) * 0.06;
        }
    });

    return (
        <group ref={groupRef}>
            <WeaponAutoFit scene={cloned.current} />
            <primitive object={cloned.current} />
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
        description: 'A nimble rogue with lightning-fast reflexes. Her dual daggers and pistol make her deadly at any distance.',
        stats: { speed: 9, power: 5, health: 6 },
        color: '#a855f7',
        glow: '#7e22ce',
    },
    {
        id: 'henry' as const,
        name: 'Henry',
        title: 'The Warrior',
        emoji: '⚔️',
        model: CHARACTERS.henry,
        description: 'A battle-hardened warrior with iron will. His heavy cutlass cleaves through enemies, and his armor soaks punishment.',
        stats: { speed: 5, power: 9, health: 9 },
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
                .weapon-card::-webkit-scrollbar { width: 4px; }
                .weapon-card::-webkit-scrollbar-track { background: transparent; }
                .weapon-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
            `}</style>
        </div>
    );
}

// ─── Start Screen ──────────────────────────────────────────────────────────────

type Screen = 'title' | 'select';
type PreviewMode = 'character' | 'weapon';

export function StartScreen() {
    const navigate = useNavigate();
    const { characterChoice, setCharacter, loadFromStorage, runNumber, saveToStorage, unlockWeapon } = useGameStore();

    const [screen, setScreen] = useState<Screen>('title');
    const [selected, setSelected] = useState<typeof CHARS[0]>(
        characterChoice === 'henry' ? CHARS[1]! : CHARS[0]!
    );
    const [selectedWeapon, setSelectedWeapon] = useState<Weapon>(WEAPON_LIST[0]!);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('character');
    const [transitioning, setTransitioning] = useState(false);
    const [titleVisible, setTitleVisible] = useState(false);
    const hasSave = runNumber > 0;

    useEffect(() => {
        loadFromStorage();
        const t = setTimeout(() => setTitleVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    // Reset to character preview whenever character changes
    useEffect(() => { setPreviewMode('character'); }, [selected]);

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
        unlockWeapon(selectedWeapon.path);
        saveToStorage();
        setTransitioning(true);
        setTimeout(() => navigate('/ocean'), 500);
    }

    function pickWeapon(w: Weapon) {
        setSelectedWeapon(w);
        setPreviewMode('character');
    }

    const char = CHARS.find(c => c.id === selected.id) ?? CHARS[0]!;
    const tierColor = TIER_COLORS[selectedWeapon.tier] ?? '#fff';
    const glowColor = previewMode === 'weapon' ? tierColor : char.color;

    return (
        <div style={{
            width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
            background: 'radial-gradient(ellipse at 30% 70%, #05142a 0%, #010810 60%, #020408 100%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
            {/* Sea gradient */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(to top, #051a3a 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />

            <Particles />

            {/* Fade overlay */}
            <div style={{
                position: 'absolute', inset: 0, background: '#000',
                opacity: transitioning ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none', zIndex: 50,
            }} />

            {/* ── TITLE SCREEN ──────────────────────────────────── */}
            {screen === 'title' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: titleVisible ? 1 : 0,
                    transition: 'opacity 1.2s ease',
                    padding: '0 20px',
                }}>
                    <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 20px #f0c04088)', animation: 'pulse 3s ease-in-out infinite' }}>
                        🏴‍☠️
                    </div>

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

                    <p style={{
                        color: 'rgba(255,255,255,0.4)', fontSize: 14,
                        letterSpacing: 5, textTransform: 'uppercase',
                        margin: '0 0 60px',
                        textAlign: 'center',
                    }}>
                        A Roguelite Island Adventure
                    </p>

                    <div style={{
                        position: 'absolute', top: '50%', left: 0, right: 0,
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0 10%', pointerEvents: 'none', transform: 'translateY(80px)',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(240,192,64,0.3))' }} />
                        <span style={{ color: '#f0c04044', fontSize: 18 }}>⚓</span>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(240,192,64,0.3))' }} />
                    </div>

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

                    <div style={{
                        position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.15)',
                        fontSize: 11, letterSpacing: 2,
                    }}>
                        v0.1 — All 72 Assets · 5 Islands
                    </div>
                </div>
            )}

            {/* ── CHARACTER SELECT SCREEN ───────────────────────── */}
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
                            onClick={() => previewMode === 'weapon' ? setPreviewMode('character') : setScreen('title')}
                            style={{
                                position: 'absolute', left: 24,
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                fontSize: 14, letterSpacing: 1,
                            }}
                        >
                            ← {previewMode === 'weapon' ? 'Back to Character' : 'Back'}
                        </button>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' }}>
                            {previewMode === 'weapon' ? 'Choose Your Weapon' : 'Choose Your Pirate'}
                        </span>
                    </div>

                    {/* ── 3D Preview Canvas (character OR weapon) ── */}
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        {/* Glow behind model */}
                        <div style={{
                            position: 'absolute', bottom: '20%', left: '50%',
                            transform: 'translateX(-50%)',
                            width: 300, height: 300,
                            background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)`,
                            pointerEvents: 'none',
                            transition: 'background 0.5s',
                        }} />

                        <Canvas
                            key={previewMode === 'weapon' ? `w-${selectedWeapon.key}` : `c-${char.id}`}
                            camera={{ position: [0, 0, 3.5], fov: 45 }}
                            gl={{ antialias: true, powerPreference: 'high-performance' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[3, 5, 3]} intensity={1.5} color={glowColor} />
                            <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#4080ff" />
                            <Environment preset="city" />
                            <Suspense fallback={null}>
                                {previewMode === 'character'
                                    ? <RotatingCharacter path={char.model} />
                                    : <RotatingWeapon path={selectedWeapon.path} />
                                }
                            </Suspense>
                        </Canvas>

                        {/* Bottom tabs — character select OR weapon picker */}
                        {previewMode === 'character' ? (
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
                        ) : (
                            /* Weapon picker scroll strip */
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 60%, transparent)',
                                padding: '16px 20px',
                            }}>
                                <div style={{
                                    display: 'flex', gap: 8, overflowX: 'auto',
                                    paddingBottom: 4,
                                    scrollbarWidth: 'none',
                                }}>
                                    {WEAPON_LIST.map(w => {
                                        const isActive = w.key === selectedWeapon.key;
                                        const tc = TIER_COLORS[w.tier] ?? '#fff';
                                        return (
                                            <button
                                                key={w.key}
                                                onClick={() => setSelectedWeapon(w)}
                                                style={{
                                                    flex: '0 0 auto',
                                                    background: isActive
                                                        ? `linear-gradient(135deg, ${tc}44, ${tc}22)`
                                                        : 'rgba(0,0,0,0.6)',
                                                    border: `2px solid ${isActive ? tc : 'rgba(255,255,255,0.1)'}`,
                                                    borderRadius: 10,
                                                    padding: '8px 14px',
                                                    cursor: 'pointer',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', gap: 3,
                                                    backdropFilter: 'blur(8px)',
                                                    transition: 'all 0.15s',
                                                    minWidth: 72,
                                                }}
                                            >
                                                <span style={{ fontSize: 20 }}>{w.emoji}</span>
                                                <span style={{
                                                    color: isActive ? tc : 'rgba(255,255,255,0.5)',
                                                    fontSize: 10, fontWeight: 700,
                                                    letterSpacing: 0.5, textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                }}>{w.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Info Panel ── */}
                    <div style={{
                        borderLeft: '1px solid rgba(255,255,255,0.07)',
                        padding: '40px 32px',
                        display: 'flex', flexDirection: 'column',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(12px)',
                        overflowY: 'auto',
                        transition: 'all 0.3s ease',
                    }}>
                        {previewMode === 'character' ? (
                            // ── Character info ──
                            <>
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ fontSize: 11, letterSpacing: 4, color: char.color, textTransform: 'uppercase', marginBottom: 6 }}>
                                        {char.title}
                                    </div>
                                    <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
                                        {char.name}
                                    </div>
                                </div>

                                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
                                    {char.description}
                                </p>

                                <div style={{ marginBottom: 32 }}>
                                    <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase' }}>
                                        Combat Stats
                                    </div>
                                    <StatBar label="Speed" value={char.stats.speed} color={char.color} />
                                    <StatBar label="Power" value={char.stats.power} color={char.color} />
                                    <StatBar label="Health" value={char.stats.health} color={char.color} />
                                </div>

                                {/* Weapon select button */}
                                <div style={{ marginTop: 'auto' }}>
                                    <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase' }}>
                                        Starting Weapon
                                    </div>
                                    <button
                                        onClick={() => setPreviewMode('weapon')}
                                        style={{
                                            width: '100%',
                                            background: `linear-gradient(90deg, ${tierColor}18, ${tierColor}08)`,
                                            border: `1px solid ${tierColor}44`,
                                            borderRadius: 12,
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            transition: 'border-color 0.2s, background 0.2s',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget).style.borderColor = `${tierColor}88`; }}
                                        onMouseLeave={e => { (e.currentTarget).style.borderColor = `${tierColor}44`; }}
                                    >
                                        <span style={{ fontSize: 24 }}>{selectedWeapon.emoji}</span>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ color: tierColor, fontWeight: 700, fontSize: 15 }}>
                                                {selectedWeapon.name}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                                                {selectedWeapon.desc}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                                            color: tierColor, border: `1px solid ${tierColor}55`,
                                            borderRadius: 4, padding: '2px 7px', flexShrink: 0,
                                        }}>{selectedWeapon.tier}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>›</span>
                                    </button>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8, letterSpacing: 1 }}>
                                        Click to preview &amp; swap weapon
                                    </div>
                                </div>
                            </>
                        ) : (
                            // ── Weapon info ──
                            <div style={{ animation: 'fadeIn 0.25s ease' }}>
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        background: `${tierColor}18`,
                                        border: `1px solid ${tierColor}44`,
                                        borderRadius: 8, padding: '4px 12px',
                                        marginBottom: 12,
                                    }}>
                                        <span style={{ fontSize: 10, letterSpacing: 2, color: tierColor, textTransform: 'uppercase' }}>
                                            {selectedWeapon.tier}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
                                        {selectedWeapon.name}
                                    </div>
                                </div>

                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                                    {selectedWeapon.desc}
                                </p>

                                {/* All weapons scrollable list */}
                                <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 10, textTransform: 'uppercase' }}>
                                    All Weapons
                                </div>
                                <div
                                    className="weapon-card"
                                    style={{
                                        display: 'flex', flexDirection: 'column', gap: 4,
                                        overflowY: 'auto', maxHeight: 340,
                                    }}
                                >
                                    {WEAPON_LIST.map(w => {
                                        const isActive = w.key === selectedWeapon.key;
                                        const tc = TIER_COLORS[w.tier] ?? '#fff';
                                        return (
                                            <button
                                                key={w.key}
                                                onClick={() => pickWeapon(w)}
                                                style={{
                                                    background: isActive
                                                        ? `linear-gradient(90deg, ${tc}22, ${tc}0a)`
                                                        : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isActive ? tc + '55' : 'rgba(255,255,255,0.06)'}`,
                                                    borderRadius: 9,
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    textAlign: 'left',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isActive) (e.currentTarget).style.background = 'rgba(255,255,255,0.05)';
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isActive) (e.currentTarget).style.background = 'rgba(255,255,255,0.02)';
                                                }}
                                            >
                                                <span style={{ fontSize: 18, minWidth: 22, textAlign: 'center' }}>{w.emoji}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{w.name}</span>
                                                        <span style={{
                                                            fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                                                            color: tc, border: `1px solid ${tc}44`,
                                                            borderRadius: 3, padding: '1px 5px',
                                                        }}>{w.tier}</span>
                                                    </div>
                                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 }}>
                                                        {w.desc}
                                                    </div>
                                                </div>
                                                {isActive && <span style={{ color: tc, fontSize: 16 }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                            <span style={{ margin: '0 8px', opacity: 0.2 }}>·</span>
                            <span style={{ color: tierColor, fontWeight: 600 }}>{selectedWeapon.emoji} {selectedWeapon.name}</span>
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
