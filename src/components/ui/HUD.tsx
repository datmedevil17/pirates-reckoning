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
    const isLowHp = hpPct <= 0.25;
    const weaponName = equippedRight
        ? equippedRight.split('/').pop()?.replace('.gltf', '').replace('Weapon_', '').replace(/_/g, ' ')
        : 'Unarmed';

    const stars = difficulty
        ? '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty)
        : '';

    const hpBarColor = hpPct > 0.5
        ? 'linear-gradient(90deg,#16a34a,#4ade80,#16a34a)'
        : hpPct > 0.25
            ? 'linear-gradient(90deg,#d97706,#fbbf24,#d97706)'
            : 'linear-gradient(90deg,#dc2626,#f87171,#dc2626)';

    return (
        <>
            {/* ── HP Panel (top-left) ──────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                background: 'rgba(4,8,20,0.82)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px',
                backdropFilter: 'blur(10px)',
                boxShadow: isLowHp
                    ? '0 0 0 1px rgba(239,68,68,0.5), inset 0 0 20px rgba(239,68,68,0.08)'
                    : '0 4px 20px rgba(0,0,0,0.4)',
                animation: isLowHp ? 'lowHpPulse 1.2s ease-in-out infinite' : 'none',
                minWidth: 170,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7,
                }}>
                    <span style={{
                        fontSize: 16,
                        display: 'inline-block',
                        animation: isLowHp ? 'heartbeat 1.2s ease-in-out infinite' : 'none',
                    }}>
                        {isLowHp ? '🩸' : '❤️'}
                    </span>
                    <span style={{
                        fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                        color: isLowHp ? '#f87171' : 'rgba(255,255,255,0.55)',
                        fontFamily: 'monospace', fontWeight: 700,
                    }}>
                        {isLowHp ? 'CRITICAL' : 'Health'}
                    </span>
                    <span style={{
                        marginLeft: 'auto', fontSize: 11, fontFamily: 'monospace',
                        color: isLowHp ? '#f87171' : 'rgba(255,255,255,0.45)',
                    }}>
                        {hp}/{maxHp}
                    </span>
                </div>
                <div style={{
                    width: '100%', height: 8,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${hpPct * 100}%`,
                        height: '100%',
                        background: hpBarColor,
                        backgroundSize: '200% 100%',
                        animation: 'shimmerGold 2.5s linear infinite',
                        transition: 'width 0.35s ease',
                        borderRadius: 4,
                    }} />
                </div>
                {/* Segment ticks */}
                <div style={{ display: 'flex', marginTop: 3, gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: (i / 5) < hpPct
                                ? hpPct > 0.5 ? 'rgba(74,222,128,0.35)' : hpPct > 0.25 ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'
                                : 'rgba(255,255,255,0.05)',
                        }} />
                    ))}
                </div>
            </div>

            {/* ── Resource Panel (top-right) ───────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 10,
                background: 'rgba(4,8,20,0.82)',
                border: '1px solid rgba(255,220,80,0.12)',
                borderRadius: 12, padding: '8px 14px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                display: 'flex', gap: 16, alignItems: 'center',
            }}>
                <ResourceBadge icon="🪙" value={resources.gold} color="#fbbf24" label="Gold" />
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />
                <ResourceBadge icon="💎" value={resources.gemBlue} color="#60a5fa" label="Blue" />
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />
                <ResourceBadge icon="🌿" value={resources.gemGreen} color="#4ade80" label="Green" />
            </div>

            {/* ── Weapon Slot (bottom-center) ──────────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 24, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
                <div style={{
                    background: 'rgba(4,8,20,0.88)',
                    border: '1px solid rgba(240,192,64,0.35)',
                    borderTop: '1px solid rgba(240,192,64,0.6)',
                    borderRadius: 10, padding: '9px 24px',
                    display: 'flex', alignItems: 'center', gap: 9,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 0 20px rgba(240,192,64,0.12), 0 4px 16px rgba(0,0,0,0.5)',
                }}>
                    <span style={{ fontSize: 16 }}>⚔</span>
                    <span style={{
                        color: '#f0c040',
                        fontFamily: "'Pirata One', monospace",
                        fontSize: 15, letterSpacing: 1, fontWeight: 400,
                        textShadow: '0 0 12px rgba(240,192,64,0.5)',
                    }}>
                        {weaponName}
                    </span>
                </div>
                {/* Controls hint */}
                <div style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'monospace',
                }}>
                    <KeyHint k="WASD" label="Move" />
                    <KeyHint k="Space" label="Jump" />
                    <KeyHint k="E" label="Sword" />
                    <KeyHint k="Q" label="Punch" />
                </div>
            </div>

            {/* ── Island Info (bottom-right) ────────────────────────────────────── */}
            {islandName && (
                <div style={{
                    position: 'absolute', bottom: 24, right: 16, zIndex: 10,
                    textAlign: 'right',
                    background: 'rgba(4,8,20,0.75)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '8px 14px',
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{
                        fontFamily: "'Pirata One', serif",
                        fontSize: 15, color: '#ffe080',
                        textShadow: '0 0 10px rgba(255,220,80,0.4)',
                    }}>
                        {islandName}
                    </div>
                    <div style={{
                        fontSize: 12, marginTop: 2,
                        color: difficulty && difficulty >= 4 ? '#ff6040' : '#f0a030',
                        letterSpacing: 1,
                    }}>
                        {stars}
                    </div>
                </div>
            )}

            {/* ── Death Screen ──────────────────────────────────────────────────── */}
            {!isAlive && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 30,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'radial-gradient(ellipse at center, rgba(80,0,0,0.6) 0%, rgba(0,0,0,0.88) 70%)',
                    animation: 'fadeIn 0.4s ease',
                }}>
                    {/* Vignette edges */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(139,0,0,0.3) 100%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{
                        animation: 'deathReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontSize: 72,
                            display: 'inline-block',
                            animation: 'skullShake 1.5s ease 0.5s 2',
                            marginBottom: 16,
                        }}>☠</div>
                        <div style={{
                            fontFamily: "'Pirata One', serif",
                            fontSize: 56, fontWeight: 400,
                            color: '#ef4444',
                            textShadow: '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.4)',
                            letterSpacing: 6,
                            marginBottom: 8,
                        }}>
                            YOU DIED
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace',
                            fontSize: 12, letterSpacing: 3, marginBottom: 28,
                        }}>
                            DEFEATED BY THE SEAS
                        </div>
                        <button
                            onClick={onReturnToShip}
                            style={{
                                background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                borderRadius: 10, padding: '13px 40px',
                                color: '#fff', fontFamily: "'Pirata One', serif",
                                fontSize: 18, cursor: 'pointer', letterSpacing: 2,
                                boxShadow: '0 0 20px rgba(239,68,68,0.3)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(239,68,68,0.6)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(239,68,68,0.3)')}
                        >
                            ⛵ Return to Ship
                        </button>
                    </div>
                </div>
            )}

            {/* ── Run Complete Banner ───────────────────────────────────────────── */}
            {isComplete && isAlive && (
                <div style={{
                    position: 'absolute', top: '28%', left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20, textAlign: 'center',
                    animation: 'slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <div style={{
                        background: 'linear-gradient(160deg, rgba(20,12,0,0.96), rgba(4,8,20,0.96))',
                        border: '1px solid rgba(251,191,36,0.5)',
                        borderTop: '2px solid rgba(251,191,36,0.9)',
                        borderRadius: 18, padding: '28px 56px',
                        boxShadow: '0 0 60px rgba(251,191,36,0.15), 0 8px 40px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(16px)',
                    }}>
                        <div style={{
                            fontSize: 48, marginBottom: 4,
                            display: 'inline-block',
                            animation: 'floatBob 2s ease-in-out infinite',
                        }}>🏆</div>
                        <div style={{
                            fontFamily: "'Pirata One', serif",
                            fontSize: 28, color: '#fbbf24',
                            textShadow: '0 0 20px rgba(251,191,36,0.6)',
                            letterSpacing: 2,
                        }}>
                            Island Cleared!
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.5)', margin: '8px 0 20px',
                            fontSize: 12, letterSpacing: 2, fontFamily: 'monospace',
                        }}>
                            TREASURE SECURED · WELL DONE, CAPTAIN
                        </div>
                        <button
                            onClick={onReturnToShip}
                            style={{
                                background: 'linear-gradient(135deg,#92400e,#d97706,#f0b030)',
                                border: '1px solid rgba(251,191,36,0.4)',
                                borderRadius: 10, padding: '12px 32px',
                                color: '#1a0800', fontFamily: "'Pirata One', serif",
                                fontSize: 17, cursor: 'pointer', letterSpacing: 2,
                                boxShadow: '0 0 20px rgba(251,191,36,0.2)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(251,191,36,0.5)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.2)')}
                        >
                            ⚓ Return to Ship
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function ResourceBadge({ icon, value, color, label }: { icon: string; value: number; color: string; label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>
                <span style={{
                    color, fontFamily: 'monospace', fontWeight: 700, fontSize: 15,
                    textShadow: `0 0 8px ${color}66`,
                }}>
                    {value}
                </span>
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace' }}>
                {label.toUpperCase()}
            </span>
        </div>
    );
}

function KeyHint({ k, label }: { k: string; label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="game-key">{k}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>{label}</span>
        </div>
    );
}
