import { create } from 'zustand';
import type { Hand } from '../lib/types';
import { PLAYER_HP } from '../lib/constants';

interface PlayerStore {
    hp: number;
    maxHp: number;
    equippedLeft: string | null;
    equippedRight: string | null;
    inventory: string[];
    isAlive: boolean;

    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
    equipWeapon: (path: string, hand: Hand) => void;
    unequipWeapon: (hand: Hand) => void;
    addToInventory: (item: string) => void;
    reset: (maxHp?: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    equippedLeft: null,
    equippedRight: '/models/weapons/Weapon_Dagger.gltf',
    inventory: [],
    isAlive: true,

    takeDamage: (amount) =>
        set(state => {
            const newHp = Math.max(0, state.hp - amount);
            return { hp: newHp, isAlive: newHp > 0 };
        }),

    heal: (amount) =>
        set(state => ({
            hp: Math.min(state.maxHp, state.hp + amount),
        })),

    equipWeapon: (path, hand) =>
        set(hand === 'left'
            ? { equippedLeft: path }
            : { equippedRight: path }),

    unequipWeapon: (hand) =>
        set(hand === 'left'
            ? { equippedLeft: null }
            : { equippedRight: null }),

    addToInventory: (item) =>
        set(state => ({
            inventory: [...state.inventory, item],
        })),

    reset: (maxHp) => {
        const hp = maxHp ?? get().maxHp;
        set({
            hp,
            maxHp: hp,
            equippedLeft: null,
            equippedRight: '/models/weapons/Weapon_Dagger.gltf',
            inventory: [],
            isAlive: true,
        });
    },
}));
