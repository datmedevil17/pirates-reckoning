import { useGLTF } from '@react-three/drei';

// ─── Character models ─────────────────────────────────────────────────────────
export const CHARACTERS = {
    anne: '/models/Characters_Anne.gltf',
    barbarossa: '/models/Characters_Captain_Barbarossa.gltf',
    henry: '/models/Characters_Henry.gltf',
    mako: '/models/Characters_Mako.gltf',
    shark: '/models/Characters_Shark.gltf',
    sharky: '/models/Characters_Sharky.gltf',
    skeleton: '/models/Characters_Skeleton.gltf',
    skeletonHL: '/models/Characters_Skeleton_Headless.gltf',
    tentacle: '/models/Characters_Tentacle.gltf',
} as const;

// ─── Weapons ──────────────────────────────────────────────────────────────────
export const WEAPONS = {
    axe: '/models/weapons/Weapon_Axe.gltf',
    axeRifle: '/models/weapons/Weapon_AxeRifle.gltf',
    cutlass: '/models/weapons/Weapon_Cutlass.gltf',
    dagger: '/models/weapons/Weapon_Dagger.gltf',
    doubleAxe: '/models/weapons/Weapon_DoubleAxe.gltf',
    doubleShotgun: '/models/weapons/Weapon_DoubleShotgun.gltf',
    lute: '/models/weapons/Weapon_Lute.gltf',
    pistol: '/models/weapons/Weapon_Pistol.gltf',
    rifle: '/models/weapons/Weapon_Rifle.gltf',
    sword1: '/models/weapons/Weapon_Sword_1.gltf',
    sword2: '/models/weapons/Weapon_Sword_2.gltf',
} as const;

// ─── Environment ──────────────────────────────────────────────────────────────
export const ENV = {
    cliff1: '/models/Environment_Cliff1.gltf',
    cliff2: '/models/Environment_Cliff2.gltf',
    cliff3: '/models/Environment_Cliff3.gltf',
    cliff4: '/models/Environment_Cliff4.gltf',
    dock: '/models/Environment_Dock.gltf',
    dockBroken: '/models/Environment_Dock_Broken.gltf',
    dockPole: '/models/Environment_Dock_Pole.gltf',
    house1: '/models/Environment_House1.gltf',
    house2: '/models/Environment_House2.gltf',
    house3: '/models/Environment_House3.gltf',
    largeBones: '/models/Environment_LargeBones.gltf',
    palmTree1: '/models/Environment_PalmTree_1.gltf',
    palmTree2: '/models/Environment_PalmTree_2.gltf',
    palmTree3: '/models/Environment_PalmTree_3.gltf',
    rock1: '/models/Environment_Rock_1.gltf',
    rock2: '/models/Environment_Rock_2.gltf',
    rock3: '/models/Environment_Rock_3.gltf',
    rock4: '/models/Environment_Rock_4.gltf',
    rock5: '/models/Environment_Rock_5.gltf',
    sawmill: '/models/Environment_Sawmill.gltf',
    skulls: '/models/Environment_Skulls.gltf',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export const PROPS = {
    anchor: '/models/Prop_Anchor.gltf',
    barrel: '/models/Prop_Barrel.gltf',
    bomb: '/models/Prop_Bomb.gltf',
    bottle1: '/models/Prop_Bottle_1.gltf',
    bottle2: '/models/Prop_Bottle_2.gltf',
    bucket: '/models/Prop_Bucket.gltf',
    bucketFish: '/models/Prop_Bucket_Fishes.gltf',
    cannon: '/models/Prop_Cannon.gltf',
    cannonBall: '/models/Prop_CannonBall.gltf',
    chestClosed: '/models/Prop_Chest_Closed.gltf',
    chestGold: '/models/Prop_Chest_Gold.gltf',
    coins: '/models/Prop_Coins.gltf',
    fishMackerel: '/models/Prop_Fish_Mackerel.gltf',
    fishTuna: '/models/Prop_Fish_Tuna.gltf',
    goldBag: '/models/Prop_GoldBag.gltf',
    skull: '/models/Prop_Skull.gltf',
} as const;

// ─── Ships ────────────────────────────────────────────────────────────────────
export const SHIPS = {
    large: '/models/Ship_Large.gltf',
    small: '/models/Ship_Small.gltf',
} as const;

// ─── UI models ────────────────────────────────────────────────────────────────
export const UI_MODELS = {
    chickenLeg: '/models/UI_ChickenLeg.gltf',
    gemBlue: '/models/UI_Gem_Blue.gltf',
    gemGreen: '/models/UI_Gem_Green.gltf',
    gemPink: '/models/UI_Gem_Pink.gltf',
    gold: '/models/UI_Gold.gltf',
    paper: '/models/UI_Paper.gltf',
    redDash: '/models/UI_Red_Dash.gltf',
    redX: '/models/UI_Red_X.gltf',
    rocks: '/models/UI_Rocks.gltf',
    swords: '/models/UI_Swords.gltf',
    wheat: '/models/UI_Wheat.gltf',
    wood: '/models/UI_Wood.gltf',
} as const;

// ─── Preloaders ───────────────────────────────────────────────────────────────
export function preloadCharacters() {
    Object.values(CHARACTERS).forEach(p => useGLTF.preload(p));
}

export function preloadWeapons() {
    Object.values(WEAPONS).forEach(p => useGLTF.preload(p));
}

export function preloadShips() {
    Object.values(SHIPS).forEach(p => useGLTF.preload(p));
}

// Preload for a specific island (call when player selects island before anchor drop)
export function preloadIslandAssets(models: string[]) {
    models.forEach(p => useGLTF.preload(p));
}
