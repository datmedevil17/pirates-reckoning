// ─── Player ───────────────────────────────────────────────────────────────────
export const PLAYER_HP = 100;
export const PLAYER_MOVE_SPEED = 8.5;
export const PLAYER_RUN_SPEED = 14;
export const PLAYER_JUMP_FORCE = 8;
export const PLAYER_ROTATE_SPEED = 12; // lerp factor per second

// ─── Enemy AI ─────────────────────────────────────────────────────────────────
export const AGGRO_RANGE = 8;   // meters — switch to chase
export const ATTACK_RANGE = 1.4; // meters — start attack animation
export const STAGGER_DURATION = 0.5; // seconds
export const ENEMY_PATROL_SPEED = 2.5;
export const ENEMY_CHASE_SPEED = 4.5;

// ─── Combat ───────────────────────────────────────────────────────────────────
export const MELEE_HITBOX_RADIUS = 0.8; // Rapier sphere sensor radius
export const SKELETON_HP = 40;
export const SKELETON_HL_HP = 70;
export const SHARKY_HP = 55;
export const BARBAROSSA_HP = 300;

// Weapon damage
export const DAMAGE: Record<string, number> = {
    dagger: 18,
    cutlass: 22,
    sword1: 26,
    sword2: 38,
    axe: 32,
    doubleAxe: 45,
    axeRifle: 30,
    pistol: 15,
    rifle: 40,
    doubleShotgun: 55,
    lute: 0, // stun only
};

// ─── Ship navigation ──────────────────────────────────────────────────────────
export const SHIP_MAX_SPEED = 12;
export const SHIP_ACCEL = 4;
export const SHIP_DECEL = 2;
export const SHIP_ROTATION_SPEED = 0.8; // rad/s
export const ISLAND_ANCHOR_DIST = 28;   // proximity to show anchor prompt

// ─── Scene ────────────────────────────────────────────────────────────────────
export const WATER_KILL_Y = -1;   // fall below this → instant death
export const FADE_DURATION = 500;  // ms for scene fade transition
