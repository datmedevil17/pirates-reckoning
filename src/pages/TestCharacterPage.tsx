import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
    { name: 'Anne',              path: '/models/Characters_Anne.gltf' },
    { name: 'Barbarossa',        path: '/models/Characters_Captain_Barbarossa.gltf' },
    { name: 'Henry',             path: '/models/Characters_Henry.gltf' },
    { name: 'Mako',              path: '/models/Characters_Mako.gltf' },
    { name: 'Shark',             path: '/models/Characters_Shark.gltf' },
    { name: 'Sharky',            path: '/models/Characters_Sharky.gltf' },
    { name: 'Skeleton',          path: '/models/Characters_Skeleton.gltf' },
    { name: 'Skeleton Headless', path: '/models/Characters_Skeleton_Headless.gltf' },
    { name: 'Tentacle',          path: '/models/Characters_Tentacle.gltf' },
];

const WEAPONS = [
    { name: 'None',          path: null },
    { name: 'Sword I',       path: '/models/weapons/Weapon_Sword_1.gltf' },
    { name: 'Sword II',      path: '/models/weapons/Weapon_Sword_2.gltf' },
    { name: 'Cutlass',       path: '/models/weapons/Weapon_Cutlass.gltf' },
    { name: 'Dagger',        path: '/models/weapons/Weapon_Dagger.gltf' },
    { name: 'Axe',           path: '/models/weapons/Weapon_Axe.gltf' },
    { name: 'Double Axe',    path: '/models/weapons/Weapon_DoubleAxe.gltf' },
    { name: 'Pistol',        path: '/models/weapons/Weapon_Pistol.gltf' },
    { name: 'Rifle',         path: '/models/weapons/Weapon_Rifle.gltf' },
    { name: 'Axe Rifle',     path: '/models/weapons/Weapon_AxeRifle.gltf' },
    { name: 'Double Shotgun',path: '/models/weapons/Weapon_DoubleShotgun.gltf' },
    { name: 'Lute',          path: '/models/weapons/Weapon_Lute.gltf' },
];

const ACTION_MAP: Record<string, string> = {
    ' ': 'Jump', 'e': 'Sword',  'q': 'Punch',
    'f': 'Wave', 'r': 'Duck',   'g': 'HitReact',
    'x': 'Death','h': 'Yes',    'n': 'No',
};

const ACTION_LEGEND = [
    { key: 'Space', norm: ' ', action: 'Jump' },
    { key: 'E',  norm: 'e', action: 'Sword'    },
    { key: 'Q',  norm: 'q', action: 'Punch'    },
    { key: 'F',  norm: 'f', action: 'Wave'     },
    { key: 'R',  norm: 'r', action: 'Duck'     },
    { key: 'G',  norm: 'g', action: 'HitReact' },
    { key: 'X',  norm: 'x', action: 'Death'    },
    { key: 'H',  norm: 'h', action: 'Yes'      },
    { key: 'N',  norm: 'n', action: 'No'       },
];

const MOVE_KEYS    = new Set(['w', 'a', 's', 'd']);
const CAPTURE_KEYS = new Set(['w', 'a', 's', 'd', ' ', 'e', 'q', 'f', 'r', 'g', 'x', 'h', 'n']);

// Camera settings
const CAM_DIST     = 5.5;
const CAM_HEAD_H   = 1.2;
const CAM_SPEED    = 0.004;
const CAM_MIN_PITCH = -0.15;
const CAM_MAX_PITCH =  0.75;

// Preload eagerly
MODELS.forEach(m => useGLTF.preload(m.path));
WEAPONS.filter(w => w.path).forEach(w => useGLTF.preload(w.path!));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shortest-path angular lerp */
function lerpAngle(from: number, to: number, t: number): number {
    let d = ((to - from) % (Math.PI * 2));
    if (d >  Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return from + d * Math.min(1, t);
}

// ─── Weapon Attacher ─────────────────────────────────────────────────────────

/**
 * Uses R3F createPortal to render the weapon into the LowerArm.R bone's
 * Three.js object so it follows animations correctly.
 */
function WeaponInHand({ characterScene, weaponPath }: {
    characterScene: THREE.Group;
    weaponPath: string;
}) {
    const { scene: weaponScene } = useGLTF(weaponPath);

    // Locate the hand bone once per character scene change
    const [handBone, setHandBone] = useState<THREE.Object3D | null>(null);
    useEffect(() => {
        let bone: THREE.Object3D | null = null;
        characterScene.traverse(obj => { if (obj.name === 'LowerArm.R') bone = obj; });
        setHandBone(bone);
    }, [characterScene]);

    // Deep-clone the weapon so we don't mutate the cached GLTF scene object
    const weaponClone = useMemo(() => weaponScene.clone(true), [weaponScene]);

    if (!handBone) return null;

    // createPortal renders the weapon as a proper R3F child of the bone,
    // ensuring it's part of the reconciler's scene graph and correctly rendered.
    return createPortal(
        <primitive
            object={weaponClone}
            position={[0, 0.25, 0]}   // along forearm Y toward the palm
            rotation={[0, 0, 0]}
        />,
        handBone,
    ) as React.JSX.Element;
}

// ─── Third-Person Camera ─────────────────────────────────────────────────────

function ThirdPersonCamera({ charGroupRef, cameraYawRef, cameraPitchRef }: {
    charGroupRef:   React.RefObject<THREE.Group | null>;
    cameraYawRef:   React.RefObject<number>;
    cameraPitchRef: React.RefObject<number>;
}) {
    const { camera, gl } = useThree();

    // Mouse drag listener attached to the WebGL canvas
    useEffect(() => {
        const canvas = gl.domElement;
        let dragging = false;
        let lastX = 0, lastY = 0;

        const onDown  = (e: MouseEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
        const onMove  = (e: MouseEvent) => {
            if (!dragging) return;
            cameraYawRef.current!   += (e.clientX - lastX) * CAM_SPEED;
            cameraPitchRef.current!  = Math.max(CAM_MIN_PITCH, Math.min(CAM_MAX_PITCH,
                cameraPitchRef.current! + (e.clientY - lastY) * CAM_SPEED));
            lastX = e.clientX; lastY = e.clientY;
        };
        const onUp    = () => { dragging = false; };
        const noCtx   = (e: Event) => e.preventDefault();

        canvas.addEventListener('mousedown',    onDown);
        canvas.addEventListener('contextmenu',  noCtx);
        window.addEventListener('mousemove',    onMove);
        window.addEventListener('mouseup',      onUp);
        return () => {
            canvas.removeEventListener('mousedown',   onDown);
            canvas.removeEventListener('contextmenu', noCtx);
            window.removeEventListener('mousemove',   onMove);
            window.removeEventListener('mouseup',     onUp);
        };
    }, [gl, cameraYawRef, cameraPitchRef]);

    useFrame(() => {
        const charGroup = charGroupRef.current;
        if (!charGroup) return;
        const yaw   = cameraYawRef.current!;
        const pitch = cameraPitchRef.current!;
        const cp    = charGroup.position;

        camera.position.set(
            cp.x + CAM_DIST * Math.sin(yaw)   * Math.cos(pitch),
            cp.y + CAM_HEAD_H + CAM_DIST * Math.sin(pitch),
            cp.z + CAM_DIST * Math.cos(yaw)   * Math.cos(pitch),
        );
        camera.lookAt(cp.x, cp.y + CAM_HEAD_H * 0.8, cp.z);
    });

    return null;
}

// ─── Character Controller ─────────────────────────────────────────────────────

type JumpPhase = 'none' | 'up' | 'air' | 'land';

function CharacterController({ path, weaponPath, groupRef, cameraYawRef, keysRef, actionRef, onAnimChange, onNamesReady }: {
    path:           string;
    weaponPath:     string | null;
    groupRef:       React.RefObject<THREE.Group | null>;
    cameraYawRef:   React.RefObject<number>;
    keysRef:        React.RefObject<Set<string>>;
    actionRef:      React.RefObject<string | null>;
    onAnimChange:   (name: string) => void;
    onNamesReady:   (names: string[]) => void;
}) {
    const { scene, animations } = useGLTF(path);
    const { actions, names, mixer } = useAnimations(animations, scene);

    const pos          = useRef(new THREE.Vector3());
    const charRotY     = useRef(0);           // character's current facing angle
    const curAnim      = useRef('');
    const actionActive = useRef(false);
    const jumpPhase    = useRef<JumpPhase>('none');
    const jumpTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stable ref for the latest onAnimChange callback
    const onAnimChangeRef = useRef(onAnimChange);
    onAnimChangeRef.current = onAnimChange;

    // play() lives in a ref so that event-listener closures always call the latest version
    const playRef = useRef((_name: string, _once: boolean) => {});
    playRef.current = (name: string, once: boolean) => {
        if (!actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2);
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
        onAnimChangeRef.current(name);
    };

    // Hard-reset (no fade) used for model switches
    const hardPlayRef = useRef((_name: string) => {});
    hardPlayRef.current = (name: string) => {
        if (!actions[name]) return;
        Object.values(actions).forEach(a => a?.stop());
        actions[name]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        curAnim.current = name;
        onAnimChangeRef.current(name);
    };

    // Reset everything when the model changes
    useEffect(() => {
        if (jumpTimer.current) { clearTimeout(jumpTimer.current); jumpTimer.current = null; }
        pos.current.set(0, 0, 0);
        charRotY.current  = 0;
        actionActive.current = false;
        jumpPhase.current    = 'none';
        curAnim.current = '';
        onNamesReady(names);

        const idle = names.includes('Idle') ? 'Idle' : (names[0] ?? '');
        if (idle) hardPlayRef.current(idle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, actions, names]);

    // Jump chain via mixer 'finished' event
    useEffect(() => {
        const onFinished = (e: THREE.Event & { action?: THREE.AnimationAction }) => {
            if (jumpPhase.current === 'up' && e.action === actions['Jump']) {
                // Jump → Jump_Idle (loop briefly) → Jump_Land
                if (names.includes('Jump_Idle')) {
                    jumpPhase.current = 'air';
                    playRef.current('Jump_Idle', false);
                    jumpTimer.current = setTimeout(() => {
                        jumpPhase.current = 'land';
                        if (names.includes('Jump_Land')) {
                            playRef.current('Jump_Land', true);
                        } else {
                            jumpPhase.current = 'none';
                            actionActive.current = false;
                        }
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
                // Generic one-shot action finished
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
    }, [mixer, actions, names]);

    useFrame((_, delta) => {
        // ── Consume one-shot action key ──────────────────────────────
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

        // ── Movement (camera-relative) ───────────────────────────────
        const keys = keysRef.current!;
        const w = keys.has('w'), s = keys.has('s'), a = keys.has('a'), d = keys.has('d');

        const yaw = cameraYawRef.current!;
        // Camera's forward and right directions projected on XZ
        const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
        const rgtX =  Math.cos(yaw), rgtZ = -Math.sin(yaw);

        let moveX = 0, moveZ = 0;
        if (w) { moveX += fwdX; moveZ += fwdZ; }
        if (s) { moveX -= fwdX; moveZ -= fwdZ; }
        if (a) { moveX -= rgtX; moveZ -= rgtZ; }
        if (d) { moveX += rgtX; moveZ += rgtZ; }

        const isMoving = moveX !== 0 || moveZ !== 0;
        if (isMoving) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= len; moveZ /= len;

            pos.current.x += moveX * 4 * delta;
            pos.current.z += moveZ * 4 * delta;

            // Smoothly rotate character to face movement direction
            const targetRot = Math.atan2(moveX, moveZ);
            charRotY.current = lerpAngle(charRotY.current, targetRot, 12 * delta);
        }

        const group = groupRef.current;
        if (group) {
            group.position.copy(pos.current);
            group.rotation.y = charRotY.current;
        }

        // ── Animation state machine (skip while action/jump is active) ──
        if (!actionActive.current) {
            if (isMoving) {
                const runAnim = names.includes('Run')  ? 'Run'
                              : names.includes('Walk') ? 'Walk'
                              : names.includes('Swim_Fast') ? 'Swim_Fast' : '';
                if (runAnim) playRef.current(runAnim, false);
            } else {
                const idleAnim = names.includes('Idle') ? 'Idle'
                               : names.includes('Swim') ? 'Swim'
                               : (names[0] ?? '');
                if (idleAnim) playRef.current(idleAnim, false);
            }
        }
    });

    return (
        <group ref={groupRef as React.RefObject<THREE.Group>}>
            <primitive object={scene} />
            {weaponPath && <WeaponInHand characterScene={scene} weaponPath={weaponPath} />}
        </group>
    );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function CharacterScene({ modelPath, weaponPath, cameraYawRef, cameraPitchRef, keysRef, actionRef, onAnimChange, onNamesReady }: {
    modelPath:      string;
    weaponPath:     string | null;
    cameraYawRef:   React.RefObject<number>;
    cameraPitchRef: React.RefObject<number>;
    keysRef:        React.RefObject<Set<string>>;
    actionRef:      React.RefObject<string | null>;
    onAnimChange:   (n: string) => void;
    onNamesReady:   (n: string[]) => void;
}) {
    const charGroupRef = useRef<THREE.Group | null>(null);

    return (
        <>
            <Environment preset="city" />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} />
            <Grid
                renderOrder={-1}
                position={[0, 0.001, 0]}
                infiniteGrid
                cellSize={1}
                cellThickness={0.4}
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#1e3a5f"
                cellColor="#1e293b"
                fadeDistance={30}
                fadeStrength={2}
            />
            <CharacterController
                path={modelPath}
                weaponPath={weaponPath}
                groupRef={charGroupRef}
                cameraYawRef={cameraYawRef}
                keysRef={keysRef}
                actionRef={actionRef}
                onAnimChange={onAnimChange}
                onNamesReady={onNamesReady}
            />
            <ThirdPersonCamera
                charGroupRef={charGroupRef}
                cameraYawRef={cameraYawRef}
                cameraPitchRef={cameraPitchRef}
            />
        </>
    );
}

// ─── Key Cap ──────────────────────────────────────────────────────────────────

function KeyCap({ label, active, available = true }: { label: string; active: boolean; available?: boolean }) {
    return (
        <span className={`
            inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5
            rounded text-[11px] font-bold border transition-all duration-100 select-none
            ${active       ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_8px_#818cf8]'
            : available    ? 'bg-slate-800 border-slate-600 text-slate-300'
            :                'bg-slate-900 border-slate-800 text-slate-600'}
        `}>
            {label}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TestCharacterPage() {
    const [selectedModel,  setSelectedModel]  = useState(MODELS[0]!);
    const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0]!);
    const [currentAnim,    setCurrentAnim]    = useState('');
    const [availableAnims, setAvailableAnims] = useState<string[]>([]);
    const [activeKeys,     setActiveKeys]     = useState<Set<string>>(new Set());
    const [canvasKey,      setCanvasKey]      = useState(0);

    const keysRef        = useRef<Set<string>>(new Set());
    const actionRef      = useRef<string | null>(null);
    const cameraYawRef   = useRef(0);     // camera starts in front; character will face it
    const cameraPitchRef = useRef(0.35);  // slight overhead angle

    // Keyboard events
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
            if (CAPTURE_KEYS.has(key)) e.preventDefault();

            if (MOVE_KEYS.has(key)) {
                keysRef.current.add(key);
                setActiveKeys(new Set(keysRef.current));
            } else if (ACTION_MAP[key]) {
                actionRef.current = key;
                setActiveKeys(prev => new Set([...prev, key]));
                setTimeout(() => setActiveKeys(prev => {
                    const next = new Set(prev); next.delete(key); return next;
                }), 200);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
            if (MOVE_KEYS.has(key)) {
                keysRef.current.delete(key);
                setActiveKeys(new Set(keysRef.current));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup',   onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup',   onKeyUp);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 z-20 flex-wrap">

                {/* Model picker */}
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Character</span>
                    <Select value={selectedModel.path} onValueChange={val => {
                        const m = MODELS.find(m => m.path === val);
                        if (m) { setSelectedModel(m); setAvailableAnims([]); setCurrentAnim(''); }
                    }}>
                        <SelectTrigger className="w-[180px] h-8 bg-slate-800 border-slate-700 text-white text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {MODELS.map(m => (
                                <SelectItem key={m.path} value={m.path}
                                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-sm">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Weapon picker */}
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weapon</span>
                    <Select value={selectedWeapon.name} onValueChange={val => {
                        const w = WEAPONS.find(w => w.name === val);
                        if (w) setSelectedWeapon(w);
                    }}>
                        <SelectTrigger className="w-[160px] h-8 bg-slate-800 border-slate-700 text-white text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {WEAPONS.map(w => (
                                <SelectItem key={w.name} value={w.name}
                                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-sm">
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="h-6 w-px bg-slate-700" />

                {/* Current animation */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Playing</span>
                    <span className="text-sm text-indigo-400 font-mono font-semibold min-w-[90px]">
                        {currentAnim || '—'}
                    </span>
                </div>

                <div className="ml-auto">
                    <a href="/"
                        className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800">
                        ← Back
                    </a>
                </div>
            </div>

            {/* ── 3D Canvas ──────────────────────────────────────── */}
            <div className="flex-1 relative min-h-0">
                <Suspense fallback={
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-slate-400 text-sm">Loading character…</p>
                        </div>
                    </div>
                }>
                    <Canvas
                        key={canvasKey}
                        frameloop="always"
                        camera={{ position: [0, 2.5, 5.5], fov: 45 }}
                        gl={{ powerPreference: 'high-performance', antialias: true }}
                        onCreated={({ gl }) => {
                            gl.domElement.style.cursor = 'grab';
                            gl.domElement.addEventListener('mousedown', () => {
                                gl.domElement.style.cursor = 'grabbing';
                            });
                            gl.domElement.addEventListener('mouseup', () => {
                                gl.domElement.style.cursor = 'grab';
                            });
                            gl.domElement.addEventListener('webglcontextlost', e => {
                                e.preventDefault();
                                setTimeout(() => setCanvasKey(k => k + 1), 500);
                            });
                        }}
                    >
                        <color attach="background" args={['#020617']} />
                        <CharacterScene
                            modelPath={selectedModel.path}
                            weaponPath={selectedWeapon.path}
                            cameraYawRef={cameraYawRef}
                            cameraPitchRef={cameraPitchRef}
                            keysRef={keysRef}
                            actionRef={actionRef}
                            onAnimChange={setCurrentAnim}
                            onNamesReady={setAvailableAnims}
                        />
                    </Canvas>
                </Suspense>

                {/* Character name watermark */}
                <div className="absolute top-4 right-4 pointer-events-none select-none">
                    <p className="text-6xl font-black text-white/[0.04] uppercase italic leading-none text-right">
                        {selectedModel.name.split(' ').map((w, i) => <span key={i} className="block">{w}</span>)}
                    </p>
                </div>

                {/* Camera hint */}
                <div className="absolute top-4 left-4 pointer-events-none">
                    <p className="text-[11px] text-slate-600">Drag to orbit camera</p>
                </div>
            </div>

            {/* ── Keyboard Legend ─────────────────────────────────── */}
            <div className="shrink-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3
                            flex items-start gap-6 flex-wrap">

                {/* WASD cluster */}
                <div className="select-none">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Move</p>
                    <div className="flex flex-col items-center gap-1">
                        <KeyCap label="W" active={activeKeys.has('w')} />
                        <div className="flex gap-1">
                            <KeyCap label="A" active={activeKeys.has('a')} />
                            <KeyCap label="S" active={activeKeys.has('s')} />
                            <KeyCap label="D" active={activeKeys.has('d')} />
                        </div>
                        <div className="text-[9px] text-slate-600 flex gap-3 mt-0.5">
                            <span>Left</span><span>Back</span><span>Right</span>
                        </div>
                    </div>
                </div>

                <div className="w-px bg-slate-800 self-stretch" />

                {/* Action keys */}
                <div className="flex-1 select-none">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Actions</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {ACTION_LEGEND.map(({ key, norm, action }) => {
                            const available = availableAnims.includes(action);
                            return (
                                <div key={key} className="flex items-center gap-1.5">
                                    <KeyCap label={key} active={activeKeys.has(norm)} available={available} />
                                    <span className={`text-xs ${available ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                                        {action}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-px bg-slate-800 self-stretch" />

                {/* Animation list */}
                <div className="shrink-0 select-none">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Animations ({availableAnims.length})
                    </p>
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {availableAnims.map(a => (
                            <span key={a} className={`
                                text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors
                                ${a === currentAnim ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}
                            `}>{a}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
