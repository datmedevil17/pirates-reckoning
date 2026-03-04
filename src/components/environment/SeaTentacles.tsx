import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { CHARACTERS } from '../../lib/assets';
import { usePlayerStore } from '../../store/playerStore';

useGLTF.preload(CHARACTERS.tentacle);

type TentState = 'submerged' | 'rising' | 'surface' | 'attack' | 'sinking';

// Each tentacle in a cluster uses a different attack animation for variety
// Tentacle_Idle, Tentacle_Attack, Tentacle_Attack2, Tentacle_Poke
const ATTACK_BY_PHASE = ['Tentacle_Attack', 'Tentacle_Attack2', 'Tentacle_Poke',
                          'Tentacle_Attack2', 'Tentacle_Attack', 'Tentacle_Poke'];

// ─── Island Sea Tentacle (fixed world position, tracks player on foot) ────────

interface SeaTentacleProps {
    position: [number, number, number];
    trackedPosRef: React.RefObject<THREE.Vector3>;
    senseRange: number;
    attackRange: number;
    waterY?: number;
    phase?: number;
    dealDamage?: boolean;
}

function SeaTentacle({
    position, trackedPosRef, senseRange, attackRange,
    waterY = -1.2, phase = 0, dealDamage = false,
}: SeaTentacleProps) {
    const SUBMERGED_Y = waterY - 5.5;
    const SURFACE_Y   = waterY + 0.25;

    const { scene, animations } = useGLTF(CHARACTERS.tentacle);
    const clone = useMemo(() => {
        const c = SkeletonUtils.clone(scene) as THREE.Group;
        c.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        return c;
    }, [scene]);

    const groupRef    = useRef<THREE.Group>(null!);
    const splashRef   = useRef<THREE.Mesh>(null!);
    const { actions, names } = useAnimations(animations, groupRef);
    const baseXZ      = useMemo(() => new THREE.Vector3(position[0], 0, position[2]), []);

    const state       = useRef<TentState>('submerged');
    const curY        = useRef(SUBMERGED_Y);
    const curAnim     = useRef('');
    const stayTimer   = useRef(0);
    const attackTimer = useRef(2.5 + phase * 0.35);
    const splashAmt   = useRef(0);
    const ready       = useRef(false);
    const atkAnim     = ATTACK_BY_PHASE[phase % ATTACK_BY_PHASE.length]!;

    const takeDamage  = usePlayerStore(s => s.takeDamage);

    const play = useRef((_n: string, _once?: boolean) => {});
    play.current = (name: string, once = false) => {
        if (!name || !actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2).setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
    };

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        if (!ready.current) {
            if (!actions['Tentacle_Idle']) return;
            actions['Tentacle_Idle']!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = 'Tentacle_Idle';
            group.position.set(position[0], SUBMERGED_Y, position[2]);
            ready.current = true;
            return;
        }

        const dt   = Math.min(delta, 0.05);
        const pp   = trackedPosRef.current;
        const dist = pp ? baseXZ.distanceTo(new THREE.Vector3(pp.x, 0, pp.z)) : 9999;

        switch (state.current) {
            case 'submerged':
                if (dist < senseRange) { state.current = 'rising'; attackTimer.current = 1.8 + phase * 0.28; }
                break;
            case 'rising':
                play.current('Tentacle_Idle');
                if (curY.current >= SURFACE_Y - 0.5) {
                    state.current = 'surface'; stayTimer.current = 6 + Math.random() * 5; splashAmt.current = 1.0;
                }
                break;
            case 'surface':
                if (pp) { const d = new THREE.Vector3(pp.x-position[0],0,pp.z-position[2]).normalize(); group.rotation.y = Math.atan2(d.x,d.z); }
                attackTimer.current -= dt; stayTimer.current -= dt;
                if (dist < attackRange && attackTimer.current <= 0) {
                    state.current = 'attack'; attackTimer.current = 3.2;
                    if (dealDamage) takeDamage(20);
                } else if (dist > senseRange * 1.5 || stayTimer.current <= 0) { state.current = 'sinking'; }
                break;
            case 'attack': {
                const a = names.includes(atkAnim) ? atkAnim : 'Tentacle_Attack';
                play.current(a, true);
                attackTimer.current -= dt;
                if (attackTimer.current <= 0) {
                    curAnim.current = '';
                    state.current = dist < senseRange ? 'surface' : 'sinking';
                    stayTimer.current = 3.5;
                }
                break;
            }
            case 'sinking':
                if (curY.current <= SUBMERGED_Y + 0.5) { state.current = 'submerged'; curAnim.current = ''; }
                break;
        }

        const targetY = (state.current === 'submerged' || state.current === 'sinking') ? SUBMERGED_Y : SURFACE_Y;
        const lerpSpd = state.current === 'rising' ? 1.1 : state.current === 'sinking' ? 0.65 : 0;
        if (lerpSpd > 0) curY.current += (targetY - curY.current) * Math.min(lerpSpd * dt, 1);
        const bob = (state.current === 'surface' || state.current === 'attack') ? Math.sin(performance.now()*0.0011+phase*1.3)*0.12 : 0;
        group.position.set(position[0], curY.current + bob, position[2]);

        if (splashRef.current && splashAmt.current > 0) {
            splashAmt.current -= dt * 0.85;
            splashRef.current.scale.setScalar(1 + (1-splashAmt.current)*6);
            (splashRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, splashAmt.current*0.6);
        }
    });

    return (
        <group>
            <group ref={groupRef}>
                <primitive object={clone} />
                <mesh position={[0, 3.2, 0.55]}>
                    <sphereGeometry args={[0.22, 8, 8]} />
                    <meshStandardMaterial color="#ff2200" emissive="#ff1100" emissiveIntensity={5} />
                </mesh>
                <pointLight position={[0, 1.5, 0]} intensity={3} distance={8} color="#4488ff" />
            </group>
            <mesh ref={splashRef} rotation={[-Math.PI/2,0,0]} position={[position[0], waterY+0.12, position[2]]}>
                <ringGeometry args={[0.5, 1.8, 28]} />
                <meshBasicMaterial color="#aaddff" transparent opacity={0} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── Island Sea Ring ──────────────────────────────────────────────────────────

const ISLAND_TENT_POS: [number, number, number][] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r = 143 + (i % 3) * 11;
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
});

export function IslandSeaTentacles({ playerPosRef }: { playerPosRef: React.RefObject<THREE.Vector3> }) {
    return (
        <>
            {ISLAND_TENT_POS.map((pos, i) => (
                <SeaTentacle key={i} position={pos} trackedPosRef={playerPosRef}
                    senseRange={115} attackRange={22} waterY={-1.2} phase={i} dealDamage={true} />
            ))}
        </>
    );
}

// ─── Kraken Tentacle (ocean, dynamic position, large scale) ──────────────────
// Positions itself around the ship's location at the moment it rises —
// not at a fixed world coord. This means the tentacles always surround
// the ship from all sides no matter where in the zone it entered.

const ZONE_RADIUS   = 55;  // ship must be this close to zone centre to trigger
const KRAKEN_WATER  = -0.5;
const KRAKEN_SUB_Y  = KRAKEN_WATER - 7.0;
const KRAKEN_SURF_Y = KRAKEN_WATER + 0.4;
const KRAKEN_SCALE  = 1.8; // scaled down — still imposing but not overwhelming

// Hexagonal surround at radius 22 — wide enough that ship has room to escape
const SURROUND_OFFSETS: [number, number][] = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 22, Math.sin(a) * 22];
});

// Kraken zone centres in open ocean — clear of all island positions
// Islands sit at: [60,-40], [-70,30], [10,80], [-20,-90], [0,-150]
export const KRAKEN_ZONES: [number, number, number][] = [
    [ 155, 0,   62],
    [-158, 0,  -68],
    [  72, 0, -215],
];

interface KrakenTentacleProps {
    zoneCenter: [number, number]; // xz
    offsetXZ: [number, number];   // xz offset from ship pos at rise time
    shipPosRef: React.RefObject<THREE.Vector3>;
    phase: number;
    /** Called each frame with (x, z, surfaced) so KrakenTentacles can do collision */
    onReport: (x: number, z: number, surfaced: boolean) => void;
}

function KrakenTentacle({ zoneCenter, offsetXZ, shipPosRef, phase, onReport }: KrakenTentacleProps) {
    const { scene, animations } = useGLTF(CHARACTERS.tentacle);
    const clone = useMemo(() => {
        const c = SkeletonUtils.clone(scene) as THREE.Group;
        c.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        return c;
    }, [scene]);

    const groupRef   = useRef<THREE.Group>(null!);
    const splashRef  = useRef<THREE.Mesh>(null!);
    const { actions, names } = useAnimations(animations, groupRef);

    const state       = useRef<TentState>('submerged');
    const curY        = useRef(KRAKEN_SUB_Y);
    const curAnim     = useRef('');
    const riseX       = useRef(-99999); // snapshotted at rise time
    const riseZ       = useRef(-99999);
    const stayTimer   = useRef(0);
    const attackTimer = useRef(1.8 + phase * 0.28);
    const splashAmt   = useRef(0);
    const ready       = useRef(false);
    // Cycle through different attack animations per phase for variety
    const atkAnim = ATTACK_BY_PHASE[phase % ATTACK_BY_PHASE.length]!;

    const play = useRef((_n: string, _once?: boolean) => {});
    play.current = (name: string, once = false) => {
        if (!name || !actions[name] || curAnim.current === name) return;
        actions[curAnim.current]?.fadeOut(0.2);
        const a = actions[name]!;
        a.reset().fadeIn(0.2).setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        if (once) a.clampWhenFinished = true;
        a.play();
        curAnim.current = name;
    };

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;

        // First-frame init
        if (!ready.current) {
            if (!actions['Tentacle_Idle']) return;
            actions['Tentacle_Idle']!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = 'Tentacle_Idle';
            group.position.set(-99999, KRAKEN_SUB_Y, -99999); // hide far away
            ready.current = true;
            return;
        }

        const dt  = Math.min(delta, 0.05);
        const pp  = shipPosRef.current;

        // Distance from ship to zone centre (for zone entry/exit)
        const zoneDist = pp
            ? Math.sqrt((pp.x - zoneCenter[0])**2 + (pp.z - zoneCenter[1])**2)
            : 9999;

        // Distance from ship to this tentacle's current position
        const tentDist = pp && state.current !== 'submerged'
            ? Math.sqrt((riseX.current - pp.x)**2 + (riseZ.current - pp.z)**2)
            : 9999;

        switch (state.current) {
            case 'submerged':
                group.position.set(-99999, KRAKEN_SUB_Y, -99999);
                onReport(-99999, -99999, false);
                if (zoneDist < ZONE_RADIUS && pp) {
                    // Snapshot rise position around ship's CURRENT location
                    riseX.current = pp.x + offsetXZ[0];
                    riseZ.current = pp.z + offsetXZ[1];
                    state.current = 'rising';
                    attackTimer.current = 1.5 + phase * 0.25;
                }
                break;

            case 'rising':
                play.current('Tentacle_Idle');
                group.position.set(riseX.current, curY.current, riseZ.current);
                onReport(riseX.current, riseZ.current, false);
                if (curY.current >= KRAKEN_SURF_Y - 0.5) {
                    state.current = 'surface';
                    stayTimer.current = 8 + Math.random() * 5;
                    splashAmt.current = 1.0;
                }
                break;

            case 'surface':
                // Face the ship
                if (pp) {
                    const dx = pp.x - riseX.current; const dz = pp.z - riseZ.current;
                    if (Math.sqrt(dx*dx+dz*dz) > 0.5) group.rotation.y = Math.atan2(dx, dz);
                }
                attackTimer.current -= dt; stayTimer.current -= dt;
                onReport(riseX.current, riseZ.current, true);
                if (tentDist < 18 && attackTimer.current <= 0) {
                    state.current = 'attack'; attackTimer.current = 3.0;
                } else if (zoneDist > ZONE_RADIUS * 1.6 || stayTimer.current <= 0) {
                    state.current = 'sinking';
                }
                break;

            case 'attack': {
                // Use this tentacle's assigned attack animation
                const resolvedAtk = names.includes(atkAnim) ? atkAnim
                    : names.includes('Tentacle_Attack') ? 'Tentacle_Attack' : 'Tentacle_Idle';
                play.current(resolvedAtk, true);
                onReport(riseX.current, riseZ.current, true);
                attackTimer.current -= dt;
                if (attackTimer.current <= 0) {
                    curAnim.current = '';
                    state.current = zoneDist < ZONE_RADIUS ? 'surface' : 'sinking';
                    stayTimer.current = 4.0;
                }
                break;
            }

            case 'sinking':
                group.position.set(riseX.current, curY.current, riseZ.current);
                onReport(riseX.current, riseZ.current, false);
                if (curY.current <= KRAKEN_SUB_Y + 0.5) {
                    state.current = 'submerged'; curAnim.current = '';
                }
                break;
        }

        // Y lerp — rise fast, sink slowly
        const targetY = (state.current === 'submerged' || state.current === 'sinking') ? KRAKEN_SUB_Y : KRAKEN_SURF_Y;
        const lerpSpd = state.current === 'rising' ? 1.2 : state.current === 'sinking' ? 0.6 : 0;
        if (lerpSpd > 0) curY.current += (targetY - curY.current) * Math.min(lerpSpd * dt, 1);

        const bob = (state.current === 'surface' || state.current === 'attack')
            ? Math.sin(performance.now()*0.001*1.1 + phase*1.4) * 0.18 : 0;

        if (state.current !== 'submerged') {
            group.position.set(riseX.current, curY.current + bob, riseZ.current);
        }

        // Splash ring
        if (splashRef.current && splashAmt.current > 0) {
            splashAmt.current -= dt * 0.8;
            const prog = 1 - splashAmt.current;
            splashRef.current.position.set(riseX.current, KRAKEN_WATER + 0.12, riseZ.current);
            splashRef.current.scale.setScalar(1 + prog * 7);
            (splashRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, splashAmt.current * 0.65);
        }
    });

    return (
        <group>
            <group ref={groupRef} scale={KRAKEN_SCALE}>
                <primitive object={clone} />
                {/* Glowing eye */}
                <mesh position={[0, 3.2, 0.55]}>
                    <sphereGeometry args={[0.25, 8, 8]} />
                    <meshStandardMaterial color="#ff2200" emissive="#ff1100" emissiveIntensity={6} />
                </mesh>
                <pointLight position={[0, 2, 0]} intensity={5} distance={14} color="#4488ff" />
            </group>
            <mesh ref={splashRef} rotation={[-Math.PI/2,0,0]} position={[-99999, KRAKEN_WATER+0.12, -99999]}>
                <ringGeometry args={[0.6, 2.2, 32]} />
                <meshBasicMaterial color="#aaddff" transparent opacity={0} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── Kraken Cluster ───────────────────────────────────────────────────────────

interface KrakenClusterProps {
    center: [number, number, number];
    shipPosRef: React.RefObject<THREE.Vector3>;
    positionsRef: React.RefObject<Map<string, THREE.Vector3>>; // shared collision map
    clusterId: number;
}

function KrakenCluster({ center, shipPosRef, positionsRef, clusterId }: KrakenClusterProps) {
    const zoneCenter: [number, number] = [center[0], center[2]];

    return (
        <>
            {SURROUND_OFFSETS.map(([ox, oz], i) => {
                const key = `${clusterId}-${i}`;
                const handleReport = (x: number, z: number, surfaced: boolean) => {
                    if (!positionsRef.current) return;
                    if (surfaced) {
                        let v = positionsRef.current.get(key);
                        if (!v) { v = new THREE.Vector3(); positionsRef.current.set(key, v); }
                        v.set(x, 0, z);
                    } else {
                        positionsRef.current.delete(key);
                    }
                };
                return (
                    <KrakenTentacle
                        key={key}
                        zoneCenter={zoneCenter}
                        offsetXZ={[ox, oz]}
                        shipPosRef={shipPosRef}
                        phase={i}
                        onReport={handleReport}
                    />
                );
            })}
        </>
    );
}

// ─── KrakenTentacles (exported, used by OceanScene) ──────────────────────────

interface KrakenTentaclesProps {
    shipPosRef: React.RefObject<THREE.Vector3>;
    onZoneChange: (active: boolean) => void;
    /** Receives the map of active tentacle positions for ship collision */
    activePosRef: React.RefObject<Map<string, THREE.Vector3>>;
}

export function KrakenTentacles({ shipPosRef, onZoneChange, activePosRef }: KrakenTentaclesProps) {
    const wasActive = useRef(false);

    // Track zone activity — trigger warning when ship enters any zone
    useFrame(() => {
        const pp = shipPosRef.current;
        if (!pp) return;
        const active = KRAKEN_ZONES.some(([cx, , cz]) =>
            Math.sqrt((pp.x - cx)**2 + (pp.z - cz)**2) < ZONE_RADIUS
        );
        if (active !== wasActive.current) {
            wasActive.current = active;
            onZoneChange(active);
        }
    });

    return (
        <>
            {KRAKEN_ZONES.map((center, i) => (
                <KrakenCluster
                    key={i}
                    center={center}
                    shipPosRef={shipPosRef}
                    positionsRef={activePosRef}
                    clusterId={i}
                />
            ))}
        </>
    );
}
