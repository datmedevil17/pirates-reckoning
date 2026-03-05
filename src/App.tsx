import { Routes, Route, useNavigate } from 'react-router-dom';
import { TestCharacterPage } from './pages/TestCharacterPage';
import { CharacterPage } from './pages/CharacterPage';
import { StartScreen } from './pages/StartScreen';
import { OceanScene } from './scenes/OceanScene';
import { IslandScene } from './scenes/IslandScene';
import { useGameStore } from './store/gameStore';
import { ISLANDS } from './lib/islands';
import './index.css';


// ─── Character Select / Home ──────────────────────────────────────────────────

function Home() {
  const navigate = useNavigate();
  const setCharacter = useGameStore(s => s.setCharacter);
  const loadFromStorage = useGameStore(s => s.loadFromStorage);
  const characterChoice = useGameStore(s => s.characterChoice);

  // Load save on first render
  const loaded = useGameStore(s => s.runNumber);

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#050d18',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#fff',
      backgroundImage: 'radial-gradient(ellipse at 50% 60%, #0a2040 0%, #020810 100%)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🏴‍☠️</div>
        <h1 style={{
          fontSize: 48, fontWeight: 900, letterSpacing: 4,
          color: '#f0c040', margin: 0,
          textShadow: '0 0 30px #f0c04088',
        }}>
          PIRATE'S RECKONING
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8, letterSpacing: 2 }}>
          A ROGUELITE ISLAND ADVENTURE
        </p>
      </div>

      {/* Character Select */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 3, marginBottom: 16 }}>
          CHOOSE YOUR PIRATE
        </p>
        <div style={{ display: 'flex', gap: 24 }}>
          {(['anne', 'henry'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCharacter(c)}
              style={{
                background: characterChoice === c
                  ? 'linear-gradient(135deg, #1e40af, #3b82f6)'
                  : 'rgba(255,255,255,0.05)',
                border: characterChoice === c
                  ? '2px solid #60a5fa'
                  : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '20px 32px',
                cursor: 'pointer', color: '#fff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{c === 'anne' ? '🏹' : '⚔️'}</div>
              <div style={{ fontWeight: 'bold', fontSize: 15, textTransform: 'uppercase', letterSpacing: 2 }}>
                {c === 'anne' ? 'Anne' : 'Henry'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                {c === 'anne' ? 'Rogue · Fast · Dagger' : 'Warrior · Tank · Cutlass'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Islands */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 3, marginBottom: 16 }}>
          CHOOSE ISLAND (or sail the ocean)
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 700 }}>
          {ISLANDS.map(island => {
            const stars = '★'.repeat(island.difficulty) + '☆'.repeat(5 - island.difficulty);
            return (
              <button
                key={island.id}
                onClick={() => navigate(`/island/${island.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '10px 16px',
                  cursor: 'pointer', color: '#fff',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 13 }}>{island.name}</div>
                <div style={{ color: '#f0a030', fontSize: 11 }}>{stars}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main actions */}
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => navigate('/ocean')}
          style={{
            background: 'linear-gradient(135deg, #c8860a, #f0b030)',
            border: 'none', borderRadius: 12,
            padding: '16px 40px', color: '#1a0a00',
            fontWeight: 900, fontSize: 18, cursor: 'pointer',
            letterSpacing: 2,
          }}
        >
          ⚓ SAIL THE OCEAN
        </button>
        <button
          onClick={() => navigate('/test')}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12, padding: '16px 32px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
          }}
        >
          🎮 Dev Sandbox
        </button>
      </div>

      <p style={{ marginTop: 32, color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 2 }}>
        Run #{loaded} • Progress saved locally
      </p>
    </div>
  );
}


// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <Routes>
      <Route path="/" element={<StartScreen />} />
      <Route path="/ocean" element={<OceanScene />} />
      <Route path="/island/:id" element={<IslandScene />} />
      <Route path="/test" element={<TestCharacterPage />} />
      <Route path="/character" element={<CharacterPage />} />
    </Routes>
  );
}

export default App;
