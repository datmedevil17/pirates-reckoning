import { create } from 'zustand';
import type { CharacterChoice, SceneName, Resources, Upgrades } from '../lib/types';

const STORAGE_KEY = 'pirate_reckoning_save';

interface GameStore {
    // Persistent state
    characterChoice: CharacterChoice;
    resources: Resources;
    upgrades: Upgrades;
    unlockedWeapons: string[];
    runNumber: number;

    // Scene routing
    currentScene: SceneName;
    currentIslandId: string | null;

    // Ship position (persists across island scenes)
    shipPosition: [number, number, number];
    shipYaw: number;

    // Actions
    setCharacter: (c: CharacterChoice) => void;
    setScene: (scene: SceneName, islandId?: string) => void;
    setShipPosition: (pos: [number, number, number], yaw: number) => void;
    addResource: (type: keyof Resources, amount: number) => void;
    spendResource: (type: keyof Resources, amount: number) => boolean;
    applyUpgrade: (upgrade: keyof Upgrades, value: number) => void;
    unlockWeapon: (path: string) => void;
    incrementRun: () => void;
    saveToStorage: () => void;
    loadFromStorage: () => void;
    reset: () => void;
}

const defaultResources: Resources = {
    gold: 0, gemBlue: 0, gemGreen: 0, gemPink: 0,
    wood: 0, rocks: 0, wheat: 0,
};

const defaultUpgrades: Upgrades = {
    maxHp: 100,
    cannonDamage: 30,
    carryLimit: 10,
};

export const useGameStore = create<GameStore>((set, get) => ({
    characterChoice: 'anne',
    resources: { ...defaultResources },
    upgrades: { ...defaultUpgrades },
    unlockedWeapons: [
        '/models/weapons/Weapon_Dagger.gltf',
        '/models/weapons/Weapon_Pistol.gltf',
    ],
    runNumber: 0,

    currentScene: 'ocean',
    currentIslandId: null,
    shipPosition: [0, 0, 0],
    shipYaw: 0,

    setCharacter: (c) => set({ characterChoice: c }),

    setScene: (scene, islandId) =>
        set({ currentScene: scene, currentIslandId: islandId ?? null }),

    setShipPosition: (pos, yaw) =>
        set({ shipPosition: pos, shipYaw: yaw }),

    addResource: (type, amount) =>
        set(state => ({
            resources: { ...state.resources, [type]: state.resources[type] + amount },
        })),

    spendResource: (type, amount) => {
        const current = get().resources[type];
        if (current < amount) return false;
        set(state => ({
            resources: { ...state.resources, [type]: state.resources[type] - amount },
        }));
        return true;
    },

    applyUpgrade: (upgrade, value) =>
        set(state => ({
            upgrades: { ...state.upgrades, [upgrade]: value },
        })),

    unlockWeapon: (path) =>
        set(state => ({
            unlockedWeapons: state.unlockedWeapons.includes(path)
                ? state.unlockedWeapons
                : [...state.unlockedWeapons, path],
        })),

    incrementRun: () =>
        set(state => ({ runNumber: state.runNumber + 1 })),

    saveToStorage: () => {
        const { characterChoice, resources, upgrades, unlockedWeapons, runNumber } = get();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            characterChoice, resources, upgrades, unlockedWeapons, runNumber,
        }));
    },

    loadFromStorage: () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            set({
                characterChoice: saved.characterChoice ?? 'anne',
                resources: { ...defaultResources, ...saved.resources },
                upgrades: { ...defaultUpgrades, ...saved.upgrades },
                unlockedWeapons: saved.unlockedWeapons ?? [],
                runNumber: saved.runNumber ?? 0,
            });
        } catch { /* corrupt save — ignore */ }
    },

    reset: () =>
        set({
            resources: { ...defaultResources },
            upgrades: { ...defaultUpgrades },
            unlockedWeapons: ['/models/weapons/Weapon_Dagger.gltf', '/models/weapons/Weapon_Pistol.gltf'],
            runNumber: 0,
        }),
}));
