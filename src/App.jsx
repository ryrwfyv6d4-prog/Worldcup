import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Navigation from './components/Navigation.jsx';
import Draw from './components/Draw.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Settings from './components/Settings.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import TheWall from './components/TheWall.jsx';
import Graveyard from './components/Graveyard.jsx';
import WhoAmIModal from './components/WhoAmIModal.jsx';
import LiveTicker from './components/LiveTicker.jsx';
import MatchSheet from './components/MatchSheet.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useFixtures } from './hooks/useFixtures.js';
import { snapshotScores, detectScoreEvents } from './utils/liveEvents.js';
import { computeFallen } from './utils/elimination.js';

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
  // wallReactions stored in cloud state so they survive tab switches without a new Worker endpoint
  const [wallReactions, setWallReactions] = useLocalStorage('wall_reactions_v1', {});
  const [showWhoAmI, setShowWhoAmI] = useState(false);
  const [tickerMatch, setTickerMatch] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [tickerFlash, setTickerFlash] = useState(false);
  const [hdrCollapsed, setHdrCollapsed] = useState(false);
  const prevScoresRef = useRef(null);

  const { fixtures, loading, error, lastFetched, refresh } = useFixtures();

  // Goal / full-time moments — diff each fixtures update against the last
  useEffect(() => {
    if (!fixtures.length) return;
    const events = detectScoreEvents(prevScoresRef.current, fixtures);
    prevScoresRef.current = snapshotScores(fixtures);
    if (!events.length) return;
    const stamped = events.map((e, i) => ({
      id: `${Date.now()}-${i}`,
      text: e.type === 'goal' ? `⚽ GOAL — ${e.score}` : `🏁 FULL TIME — ${e.score}`,
      fixture: e.fixture,
    }));
    setToasts((t) => [...t, ...stamped]);
    if (events.some((e) => e.type === 'goal')) {
      setTickerFlash(true);
      setTimeout(() => setTickerFlash(false), 2500);
      try { navigator.vibrate?.([90, 60, 90]); } catch { /* not supported */ }
    }
    for (const s of stamped) {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== s.id)), 6000);
    }
  }, [fixtures]);

  // Collapse the masthead once scrolled; hysteresis avoids jitter
  const handleMainScroll = useCallback((e) => {
    const y = e.currentTarget.scrollTop;
    setHdrCollapsed((c) => (c ? y > 12 : y > 48));
  }, []);

  // Nav badges
  const liveCount = useMemo(
    () => fixtures.filter((f) => f.status === 'IN_PLAY' || f.status === 'PAUSED').length,
    [fixtures]
  );
  const deportedCount = useMemo(
    () => computeFallen(assignments, drawType, fixtures).length,
    [assignments, drawType, fixtures]
  );

  // Pull-to-refresh on the main scroll container
  const mainRef = useRef(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let startY = 0, startX = 0, pulling = false, px = 0;
    const onStart = (e) => {
      if (el.scrollTop > 0) { pulling = false; return; }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      pulling = true; px = 0;
    };
    const onMove = (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > Math.abs(dy)) { pulling = false; setPullPx(0); return; }
      if (dy <= 0 || el.scrollTop > 0) { if (px) { px = 0; setPullPx(0); } return; }
      e.preventDefault();
      px = Math.min(110, dy * 0.45);
      setPullPx(px);
    };
    const onEnd = async () => {
      if (!pulling) return;
      pulling = false;
      if (px > 62) {
        setRefreshing(true);
        setPullPx(56);
        try { await refreshRef.current(); } catch { /* network best-effort */ }
        setRefreshing(false);
        setPullPx(0);
      } else {
        setPullPx(0);
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  // Guard: prevent accidentally overwriting a draw that lived in the cloud
  // with empty state on a device that hasn't loaded the draw locally yet.
  const cloudHadDrawRef = useRef(false);

  // Cloud state sync — load draw on mount, push on every change
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    if (!WORKER_URL) { setCloudLoaded(true); return; }
    fetch(`${WORKER_URL}/state`)
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (s && Object.keys(s.assignments || {}).length > 0) {
          cloudHadDrawRef.current = true;
          setParticipants(s.participants || []);
          setAssignments(s.assignments || {});
          // Detect stale drawType: cloud may still say 'groups' but assignments
          // now contain team names (from a tiered draw). If so, correct to 'tiered'.
          let loadedDrawType = s.drawType || 'teams';
          if (loadedDrawType === 'groups') {
            const sample = Object.values(s.assignments || {})[0] || [];
            if (sample.length > 0 && !String(sample[0]).startsWith('Group ')) {
              loadedDrawType = 'tiered';
            }
          }
          setDrawType(loadedDrawType);
          setDrawLocked(s.drawLocked || false);
        }
        if (s && s.lbReactions) setLbReactions(s.lbReactions);
        if (s && s.wallReactions) setWallReactions(s.wallReactions);
      })
      .catch(() => {})
      .finally(() => { setCloudLoaded(true); });
  }, []);

  useEffect(() => {
    if (!cloudLoaded || !WORKER_URL) return;
    // Safety guard: never overwrite a known cloud draw with empty local state.
    // This can happen if reactions fire the sync before the draw state is stable.
    if (
      cloudHadDrawRef.current &&
      participants.length === 0 &&
      Object.keys(assignments).length === 0
    ) return;
    fetch(`${WORKER_URL}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants, assignments, drawType, drawLocked, lbReactions, wallReactions }),
    }).catch(() => {});
  }, [cloudLoaded, participants, assignments, drawType, drawLocked, lbReactions, wallReactions]);

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

  const handleWallReact = useCallback((photoId, emoji) => {
    if (!currentUser || currentUser === '__guest__') return;
    setWallReactions(prev => {
      const updated = { ...prev };
      const photoReactions = { ...(updated[photoId] || {}) };
      const people = [...(photoReactions[emoji] || [])];
      const idx = people.indexOf(currentUser);
      if (idx === -1) {
        photoReactions[emoji] = [...people, currentUser];
      } else {
        photoReactions[emoji] = people.filter((_, i) => i !== idx);
        if (photoReactions[emoji].length === 0) delete photoReactions[emoji];
      }
      updated[photoId] = photoReactions;
      return updated;
    });
  }, [currentUser]);

  const handleResetDraw = () => {
    // Allow the sync to send empty state (intentional reset)
    cloudHadDrawRef.current = false;
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
    document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className={`app${hdrCollapsed ? ' hdr-collapsed' : ''}`}>
      <div className="bunting" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
      </div>
      <header className="app-header masthead">
        <div className="masthead-eagle">🦅</div>
        <h1 className="app-title">THE EAGLE'S NEST</h1>
        <p className="app-year masthead-est">
          {selectedTeam ? `← ${selectedTeam}` : "WORLD CUP SWEEP · EST. 2026 · DAN'S SHED"}
        </p>
      </header>

      <div
        className={`ptr-spinner${refreshing ? ' spinning' : ''}`}
        style={{
          opacity: pullPx > 6 ? Math.min(1, pullPx / 56) : 0,
          transform: `translateX(-50%) translateY(${pullPx}px) rotate(${pullPx * 3.2}deg)`,
        }}
        aria-hidden="true"
      >
        🦅
      </div>
      <main className="main" ref={mainRef} onScroll={handleMainScroll}>
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
                onChangeUser={handleChangeUser}
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
                currentUser={resolvedUser}
              />
            )}
            {tab === 'fallen' && (
              <Graveyard
                assignments={assignments}
                drawType={drawType}
                fixtures={fixtures}
                onSelectTeam={handleSelectTeam}
              />
            )}
            {tab === 'wall' && (
              <TheWall
                participants={participants}
                currentUser={resolvedUser}
                wallReactions={wallReactions}
                onWallReact={handleWallReact}
              />
            )}
            {tab === 'settings' && (
              <Settings
                onResetDraw={handleResetDraw}
                onClearCache={handleClearCache}
                currentUser={resolvedUser}
                onChangeUser={handleChangeUser}
                onOpenDraw={() => handleSetTab('draw')}
              />
            )}
          </>
        )}
      </main>

      {toasts.length > 0 && (
        <div className="goal-toasts">
          {toasts.map((t) => (
            <button key={t.id} className="goal-toast" onClick={() => {
              setToasts((x) => x.filter((y) => y.id !== t.id));
              setTickerMatch(t.fixture);
            }}>
              {t.text}
            </button>
          ))}
        </div>
      )}

      <LiveTicker fixtures={fixtures} onOpen={setTickerMatch} flash={tickerFlash} />

      <Navigation tab={tab} setTab={handleSetTab} liveCount={liveCount} deportedCount={deportedCount} />

      {tickerMatch && (
        <MatchSheet
          match={tickerMatch}
          assignments={assignments}
          drawType={drawType}
          onClose={() => setTickerMatch(null)}
          onSelectTeam={(team) => { setTickerMatch(null); handleSelectTeam(team); }}
        />
      )}

      {showWhoAmI && (
        <WhoAmIModal participants={participants} onSelect={handleSelectUser} />
      )}
    </div>
  );
}

