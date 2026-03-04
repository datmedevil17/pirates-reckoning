// ─── Core game types ─────────────────────────────────────────────────────────

export type CharacterChoice = 'anne' | 'henry';
export type SceneName = 'ocean' | 'island' | 'naval' | 'ship';
export type AIState = 'patrol' | 'alert' | 'chase' | 'attack' | 'stagger' | 'dead';
export type EnemyType = 'skeleton' | 'skeleton_headless' | 'sharky' | 'shark' | 'tentacle' | 'barbarossa' | 'snake' | 'spider' | 'mantaray';
export type IslandTheme = 'village' | 'ruins' | 'port' | 'jungle' | 'boss' | 'underwater';
export type LightingPreset = 'day' | 'overcast' | 'sunset' | 'night' | 'storm' | 'jungle' | 'underwater';
export type Hand = 'left' | 'right';

// ─── Island layout ────────────────────────────────────────────────────────────

export interface PropPlacement {
    model: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    interactive?: boolean;   // E key interaction
    destructible?: boolean;  // can be destroyed (barrel, rock)
}

export interface EnemySpawn {
    type: EnemyType;
    position: [number, number, number];
    waypoints?: [number, number, number][];
    boss?: boolean;
}

export interface IslandDef {
    id: string;
    name: string;
    oceanPosition: [number, number, number]; // world pos in OceanScene
    difficulty: 1 | 2 | 3 | 4 | 5;
    theme: IslandTheme;
    lightingPreset: LightingPreset;
    dockPosition: [number, number, number];  // character spawn on drop anchor
    props: PropPlacement[];
    enemySpawns: EnemySpawn[];
    goldChestPosition: [number, number, number];
}

// ─── Resources / economy ─────────────────────────────────────────────────────

export interface Resources {
    gold: number;
    gemBlue: number;
    gemGreen: number;
    gemPink: number;
    wood: number;
    rocks: number;
    wheat: number;
}

export interface Upgrades {
    maxHp: number;
    cannonDamage: number;
    carryLimit: number;
}

// ─── Loot ────────────────────────────────────────────────────────────────────

export type LootItemType =
    | 'coins' | 'goldBag' | 'gemBlue' | 'gemGreen' | 'gemPink'
    | 'bottle1' | 'bottle2' | 'skull' | 'bomb'
    | 'wood' | 'rocks' | 'wheat';

export interface LootDrop {
    type: LootItemType;
    position: [number, number, number];
    id: string;
}
