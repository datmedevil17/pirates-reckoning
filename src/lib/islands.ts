import type { IslandDef } from './types';
import { ENV, PROPS, UI_MODELS, SHIPS } from './assets';

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
            { model: ENV.dock,     position: [0, 0, 74],  rotation: [0, 0, 0] },
            { model: ENV.dockPole, position: [-5, 0, 76], rotation: [0, 0.3, 0] },
            { model: ENV.dockPole, position: [ 5, 0, 76], rotation: [0, -0.2, 0] },
            { model: ENV.dockPole, position: [ 0, 0, 78], rotation: [0, 0.1, 0] },
            { model: ENV.dockPole, position: [-8, 0, 72], rotation: [0, 0.5, 0] },
            { model: ENV.dockPole, position: [ 8, 0, 72], rotation: [0, -0.4, 0] },

            // ── Wood stacked near dock ─────────────────────────────────────────
            { model: UI_MODELS.wood, position: [ 4, 0.3, 66], rotation: [0, 0.3, 0], scale: 4 },
            { model: UI_MODELS.wood, position: [-4, 0.3, 66], rotation: [0, -0.4, 0], scale: 4 },
            { model: UI_MODELS.wood, position: [ 7, 0.3, 68], rotation: [0, 1.1, 0], scale: 3.5 },

            // ── Small ship anchored to the east of dock (in water) ────────────
            { model: SHIPS.small, position: [52, -1.5, 68], rotation: [0, -0.45, 0], scale: 3 },

            // ── Cliff ring — scaled down so animals + player don't clip into them ──
            { model: ENV.cliff3, position: [  0, -2, -65], rotation: [0, Math.PI, 0], scale: 4.0 },
            { model: ENV.cliff1, position: [-58,  0, -32], rotation: [0,  0.8, 0],   scale: 3.0 },
            { model: ENV.cliff2, position: [ 58,  0, -32], rotation: [0, -0.5, 0],   scale: 3.0 },
            { model: ENV.cliff4, position: [ 62,  0,  18], rotation: [0,  2.2, 0],   scale: 2.6 },
            { model: ENV.cliff1, position: [-62,  0,  18], rotation: [0, -1.2, 0],   scale: 2.6 },
            { model: ENV.cliff2, position: [-65, -2,  -8], rotation: [0,  1.5, 0],   scale: 3.2 },
            { model: ENV.cliff3, position: [ 65, -2, -12], rotation: [0, -1.5, 0],   scale: 3.2 },
            { model: ENV.cliff4, position: [-35,  0, -52], rotation: [0,  0.5, 0],   scale: 2.5 },
            { model: ENV.cliff1, position: [ 38,  0, -55], rotation: [0, -0.3, 0],   scale: 2.7 },
            { model: ENV.cliff2, position: [  0, -2, -52], rotation: [0,  0.8, 0],   scale: 2.4 },
            { model: ENV.cliff3, position: [-22,  0, -60], rotation: [0,  1.2, 0],   scale: 2.2 },
            { model: ENV.cliff4, position: [ 24,  0, -58], rotation: [0, -0.9, 0],   scale: 2.2 },

            // ── Mid-island rock outcroppings — jungle floor terrain ────────────
            { model: ENV.rock1, position: [-18, 0,   4], scale: 2.2 },
            { model: ENV.rock2, position: [ 22, 0,  -4], scale: 2.0 },
            { model: ENV.rock3, position: [  8, 0, -18], scale: 1.8 },
            { model: ENV.rock4, position: [-10, 0,  20], scale: 2.0 },
            { model: ENV.rock5, position: [ 30, 0,   6], scale: 1.9 },
            { model: ENV.rock1, position: [-32, 0,  -4], scale: 2.1 },
            { model: ENV.rock2, position: [  6, 0,  40], scale: 1.7 },
            { model: ENV.rock3, position: [-12, 0, -30], scale: 1.8 },
            { model: ENV.rock4, position: [ 36, 0, -18], scale: 1.9 },
            { model: ENV.rock5, position: [-24, 0,  36], scale: 1.6 },
            { model: ENV.rock1, position: [ 14, 0,  26], scale: 1.5 },
            { model: ENV.rock2, position: [-36, 0, -24], scale: 1.8 },

            // ── Dense palm tree cover — cluster A west ────────────────────────
            { model: ENV.palmTree1, position: [-22, 0, 12], rotation: [0, 0.3, 0],  scale: 4.5 },
            { model: ENV.palmTree2, position: [-28, 0, 20], rotation: [0, 1.2, 0],  scale: 4.0 },
            { model: ENV.palmTree3, position: [-18, 0, 25], rotation: [0, 2.5, 0],  scale: 3.8 },
            { model: ENV.palmTree2, position: [-34, 0, 14], rotation: [0, 0.7, 0],  scale: 3.6 },
            { model: ENV.palmTree1, position: [-14, 0, 34], rotation: [0, 1.8, 0],  scale: 3.5 },
            { model: ENV.palmTree3, position: [-26, 0, 30], rotation: [0, 3.0, 0],  scale: 3.8 },

            // ── Dense palm tree cover — cluster B east ────────────────────────
            { model: ENV.palmTree2, position: [ 24, 0, 15], rotation: [0,  0.8, 0], scale: 4.3 },
            { model: ENV.palmTree1, position: [ 32, 0, 22], rotation: [0, -0.4, 0], scale: 4.0 },
            { model: ENV.palmTree3, position: [ 26, 0, 30], rotation: [0,  1.8, 0], scale: 3.8 },
            { model: ENV.palmTree1, position: [ 38, 0, 16], rotation: [0,  2.3, 0], scale: 3.5 },
            { model: ENV.palmTree2, position: [ 18, 0, 36], rotation: [0,  0.6, 0], scale: 3.6 },
            { model: ENV.palmTree3, position: [ 44, 0,  6], rotation: [0,  1.4, 0], scale: 3.4 },

            // ── Dense palm tree cover — cluster C north-centre ────────────────
            { model: ENV.palmTree1, position: [ -5, 0, -10], rotation: [0, 0.5, 0], scale: 4.5 },
            { model: ENV.palmTree2, position: [  8, 0, -15], rotation: [0, 1.5, 0], scale: 4.2 },
            { model: ENV.palmTree3, position: [-14, 0, -22], rotation: [0, 2.8, 0], scale: 4.0 },
            { model: ENV.palmTree1, position: [ 15, 0, -12], rotation: [0, 0.1, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [  0, 0, -28], rotation: [0, 3.0, 0], scale: 4.2 },
            // Note: [-8,0,-6] removed (5 units from [-5,0,-10], canopies overlapped)

            // ── Dense palm tree cover — cluster D northwest ───────────────────
            { model: ENV.palmTree3, position: [-30, 0, -22], rotation: [0, 1.1, 0], scale: 4.0 },
            { model: ENV.palmTree1, position: [-38, 0, -30], rotation: [0, 2.0, 0], scale: 4.2 },
            { model: ENV.palmTree2, position: [-26, 0, -32], rotation: [0, 0.6, 0], scale: 3.7 },
            { model: ENV.palmTree3, position: [-44, 0, -18], rotation: [0, 1.7, 0], scale: 3.8 },
            { model: ENV.palmTree1, position: [-18, 0, -40], rotation: [0, 2.4, 0], scale: 3.6 },

            // ── Dense palm tree cover — cluster E northeast ───────────────────
            { model: ENV.palmTree2, position: [ 32, 0, -24], rotation: [0, -0.8, 0], scale: 4.0 },
            { model: ENV.palmTree3, position: [ 40, 0, -30], rotation: [0,  1.3, 0], scale: 4.2 },
            { model: ENV.palmTree1, position: [ 28, 0, -35], rotation: [0,  2.2, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [ 46, 0, -20], rotation: [0,  0.4, 0], scale: 3.6 },
            { model: ENV.palmTree3, position: [ 18, 0, -40], rotation: [0,  0.9, 0], scale: 3.7 },

            // ── Scattered fill trees throughout the jungle floor ─────────────
            { model: ENV.palmTree1, position: [ -2, 0, 18],  rotation: [0, 2.1, 0], scale: 3.8 },
            { model: ENV.palmTree2, position: [ 10, 0,  6],  rotation: [0, 0.9, 0], scale: 3.5 },
            { model: ENV.palmTree3, position: [-10, 0, 14],  rotation: [0, 1.4, 0], scale: 3.6 },
            { model: ENV.palmTree1, position: [ 48, 0, -4],  rotation: [0, 2.8, 0], scale: 3.4 },
            // Note: [-48,0,6] removed (too close to landmark at [-46,0,2])
            { model: ENV.palmTree3, position: [-42, 0, 26],  rotation: [0, 1.0, 0], scale: 3.5 },
            { model: ENV.palmTree1, position: [ 40, 0, 28],  rotation: [0, 2.5, 0], scale: 3.5 },
            { model: ENV.palmTree2, position: [ -6, 0, 46],  rotation: [0, 0.7, 0], scale: 3.2 },
            { model: ENV.palmTree3, position: [ 14, 0, 48],  rotation: [0, 1.3, 0], scale: 3.2 },
            { model: ENV.palmTree1, position: [-20, 0, 48],  rotation: [0, 2.9, 0], scale: 3.0 },

            // ── Landmark canopy trees (slightly taller than the rest) ──────────
            { model: ENV.palmTree2, position: [  0, 0,   5], rotation: [0, 0.2, 0], scale: 5.5 }, // iconic centrepiece
            { model: ENV.palmTree1, position: [-46, 0,   2], rotation: [0, 1.5, 0], scale: 4.2 },
            { model: ENV.palmTree3, position: [ 46, 0,   5], rotation: [0,-0.5, 0], scale: 4.2 },
            { model: ENV.palmTree1, position: [  0, 0, -42], rotation: [0, 0.5, 0], scale: 4.6 },
            { model: ENV.palmTree3, position: [-20, 0, -44], rotation: [0, 1.9, 0], scale: 4.0 },
            { model: ENV.palmTree2, position: [ 20, 0, -42], rotation: [0,-1.2, 0], scale: 4.0 },

            // ── Chests (interactive) ──────────────────────────────────────────
            // Placed in open clearings away from trees and rocks
            { model: PROPS.chestClosed, position: [  8, 0,  20],  interactive: true }, // east clearing
            { model: PROPS.chestGold,   position: [ -8, 0, -38],  interactive: true }, // north reward, clear of the tree at [0,0,-42]
        ],
        enemySpawns: [],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 3: Ghost Port
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'ghost-port',
        name: 'Ghost Port',
        oceanPosition: [10, 0, 80],
        difficulty: 3,
        theme: 'port',
        lightingPreset: 'sunset',
        dockPosition: [0, 0, 18],
        goldChestPosition: [-16, 0, -8],
        props: [
            { model: ENV.dock, position: [0, 0, 22] },
            { model: ENV.dockBroken, position: [10, 0, 22] },
            { model: ENV.dockBroken, position: [-10, 0, 20] },
            { model: ENV.dockPole, position: [5, 0, 22] },
            { model: ENV.dockPole, position: [-5, 0, 22] },
            { model: ENV.dockPole, position: [8, 0, 24] },
            { model: ENV.house1, position: [-12, 0, 2], rotation: [0, 0.4, 0] },
            { model: ENV.house2, position: [10, 0, -4], rotation: [0, -0.3, 0] },
            { model: ENV.sawmill, position: [-18, 0, -6] },
            { model: ENV.rock2, position: [-22, 0, 8], scale: 1.3 },
            { model: ENV.rock4, position: [20, 0, -8], scale: 1.2 },
            { model: ENV.rock5, position: [-8, 0, -18], scale: 1.1 },
            { model: PROPS.cannon, position: [14, 0, 8] },
            { model: PROPS.cannon, position: [-14, 0, 10] },
            { model: PROPS.cannonBall, position: [15, 0, 8] },
            { model: PROPS.barrel, position: [2, 0, 16], destructible: true },
            { model: PROPS.barrel, position: [3, 0, 16], destructible: true },
            { model: PROPS.barrel, position: [-2, 0, 16], destructible: true },
            { model: PROPS.barrel, position: [-3, 0, 15], destructible: true },
            { model: PROPS.barrel, position: [0, 0, 16], destructible: true },
            { model: PROPS.anchor, position: [1, 0, 20] },
            { model: PROPS.skull, position: [-6, 0.5, 4], scale: 1.2 },
            { model: PROPS.skull, position: [8, 0.5, -10], scale: 1.2 },
            { model: ENV.skulls, position: [5, 0.5, -14], scale: 1.1 },
            { model: PROPS.chestClosed, position: [10, 0, -6], interactive: true },
            { model: PROPS.chestGold, position: [-16, 0, -8], interactive: true },
        ],
        enemySpawns: [
            { type: 'skeleton', position: [6, 0, -4], waypoints: [[6, 0, -4], [10, 0, -2], [7, 0, -10]] },
            { type: 'skeleton', position: [-8, 0, -8], waypoints: [[-8, 0, -8], [-4, 0, -6], [-10, 0, -3]] },
            { type: 'skeleton_headless', position: [-5, 0, 6], waypoints: [[-5, 0, 6], [-8, 0, 10], [-3, 0, 14]] },
            { type: 'sharky', position: [-18, 0, 8], waypoints: [[-18, 0, 8], [-18, 0, 14], [-12, 0, 18]] },
            { type: 'sharky', position: [16, 0, 10], waypoints: [[16, 0, 10], [18, 0, 6], [12, 0, 16]] },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ISLAND 4: Bone Shore
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'bone-shore',
        name: 'Bone Shore',
        oceanPosition: [-20, 0, -90],
        difficulty: 4,
        theme: 'jungle',
        lightingPreset: 'night',
        dockPosition: [0, 0, 18],
        goldChestPosition: [-10, 0, -16],
        props: [
            { model: ENV.cliff1, position: [-20, 0, 0], scale: 1.4 },
            { model: ENV.cliff3, position: [0, 0, -20], scale: 1.4 },
            { model: ENV.cliff2, position: [20, 0, 0], scale: 1.3 },
            { model: ENV.largeBones, position: [-10, 0, -10], scale: 1.2 },
            { model: ENV.largeBones, position: [8, 0, -8], scale: 1.0 },
            { model: ENV.skulls, position: [6, 0.5, 4], scale: 1.2 },
            { model: ENV.skulls, position: [-4, 0.5, -6], scale: 1.2 },
            { model: ENV.skulls, position: [12, 0.5, -8], scale: 1.1 },
            { model: ENV.skulls, position: [0, 0.5, -14], scale: 1.2 },
            { model: ENV.palmTree1, position: [10, 0, 8], scale: 1.1 },
            { model: ENV.palmTree2, position: [-8, 0, 8], scale: 1.0 },
            { model: ENV.palmTree3, position: [16, 0, -4], scale: 1.2 },
            { model: ENV.rock1, position: [-16, 0, 4], scale: 1.3 },
            { model: ENV.rock2, position: [14, 0, 10], scale: 1.2 },
            { model: ENV.rock3, position: [-8, 0, -16], scale: 1.1 },
            { model: ENV.rock5, position: [6, 0, -14], scale: 1.2 },
            { model: ENV.dockBroken, position: [0, 0, 20] },
            { model: PROPS.skull, position: [4, 0.5, -4], scale: 1.2 },
            { model: PROPS.skull, position: [-5, 0.5, 3], scale: 1.2 },
            { model: PROPS.skull, position: [9, 0.5, -10], scale: 1.2 },
            { model: PROPS.goldBag, position: [8, 0, -8] },
            { model: PROPS.bomb, position: [3, 0, 2] },
            { model: PROPS.bomb, position: [-4, 0, 6] },
            { model: PROPS.bucket, position: [-3, 0.2, 4] },
            { model: PROPS.chestClosed, position: [6, 0, 8], interactive: true },
            { model: PROPS.chestGold, position: [-10, 0, -16], interactive: true },
        ],
        enemySpawns: [
            { type: 'skeleton_headless', position: [8, 0, 4], waypoints: [[8, 0, 4], [12, 0, 8], [6, 0, 12]] },
            { type: 'skeleton_headless', position: [-10, 0, -4], waypoints: [[-10, 0, -4], [-7, 0, 0], [-6, 0, -8]] },
            { type: 'skeleton_headless', position: [3, 0, -10], waypoints: [[3, 0, -10], [7, 0, -7], [0, 0, -14]] },
            { type: 'skeleton_headless', position: [-4, 0, 6], waypoints: [[-4, 0, 6], [-8, 0, 9], [-2, 0, 12]] },
            { type: 'skeleton_headless', position: [12, 0, -6], waypoints: [[12, 0, -6], [14, 0, -2], [10, 0, -10]] },
            { type: 'sharky', position: [-16, 0, 10], waypoints: [[-16, 0, 10], [-16, 0, 16], [-10, 0, 20]] },
            { type: 'tentacle', position: [0, 0, 20] },
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
        dockPosition: [0, 0, 18],
        goldChestPosition: [0, 0, -18],
        props: [
            { model: ENV.cliff1, position: [-22, 0, 0], scale: 1.5 },
            { model: ENV.cliff2, position: [22, 0, 0], scale: 1.5 },
            { model: ENV.cliff3, position: [0, 0, -22], scale: 1.5 },
            { model: ENV.cliff4, position: [0, 0, 22], scale: 1.4 },
            { model: ENV.house1, position: [-10, 0, -6], rotation: [0, 0.6, 0] },
            { model: ENV.house3, position: [8, 0, -10], rotation: [0, -0.4, 0] },
            { model: ENV.largeBones, position: [-14, 0, 4], scale: 1.3 },
            { model: ENV.largeBones, position: [12, 0, 2], scale: 1.1 },
            { model: ENV.skulls, position: [9, 0.5, 6], scale: 1.2 },
            { model: ENV.skulls, position: [-6, 0.5, -12], scale: 1.2 },
            { model: ENV.skulls, position: [0, 0.5, -12], scale: 1.3 },
            { model: ENV.dock, position: [0, 0, 22] },
            { model: ENV.dockBroken, position: [10, 0, 22] },
            { model: PROPS.cannon, position: [-10, 0, 12] },
            { model: PROPS.cannon, position: [10, 0, 12] },
            { model: PROPS.cannon, position: [-14, 0, -2] },
            { model: PROPS.cannon, position: [14, 0, -2] },
            { model: PROPS.cannonBall, position: [11, 0, 12] },
            { model: PROPS.bomb, position: [4, 0, 0] },
            { model: PROPS.bomb, position: [-5, 0, 2] },
            { model: PROPS.chestGold, position: [0, 0, -18], interactive: true },
        ],
        enemySpawns: [
            { type: 'barbarossa', position: [0, 0, -8] },
            { type: 'skeleton', position: [8, 0, 4], waypoints: [[8, 0, 4], [12, 0, 6], [6, 0, 10]] },
            { type: 'skeleton', position: [-8, 0, 4], waypoints: [[-8, 0, 4], [-12, 0, 6], [-6, 0, 10]] },
            { type: 'skeleton_headless', position: [10, 0, -4], waypoints: [[10, 0, -4], [14, 0, -2], [8, 0, -8]] },
            { type: 'skeleton_headless', position: [-10, 0, -4], waypoints: [[-10, 0, -4], [-14, 0, -2], [-8, 0, -8]] },
            { type: 'tentacle', position: [-6, 0, 18] },
            { type: 'tentacle', position: [6, 0, 18] },
        ],
    },
];

export function getIsland(id: string): IslandDef | undefined {
    return ISLANDS.find(i => i.id === id);
}
