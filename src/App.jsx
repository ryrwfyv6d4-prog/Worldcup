import { useState } from 'react';
import Navigation from './components/Navigation.jsx';
import Draw from './components/Draw.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Settings from './components/Settings.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useFixtures } from './hooks/useFixtures.js';

export default function App() {
  const [tab, setTab] = useState('draw');
  const [participants, setParticipants] = useLocalStorage('sweep_participants', []);
  const [assignments, setAssignments] = useLocalStorage('sweep_assignments', {});
  const [drawType, setDrawType] = useLocalStorage('sweep_draw_type', 'teams');
  const [apiKey, setApiKey] = useLocalStorage('sweep_api_key', '');

  const { fixtures, loading, error, lastFetched, refresh } = useFixtures(apiKey);

  const handleResetDraw = () => {
    setParticipants([]);
    setAssignments({});
  };

  const handleClearCache = () => {
    localStorage.removeItem('wc_fixtures_cache');
    refresh();
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">⚽</span>
        <div>
          <h1 className="app-title">World Cup Sweep</h1>
          <p className="app-year">FIFA 2026</p>
        </div>
      </header>

      <main className="main">
        {tab === 'draw' && (
          <Draw
            participants={participants}
            setParticipants={setParticipants}
            assignments={assignments}
            setAssignments={setAssignments}
            drawType={drawType}
            setDrawType={setDrawType}
          />
        )}
        {tab === 'leaderboard' && (
          <Leaderboard
            assignments={assignments}
            drawType={drawType}
            fixtures={fixtures}
            apiError={error}
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
            apiKey={apiKey}
            setApiKey={setApiKey}
            onResetDraw={handleResetDraw}
            onClearCache={handleClearCache}
          />
        )}
      </main>

      <Navigation tab={tab} setTab={setTab} />
    </div>
  );
}
