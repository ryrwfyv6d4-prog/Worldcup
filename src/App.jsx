import { useState } from 'react';
import Navigation from './components/Navigation.jsx';
import Draw from './components/Draw.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Settings from './components/Settings.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useFixtures } from './hooks/useFixtures.js';

export default function App() {
  const [tab, setTab] = useState('leaderboard');
  const [participants, setParticipants] = useLocalStorage('sweep_participants', []);
  const [assignments, setAssignments] = useLocalStorage('sweep_assignments', {});
  const [drawType, setDrawType] = useLocalStorage('sweep_draw_type', 'teams');
  const [drawLocked, setDrawLocked] = useLocalStorage('sweep_draw_locked', false);
  const { fixtures, loading, error, lastFetched, refresh } = useFixtures();

  const handleResetDraw = () => {
    setParticipants([]);
    setAssignments({});
    setDrawLocked(false);
  };

  const handleClearCache = () => {
    localStorage.removeItem('wc_fixtures_cache_v4');
    localStorage.removeItem('wc_fixtures_cache');
    refresh();
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">🏟️</span>
        <div className="header-text">
          <h1 className="app-title">
            DAN'S <span className="gold">SHED</span>
          </h1>
          <p className="app-year">World Cup Sweep '26</p>
        </div>
      </header>

      <main className="main">
        {tab === 'leaderboard' && (
          <Leaderboard
            assignments={assignments}
            drawType={drawType}
            fixtures={fixtures}
            apiError={error}
            lastFetched={lastFetched}
          />
        )}
        {tab === 'draw' && (
          <Draw
            participants={participants}
            setParticipants={setParticipants}
            assignments={assignments}
            setAssignments={setAssignments}
            drawType={drawType}
            setDrawType={setDrawType}
            drawLocked={drawLocked}
            setDrawLocked={setDrawLocked}
          />
        )}
        {tab === 'fixtures' && (
          <Fixtures
            fixtures={fixtures}
            loading={loading}
            error={error}
            lastFetched={lastFetched}
            onRefresh={refresh}
            assignments={assignments}
            drawType={drawType}
          />
        )}
        {tab === 'settings' && (
          <Settings
            onResetDraw={handleResetDraw}
            onClearCache={handleClearCache}
          />
        )}
      </main>

      <Navigation tab={tab} setTab={setTab} />
    </div>
  );
}
