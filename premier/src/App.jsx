import { useState, useEffect, useRef } from 'react';
import { useEnglandFixtures } from './hooks/useEnglandFixtures.js';
import { useSharedState } from './hooks/useSharedState.js';
import Navigation from './components/Navigation.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Tables from './components/Tables.jsx';
import Campaign from './components/Campaign.jsx';
import HQ from './components/HQ.jsx';
import TeamSheet from './components/TeamSheet.jsx';
import { SEASON } from './data/england2027.js';

function WhoAmIModal({ participants, onPick, onSkip }) {
  const hasRoster = participants.length > 0;
  return (
    <div className="whoami-overlay">
      <div className="whoami-modal">
        <div className="whoami-icon">🦅</div>
        <div className="whoami-title">Report in, soldier</div>
        <div className="whoami-sub">
          {hasRoster
            ? 'Who are you? Your row gets marked and your posts get signed.'
            : 'No troops conscripted yet. Run the draw in HQ → Conscription, then report back in.'}
        </div>
        {hasRoster && (
          <div className="whoami-list">
            {participants.map((p) => (
              <button key={p} className="whoami-btn" onClick={() => onPick(p)}>{p}</button>
            ))}
          </div>
        )}
        <button className="whoami-skip" onClick={onSkip}>
          {hasRoster ? 'Just observing' : 'Close'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('front');
  const { state, update, synced } = useSharedState();
  const { fixtures, loading, error, refresh, lastFetched } = useEnglandFixtures();
  const { assignments } = state;
  const participants = Object.keys(assignments);

  const [whoAmI, setWhoAmI] = useState(() => {
    try { return localStorage.getItem('epl_whoami') || ''; } catch { return ''; }
  });
  const [showWho, setShowWho] = useState(false);
  const promptedRef = useRef(false);

  // Auto-prompt once, the first time a roster is available and nobody's signed in.
  useEffect(() => {
    if (promptedRef.current) return;
    if (whoAmI) { promptedRef.current = true; return; }
    if (participants.length > 0) {
      promptedRef.current = true;
      setShowWho(true);
    }
  }, [participants.length, whoAmI]);

  const pickWho = (name) => {
    setWhoAmI(name);
    setShowWho(false);
    try { localStorage.setItem('epl_whoami', name); } catch { /* ignore */ }
  };
  const skipWho = () => setShowWho(false);

  const [teamSheet, setTeamSheet] = useState(null);
  const liveCount = fixtures.filter((f) => f.status === 'IN_PLAY').length;

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">🦅</span>
        <div className="header-text">
          <h1 className="app-title">The Eagle's <span className="gold">Nest</span></h1>
          <div className="app-year">England Campaign {SEASON} · Two Fronts</div>
        </div>
        <button className="id-chip" onClick={() => setShowWho(true)}>
          {whoAmI || 'Report in'}
        </button>
      </header>

      <main className="main">
        {error && <div className="error-bar">{error} <button className="btn" onClick={refresh}>Retry</button></div>}
        {loading && fixtures.length === 0 && (
          <div className="empty-state"><div className="empty-icon">📡</div><p>Receiving transmissions…</p></div>
        )}
        {tab === 'front' && (
          <Leaderboard
            assignments={assignments}
            fixtures={fixtures}
            whoAmI={whoAmI}
            onChangeUser={() => setShowWho(true)}
            onSelectTeam={setTeamSheet}
          />
        )}
        {tab === 'orders' && <Fixtures fixtures={fixtures} assignments={assignments} onSelectTeam={setTeamSheet} />}
        {tab === 'map' && <Tables fixtures={fixtures} assignments={assignments} onSelectTeam={setTeamSheet} />}
        {tab === 'campaign' && <Campaign assignments={assignments} fixtures={fixtures} />}
        {tab === 'hq' && (
          <HQ
            state={state}
            update={update}
            synced={synced}
            whoAmI={whoAmI}
            onChangeUser={() => setShowWho(true)}
            onSelectTeam={setTeamSheet}
            lastFetched={lastFetched}
            refresh={refresh}
          />
        )}
      </main>

      {showWho && (
        <WhoAmIModal participants={participants} onPick={pickWho} onSkip={skipWho} />
      )}

      {teamSheet && (
        <TeamSheet team={teamSheet} fixtures={fixtures} assignments={assignments} onClose={() => setTeamSheet(null)} />
      )}

      <Navigation tab={tab} setTab={setTab} liveCount={liveCount} />
    </div>
  );
}
