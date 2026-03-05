import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHARACTER_PATH = '/models/Characters_Anne.gltf';
const CHARACTER_NAME = 'Anne';

const WEAPONS = [
    { name: 'None',           path: null },
    { name: 'Dagger',         path: '/models/weapons/Weapon_Dagger.gltf' },
    { name: 'Cutlass',        path: '/models/weapons/Weapon_Cutlass.gltf' },
    { name: 'Sword I',        path: '/models/weapons/Weapon_Sword_1.gltf' },
    { name: 'Sword II',       path: '/models/weapons/Weapon_Sword_2.gltf' },
    { name: 'Axe',            path: '/models/weapons/Weapon_Axe.gltf' },
    { name: 'Double Axe',     path: '/models/weapons/Weapon_DoubleAxe.gltf' },
    { name: 'Pistol',         path: '/models/weapons/Weapon_Pistol.gltf' },
    { name: 'Rifle',          path: '/models/weapons/Weapon_Rifle.gltf' },
    { name: 'Axe Rifle',      path: '/models/weapons/Weapon_AxeRifle.gltf' },
    { name: 'Double Shotgun', path: '/models/weapons/Weapon_DoubleShotgun.gltf' },
    { name: 'Lute',           path: '/models/weapons/Weapon_Lute.gltf' },
];

// Preload everything upfront
useGLTF.preload(CHARACTER_PATH);
WEAPONS.filter(w => w.path).forEach(w => useGLTF.preload(w.path!));

// ─── Weapon Attacher ──────────────────────────────────────────────────────────

function WeaponInHand({ characterScene, weaponPath }: {
    characterScene: THREE.Group;
    weaponPath: string;
}) {
    const { scene: weaponScene } = useGLTF(weaponPath);

    const [handBone, setHandBone] = useState<THREE.Object3D | null>(null);
    useEffect(() => {
        let bone: THREE.Object3D | null = null;
        characterScene.traverse(obj => { if (obj.name === 'LowerArm.R') bone = obj; });
        setHandBone(bone);
    }, [characterScene]);

    const weaponClone = useMemo(() => weaponScene.clone(true), [weaponScene]);

    if (!handBone) return null;

    return createPortal(
        <primitive object={weaponClone} position={[0, 0.25, 0]} />,
        handBone,
    ) as React.JSX.Element;
}

// ─── Character Display ────────────────────────────────────────────────────────

function CharacterDisplay({ weaponPath }: { weaponPath: string | null }) {
    const { scene, animations } = useGLTF(CHARACTER_PATH);
    const { actions, names } = useAnimations(animations, scene);

    // Start idle animation once
    useEffect(() => {
        const idle = names.includes('Idle') ? 'Idle' : names[0] ?? '';
        if (idle && actions[idle]) {
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        }
    }, [actions, names]);

    // Gentle auto-rotate
    const groupRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene} />
            {weaponPath && <WeaponInHand characterScene={scene} weaponPath={weaponPath} />}
        </group>
    );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function CharacterScene({ weaponPath }: { weaponPath: string | null }) {
    return (
        <>
            <Environment preset="sunset" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#4466ff" />
            <CharacterDisplay weaponPath={weaponPath} />
            <OrbitControls
                enablePan={false}
                minDistance={2}
                maxDistance={6}
                minPolarAngle={Math.PI * 0.15}
                maxPolarAngle={Math.PI * 0.75}
                target={[0, 0.9, 0]}
            />
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CharacterPage() {
    const [weaponIndex, setWeaponIndex] = useState(0);
    const [canvasKey,   setCanvasKey]   = useState(0);

    const selectedWeapon = WEAPONS[weaponIndex]!;

    const prev = () => setWeaponIndex(i => (i - 1 + WEAPONS.length) % WEAPONS.length);
    const next = () => setWeaponIndex(i => (i + 1) % WEAPONS.length);

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-4 px-5 py-3 bg-slate-900/80 border-b border-slate-800 z-20 backdrop-blur">
                <a href="/"
                    className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800">
                    ← Back
                </a>
                <div className="w-px h-5 bg-slate-700" />
                <h1 className="text-sm font-bold text-white uppercase tracking-widest">
                    Character Preview
                </h1>
            </div>

            {/* ── Canvas ────────────────────────────────────────────── */}
            <div className="flex-1 relative min-h-0">
                <Suspense fallback={
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-slate-400 text-sm">Loading…</p>
                        </div>
                    </div>
                }>
                    <Canvas
                        key={canvasKey}
                        frameloop="always"
                        camera={{ position: [0, 1.4, 4], fov: 45 }}
                        gl={{ antialias: true, powerPreference: 'high-performance' }}
                        shadows
                        onCreated={({ gl }) => {
                            gl.domElement.addEventListener('webglcontextlost', e => {
                                e.preventDefault();
                                setTimeout(() => setCanvasKey(k => k + 1), 500);
                            });
                        }}
                    >
                        <color attach="background" args={['#080d18']} />
                        <CharacterScene weaponPath={selectedWeapon.path} />
                    </Canvas>
                </Suspense>

                {/* Character name watermark */}
                <div className="absolute top-5 right-6 pointer-events-none select-none">
                    <p className="text-7xl font-black text-white/[0.04] uppercase italic leading-none">
                        {CHARACTER_NAME}
                    </p>
                </div>

                {/* Orbit hint */}
                <div className="absolute top-5 left-5 pointer-events-none">
                    <p className="text-[11px] text-slate-600">Drag to orbit · Scroll to zoom</p>
                </div>
            </div>

            {/* ── Weapon Switcher ───────────────────────────────────── */}
            <div className="shrink-0 bg-slate-900/95 border-t border-slate-800 backdrop-blur">
                <div className="flex items-center justify-center gap-4 px-6 py-5">

                    {/* Prev */}
                    <button
                        onClick={prev}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </button>

                    {/* Weapon name + dots */}
                    <div className="flex flex-col items-center gap-2 min-w-[200px]">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Weapon
                        </div>
                        <div className="text-lg font-bold text-white tracking-wide">
                            {selectedWeapon.name}
                        </div>
                        {/* Dot indicators */}
                        <div className="flex gap-1.5 mt-0.5">
                            {WEAPONS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setWeaponIndex(i)}
                                    className={`rounded-full transition-all duration-200 ${
                                        i === weaponIndex
                                            ? 'w-4 h-2 bg-indigo-500'
                                            : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Next */}
                    <button
                        onClick={next}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                </div>

                {/* Weapon grid shortcuts */}
                <div className="flex gap-2 flex-wrap justify-center px-6 pb-4">
                    {WEAPONS.map((w, i) => (
                        <button
                            key={w.name}
                            onClick={() => setWeaponIndex(i)}
                            className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                                i === weaponIndex
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                            }`}
                        >
                            {w.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
