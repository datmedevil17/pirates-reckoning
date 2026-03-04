import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useRunStore } from '../../store/runStore';

interface HUDProps {
    islandName?: string;
    difficulty?: number;
    onReturnToShip?: () => void;
}

export function HUD({ islandName, difficulty, onReturnToShip }: HUDProps) {
    const hp = usePlayerStore(s => s.hp);
    const maxHp = usePlayerStore(s => s.maxHp);
    const isAlive = usePlayerStore(s => s.isAlive);
    const equippedRight = usePlayerStore(s => s.equippedRight);
    const resources = useGameStore(s => s.resources);
    const isComplete = useRunStore(s => s.isComplete);

    const hpPct = Math.max(0, hp / maxHp);
    const weaponName = equippedRight
        ? equippedRight.split('/').pop()?.replace('.gltf', '').replace('Weapon_', '').replace(/_/g, ' ')
        : 'Unarmed';

    const stars = difficulty
        ? '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty)
        : '';

    return (
        <>
            {/* ── HP Bar ───────────────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'monospace', letterSpacing: 2, marginBottom: 2,
                }}>
                    ❤ HEALTH
                </div>
                <div style={{
                    width: 180, height: 12, background: 'rgba(0,0,0,0.6)',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${hpPct * 100}%`,
                        height: '100%',
                        background: hpPct > 0.5
                            ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                            : hpPct > 0.25
                                ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                : 'linear-gradient(90deg,#ef4444,#f87171)',
                        transition: 'width 0.3s ease',
                        borderRadius: 6,
                    }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                    {hp} / {maxHp}
                </div>
            </div>

            {/* ── Resource Counters ────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 10,
                display: 'flex', gap: 12, alignItems: 'center',
            }}>
                <ResourceBadge icon="🪙" value={resources.gold} color="#fbbf24" />
                <ResourceBadge icon="💎" value={resources.gemBlue} color="#60a5fa" />
                <ResourceBadge icon="🌿" value={resources.gemGreen} color="#4ade80" />
            </div>

            {/* ── Weapon Slot ───────────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 24, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '8px 20px',
                color: '#f0c040', fontFamily: 'monospace',
                fontSize: 13, letterSpacing: 1, textAlign: 'center',
            }}>
                ⚔ {weaponName}
            </div>

            {/* ── Island Info ───────────────────────────────────────────────────── */}
            {islandName && (
                <div style={{
                    position: 'absolute', bottom: 24, right: 16, zIndex: 10,
                    textAlign: 'right',
                    color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 12,
                }}>
                    <div style={{ fontWeight: 'bold', color: '#ffe080' }}>{islandName}</div>
                    <div style={{ color: '#f0a030', fontSize: 11 }}>{stars}</div>
                </div>
            )}

            {/* ── Controls hint ─────────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 24, left: 16, zIndex: 10,
                color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 11,
                lineHeight: 1.7,
            }}>
                <div>WASD move · Drag camera</div>
                <div>Space jump · E sword · Q punch</div>
            </div>

            {/* ── Death Screen ─────────────────────────────────────────────────── */}
            {!isAlive && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 30,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.7)',
                }}>
                    <div style={{ fontSize: 56, fontWeight: 900, color: '#ef4444', marginBottom: 16 }}>
                        ☠ YOU DIED
                    </div>
                    <button
                        onClick={onReturnToShip}
                        style={{
                            background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)',
                            border: 'none', borderRadius: 10,
                            padding: '12px 36px', color: '#fff',
                            fontWeight: 'bold', fontSize: 16, cursor: 'pointer',
                        }}
                    >
                        ← Return to Ship
                    </button>
                </div>
            )}

            {/* ── Run Complete Banner ───────────────────────────────────────────── */}
            {isComplete && isAlive && (
                <div style={{
                    position: 'absolute', top: '30%', left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20, textAlign: 'center',
                }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.85)',
                        border: '2px solid #fbbf24',
                        borderRadius: 16, padding: '24px 48px',
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24' }}>Island Cleared!</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 16px', fontSize: 13 }}>
                            Gold chest opened. Return to your ship.
                        </div>
                        <button
                            onClick={onReturnToShip}
                            style={{
                                background: 'linear-gradient(135deg,#c8860a,#f0b030)',
                                border: 'none', borderRadius: 8,
                                padding: '10px 28px', color: '#1a0a00',
                                fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
                            }}
                        >
                            ⚓ Return to Ship
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function ResourceBadge({ icon, value, color }: { icon: string; value: number; color: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,0,0,0.55)', borderRadius: 8,
            padding: '4px 10px',
            border: `1px solid ${color}40`,
        }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ color, fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 }}>
                {value}
            </span>
        </div>
    );
}
