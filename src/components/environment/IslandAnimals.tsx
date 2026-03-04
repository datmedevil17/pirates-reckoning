import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { lerpAngle } from '../shared/AnimatedCharacter';

// ─── Model paths ──────────────────────────────────────────────────────────────

const PATHS = {
    deer:            '/models/island2animals/Deer.gltf',
    stag:            '/models/island2animals/Stag.gltf',
    wolf:            '/models/island2animals/Wolf.gltf',
    apatosaurus:     '/models/island2animals/Apatosaurus.glb',
    parasaurolophus: '/models/island2animals/Parasaurolophus.glb',
    trex:            '/models/island2animals/Trex.glb',
    triceratops:     '/models/island2animals/Triceratops.glb',
} as const;

Object.values(PATHS).forEach(p => useGLTF.preload(p));

type AnimalType = 'deer' | 'stag' | 'wolf';
type DinoType   = 'apatosaurus' | 'parasaurolophus' | 'trex' | 'triceratops';

// ─── Exact animation names (provided by the user) ────────────────────────────

// Deer / Stag:  Idle, Idle_2, Walk, Gallop, Eating
// Wolf:         Idle, Idle_2, Idle_2_HeadLow, Gallop, Attack, Eating  (no Walk!)
// Wolf patrol uses Gallop at a reduced speed to simulate trotting

const IDLE_ANIMS: Record<AnimalType, string[]> = {
    deer: ['Idle', 'Idle_2'],
    stag: ['Idle', 'Idle_2'],
    wolf: ['Idle', 'Idle_2', 'Idle_2_HeadLow'],
};

// Animation for moving to waypoints (patrol)
const PATROL_ANIM: Record<AnimalType, string> = {
    deer: 'Walk',
    stag: 'Walk',
    wolf: 'Gallop',  // wolf has no Walk — trot with Gallop at lower speed
};

const WOLF_PATROL_SPEED = 2.5; // slow enough that Gallop looks like a trot

// ─── Behavior constants ───────────────────────────────────────────────────────

const FLEE_RANGE      = 20;
const WOLF_AGGRO      = 24;
const WOLF_ALERT      = 36; // wolf lifts head and watches from further out
const WOLF_ATTACK_R   = 4.0;
const WOLF_CHASE_SPD  = 8.5;
const WALK_SPEED      = 2.8;
const FLEE_SPEED      = 10.0;
const ISLAND_RADIUS   = 56;

type AnimalState = 'idle' | 'graze' | 'walk' | 'flee' | 'chase' | 'attack';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampToIsland(pos: THREE.Vector3): void {
    const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (r > ISLAND_RADIUS) { pos.x *= ISLAND_RADIUS / r; pos.z *= ISLAND_RADIUS / r; }
}

const CLIFF_ZONES: Array<[number, number]> = [
    [-58,-32],[58,-32],[62,18],[-62,18],[-65,-8],[65,-12],
    [-35,-52],[38,-55],[0,-52],[-22,-60],[24,-58],[0,-65],
];
function isBlocked(wp: THREE.Vector3): boolean {
    return CLIFF_ZONES.some(([cx,cz]) => (wp.x-cx)**2 + (wp.z-cz)**2 < 81);
}

// ─── SkeletalAnimal (deer / stag / wolf) ─────────────────────────────────────

interface SkeletalAnimalProps {
    type: AnimalType;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
    scale?: number;
    phase?: number;
}

function SkeletalAnimal({ type, position, waypoints, playerPosRef, scale = 1, phase = 0 }: SkeletalAnimalProps) {
    const { scene, animations } = useGLTF(PATHS[type]);

    const clone = useMemo(() => {
        const c = SkeletonUtils.clone(scene) as THREE.Group;
        c.traverse((o: THREE.Object3D) => {
            if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
        });
        return c;
    }, [scene]);

    const groupRef    = useRef<THREE.Group>(null!);
    const { actions } = useAnimations(animations, groupRef);

    const pos     = useRef(new THREE.Vector3(...position));
    const rotY    = useRef(Math.random() * Math.PI * 2);
    const curAnim = useRef('');
    const state   = useRef<AnimalState>('idle');
    const timer   = useRef(phase);
    const wpIdx   = useRef(0);
    const fleeDir = useRef(new THREE.Vector3());
    const ready   = useRef(false);

    // Idle variety — cycles through available idles so animals don't look robotic
    const idleVariantIdx   = useRef(Math.floor(Math.random() * IDLE_ANIMS[type].length));
    const idleVariantTimer = useRef(2 + Math.random() * 5);

    // Updated each render so play() always captures the latest actions
    const play = useRef((_name: string) => {});
    play.current = (name: string) => {
        if (!name || !actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.3);
        actions[name]!.reset().fadeIn(0.3).setLoop(THREE.LoopRepeat, Infinity).play();
        curAnim.current = name;
    };

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;

        // ── First-frame init: wait until useAnimations is ready ──────────────
        if (!ready.current) {
            const first = IDLE_ANIMS[type][0]!;
            if (!actions[first]) return;
            actions[first]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = first;
            group.position.copy(pos.current);
            ready.current = true;
            return;
        }

        const dt  = Math.min(delta, 0.05);
        const pp  = playerPosRef.current;
        const d2p = pp ? pos.current.distanceTo(pp) : 9999;

        // ── Wolf alert: use head-low idle when player is sensed ──────────────
        const wolfAlert = type === 'wolf' && d2p < WOLF_ALERT && state.current === 'idle';

        // ── State transitions ────────────────────────────────────────────────
        if (type === 'wolf') {
            if (d2p < WOLF_ATTACK_R) {
                if (state.current !== 'attack') { state.current = 'attack'; timer.current = 0.8; }
            } else if (d2p < WOLF_AGGRO) {
                if (state.current !== 'chase' && state.current !== 'attack') state.current = 'chase';
            } else if (state.current === 'chase' || state.current === 'attack') {
                state.current = 'idle'; timer.current = 2.5;
            } else {
                timer.current -= dt;
                if (timer.current <= 0) nextState();
            }
        } else {
            if (d2p < FLEE_RANGE) {
                if (state.current !== 'flee' && pp) {
                    fleeDir.current.copy(pos.current).sub(pp).normalize();
                    state.current = 'flee'; timer.current = 4.5;
                }
            } else if (state.current !== 'flee') {
                timer.current -= dt;
                if (timer.current <= 0) nextState();
            }
        }

        // ── Behaviours ───────────────────────────────────────────────────────
        switch (state.current) {

            case 'idle': {
                // Cycle through idle variants for variety
                idleVariantTimer.current -= dt;
                if (idleVariantTimer.current <= 0) {
                    const idles = IDLE_ANIMS[type];
                    idleVariantIdx.current = (idleVariantIdx.current + 1) % idles.length;
                    // Force re-play by clearing curAnim
                    if (actions[idles[idleVariantIdx.current]!]) {
                        actions[curAnim.current]?.fadeOut(0.5);
                        actions[idles[idleVariantIdx.current]!]!.reset().fadeIn(0.5).setLoop(THREE.LoopRepeat, Infinity).play();
                        curAnim.current = idles[idleVariantIdx.current]!;
                    }
                    idleVariantTimer.current = 2.5 + Math.random() * 5;
                } else {
                    // Wolf uses head-low idle when it senses the player
                    const idleAnim = wolfAlert
                        ? 'Idle_2_HeadLow'
                        : IDLE_ANIMS[type][idleVariantIdx.current]!;
                    play.current(idleAnim);
                }
                break;
            }

            case 'graze':
                play.current('Eating');
                break;

            case 'walk': {
                play.current(PATROL_ANIM[type]);
                const wp = new THREE.Vector3(...waypoints[wpIdx.current]!);
                if (isBlocked(wp)) { wpIdx.current = (wpIdx.current + 1) % waypoints.length; break; }
                const dir = wp.clone().sub(pos.current);
                if (dir.length() < 0.6) {
                    wpIdx.current = (wpIdx.current + 1) % waypoints.length;
                } else {
                    dir.normalize();
                    const spd = type === 'wolf' ? WOLF_PATROL_SPEED : WALK_SPEED;
                    pos.current.addScaledVector(dir, spd * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 5 * dt);
                }
                break;
            }

            case 'flee': {
                play.current('Gallop');
                pos.current.addScaledVector(fleeDir.current, FLEE_SPEED * dt);
                rotY.current = lerpAngle(rotY.current, Math.atan2(fleeDir.current.x, fleeDir.current.z), 8 * dt);
                timer.current -= dt;
                if (timer.current <= 0) { state.current = 'idle'; timer.current = 2.0; }
                break;
            }

            case 'chase': {
                // Wolf charges at full gallop
                play.current('Gallop');
                if (pp) {
                    const dir = pp.clone().sub(pos.current); dir.y = 0;
                    if (dir.length() > 0.3) {
                        dir.normalize();
                        pos.current.addScaledVector(dir, WOLF_CHASE_SPD * dt);
                        rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 10 * dt);
                    }
                }
                break;
            }

            case 'attack': {
                play.current('Attack');
                if (pp) {
                    const dir = pp.clone().sub(pos.current).normalize();
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 14 * dt);
                }
                timer.current -= dt;
                if (timer.current <= 0) {
                    state.current = d2p < WOLF_AGGRO ? 'chase' : 'idle';
                    timer.current = 1.5;
                }
                break;
            }
        }

        clampToIsland(pos.current);
        group.position.copy(pos.current);
        group.rotation.y = rotY.current;
    });

    function nextState() {
        const r = Math.random();
        if (type === 'wolf') {
            if (r < 0.55)      { state.current = 'walk';  timer.current = 4 + Math.random() * 4; wpIdx.current = (wpIdx.current + 1) % waypoints.length; }
            else if (r < 0.78) { state.current = 'graze'; timer.current = 2 + Math.random() * 3; }
            else               { state.current = 'idle';  timer.current = 2 + Math.random() * 4; }
        } else {
            if (r < 0.40)      { state.current = 'walk';  timer.current = 3 + Math.random() * 5; wpIdx.current = (wpIdx.current + 1) % waypoints.length; }
            else if (r < 0.70) { state.current = 'graze'; timer.current = 3 + Math.random() * 5; }
            else               { state.current = 'idle';  timer.current = 1.5 + Math.random() * 3; }
        }
    }

    return (
        <group ref={groupRef} scale={scale}>
            <primitive object={clone} />
        </group>
    );
}

// ─── Animated Dinosaur ────────────────────────────────────────────────────────

// Exact animation names from the GLBs (user confirmed):
// Apatosaurus_Idle,  Apatosaurus_Walk,  Apatosaurus_Run,  Apatosaurus_Attack
// TRex_Idle,         TRex_Walk,         TRex_Run,         TRex_Attack
// Triceratops_Idle,  Triceratops_Walk,  Triceratops_Run,  Triceratops_Attack
// Parasaurolophus_Idle, Parasaurolophus_Walk, Parasaurolophus_Run, Parasaurolophus_Attack

const DINO_ANIMS: Record<DinoType, { idle: string; walk: string; run: string; attack: string }> = {
    apatosaurus:     { idle: 'Apatosaurus_Idle',     walk: 'Apatosaurus_Walk',     run: 'Apatosaurus_Run',     attack: 'Apatosaurus_Attack' },
    parasaurolophus: { idle: 'Parasaurolophus_Idle', walk: 'Parasaurolophus_Walk', run: 'Parasaurolophus_Run', attack: 'Parasaurolophus_Attack' },
    trex:            { idle: 'TRex_Idle',            walk: 'TRex_Walk',            run: 'TRex_Run',            attack: 'TRex_Attack' },
    triceratops:     { idle: 'Triceratops_Idle',     walk: 'Triceratops_Walk',     run: 'Triceratops_Run',     attack: 'Triceratops_Attack' },
};

// Fallback chains if the exact name isn't found (safety net)
const DINO_FALLBACKS: Record<DinoType, { idle: string[]; walk: string[]; run: string[]; attack: string[] }> = {
    apatosaurus:     { idle: ['Idle','idle'],  walk: ['Walk','walk'], run: ['Run','Walk'],    attack: ['Attack','Walk'] },
    parasaurolophus: { idle: ['Idle','idle'],  walk: ['Walk','walk'], run: ['Run','Walk'],    attack: ['Attack','Walk'] },
    trex:            { idle: ['Idle','idle'],  walk: ['Walk','walk'], run: ['Run','Walk'],    attack: ['Attack','Walk'] },
    triceratops:     { idle: ['Idle','idle'],  walk: ['Walk','walk'], run: ['Charge','Walk'], attack: ['Attack','Charge','Walk'] },
};

const DINO_TARGET_HEIGHT: Record<DinoType, number> = {
    apatosaurus: 9.0, parasaurolophus: 3.0, trex: 8.5, triceratops: 3.2,
};

const DINO_BEH: Record<DinoType, {
    bobAmp: number; walkSpeed: number;
    aggroRange?: number; attackRange?: number; chaseSpeed?: number;
}> = {
    apatosaurus:     { bobAmp: 0.18, walkSpeed: 1.5 },
    parasaurolophus: { bobAmp: 0.10, walkSpeed: 2.5 },
    trex:            { bobAmp: 0.14, walkSpeed: 2.2, aggroRange: 38, attackRange: 5.5, chaseSpeed: 8.0 },
    triceratops:     { bobAmp: 0.10, walkSpeed: 1.8, aggroRange: 20, attackRange: 5.0, chaseSpeed: 5.5 },
};

type DinoState = 'idle' | 'walk' | 'chase' | 'attack';

interface DinoAnimalProps {
    type: DinoType;
    position: [number, number, number];
    waypoints: [number, number, number][];
    playerPosRef: React.RefObject<THREE.Vector3>;
    phase?: number;
    /** Optional territory: animal won't leave this circle (xz centre + radius) */
    zoneCenterXZ?: [number, number];
    zoneRadius?: number;
}

function pickAnim(actions: Record<string, THREE.AnimationAction | null>, exact: string, fallbacks: string[]): string {
    if (actions[exact]) return exact;
    for (const f of fallbacks) if (actions[f]) return f;
    const any = Object.keys(actions).find(k => !!actions[k]);
    return any ?? '';
}

function clampToZone(pos: THREE.Vector3, cx: number, cz: number, r: number): void {
    const dx = pos.x - cx; const dz = pos.z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > r) { pos.x = cx + dx / dist * r; pos.z = cz + dz / dist * r; }
}

function DinoAnimated({ type, position, waypoints, playerPosRef, phase = 0, zoneCenterXZ, zoneRadius }: DinoAnimalProps) {
    const { scene, animations } = useGLTF(PATHS[type]);
    const beh = DINO_BEH[type];

    const { clone, dinoScale, groundOffset } = useMemo(() => {
        const c = SkeletonUtils.clone(scene) as THREE.Group;
        c.traverse((o: THREE.Object3D) => {
            if ((o as THREE.Mesh).isMesh) {
                (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true;
            }
        });
        const box = new THREE.Box3().setFromObject(c);
        const modelH = box.max.y - box.min.y;
        const sc = modelH > 0.01 ? DINO_TARGET_HEIGHT[type] / modelH : 1.0;
        return { clone: c, dinoScale: sc, groundOffset: Math.abs(box.min.y) * sc };
    }, [scene, type]);

    const groupRef    = useRef<THREE.Group>(null!);
    const { actions } = useAnimations(animations, groupRef);

    // Resolved exact anim names (filled on first ready frame)
    const res = useRef({ idle: '', walk: '', run: '', attack: '' });

    const curAnim     = useRef('');
    const ready       = useRef(false);
    const pos         = useRef(new THREE.Vector3(position[0], 0, position[2]));
    const rotY        = useRef(Math.random() * Math.PI * 2);
    const dinoState   = useRef<DinoState>('walk');
    const stateTimer  = useRef(phase);
    const wpIdx       = useRef(0);
    const breathPhase = useRef(phase * Math.PI * 2);

    // Idle randomization: occasionally pause mid-walk for a look around
    const pauseTimer  = useRef(8 + Math.random() * 12);

    const play = useRef((_name: string) => {});
    play.current = (name: string) => {
        if (!name || !actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.35);
        actions[name]!.reset().fadeIn(0.35).setLoop(THREE.LoopRepeat, Infinity).play();
        curAnim.current = name;
    };

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;

        // ── First-frame: resolve exact animation names ────────────────────────
        if (!ready.current) {
            const fb = DINO_FALLBACKS[type];
            const ex = DINO_ANIMS[type];
            const walkName = pickAnim(actions, ex.walk, fb.walk);
            if (!walkName) return; // not ready yet

            res.current.idle   = pickAnim(actions, ex.idle,   fb.idle);
            res.current.walk   = walkName;
            res.current.run    = pickAnim(actions, ex.run,    fb.run);
            res.current.attack = pickAnim(actions, ex.attack, fb.attack);

            actions[walkName]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = walkName;
            group.position.set(pos.current.x, groundOffset, pos.current.z);
            ready.current = true;
            return;
        }

        const dt  = Math.min(delta, 0.05);
        const pp  = playerPosRef.current;
        const d2p = pp ? pos.current.distanceTo(pp) : 9999;
        const { aggroRange, attackRange, chaseSpeed } = beh;

        // ── State machine ────────────────────────────────────────────────────
        // Zone check: if player is outside our territory, give up chase
        const playerInZone = !(zoneCenterXZ && zoneRadius && pp &&
            Math.sqrt((pp.x - zoneCenterXZ[0]) ** 2 + (pp.z - zoneCenterXZ[1]) ** 2) > zoneRadius);

        if (aggroRange) {
            if (!playerInZone && (dinoState.current === 'chase' || dinoState.current === 'attack')) {
                dinoState.current = 'walk'; stateTimer.current = 4.0;
            } else if (d2p < attackRange!) {
                if (dinoState.current !== 'attack') { dinoState.current = 'attack'; stateTimer.current = 1.0; }
            } else if (d2p < aggroRange && playerInZone) {
                if (dinoState.current !== 'chase' && dinoState.current !== 'attack') dinoState.current = 'chase';
            } else if ((dinoState.current === 'chase' || dinoState.current === 'attack') && d2p > aggroRange * 1.4) {
                dinoState.current = 'walk'; stateTimer.current = 4.0;
            } else if (dinoState.current === 'idle' || dinoState.current === 'walk') {
                stateTimer.current -= dt;
                if (stateTimer.current <= 0) nextDinoState();
            }
        } else {
            // Peaceful dino: occasionally pauses mid-walk to look around
            pauseTimer.current -= dt;
            if (pauseTimer.current <= 0 && dinoState.current === 'walk') {
                dinoState.current = 'idle'; stateTimer.current = 2 + Math.random() * 3;
                pauseTimer.current = 8 + Math.random() * 12;
            } else {
                stateTimer.current -= dt;
                if (stateTimer.current <= 0) nextDinoState();
            }
        }

        // ── Behaviours ───────────────────────────────────────────────────────
        let moving = false;
        switch (dinoState.current) {
            case 'idle':
                play.current(res.current.idle);
                break;

            case 'walk': {
                play.current(res.current.walk);
                const wp = new THREE.Vector3(...waypoints[wpIdx.current]!);
                const dir = wp.clone().sub(pos.current); dir.y = 0;
                if (dir.length() < 0.8) {
                    wpIdx.current = (wpIdx.current + 1) % waypoints.length;
                } else {
                    dir.normalize();
                    pos.current.addScaledVector(dir, beh.walkSpeed * dt);
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 1.5 * dt);
                    moving = true;
                }
                break;
            }

            case 'chase': {
                play.current(res.current.run);
                if (pp) {
                    const dir = pp.clone().sub(pos.current); dir.y = 0;
                    if (dir.length() > 0.5) {
                        dir.normalize();
                        pos.current.addScaledVector(dir, (chaseSpeed ?? beh.walkSpeed * 1.5) * dt);
                        rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 3.5 * dt);
                        moving = true;
                    }
                }
                break;
            }

            case 'attack': {
                play.current(res.current.attack);
                if (pp) {
                    const dir = pp.clone().sub(pos.current).normalize();
                    rotY.current = lerpAngle(rotY.current, Math.atan2(dir.x, dir.z), 6 * dt);
                }
                stateTimer.current -= dt;
                if (stateTimer.current <= 0) {
                    dinoState.current  = (aggroRange && d2p < aggroRange) ? 'chase' : 'walk';
                    stateTimer.current = 1.5;
                }
                break;
            }
        }

        // Gentle breathing when idle
        if (!moving) breathPhase.current += dt * 0.8;
        const bobY = !moving ? Math.sin(breathPhase.current) * beh.bobAmp * 0.12 : 0;

        clampToIsland(pos.current);
        if (zoneCenterXZ && zoneRadius) clampToZone(pos.current, zoneCenterXZ[0], zoneCenterXZ[1], zoneRadius);
        group.position.set(pos.current.x, groundOffset + bobY, pos.current.z);
        group.rotation.y = rotY.current;
    });

    function nextDinoState() {
        if (Math.random() < 0.65) { dinoState.current = 'walk'; stateTimer.current = 6 + Math.random() * 8; wpIdx.current = (wpIdx.current + 1) % waypoints.length; }
        else                      { dinoState.current = 'idle'; stateTimer.current = 3 + Math.random() * 5; }
    }

    return (
        <group ref={groupRef} scale={dinoScale}>
            <primitive object={clone} />
        </group>
    );
}

// ─── Fireflies ────────────────────────────────────────────────────────────────

function Fireflies() {
    const COUNT   = 28;
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const dummy   = useMemo(() => new THREE.Object3D(), []);
    const basePos = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 6 + Math.random() * 44;
            pts.push(new THREE.Vector3(Math.cos(a)*r, 0.5+Math.random()*3.5, Math.sin(a)*r));
        }
        return pts;
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        for (let i = 0; i < COUNT; i++) {
            const bp = basePos[i]!; const ph = i * 0.618;
            dummy.position.set(
                bp.x + Math.sin(t*0.7+ph*3.1)*1.5,
                bp.y + Math.sin(t*1.2+ph)*0.8,
                bp.z + Math.cos(t*0.6+ph*2.7)*1.5,
            );
            dummy.scale.setScalar(0.04 + Math.abs(Math.sin(t*2.0+ph))*0.09);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
            <sphereGeometry args={[1, 4, 4]} />
            <meshStandardMaterial color="#aaff88" emissive="#88ff44" emissiveIntensity={4} transparent opacity={0.85} />
        </instancedMesh>
    );
}

// ─── Gem Decoration ───────────────────────────────────────────────────────────

function GemDecoration({ position, color, phase = 0 }: { position: [number,number,number]; color: string; phase?: number }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const baseY = position[1] + 0.55;
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        meshRef.current.rotation.y = t * 0.85 + phase;
        meshRef.current.rotation.x = Math.sin(t * 0.4 + phase) * 0.15;
        meshRef.current.position.y = baseY + Math.sin(t * 1.5 + phase) * 0.12;
    });
    return (
        <mesh ref={meshRef} position={[position[0], baseY, position[2]]} castShadow>
            <octahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.05} metalness={0.9} transparent opacity={0.92} />
        </mesh>
    );
}

// ─── Island2Animals ───────────────────────────────────────────────────────────

export function Island2Animals({ playerPosRef }: { playerPosRef: React.RefObject<THREE.Vector3> }) {
    return (
        <>
            {/* ── Deer — east glades ───────────────────────────────────────── */}
            <SkeletalAnimal type="deer" scale={0.48} phase={0.5}
                position={[28,0,18]} waypoints={[[28,0,18],[34,0,26],[22,0,34],[16,0,22]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="deer" scale={0.44} phase={1.8}
                position={[12,0,-4]} waypoints={[[12,0,-4],[20,0,-10],[10,0,-18],[4,0,-8]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="deer" scale={0.50} phase={3.2}
                position={[38,0,8]} waypoints={[[38,0,8],[44,0,16],[38,0,24],[30,0,14]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="deer" scale={0.46} phase={4.8}
                position={[6,0,36]} waypoints={[[6,0,36],[14,0,44],[2,0,50],[-6,0,42]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="deer" scale={0.52} phase={2.4}
                position={[22,0,-14]} waypoints={[[22,0,-14],[30,0,-20],[24,0,-28],[14,0,-20]]}
                playerPosRef={playerPosRef} />

            {/* ── Stag — north forest ──────────────────────────────────────── */}
            <SkeletalAnimal type="stag" scale={0.58} phase={2.0}
                position={[24,0,-20]} waypoints={[[24,0,-20],[32,0,-28],[26,0,-36],[16,0,-26]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="stag" scale={0.54} phase={0.9}
                position={[-24,0,-20]} waypoints={[[-24,0,-20],[-32,0,-26],[-22,0,-34],[-14,0,-22]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="stag" scale={0.56} phase={3.7}
                position={[2,0,-22]} waypoints={[[2,0,-22],[10,0,-30],[2,0,-38],[-10,0,-28]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="stag" scale={0.52} phase={1.4}
                position={[40,0,-8]} waypoints={[[40,0,-8],[46,0,-18],[40,0,-26],[30,0,-14]]}
                playerPosRef={playerPosRef} />

            {/* ── Wolves — pack hunters, use Gallop to chase ───────────────── */}
            <SkeletalAnimal type="wolf" scale={0.54} phase={1.2}
                position={[-28,0,-8]} waypoints={[[-28,0,-8],[-36,0,0],[-32,0,10],[-22,0,2]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="wolf" scale={0.50} phase={2.7}
                position={[-18,0,-24]} waypoints={[[-18,0,-24],[-10,0,-30],[-4,0,-20],[-14,0,-12]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="wolf" scale={0.52} phase={0.4}
                position={[-34,0,14]} waypoints={[[-34,0,14],[-42,0,4],[-38,0,-6],[-28,0,8]]}
                playerPosRef={playerPosRef} />
            <SkeletalAnimal type="wolf" scale={0.48} phase={3.5}
                position={[-10,0,-18]} waypoints={[[-10,0,-18],[-18,0,-26],[-24,0,-14],[-14,0,-6]]}
                playerPosRef={playerPosRef} />

            {/* ── Apatosaurus — gentle giant, pauses to look around ────────── */}
            <DinoAnimated type="apatosaurus" phase={1.0}
                position={[14,0,14]} waypoints={[[14,0,14],[20,0,24],[6,0,32],[-6,0,22],[4,0,10]]}
                playerPosRef={playerPosRef} />

            {/* ── Parasaurolophus — east trio, skittish grazers ────────────── */}
            <DinoAnimated type="parasaurolophus" phase={0.5}
                position={[22,0,2]} waypoints={[[22,0,2],[30,0,-6],[26,0,-14],[16,0,-4]]}
                playerPosRef={playerPosRef} />
            <DinoAnimated type="parasaurolophus" phase={2.2}
                position={[26,0,10]} waypoints={[[26,0,10],[34,0,2],[30,0,-8],[20,0,0]]}
                playerPosRef={playerPosRef} />
            <DinoAnimated type="parasaurolophus" phase={3.6}
                position={[32,0,-2]} waypoints={[[32,0,-2],[38,0,-12],[30,0,-20],[22,0,-8]]}
                playerPosRef={playerPosRef} />

            {/* ── Triceratops — territorial, charges when you get close ─────── */}
            <DinoAnimated type="triceratops" phase={3.0}
                position={[-18,0,-6]} waypoints={[[-18,0,-6],[-26,0,-14],[-22,0,-22],[-12,0,-10]]}
                playerPosRef={playerPosRef} />
            <DinoAnimated type="triceratops" phase={0.8}
                position={[-8,0,28]} waypoints={[[-8,0,28],[-16,0,18],[-22,0,28],[-14,0,38]]}
                playerPosRef={playerPosRef} />

            {/* ── T-Rex — apex predators confined to northern jungle ────────── */}
            <DinoAnimated type="trex" phase={1.5}
                position={[10,0,-28]} waypoints={[[10,0,-28],[20,0,-36],[4,0,-42],[-10,0,-34]]}
                playerPosRef={playerPosRef}
                zoneCenterXZ={[4, -34]} zoneRadius={26} />
            <DinoAnimated type="trex" phase={4.2}
                position={[-18,0,-34]} waypoints={[[-18,0,-34],[-6,0,-42],[6,0,-34],[-8,0,-26]]}
                playerPosRef={playerPosRef}
                zoneCenterXZ={[-6, -34]} zoneRadius={26} />

            {/* ── Fireflies ─────────────────────────────────────────────────── */}
            <Fireflies />

            {/* ── Gems ──────────────────────────────────────────────────────── */}
            <GemDecoration position={[12,0,8]}    color="#00e87a" phase={0.0} />
            <GemDecoration position={[-26,0,-10]} color="#00e87a" phase={2.1} />
            <GemDecoration position={[42,0,-2]}   color="#00cc55" phase={4.2} />
            <GemDecoration position={[-16,0,32]}  color="#00ee66" phase={5.1} />
            <GemDecoration position={[-10,0,28]}  color="#ff44aa" phase={1.0} />
            <GemDecoration position={[20,0,-28]}  color="#ff44aa" phase={3.3} />
            <GemDecoration position={[-40,0,10]}  color="#dd2299" phase={0.7} />
            <GemDecoration position={[30,0,22]}   color="#ff66bb" phase={2.8} />
            <GemDecoration position={[0,0,-22]}   color="#4499ff" phase={2.0} />
            <GemDecoration position={[34,0,-10]}  color="#4499ff" phase={4.8} />
            <GemDecoration position={[-6,0,-40]}  color="#2266ee" phase={1.4} />
            <GemDecoration position={[-30,0,-30]} color="#55aaff" phase={3.6} />
        </>
    );
}
