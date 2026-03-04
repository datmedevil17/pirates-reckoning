import { create } from 'zustand';
import type { LootDrop } from '../lib/types';

interface RunStore {
    islandId: string;
    enemiesAlive: string[];    // instance ids
    lootCollected: string[];   // loot drop ids collected
    chestsOpened: string[];
    lootDrops: LootDrop[];     // active loot on ground
    isComplete: boolean;
    phase: number;             // boss fight phase

    setIslandId: (id: string) => void;
    removeEnemy: (id: string) => void;
    openChest: (id: string) => void;
    addLootDrop: (drop: LootDrop) => void;
    collectLoot: (id: string) => void;
    setComplete: () => void;
    setPhase: (phase: number) => void;
    reset: (islandId: string, enemyIds: string[]) => void;
}

export const useRunStore = create<RunStore>((set) => ({
    islandId:      '',
    enemiesAlive:  [],
    lootCollected: [],
    chestsOpened:  [],
    lootDrops:     [],
    isComplete:    false,
    phase:         0,

    setIslandId: (id) => set({ islandId: id }),

    removeEnemy: (id) =>
        set(state => ({
            enemiesAlive: state.enemiesAlive.filter(e => e !== id),
        })),

    openChest: (id) =>
        set(state => ({
            chestsOpened: [...state.chestsOpened, id],
        })),

    addLootDrop: (drop) =>
        set(state => ({
            lootDrops: [...state.lootDrops, drop],
        })),

    collectLoot: (id) =>
        set(state => ({
            lootDrops:     state.lootDrops.filter(d => d.id !== id),
            lootCollected: [...state.lootCollected, id],
        })),

    setComplete: () => set({ isComplete: true }),
    setPhase: (phase) => set({ phase }),

    reset: (islandId, enemyIds) =>
        set({
            islandId,
            enemiesAlive:  enemyIds,
            lootCollected: [],
            chestsOpened:  [],
            lootDrops:     [],
            isComplete:    false,
            phase:         0,
        }),
}));
