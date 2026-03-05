import type { IslandDef } from './types';
import { ENV, PROPS, UI_MODELS, SHIPS, UNDERWATER } from './assets';

export const ISLANDS: IslandDef[] = [

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 1: HOME ISLAND — peaceful base, no enemies, explore & collect
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'traders-cove',
        name: "Trader's Cove",
        oceanPosition: [60, 0, -40],
        difficulty: 1,
        theme: 'village',
        lightingPreset: 'day',
        // Move dock to island edge (positive Z is towards water)
        dockPosition: [0, 0, 45],
        goldChestPosition: [-18, 0, -12],
        props: [
            // ── Dock area (Pushed to edge Z=45+) ───────────────────────────────
            { model: ENV.dock, position: [0, 0, 48], rotation: [0, 0, 0] },
            { model: ENV.dockPole, position: [-4, 0, 50], rotation: [0, 0.3, 0] },
            { model: ENV.dockPole, position: [4, 0, 50], rotation: [0, -0.2, 0] },
            { model: ENV.dockPole, position: [0, 0, 52], rotation: [0, 0.1, 0] },
            { model: PROPS.anchor, position: [2, 0, 47], rotation: [0, 0.5, 0] },
            { model: PROPS.barrel, position: [3, 0, 46], destructible: true },
            { model: PROPS.barrel, position: [4, 0, 46], destructible: true },
            { model: PROPS.barrel, position: [-3, 0, 46], destructible: true },

            // ── Cliffs & Large Stone Formations ────────────────────────────────
            { model: ENV.cliff1, position: [-35, 0, -20], rotation: [0, 0.8, 0], scale: 2.2 },
            { model: ENV.cliff2, position: [35, 0, -15], rotation: [0, -0.5, 0], scale: 2.0 },
            { model: ENV.cliff3, position: [0, -2, -45], rotation: [0, Math.PI, 0], scale: 3.5 },
            { model: ENV.cliff4, position: [45, 0, 25], rotation: [0, 2.1, 0], scale: 2.8 },
            { model: ENV.cliff1, position: [-45, 0, 35], rotation: [0, -1.2, 0], scale: 2.5 },
            { model: ENV.cliff2, position: [-50, -2, 0], rotation: [0, 1.5, 0], scale: 3.0 },
            { model: ENV.cliff3, position: [50, -2, -10], rotation: [0, -1.5, 0], scale: 3.0 },

            // ── Village — 3 houses ──────────────────────────────────────────────
            { model: ENV.house1, position: [-16, 0, 2], rotation: [0, 0.3, 0] },
            { model: ENV.house2, position: [14, 0, 0], rotation: [0, -0.4, 0] },
            { model: ENV.house3, position: [0, 0, -10], rotation: [0, Math.PI, 0] },

            // ── Sawmill ────────────────────────────────────────────────────────
            { model: ENV.sawmill, position: [-22, 0, -6], rotation: [0, 0.5, 0] },

            // ── Palm trees ─────────────────────────────────────────────────────
            { model: ENV.palmTree1, position: [20, 0, 10], rotation: [0, 0.2, 0], scale: 4.5 },
            { model: ENV.palmTree1, position: [-20, 0, 12], rotation: [0, 1.1, 0], scale: 4.0 },
            { model: ENV.palmTree1, position: [10, 0, -25], rotation: [0, 2.3, 0], scale: 4.8 },
            { model: ENV.palmTree2, position: [-10, 0, 22], rotation: [0, 0.8, 0], scale: 4.2 },
            { model: ENV.palmTree2, position: [26, 0, -10], rotation: [0, 1.6, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [-28, 0, 8], rotation: [0, 2.8, 0], scale: 4.3 },
            { model: ENV.palmTree3, position: [8, 0, 28], rotation: [0, 0.5, 0], scale: 3.7 },
            { model: ENV.palmTree3, position: [-16, 0, -20], rotation: [0, 1.9, 0], scale: 4.1 },
            { model: ENV.palmTree3, position: [22, 0, -18], rotation: [0, 3.1, 0], scale: 3.5 },
            { model: ENV.palmTree1, position: [0, 0, -35], rotation: [0, 0.5, 0], scale: 5.0 },
            { model: ENV.palmTree2, position: [35, 0, 5], rotation: [0, 1.2, 0], scale: 4.4 },
            { model: ENV.palmTree3, position: [-35, 0, -10], rotation: [0, 2.1, 0], scale: 4.0 },

            // ── Rocks scattered ───────────────────────────────────────────────
            { model: ENV.rock1, position: [-28, 0, 4], scale: 2.5 },
            { model: ENV.rock2, position: [28, 0, 7], scale: 2.2 },
            { model: ENV.rock3, position: [-22, 0, -22], scale: 2.0 },
            { model: ENV.rock4, position: [24, 0, 20], scale: 2.3 },
            { model: ENV.rock5, position: [0, 0, -38], scale: 2.8 },
            { model: ENV.rock1, position: [-8, 0, 28], scale: 1.8 },
            { model: ENV.rock2, position: [18, 0, -28], scale: 2.0 },
            { model: ENV.rock3, position: [38, 0, 12], scale: 2.1 },
            { model: ENV.rock4, position: [-38, 0, -12], scale: 2.0 },
            { model: ENV.rock5, position: [12, 0, 38], scale: 2.4 },
            { model: ENV.rock1, position: [-30, 0, 30], scale: 2.0 },
            { model: ENV.rock2, position: [30, 0, 30], scale: 2.0 },

            // ── Loot ──────────────────────────────────────────────────────────
            { model: PROPS.coins, position: [6, 0, -3], scale: 1.2 },
            { model: PROPS.coins, position: [-5, 0, 5], scale: 1.2 },
            { model: PROPS.goldBag, position: [-12, 0, 8], scale: 1.3 },
            { model: PROPS.goldBag, position: [11, 0, -11], scale: 1.3 },
            { model: PROPS.bucket, position: [4, 0.2, 17], scale: 1.3 },
            { model: PROPS.bucketFish, position: [-4, 0.2, 43], scale: 1.3 }, // dock bucket

            // ── Chests ────────────────────────────────────────────────────────
            { model: PROPS.chestClosed, position: [-10, 0, 6], interactive: true },
            { model: PROPS.chestClosed, position: [14, 0, 10], interactive: true },
            { model: PROPS.chestClosed, position: [-18, 0, -14], interactive: true },
            { model: PROPS.chestGold, position: [-22, 0, -16], interactive: true },

            // ── Skulls ────────────────────────────────────────────────────────
            // ── Skulls (Properly raised) ──────────────────────────────────
            { model: PROPS.skull, position: [7, 1.2, -7], scale: 1.6 },
            { model: PROPS.skull, position: [-12, 1.2, 2], scale: 1.6 },

        ],
        enemySpawns: [],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 2: Crumbling Fortress — lush, gem-strewn, big-cliff island
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'crumbling-fortress',
        name: 'Jungle Ruins',
        oceanPosition: [-70, 0, 30],
        difficulty: 2,
        theme: 'ruins',
        lightingPreset: 'jungle',
        dockPosition: [0, 0, 70],
        goldChestPosition: [-8, 0, -38],
        props: [

            // ── Dock area (south entry) ────────────────────────────────────────
            { model: ENV.dock, position: [0, 0, 74], rotation: [0, 0, 0] },
            { model: ENV.dockPole, position: [-5, 0, 76], rotation: [0, 0.3, 0] },
            { model: ENV.dockPole, position: [5, 0, 76], rotation: [0, -0.2, 0] },
            { model: ENV.dockPole, position: [0, 0, 78], rotation: [0, 0.1, 0] },
            { model: ENV.dockPole, position: [-8, 0, 72], rotation: [0, 0.5, 0] },
            { model: ENV.dockPole, position: [8, 0, 72], rotation: [0, -0.4, 0] },

            // ── Wood stacked near dock ─────────────────────────────────────────
            { model: UI_MODELS.wood, position: [4, 0.3, 66], rotation: [0, 0.3, 0], scale: 4 },
            { model: UI_MODELS.wood, position: [-4, 0.3, 66], rotation: [0, -0.4, 0], scale: 4 },
            { model: UI_MODELS.wood, position: [7, 0.3, 68], rotation: [0, 1.1, 0], scale: 3.5 },

            // ── Small ship anchored to the east of dock (in water) ────────────
            { model: SHIPS.small, position: [52, -1.5, 68], rotation: [0, -0.45, 0], scale: 3 },

            // ── Cliff ring — scaled down so animals + player don't clip into them ──
            { model: ENV.cliff3, position: [0, -2, -65], rotation: [0, Math.PI, 0], scale: 4.0 },
            { model: ENV.cliff1, position: [-58, 0, -32], rotation: [0, 0.8, 0], scale: 3.0 },
            { model: ENV.cliff2, position: [58, 0, -32], rotation: [0, -0.5, 0], scale: 3.0 },
            { model: ENV.cliff4, position: [62, 0, 18], rotation: [0, 2.2, 0], scale: 2.6 },
            { model: ENV.cliff1, position: [-62, 0, 18], rotation: [0, -1.2, 0], scale: 2.6 },
            { model: ENV.cliff2, position: [-65, -2, -8], rotation: [0, 1.5, 0], scale: 3.2 },
            { model: ENV.cliff3, position: [65, -2, -12], rotation: [0, -1.5, 0], scale: 3.2 },
            { model: ENV.cliff4, position: [-35, 0, -52], rotation: [0, 0.5, 0], scale: 2.5 },
            { model: ENV.cliff1, position: [38, 0, -55], rotation: [0, -0.3, 0], scale: 2.7 },
            { model: ENV.cliff2, position: [0, -2, -52], rotation: [0, 0.8, 0], scale: 2.4 },
            { model: ENV.cliff3, position: [-22, 0, -60], rotation: [0, 1.2, 0], scale: 2.2 },
            { model: ENV.cliff4, position: [24, 0, -58], rotation: [0, -0.9, 0], scale: 2.2 },

            // ── Mid-island rock outcroppings — jungle floor terrain ────────────
            { model: ENV.rock1, position: [-18, 0, 4], scale: 2.2 },
            { model: ENV.rock2, position: [22, 0, -4], scale: 2.0 },
            { model: ENV.rock3, position: [8, 0, -18], scale: 1.8 },
            { model: ENV.rock4, position: [-10, 0, 20], scale: 2.0 },
            { model: ENV.rock5, position: [30, 0, 6], scale: 1.9 },
            { model: ENV.rock1, position: [-32, 0, -4], scale: 2.1 },
            { model: ENV.rock2, position: [6, 0, 40], scale: 1.7 },
            { model: ENV.rock3, position: [-12, 0, -30], scale: 1.8 },
            { model: ENV.rock4, position: [36, 0, -18], scale: 1.9 },
            { model: ENV.rock5, position: [-24, 0, 36], scale: 1.6 },
            { model: ENV.rock1, position: [14, 0, 26], scale: 1.5 },
            { model: ENV.rock2, position: [-36, 0, -24], scale: 1.8 },

            // ── Dense palm tree cover — cluster A west ────────────────────────
            { model: ENV.palmTree1, position: [-22, 0, 12], rotation: [0, 0.3, 0], scale: 4.5 },
            { model: ENV.palmTree2, position: [-28, 0, 20], rotation: [0, 1.2, 0], scale: 4.0 },
            { model: ENV.palmTree3, position: [-18, 0, 25], rotation: [0, 2.5, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [-34, 0, 14], rotation: [0, 0.7, 0], scale: 3.6 },
            { model: ENV.palmTree1, position: [-14, 0, 34], rotation: [0, 1.8, 0], scale: 3.5 },
            { model: ENV.palmTree3, position: [-26, 0, 30], rotation: [0, 3.0, 0], scale: 3.8 },

            // ── Dense palm tree cover — cluster B east ────────────────────────
            { model: ENV.palmTree2, position: [24, 0, 15], rotation: [0, 0.8, 0], scale: 4.3 },
            { model: ENV.palmTree1, position: [32, 0, 22], rotation: [0, -0.4, 0], scale: 4.0 },
            { model: ENV.palmTree3, position: [26, 0, 30], rotation: [0, 1.8, 0], scale: 3.8 },
            { model: ENV.palmTree1, position: [38, 0, 16], rotation: [0, 2.3, 0], scale: 3.5 },
            { model: ENV.palmTree2, position: [18, 0, 36], rotation: [0, 0.6, 0], scale: 3.6 },
            { model: ENV.palmTree3, position: [44, 0, 6], rotation: [0, 1.4, 0], scale: 3.4 },

            // ── Dense palm tree cover — cluster C north-centre ────────────────
            { model: ENV.palmTree1, position: [-5, 0, -10], rotation: [0, 0.5, 0], scale: 4.5 },
            { model: ENV.palmTree2, position: [8, 0, -15], rotation: [0, 1.5, 0], scale: 4.2 },
            { model: ENV.palmTree3, position: [-14, 0, -22], rotation: [0, 2.8, 0], scale: 4.0 },
            { model: ENV.palmTree1, position: [15, 0, -12], rotation: [0, 0.1, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [0, 0, -28], rotation: [0, 3.0, 0], scale: 4.2 },
            // Note: [-8,0,-6] removed (5 units from [-5,0,-10], canopies overlapped)

            // ── Dense palm tree cover — cluster D northwest ───────────────────
            { model: ENV.palmTree3, position: [-30, 0, -22], rotation: [0, 1.1, 0], scale: 4.0 },
            { model: ENV.palmTree1, position: [-38, 0, -30], rotation: [0, 2.0, 0], scale: 4.2 },
            { model: ENV.palmTree2, position: [-26, 0, -32], rotation: [0, 0.6, 0], scale: 3.7 },
            { model: ENV.palmTree3, position: [-44, 0, -18], rotation: [0, 1.7, 0], scale: 3.8 },
            { model: ENV.palmTree1, position: [-18, 0, -40], rotation: [0, 2.4, 0], scale: 3.6 },

            // ── Dense palm tree cover — cluster E northeast ───────────────────
            { model: ENV.palmTree2, position: [32, 0, -24], rotation: [0, -0.8, 0], scale: 4.0 },
            { model: ENV.palmTree3, position: [40, 0, -30], rotation: [0, 1.3, 0], scale: 4.2 },
            { model: ENV.palmTree1, position: [28, 0, -35], rotation: [0, 2.2, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [46, 0, -20], rotation: [0, 0.4, 0], scale: 3.6 },
            { model: ENV.palmTree3, position: [18, 0, -40], rotation: [0, 0.9, 0], scale: 3.7 },

            // ── Scattered fill trees throughout the jungle floor ─────────────
            { model: ENV.palmTree1, position: [-2, 0, 18], rotation: [0, 2.1, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [10, 0, 6], rotation: [0, 0.9, 0], scale: 3.5 },
            { model: ENV.palmTree3, position: [-10, 0, 14], rotation: [0, 1.4, 0], scale: 3.6 },
            { model: ENV.palmTree1, position: [48, 0, -4], rotation: [0, 2.8, 0], scale: 3.4 },
            // Note: [-48,0,6] removed (too close to landmark at [-46,0,2])
            { model: ENV.palmTree3, position: [-42, 0, 26], rotation: [0, 1.0, 0], scale: 3.5 },
            { model: ENV.palmTree1, position: [40, 0, 28], rotation: [0, 2.5, 0], scale: 3.5 },
            { model: ENV.palmTree2, position: [-6, 0, 46], rotation: [0, 0.7, 0], scale: 3.2 },
            { model: ENV.palmTree3, position: [14, 0, 48], rotation: [0, 1.3, 0], scale: 3.2 },
            { model: ENV.palmTree1, position: [-20, 0, 48], rotation: [0, 2.9, 0], scale: 3.0 },

            // ── Landmark canopy trees (slightly taller than the rest) ──────────
            { model: ENV.palmTree2, position: [0, 0, 5], rotation: [0, 0.2, 0], scale: 5.5 }, // iconic centrepiece
            { model: ENV.palmTree1, position: [-46, 0, 2], rotation: [0, 1.5, 0], scale: 4.2 },
            { model: ENV.palmTree3, position: [46, 0, 5], rotation: [0, -0.5, 0], scale: 4.2 },
            { model: ENV.palmTree1, position: [0, 0, -42], rotation: [0, 0.5, 0], scale: 4.6 },
            { model: ENV.palmTree3, position: [-20, 0, -44], rotation: [0, 1.9, 0], scale: 4.0 },
            { model: ENV.palmTree2, position: [20, 0, -42], rotation: [0, -1.2, 0], scale: 4.0 },

            // ── Chests (interactive) ──────────────────────────────────────────
            // Placed in open clearings away from trees and rocks
            { model: PROPS.chestClosed, position: [8, 0, 20], interactive: true }, // east clearing
            { model: PROPS.chestGold, position: [-8, 0, -38], interactive: true }, // north reward, clear of the tree at [0,0,-42]
        ],
        enemySpawns: [],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 3: Sunken Depths — ocean floor cavern, entered via whirlpool
    // Playable radius ~22u. fogFar=45 means walls at r=26 fade into darkness.
    // NO dock, NO ship, NO water, NO trees — pure seabed ruins.
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'sunken-depths',
        name: 'Sunken Depths',
        oceanPosition: [10, 0, 80],
        difficulty: 3,
        theme: 'underwater',
        lightingPreset: 'underwater',
        dockPosition: [0, 0, 32],   // player spawn — south seabed
        goldChestPosition: [0, 0, -28],
        props: [
            // ── Castle — north centrepiece, entrance facing player ────────────
            { model: UNDERWATER.castle,      position: [0,   0, -14], rotation: [0, Math.PI, 0], scale: 6.0 },
            // ── Towers flanking the castle ────────────────────────────────────
            { model: UNDERWATER.towerCenter, position: [-22, 0, -24], rotation: [0, 0.3,      0], scale: 4.5 },
            { model: UNDERWATER.towerCenter, position: [22,  0, -24], rotation: [0, -0.3,     0], scale: 4.5 },

            // ── Boundary wall — 18 cliff pieces, expanded ring r=40-44 ────────
            // Walls loom out of the fog (fogFar=45) giving a sense of depth.
            // North arc
            { model: ENV.cliff3, position: [0,   -1, -44], rotation: [0, 0,        0], scale: 2.8 },
            { model: ENV.cliff1, position: [-18, -1, -40], rotation: [0, 0.5,      0], scale: 2.4 },
            { model: ENV.cliff2, position: [18,  -1, -40], rotation: [0, -0.5,     0], scale: 2.4 },
            { model: ENV.cliff4, position: [-32, -1, -30], rotation: [0, 1.0,      0], scale: 2.3 },
            { model: ENV.cliff3, position: [32,  -1, -30], rotation: [0, -1.0,     0], scale: 2.3 },
            // NE / NW corners
            { model: ENV.cliff1, position: [-40, -1, -18], rotation: [0, 1.3,      0], scale: 2.2 },
            { model: ENV.cliff2, position: [40,  -1, -18], rotation: [0, -1.3,     0], scale: 2.2 },
            // East arc
            { model: ENV.cliff4, position: [44,  -1, -4],  rotation: [0, 1.6,      0], scale: 2.3 },
            { model: ENV.cliff1, position: [43,  -1, 12],  rotation: [0, 2.0,      0], scale: 2.2 },
            { model: ENV.cliff2, position: [38,  -1, 26],  rotation: [0, 2.4,      0], scale: 2.1 },
            // West arc
            { model: ENV.cliff3, position: [-44, -1, -4],  rotation: [0, -1.6,     0], scale: 2.3 },
            { model: ENV.cliff4, position: [-43, -1, 12],  rotation: [0, -2.0,     0], scale: 2.2 },
            { model: ENV.cliff1, position: [-38, -1, 26],  rotation: [0, -2.4,     0], scale: 2.1 },
            // South arc
            { model: ENV.cliff2, position: [-22, -1, 38],  rotation: [0, -2.8,     0], scale: 2.0 },
            { model: ENV.cliff3, position: [22,  -1, 38],  rotation: [0, 2.8,      0], scale: 2.0 },
            { model: ENV.cliff4, position: [0,   -1, 42],  rotation: [0, Math.PI,  0], scale: 2.2 },
            // SE / SW corner gap-fillers
            { model: ENV.cliff1, position: [-34, -1, -34], rotation: [0, 0.75,     0], scale: 2.1 },
            { model: ENV.cliff2, position: [34,  -1, -34], rotation: [0, -0.75,    0], scale: 2.1 },
        ],
        enemySpawns: [
            // ── 12 Sharky — stop when player out of range, charge when in range ──
            { type: 'sharky', position: [-6,  0,  10], waypoints: [] },
            { type: 'sharky', position: [6,   0,  10], waypoints: [] },
            { type: 'sharky', position: [-14, 0,  6],  waypoints: [] },
            { type: 'sharky', position: [14,  0,  6],  waypoints: [] },
            { type: 'sharky', position: [-20, 0,  0],  waypoints: [] },
            { type: 'sharky', position: [20,  0,  0],  waypoints: [] },
            { type: 'sharky', position: [-8,  0,  18], waypoints: [] },
            { type: 'sharky', position: [8,   0,  18], waypoints: [] },
            { type: 'sharky', position: [-16, 0, -6],  waypoints: [] },
            { type: 'sharky', position: [16,  0, -6],  waypoints: [] },
            { type: 'sharky', position: [-22, 0,  8],  waypoints: [] },
            { type: 'sharky', position: [22,  0,  8],  waypoints: [] },
            // ── 2 Shark (large shark) — Swim_Fast chase, Swim_Bite attack ────
            { type: 'shark',  position: [-10, 0, -10], waypoints: [] },
            { type: 'shark',  position: [10,  0, -10], waypoints: [] },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 4: Bone Shore — graveyard of ships, night island, heavily guarded
    // Scale note: ENV.skulls pivot is centred — y ≈ 0.45 * scale to sit on ground
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'bone-shore',
        name: 'Bone Shore',
        oceanPosition: [-20, 0, -90],
        difficulty: 4,
        theme: 'ruins',
        lightingPreset: 'night',
        dockPosition: [0, 0, 55],
        goldChestPosition: [-5, 0, -35],
        props: [
            // ── Dock entry ────────────────────────────────────────────────────
            { model: ENV.dockBroken, position: [0, 0, 58] },
            { model: ENV.dockPole, position: [-4, 0, 60] },
            { model: ENV.dockPole, position: [4, 0, 60] },

            // ── Cliff ring — gives the island a rugged coastline ──────────────
            { model: ENV.cliff3, position: [0, -2, -55],   rotation: [0, Math.PI, 0], scale: 3.2 },
            { model: ENV.cliff1, position: [-48, 0, -22],  rotation: [0, 0.7, 0],    scale: 2.6 },
            { model: ENV.cliff2, position: [48, 0, -22],   rotation: [0, -0.6, 0],   scale: 2.6 },
            { model: ENV.cliff4, position: [-54, 0, 8],    rotation: [0, 1.2, 0],    scale: 2.4 },
            { model: ENV.cliff1, position: [54, 0, 8],     rotation: [0, -1.1, 0],   scale: 2.4 },
            { model: ENV.cliff2, position: [-40, 0, 38],   rotation: [0, 1.8, 0],    scale: 2.2 },
            { model: ENV.cliff3, position: [40, 0, 38],    rotation: [0, -1.9, 0],   scale: 2.2 },
            { model: ENV.cliff4, position: [-22, -1, -48], rotation: [0, 0.4, 0],    scale: 2.0 },
            { model: ENV.cliff1, position: [22, -1, -48],  rotation: [0, -0.4, 0],   scale: 2.0 },

            // ── Rocks scattered across the island ────────────────────────────
            { model: ENV.rock1, position: [-14, 0, -8],  scale: 2.2 },
            { model: ENV.rock2, position: [16, 0, -6],   scale: 2.0 },
            { model: ENV.rock3, position: [-8, 0, 24],   scale: 1.8 },
            { model: ENV.rock4, position: [20, 0, 18],   scale: 1.9 },
            { model: ENV.rock5, position: [-24, 0, -20], scale: 2.1 },
            { model: ENV.rock1, position: [30, 0, -18],  scale: 1.7 },
            { model: ENV.rock2, position: [-32, 0, 10],  scale: 2.0 },
            { model: ENV.rock3, position: [6, 0, -32],   scale: 1.8 },
            { model: ENV.rock4, position: [-6, 0, 40],   scale: 1.7 },
            { model: ENV.rock5, position: [28, 0, 30],   scale: 1.6 },
            { model: ENV.rock1, position: [-28, 0, 28],  scale: 1.9 },
            { model: ENV.rock2, position: [42, 0, -5],   scale: 1.8 },
            { model: ENV.rock3, position: [-42, 0, -5],  scale: 1.8 },

            // ── 1 BIG + 2 small Environment_LargeBones ────────────────────────
            // Pivot is at model base — y=0 is correct
            { model: ENV.largeBones, position: [-2, 0, -6],   scale: 2.2 }, // big centrepiece
            { model: ENV.largeBones, position: [-20, 0, 14],  scale: 1.1 },
            { model: ENV.largeBones, position: [18, 0, -20],  scale: 1.0 },

            // ── 1 BIG + 2 small Environment_Skulls ───────────────────────────
            // Pivot is centred — y must equal scale so base sits on ground
            { model: ENV.skulls, position: [16, 2.0, 6],   scale: 2.0 }, // big feature
            { model: ENV.skulls, position: [-10, 1.1, -16], scale: 1.1 },
            { model: ENV.skulls, position: [26, 1.0, -4],   scale: 1.0 },

            // ── Prop_Skull scattered — small single skulls ────────────────────
            { model: PROPS.skull, position: [5,   0.5, 3],   scale: 1.5 },
            { model: PROPS.skull, position: [-7,  0.5, -5],  scale: 1.4 },
            { model: PROPS.skull, position: [12,  0.5, -12], scale: 1.5 },
            { model: PROPS.skull, position: [-18, 0.5, 18],  scale: 1.4 },
            { model: PROPS.skull, position: [32,  0.5, 20],  scale: 1.3 },
            { model: PROPS.skull, position: [-28, 0.5, -18], scale: 1.3 },
            { model: PROPS.skull, position: [7,   0.5, -28], scale: 1.4 },
            { model: PROPS.skull, position: [-5,  0.5, 36],  scale: 1.3 },

            // ── 4 Prop_Cannon — facing outward at cardinal points ──────────────
            { model: PROPS.cannon,     position: [24, 0.5, 34],  rotation: [0, -0.7, 0] },
            { model: PROPS.cannonBall, position: [25, 0.3, 33] },
            { model: PROPS.cannon,     position: [-24, 0.5, 34], rotation: [0, 0.7, 0] },
            { model: PROPS.cannonBall, position: [-25, 0.3, 33] },
            { model: PROPS.cannon,     position: [38, 0.5, -10], rotation: [0, -1.5, 0] },
            { model: PROPS.cannonBall, position: [39, 0.3, -10] },
            { model: PROPS.cannon,     position: [-38, 0.5, -10], rotation: [0, 1.5, 0] },
            { model: PROPS.cannonBall, position: [-39, 0.3, -10] },

            // ── Gold coins and bags ───────────────────────────────────────────
            { model: PROPS.coins,   position: [7,  0, 12],  scale: 1.2 },
            { model: PROPS.coins,   position: [-7, 0, 16],  scale: 1.2 },
            { model: PROPS.coins,   position: [18, 0, -10], scale: 1.2 },
            { model: PROPS.coins,   position: [-17, 0, -9], scale: 1.2 },
            { model: PROPS.coins,   position: [9,  0, 32],  scale: 1.2 },
            { model: PROPS.coins,   position: [-9, 0, 32],  scale: 1.2 },
            { model: PROPS.goldBag, position: [14, 0, 22],  scale: 1.3 },
            { model: PROPS.goldBag, position: [-13, 0, 26], scale: 1.3 },

            // ── Gems — one of each type ───────────────────────────────────────
            { model: UI_MODELS.gemBlue,  position: [4,  0.2, -10], scale: 1.5 },
            { model: UI_MODELS.gemGreen, position: [-4, 0.2, -12], scale: 1.5 },
            { model: UI_MODELS.gemPink,  position: [9,  0.2, -22], scale: 1.5 },
            { model: UI_MODELS.gemBlue,  position: [-9, 0.2, -22], scale: 1.5 },
            { model: UI_MODELS.gemGreen, position: [22, 0.2, 28],  scale: 1.5 },
            { model: UI_MODELS.gemPink,  position: [-21, 0.2, 28], scale: 1.5 },

            // ── Wrecked ships — beached / run aground ─────────────────────────
            { model: SHIPS.small, position: [88, -1.0, -52],  rotation: [0.18,  0.45, 0.14],  scale: 2.5 },
            { model: SHIPS.large, position: [-95, -1.5, 18],  rotation: [-0.08, -0.7, -0.2],  scale: 2.2 },
            { model: SHIPS.small, position: [62, -0.5, 48],   rotation: [0.12,  1.8, -0.15],  scale: 2.0 },

            // ── Wreckage debris — broken dock & poles scattered ashore ──────────
            { model: ENV.dockBroken, position: [30, 0, -50],  rotation: [0.1,   0.3,  0.05] },
            { model: ENV.dockBroken, position: [-35, 0, 42],  rotation: [-0.05,-0.5,  0.1]  },
            { model: ENV.dockBroken, position: [55, 0, 15],   rotation: [0.08,  1.1, -0.08] },
            { model: ENV.dockPole,   position: [28, 0, -48],  rotation: [0,     0.8,  0.2]  },
            { model: ENV.dockPole,   position: [-30, 0, 44],  rotation: [0,    -0.6, -0.15] },
            { model: ENV.dockPole,   position: [52, 0, 18],   rotation: [0,     1.5,  0.1]  },

            // ── Anchors — dragged ashore from wrecks ──────────────────────────
            { model: PROPS.anchor, position: [40, 0, -28],  rotation: [0, 1.2, 0] },
            { model: PROPS.anchor, position: [-38, 0, 36],  rotation: [0, -0.8, 0] },
            { model: PROPS.anchor, position: [60, 0, 22],   rotation: [0, 2.1, 0] },

            // ── Barrel clusters near cannons & wrecks ─────────────────────────
            { model: PROPS.barrel, position: [22, 0, 32],   destructible: true },
            { model: PROPS.barrel, position: [23, 0, 33],   destructible: true },
            { model: PROPS.barrel, position: [-22, 0, 32],  destructible: true },
            { model: PROPS.barrel, position: [-23, 0, 33],  destructible: true },
            { model: PROPS.barrel, position: [56, 0, 20],   destructible: true },
            { model: PROPS.barrel, position: [58, 0, 18],   destructible: true },

            // ── Bombs — hazards littered from old battles ─────────────────────
            { model: PROPS.bomb, position: [10, 0, -14] },
            { model: PROPS.bomb, position: [-12, 0, 8]  },
            { model: PROPS.bomb, position: [20, 0, -24] },
            { model: PROPS.bomb, position: [-8, 0, -30] },

            // ── Chests ────────────────────────────────────────────────────────
            { model: PROPS.chestClosed, position: [11, 0, -26], interactive: true },
            { model: PROPS.chestClosed, position: [-16, 0, 38], interactive: true },
            { model: PROPS.chestGold,   position: [-5, 0, -35], interactive: true },
        ],
        enemySpawns: [
            // ── BOSSES — Serpent guards the west, Arachnis guards the east ─────
            { type: 'snake',   position: [-14, 0, -28],
              waypoints: [[-14,0,-28], [-22,0,-16], [-30,0,-38], [-8,0,-44]] },
            { type: 'spider',  position: [14, 0, -28],
              waypoints: [[14,0,-28],  [22,0,-16],  [30,0,-38],  [8,0,-44]]  },

            // ── 12 Regular Skeletons — spread across the island ───────────────
            { type: 'skeleton', position: [8, 0, 4],     waypoints: [[8,0,4],    [16,0,-4],   [10,0,-14],  [3,0,-4]]    },
            { type: 'skeleton', position: [-8, 0, 4],    waypoints: [[-8,0,4],   [-16,0,-4],  [-10,0,-14], [-3,0,-4]]   },
            { type: 'skeleton', position: [4, 0, 24],    waypoints: [[4,0,24],   [14,0,30],   [6,0,40],    [-2,0,32]]   },
            { type: 'skeleton', position: [-4, 0, 24],   waypoints: [[-4,0,24],  [-14,0,30],  [-6,0,40],   [2,0,32]]    },
            { type: 'skeleton', position: [28, 0, 6],    waypoints: [[28,0,6],   [36,0,0],    [34,0,-14],  [22,0,-8]]   },
            { type: 'skeleton', position: [-28, 0, 6],   waypoints: [[-28,0,6],  [-36,0,0],   [-34,0,-14], [-22,0,-8]]  },
            { type: 'skeleton', position: [14, 0, -30],  waypoints: [[14,0,-30], [22,0,-20],  [18,0,-42],  [6,0,-38]]   },
            { type: 'skeleton', position: [-14, 0, -30], waypoints: [[-14,0,-30],[-22,0,-20], [-18,0,-42], [-6,0,-38]]  },
            { type: 'skeleton', position: [0, 0, 44],    waypoints: [[0,0,44],   [10,0,48],   [0,0,52],    [-10,0,48]]  },
            { type: 'skeleton', position: [36, 0, 24],   waypoints: [[36,0,24],  [42,0,34],   [32,0,44],   [26,0,30]]   },
            { type: 'skeleton', position: [-36, 0, 24],  waypoints: [[-36,0,24], [-42,0,34],  [-32,0,44],  [-26,0,30]]  },
            { type: 'skeleton', position: [0, 0, -44],   waypoints: [[0,0,-44],  [12,0,-38],  [6,0,-52],   [-12,0,-46]] },

            // ── 6 Headless Skeletons — tougher, wider patrols ─────────────────
            { type: 'skeleton_headless', position: [0, 0, 2],     waypoints: [[0,0,2],   [20,0,14],   [0,0,-22],   [-20,0,14]]  },
            { type: 'skeleton_headless', position: [20, 0, -14],  waypoints: [[20,0,-14],[30,0,-4],   [24,0,-26],  [10,0,-20]]  },
            { type: 'skeleton_headless', position: [-20, 0, -14], waypoints: [[-20,0,-14],[-30,0,-4], [-24,0,-26], [-10,0,-20]] },
            { type: 'skeleton_headless', position: [0, 0, 34],    waypoints: [[0,0,34],  [14,0,44],   [0,0,50],    [-14,0,44]]  },
            { type: 'skeleton_headless', position: [34, 0, -10],  waypoints: [[34,0,-10],[44,0,-4],   [40,0,-20],  [26,0,-16]]  },
            { type: 'skeleton_headless', position: [-34, 0, -10], waypoints: [[-34,0,-10],[-44,0,-4], [-40,0,-20], [-26,0,-16]] },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 5: Barbarossa's Keep
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'barbarossas-keep',
        name: "Barbarossa's Keep",
        oceanPosition: [0, 0, -150],
        difficulty: 5,
        theme: 'boss',
        lightingPreset: 'storm',
        dockPosition: [0, 0, 155],
        goldChestPosition: [0, 0, -18],
        props: [
            // ── 60 trees scattered across the green area (r < 135) ──
            { model: ENV.palmTree1, position: [ 32,  0,  -55], rotation: [0,  0.8, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-48,  0,  -72], rotation: [0,  2.3, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 72,  0,  -38], rotation: [0,  1.1, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-28,  0,   52], rotation: [0,  3.7, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 58,  0,   62], rotation: [0,  0.4, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-82,  0,   28], rotation: [0,  5.1, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 92,  0,  -18], rotation: [0,  2.9, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-62,  0,  -48], rotation: [0,  4.4, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 22,  0,   85], rotation: [0,  1.6, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-95,  0,  -28], rotation: [0,  0.2, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 48,  0,  -95], rotation: [0,  3.2, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-38,  0, -112], rotation: [0,  4.8, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 15,  0,  -30], rotation: [0,  1.5, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-18,  0,  -85], rotation: [0,  3.0, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 105, 0,   42], rotation: [0,  0.6, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-110, 0,  -55], rotation: [0,  2.1, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 40,  0,  110], rotation: [0,  4.2, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-108, 0,   62], rotation: [0,  5.5, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 118, 0,  -30], rotation: [0,  1.8, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ -20, 0,  120], rotation: [0,  3.5, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [  65, 0,  -82], rotation: [0,  0.9, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ -75, 0,   98], rotation: [0,  2.7, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [  10, 0,   45], rotation: [0,  5.8, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ -55, 0,  -22], rotation: [0,  1.3, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [  8,  0,  -62], rotation: [0,  2.0, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 78,  0,   18], rotation: [0,  4.6, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-35,  0,   28], rotation: [0,  0.5, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 50,  0,  -20], rotation: [0,  3.3, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-70,  0,  -88], rotation: [0,  1.7, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 88,  0,   72], rotation: [0,  5.3, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-42,  0,  130], rotation: [0,  2.5, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [128,  0,   18], rotation: [0,  0.1, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-128, 0,   -8], rotation: [0,  3.9, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 25,  0,  -12], rotation: [0,  5.0, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-15,  0,   68], rotation: [0,  1.2, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [112,  0,  -58], rotation: [0,  2.8, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-88,  0,  -65], rotation: [0,  4.1, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 62,  0,  125], rotation: [0,  0.7, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-58,  0,   78], rotation: [0,  3.4, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 38,  0, -130], rotation: [0,  2.2, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-105, 0,   38], rotation: [0,  5.7, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 98,  0,  -75], rotation: [0,  1.4, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-22,  0,  -42], rotation: [0,  4.0, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 68,  0, -115], rotation: [0,  2.6, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-118, 0,   85], rotation: [0,  0.3, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [ 45,  0,   35], rotation: [0,  3.8, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-32,  0,  -18], rotation: [0,  5.4, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 55,  0,  -45], rotation: [0,  1.9, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-72,  0,   55], rotation: [0,  3.1, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 30,  0,   72], rotation: [0,  0.6, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-52,  0,  -98], rotation: [0,  4.3, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [115,  0,   62], rotation: [0,  2.4, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-98,  0,  -45], rotation: [0,  5.6, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [ 82,  0,  -58], rotation: [0,  1.0, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [-35,  0,   98], rotation: [0,  3.6, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [ 18,  0,  -18], rotation: [0,  4.9, 0], scale: 1.8 },
            { model: ENV.palmTree3, position: [-78,  0,  -18], rotation: [0,  2.2, 0], scale: 1.8 },
            { model: ENV.palmTree1, position: [132,  0,  -45], rotation: [0,  0.4, 0], scale: 1.8 },
            { model: ENV.palmTree2, position: [-132, 0,   52], rotation: [0,  3.0, 0], scale: 1.8 },
            // ── 12 cliffs ringing the green boundary at r≈145, every 30° ──
            { model: ENV.cliff3, position: [0,    0, -145], rotation: [0,  Math.PI,    0], scale: 2.8 }, // N
            { model: ENV.cliff1, position: [73,   0, -126], rotation: [0,  2.62,       0], scale: 2.6 }, // NNE
            { model: ENV.cliff4, position: [126,  0,  -73], rotation: [0,  2.09,       0], scale: 2.6 }, // ENE
            { model: ENV.cliff2, position: [145,  0,    0], rotation: [0,  Math.PI/2,  0], scale: 2.8 }, // E
            { model: ENV.cliff3, position: [126,  0,   73], rotation: [0,  1.05,       0], scale: 2.6 }, // ESE
            { model: ENV.cliff1, position: [73,   0,  126], rotation: [0,  0.52,       0], scale: 2.6 }, // SSE
            { model: ENV.cliff4, position: [0,    0,  145], rotation: [0,  0,          0], scale: 2.8 }, // S
            { model: ENV.cliff2, position: [-73,  0,  126], rotation: [0, -0.52,       0], scale: 2.6 }, // SSW
            { model: ENV.cliff3, position: [-126, 0,   73], rotation: [0, -1.05,       0], scale: 2.6 }, // WSW
            { model: ENV.cliff1, position: [-145, 0,    0], rotation: [0, -Math.PI/2,  0], scale: 2.8 }, // W
            { model: ENV.cliff4, position: [-126, 0,  -73], rotation: [0, -2.09,       0], scale: 2.6 }, // WNW
            { model: ENV.cliff2, position: [-73,  0, -126], rotation: [0, -2.62,       0], scale: 2.6 }, // NNW
            // ── Dock cluster A — East side ──
            { model: ENV.dock,       position: [145,  0,  76],  rotation: [0,  1.07, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [137,  0,  68],  rotation: [0,  0.90, 0], scale: 1.6 },
            { model: ENV.dockPole,   position: [153,  0,  84],  rotation: [0,  1.25, 0], scale: 1.4 },
            { model: ENV.dockBroken, position: [140,  0,  91],  rotation: [0,  0.75, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [152,  0,  70],  rotation: [0,  1.35, 0], scale: 1.3 },
            { model: ENV.dockBroken, position: [131,  0,  82],  rotation: [0,  1.55, 0], scale: 1.4 },
            { model: ENV.dockPole,   position: [158,  0,  62],  rotation: [0,  1.15, 0], scale: 1.6 },
            // ── Dock cluster B — North-West side ──
            { model: ENV.dock,       position: [-80,  0, -145], rotation: [0, -2.64, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [-72,  0, -152], rotation: [0, -2.48, 0], scale: 1.6 },
            { model: ENV.dockBroken, position: [-88,  0, -137], rotation: [0, -2.82, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [-92,  0, -150], rotation: [0, -2.40, 0], scale: 1.4 },
            { model: ENV.dockBroken, position: [-70,  0, -140], rotation: [0, -2.92, 0], scale: 1.3 },
            { model: ENV.dockPole,   position: [-84,  0, -158], rotation: [0, -2.58, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [-62,  0, -148], rotation: [0, -2.72, 0], scale: 1.6 },
            // ── Dock cluster C — South-West side ──
            { model: ENV.dock,       position: [-76,  0,  145], rotation: [0, -0.49, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [-67,  0,  152], rotation: [0, -0.32, 0], scale: 1.6 },
            { model: ENV.dockBroken, position: [-84,  0,  138], rotation: [0, -0.65, 0], scale: 1.5 },
            { model: ENV.dockPole,   position: [-62,  0,  140], rotation: [0, -0.20, 0], scale: 1.4 },
            { model: ENV.dockPole,   position: [-85,  0,  150], rotation: [0, -0.72, 0], scale: 1.3 },
            { model: ENV.dockBroken, position: [-72,  0,  158], rotation: [0, -0.40, 0], scale: 1.4 },
            { model: ENV.dockPole,   position: [-90,  0,  130], rotation: [0, -0.58, 0], scale: 1.6 },
            // ── House3 guard region (NE, centre ~[78, 0, -55]) ──
            { model: ENV.house3,     position: [78,   0,  -55], rotation: [0, -0.8,  0], scale: 2.0 },
            { model: PROPS.barrel,   position: [65,   0,  -48], rotation: [0,  1.2,  0], scale: 1.4 },
            { model: PROPS.barrel,   position: [90,   0,  -48], rotation: [0,  2.4,  0], scale: 1.3 },
            { model: PROPS.cannon,   position: [70,   0,  -44], rotation: [0,  0.4,  0], scale: 1.5 },
            { model: PROPS.cannon,   position: [85,   0,  -44], rotation: [0,  2.8,  0], scale: 1.5 },
            // ── Bones & Skull zone (SW, centre ~[-68, 0, 45]) ──
            { model: ENV.largeBones, position: [-68,  0,  45],  rotation: [0,  1.0,  0], scale: 3.0 },
            { model: ENV.skulls,     position: [-58,  1.0,  36],  rotation: [0,  2.2,  0], scale: 2.2 },
            { model: ENV.skulls,     position: [-78,  1.1,  54],  rotation: [0, -0.5,  0], scale: 2.4 },
            { model: ENV.rock1,      position: [-62,  0,  58],  rotation: [0,  1.8,  0], scale: 1.8 },
            { model: ENV.rock3,      position: [-75,  0,  38],  rotation: [0,  0.6,  0], scale: 1.6 },
            // ── Red X — marks the centre treasure spot ──
            { model: UI_MODELS.redX, position: [0,  0.05,  0],  rotation: [0,  0,  0], scale: 6.0 },
        ],
        enemySpawns: [
            // ── Captain Barbarossa — guards the Red X at the centre ──
            { type: 'barbarossa', position: [0, 0, -6], boss: true },
            // ── 2 T-Rexes, each with its own roaming zone ──
            { type: 'trex', position: [-55, 0, -60] }, // North-West zone
            { type: 'trex', position: [  60, 0,  55] }, // South-East zone
            // ── Raptor pack — 4 raptors in the North area ──
            { type: 'raptor', position: [ 15, 0, -80] },
            { type: 'raptor', position: [ 30, 0, -90] },
            { type: 'raptor', position: [  0, 0, -100] },
            { type: 'raptor', position: [ 22, 0, -68] },
            // ── Wolf pack — 5 wolves clustered in the East area ──
            { type: 'wolf', position: [ 45, 0,  -30] },
            { type: 'wolf', position: [ 52, 0,  -22] },
            { type: 'wolf', position: [ 38, 0,  -38] },
            { type: 'wolf', position: [ 58, 0,  -14] },
            { type: 'wolf', position: [ 42, 0,  -12] },
            // ── Big roaming snake — South area ──
            { type: 'bigsnake', position: [-20, 0, 75] },
            // ── House3 guard zone — 8 Sharky soldiers ringing the building ──
            { type: 'sharky', position: [ 63, 0, -44], waypoints: [[ 63, 0, -44], [ 93, 0, -44]] },
            { type: 'sharky', position: [ 93, 0, -44], waypoints: [[ 93, 0, -44], [ 63, 0, -44]] },
            { type: 'sharky', position: [ 63, 0, -66], waypoints: [[ 63, 0, -66], [ 93, 0, -66]] },
            { type: 'sharky', position: [ 93, 0, -66], waypoints: [[ 93, 0, -66], [ 63, 0, -66]] },
            { type: 'sharky', position: [ 60, 0, -50], waypoints: [[ 60, 0, -50], [ 60, 0, -60]] },
            { type: 'sharky', position: [ 60, 0, -60], waypoints: [[ 60, 0, -60], [ 60, 0, -50]] },
            { type: 'sharky', position: [ 96, 0, -50], waypoints: [[ 96, 0, -50], [ 96, 0, -60]] },
            { type: 'sharky', position: [ 96, 0, -60], waypoints: [[ 96, 0, -60], [ 96, 0, -50]] },
            // ── Bones & Skull zone — 10 Skeleton soldiers patrolling the perimeter ──
            { type: 'skeleton', position: [-68, 0,  25], waypoints: [[-68, 0,  25], [-50, 0,  32]] },
            { type: 'skeleton', position: [-50, 0,  32], waypoints: [[-50, 0,  32], [-45, 0,  45]] },
            { type: 'skeleton', position: [-45, 0,  45], waypoints: [[-45, 0,  45], [-52, 0,  63]] },
            { type: 'skeleton', position: [-52, 0,  63], waypoints: [[-52, 0,  63], [-68, 0,  68]] },
            { type: 'skeleton', position: [-68, 0,  68], waypoints: [[-68, 0,  68], [-84, 0,  63]] },
            { type: 'skeleton', position: [-84, 0,  63], waypoints: [[-84, 0,  63], [-91, 0,  45]] },
            { type: 'skeleton', position: [-91, 0,  45], waypoints: [[-91, 0,  45], [-84, 0,  27]] },
            { type: 'skeleton', position: [-84, 0,  27], waypoints: [[-84, 0,  27], [-68, 0,  25]] },
            { type: 'skeleton', position: [-62, 0,  40], waypoints: [[-62, 0,  40], [-74, 0,  50]] },
            { type: 'skeleton', position: [-74, 0,  50], waypoints: [[-74, 0,  50], [-62, 0,  40]] },
        ],
    },
];

export function getIsland(id: string): IslandDef | undefined {
    return ISLANDS.find(i => i.id === id);
}
