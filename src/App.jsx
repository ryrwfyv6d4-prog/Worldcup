import { useState, useEffect } from 'react';
import Navigation from './components/Navigation.jsx';
import Draw from './components/Draw.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Settings from './components/Settings.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import TheWall from './components/TheWall.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useFixtures } from './hooks/useFixtures.js';

const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';

export default function App() {
  const [tab, setTab] = useState('leaderboard');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [participants, setParticipants] = useLocalStorage('sweep_participants', []);
  const [assignments, setAssignments] = useLocalStorage('sweep_assignments', {});
  const [drawType, setDrawType] = useLocalStorage('sweep_draw_type', 'teams');
  const [drawLocked, setDrawLocked] = useLocalStorage('sweep_draw_locked', false);

  const { fixtures, loading, error, lastFetched, refresh } = useFixtures();

  // Cloud state sync — load draw on mount, push on every change
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    if (!WORKER_URL) { setCloudLoaded(true); return; }
    fetch(`${WORKER_URL}/state`)
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (s && Object.keys(s.assignments || {}).length > 0) {
          setParticipants(s.participants || []);
          setAssignments(s.assignments || {});
          setDrawType(s.drawType || 'teams');
          setDrawLocked(s.drawLocked || false);
        }
      })
      .catch(() => {})
      .finally(() => { setCloudLoaded(true); });
  }, []);

  useEffect(() => {
    if (!cloudLoaded || !WORKER_URL) return;
    fetch(`${WORKER_URL}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants, assignments, drawType, drawLocked }),
    }).catch(() => {});
  }, [cloudLoaded, participants, assignments, drawType, drawLocked]);

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

  const handleSetTab = (t) => {
    setSelectedTeam(null);
    setTab(t);
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    document.querySelector('.main')?.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedTeam(null);
    document.querySelector('.main')?.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <header className="app-header">
        <img src="/Worldcup/icon-192.png" alt="Dan's Shed" className="header-icon" style={{width:40,height:40,objectFit:'contain'}} />
        <div className="header-text">
          <h1 className="app-title">
            DAN'S <span className="gold">SHED</span>
          </h1>
          <p className="app-year">
            {selectedTeam ? `← ${selectedTeam}` : "World Cup Sweep '26"}
          </p>
        </div>
      </header>

      <main className="main">
        {selectedTeam ? (
          <TeamDetail
            team={selectedTeam}
            fixtures={fixtures}
            assignments={assignments}
            drawType={drawType}
            onBack={handleBack}
            onSelectTeam={handleSelectTeam}
          />
        ) : (
          <>
            {tab === 'leaderboard' && (
              <Leaderboard
                assignments={assignments}
                drawType={drawType}
                fixtures={fixtures}
                apiError={error}
                lastFetched={lastFetched}
                onSelectTeam={handleSelectTeam}
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
                onSelectTeam={handleSelectTeam}
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
                onSelectTeam={handleSelectTeam}
              />
            )}
            {tab === 'wall' && (
              <TheWall participants={participants} />
            )}
            {tab === 'settings' && (
              <Settings
                onResetDraw={handleResetDraw}
                onClearCache={handleClearCache}
              />
            )}
          </>
        )}
      </main>

      <Navigation tab={tab} setTab={handleSetTab} />
    </div>
  );
}
