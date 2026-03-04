import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { CHARACTERS } from '../../lib/assets';
import { usePlayerStore } from '../../store/playerStore';

useGLTF.preload(CHARACTERS.tentacle);

// ─── State ────────────────────────────────────────────────────────────────────

type TentState = 'submerged' | 'rising' | 'surface' | 'attack' | 'sinking';

// ─── Single Sea Tentacle ──────────────────────────────────────────────────────

interface SeaTentacleProps {
    position: [number, number, number]; // xz world pos; y is fully driven
    trackedPosRef: React.RefObject<THREE.Vector3>;
    senseRange: number;   // distance at which tentacle rises
    attackRange: number;  // distance at which it attacks
    waterY?: number;      // water surface Y (island = -1.2, ocean = -0.5)
    phase?: number;       // 0-7 timing offset for staggered emergence
    dealDamage?: boolean; // true only when player is on foot near island
}

function SeaTentacle({
    position,
    trackedPosRef,
    senseRange,
    attackRange,
    waterY = -1.2,
    phase = 0,
    dealDamage = false,
}: SeaTentacleProps) {
    const SUBMERGED_Y = waterY - 5.5;
    const SURFACE_Y   = waterY + 0.25;

    const { scene, animations } = useGLTF(CHARACTERS.tentacle);
    const clone = useMemo(() => {
        const c = SkeletonUtils.clone(scene) as THREE.Group;
        c.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        return c;
    }, [scene]);

    const groupRef   = useRef<THREE.Group>(null!);
    const splashRef  = useRef<THREE.Mesh>(null!);
    const { actions, names } = useAnimations(animations, groupRef);

    // Fixed xz for distance checks (avoids new Vector3 allocation per frame)
    const baseXZ = useMemo(() => new THREE.Vector3(position[0], 0, position[2]), []);

    const state       = useRef<TentState>('submerged');
    const curY        = useRef(SUBMERGED_Y);
    const curAnim     = useRef('');
    const stayTimer   = useRef(0);
    const attackTimer = useRef(2.5 + phase * 0.35); // stagger attacks across cluster
    const splashAmt   = useRef(0);                   // drives splash ring opacity/scale
    const ready       = useRef(false);

    const takeDamage = usePlayerStore(s => s.takeDamage);

    // Reassigned every render so it always captures current actions (avoids stale closure)
    const play = useRef((_name: string, _once?: boolean) => {});
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

        // ── First-frame init: wait for useAnimations to populate actions ──────
        if (!ready.current) {
            const idle = names.includes('Tentacle_Idle') ? 'Tentacle_Idle' : (names[0] ?? '');
            if (!idle || !actions[idle]) return;
            actions[idle]!.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            curAnim.current = idle;
            group.position.set(position[0], SUBMERGED_Y, position[2]);
            ready.current = true;
            return;
        }

        const dt   = Math.min(delta, 0.05);
        const pp   = trackedPosRef.current;
        const dist = pp ? baseXZ.distanceTo(new THREE.Vector3(pp.x, 0, pp.z)) : 9999;

        // ── State machine ─────────────────────────────────────────────────────
        switch (state.current) {

            case 'submerged':
                if (dist < senseRange) {
                    state.current = 'rising';
                    attackTimer.current = 1.8 + phase * 0.28;
                }
                break;

            case 'rising':
                play.current('Tentacle_Idle');
                if (curY.current >= SURFACE_Y - 0.5) {
                    state.current = 'surface';
                    stayTimer.current = 6 + Math.random() * 5;
                    splashAmt.current = 1.0; // burst splash when emerging
                }
                break;

            case 'surface':
                // Always face the tracked target
                if (pp) {
                    const dir = new THREE.Vector3(pp.x - position[0], 0, pp.z - position[2]).normalize();
                    group.rotation.y = Math.atan2(dir.x, dir.z);
                }
                attackTimer.current -= dt;
                stayTimer.current -= dt;
                if (dist < attackRange && attackTimer.current <= 0) {
                    state.current = 'attack';
                    attackTimer.current = 3.2;
                    if (dealDamage) takeDamage(20);
                } else if (dist > senseRange * 1.5 || stayTimer.current <= 0) {
                    state.current = 'sinking';
                }
                break;

            case 'attack': {
                const atk = names.includes('Tentacle_Attack') ? 'Tentacle_Attack'
                    : names.includes('Tentacle_Poke')         ? 'Tentacle_Poke'
                    : 'Tentacle_Attack2';
                play.current(atk, true);
                attackTimer.current -= dt;
                if (attackTimer.current <= 0) {
                    curAnim.current = ''; // reset so attack can fire again
                    state.current = dist < senseRange ? 'surface' : 'sinking';
                    stayTimer.current = 3.5;
                }
                break;
            }

            case 'sinking':
                if (curY.current <= SUBMERGED_Y + 0.5) {
                    state.current = 'submerged';
                    curAnim.current = '';
                }
                break;
        }

        // ── Y lerp: rise fast, sink slowly ───────────────────────────────────
        const targetY = (state.current === 'submerged' || state.current === 'sinking')
            ? SUBMERGED_Y : SURFACE_Y;
        const lerpSpd = state.current === 'rising'  ? 1.1
                      : state.current === 'sinking' ? 0.65 : 0;
        if (lerpSpd > 0) curY.current += (targetY - curY.current) * Math.min(lerpSpd * dt, 1);

        // Gentle idle bob when surfaced
        const bob = (state.current === 'surface' || state.current === 'attack')
            ? Math.sin(performance.now() * 0.0011 + phase * 1.3) * 0.12 : 0;
        group.position.set(position[0], curY.current + bob, position[2]);

        // ── Splash ring burst on emergence ───────────────────────────────────
        if (splashRef.current && splashAmt.current > 0) {
            splashAmt.current -= dt * 0.85;
            const prog = 1 - splashAmt.current;
            splashRef.current.scale.setScalar(1 + prog * 6);
            (splashRef.current.material as THREE.MeshBasicMaterial).opacity =
                Math.max(0, splashAmt.current * 0.6);
        }
    });

    return (
        <group>
            <group ref={groupRef}>
                <primitive object={clone} />
                {/* Glowing eye — gives Kraken personality */}
                <mesh position={[0, 3.2, 0.55]}>
                    <sphereGeometry args={[0.22, 8, 8]} />
                    <meshStandardMaterial
                        color="#ff2200" emissive="#ff1100" emissiveIntensity={5}
                        roughness={0} metalness={0}
                    />
                </mesh>
                {/* Bioluminescent glow ring at base */}
                <pointLight position={[0, 1.5, 0]} intensity={3} distance={8} color="#4488ff" />
            </group>

            {/* Splash ring at water surface level */}
            <mesh
                ref={splashRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[position[0], waterY + 0.12, position[2]]}
            >
                <ringGeometry args={[0.5, 1.8, 28]} />
                <meshBasicMaterial color="#aaddff" transparent opacity={0} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── Island Sea Ring ──────────────────────────────────────────────────────────
// 8 tentacles evenly distributed at water-ring radius ~145 around the island.
// They sense the player approaching the shore and deal damage if walked into.

const ISLAND_TENT_POS: [number, number, number][] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2; // slight angular offset for variety
    const r = 143 + (i % 3) * 11;            // slight radius variation
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
});

export function IslandSeaTentacles({ playerPosRef }: { playerPosRef: React.RefObject<THREE.Vector3> }) {
    return (
        <>
            {ISLAND_TENT_POS.map((pos, i) => (
                <SeaTentacle
                    key={i}
                    position={pos}
                    trackedPosRef={playerPosRef}
                    senseRange={115}
                    attackRange={22}
                    waterY={-1.2}
                    phase={i}
                    dealDamage={true}
                />
            ))}
        </>
    );
}

// ─── Ocean Kraken Clusters ────────────────────────────────────────────────────
// 3 zones in open ocean between islands. Each zone has 6 tentacles in a
// hexagonal ring (radius 20) that all emerge simultaneously when the ship
// sails into the zone — creating a full surround-and-attack moment.

// Hexagonal surround: 6 arms at 60° intervals, radius 20
const SURROUND_OFFSETS: [number, number, number][] = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 20, 0, Math.sin(a) * 20];
});

// Kraken zone world centres — verified clear of all island oceanPositions
// Islands: [60,-40], [-70,30], [10,80], [-20,-90], [0,-150]
const KRAKEN_ZONES: [number, number, number][] = [
    [ 155, 0,   62],   // open east
    [-158, 0,  -68],   // open west-south
    [  72, 0, -215],   // deep south
];

interface KrakenClusterProps {
    center: [number, number, number];
    shipPosRef: React.RefObject<THREE.Vector3>;
}

function KrakenCluster({ center, shipPosRef }: KrakenClusterProps) {
    return (
        <>
            {SURROUND_OFFSETS.map((off, i) => (
                <SeaTentacle
                    key={i}
                    position={[center[0] + off[0], 0, center[2] + off[2]]}
                    trackedPosRef={shipPosRef}
                    senseRange={40}   // sense when ship ~40 away from each arm
                    attackRange={26}  // attack when ship within 26
                    waterY={-0.5}
                    phase={i}
                    dealDamage={false} // no player HP while in ship
                />
            ))}
        </>
    );
}

export function KrakenTentacles({ shipPosRef }: { shipPosRef: React.RefObject<THREE.Vector3> }) {
    return (
        <>
            {KRAKEN_ZONES.map((center, i) => (
                <KrakenCluster key={i} center={center} shipPosRef={shipPosRef} />
            ))}
        </>
    );
}
