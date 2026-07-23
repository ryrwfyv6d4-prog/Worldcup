import { useState } from 'react';
import { useEnglandFixtures } from './hooks/useEnglandFixtures.js';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Tables from './components/Tables.jsx';
import Draw from './components/Draw.jsx';
import Regiments from './components/Regiments.jsx';
import { SEASON } from './data/england2027.js';

function useStored(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  const set = (v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  };
  return [val, set];
}

const TABS = [
  { key: 'front', label: 'The Front', icon: '🎖' },
  { key: 'orders', label: 'Orders', icon: '📋' },
  { key: 'map', label: 'Map Room', icon: '🗺' },
  { key: 'regiments', label: 'Regiments', icon: '🪖' },
  { key: 'draw', label: 'Conscription', icon: '📯' },
];

export default function App() {
  const [tab, setTab] = useState('front');
  const [assignments, setAssignments] = useStored('epl_assignments', {});
  const [drawLocked, setDrawLocked] = useStored('epl_draw_locked', false);
  const { fixtures, loading, error, refresh } = useEnglandFixtures();

  return (
    <div className="app">
      <header className="header">
        <h1>THE EAGLE'S NEST</h1>
        <p className="subtitle">England Campaign {SEASON} · Two Fronts</p>
      </header>

      <main className="main">
        {error && <div className="error-bar">{error} <button className="btn" onClick={refresh}>Retry</button></div>}
        {loading && fixtures.length === 0 && <p className="muted center">Receiving transmissions…</p>}
        {tab === 'front' && <Leaderboard assignments={assignments} fixtures={fixtures} />}
        {tab === 'orders' && <Fixtures fixtures={fixtures} assignments={assignments} />}
        {tab === 'map' && <Tables fixtures={fixtures} assignments={assignments} />}
        {tab === 'regiments' && <Regiments assignments={assignments} />}
        {tab === 'draw' && (
          <Draw
            assignments={assignments}
            setAssignments={setAssignments}
            drawLocked={drawLocked}
            setDrawLocked={setDrawLocked}
          />
        )}
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.key} className={`nav-btn ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
