import { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation.jsx';
import Draw from './components/Draw.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Settings from './components/Settings.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import TheWall from './components/TheWall.jsx';
import WhoAmIModal from './components/WhoAmIModal.jsx';
import Predictions from './components/Predictions.jsx';
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
  const [currentUser, setCurrentUser] = useLocalStorage('sweep_current_user', null);
  const [lbReactions, setLbReactions] = useLocalStorage('lb_reactions_v1', {});
  const [showWhoAmI, setShowWhoAmI] = useState(false);

  // Predictions — loaded from cloud
  const [predictions, setPredictions] = useState({});

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
        if (s && s.lbReactions) {
          setLbReactions(s.lbReactions);
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
      body: JSON.stringify({ participants, assignments, drawType, drawLocked, lbReactions }),
    }).catch(() => {});
  }, [cloudLoaded, participants, assignments, drawType, drawLocked, lbReactions]);

  // Load predictions from cloud
  useEffect(() => {
    if (!WORKER_URL) return;
    fetch(`${WORKER_URL}/predictions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPredictions(data); })
      .catch(() => {});
  }, []);

  // Show identity picker on first open if participants exist and user is unknown
  useEffect(() => {
    if (cloudLoaded && currentUser === null && participants.length > 0) {
      setShowWhoAmI(true);
    }
  }, [cloudLoaded, participants.length]);

  // Badge API — count new finished fixtures since last open
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    const lastSeen = Number(localStorage.getItem('last_seen_ts') || 0);
    const newResults = fixtures.filter(
      (f) => f.status === 'FINISHED' && new Date(f.utcDate).getTime() > lastSeen
    ).length;
    if (newResults > 0) {
      navigator.setAppBadge(newResults).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [fixtures]);

  // Clear badge and update lastSeen when user opens app
  useEffect(() => {
    localStorage.setItem('last_seen_ts', String(Date.now()));
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, []);

  const handleSelectUser = (name) => {
    setCurrentUser(name || '__guest__');
    setShowWhoAmI(false);
  };

  const handleChangeUser = () => {
    setCurrentUser(null);
    setShowWhoAmI(true);
  };

  const handleLbReact = useCallback((personName, emoji) => {
    if (!currentUser || currentUser === '__guest__') return;
    setLbReactions(prev => {
      const updated = { ...prev };
      const personReactions = { ...(updated[personName] || {}) };
      const people = [...(personReactions[emoji] || [])];
      const idx = people.indexOf(currentUser);
      if (idx === -1) {
        personReactions[emoji] = [...people, currentUser];
      } else {
        personReactions[emoji] = people.filter((_, i) => i !== idx);
        if (personReactions[emoji].length === 0) delete personReactions[emoji];
      }
      updated[personName] = personReactions;
      return updated;
    });
  }, [currentUser]);

  const handlePick = useCallback((matchId, person, pick) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [person]: pick },
    }));
    if (!WORKER_URL) return;
    fetch(`${WORKER_URL}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, person, pick }),
    }).catch(() => {});
  }, []);

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

  const resolvedUser = currentUser === '__guest__' ? null : currentUser;

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">🏟️</span>
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
                currentUser={resolvedUser}
                lbReactions={lbReactions}
                onLbReact={handleLbReact}
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
            {tab === 'predictions' && (
              <Predictions
                fixtures={fixtures}
                currentUser={resolvedUser}
                participants={participants}
                predictions={predictions}
                onPick={handlePick}
              />
            )}
            {tab === 'wall' && (
              <TheWall participants={participants} currentUser={resolvedUser} />
            )}
            {tab === 'settings' && (
              <Settings
                onResetDraw={handleResetDraw}
                onClearCache={handleClearCache}
                currentUser={resolvedUser}
                onChangeUser={handleChangeUser}
              />
            )}
          </>
        )}
      </main>

      <Navigation tab={tab} setTab={handleSetTab} />

      {showWhoAmI && (
        <WhoAmIModal participants={participants} onSelect={handleSelectUser} />
      )}
    </div>
  );
}
