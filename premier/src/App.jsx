import { useState } from 'react';
import { useEnglandFixtures } from './hooks/useEnglandFixtures.js';
import { useSharedState } from './hooks/useSharedState.js';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Tables from './components/Tables.jsx';
import Campaign from './components/Campaign.jsx';
import Regiments from './components/Regiments.jsx';
import HQ from './components/HQ.jsx';
import { SEASON } from './data/england2027.js';

const TABS = [
  { key: 'front', label: 'The Front', icon: '🎖' },
  { key: 'orders', label: 'Orders', icon: '📋' },
  { key: 'map', label: 'Map Room', icon: '🗺' },
  { key: 'campaign', label: 'Campaign', icon: '🏅' },
  { key: 'regiments', label: 'Regiments', icon: '🪖' },
  { key: 'hq', label: 'HQ', icon: '📯' },
];

export default function App() {
  const [tab, setTab] = useState('front');
  const { state, update, synced } = useSharedState();
  const { fixtures, loading, error, refresh } = useEnglandFixtures();
  const { assignments } = state;

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
        {tab === 'campaign' && <Campaign assignments={assignments} fixtures={fixtures} />}
        {tab === 'regiments' && <Regiments assignments={assignments} />}
        {tab === 'hq' && <HQ state={state} update={update} synced={synced} />}
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
