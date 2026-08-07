import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEnglandFixtures } from './hooks/useEnglandFixtures.js';
import { useSharedState } from './hooks/useSharedState.js';
import { buildLadder } from './utils/scoring.js';
import Navigation from './components/Navigation.jsx';
import Ticker from './components/Ticker.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Tables from './components/Tables.jsx';
import Wall from './components/Wall.jsx';
import Shed from './components/Shed.jsx';
import TeamSheet from './components/TeamSheet.jsx';
import MatchSheet from './components/MatchSheet.jsx';
import { SEASON } from './data/england2027.js';
import { useDismissable } from './hooks/useDismissable.js';

function WhoAmIModal({ participants, onPick, onSkip }) {
  const hasRoster = participants.length > 0;
  return (
    <div className="whoami-overlay">
      <div className="whoami-modal">
        <div className="whoami-title">Who are you?</div>
        <div className="whoami-sub">
          {hasRoster
            ? 'Your row gets marked and your posts get signed.'
            : 'Nobody drawn yet. Run the draw in the Shed, then come back.'}
        </div>
        {hasRoster && (
          <div className="whoami-list">
            {participants.map((p) => (
              <button key={p} className="whoami-btn" onClick={() => onPick(p)}>{p}</button>
            ))}
          </div>
        )}
        <button className="whoami-skip" onClick={onSkip}>
          {hasRoster ? 'Just watching' : 'Close'}
        </button>
      </div>
    </div>
  );
}

// Masthead wordmark + issue line per screen
const MASTHEAD = {
  table: { word: "Dan's Shed", strapRight: null },
  fixtures: { word: 'Fixtures', strapRight: null },
  clubs: { word: 'Clubs', strapRight: null },
  wall: { word: 'The Wall', strapRight: null },
  shed: { word: 'The Shed', strapRight: null },
};

export default function App() {
  const [tab, setTab] = useState('table');
  const { state, update, synced } = useSharedState();
  const { fixtures, loading, error, refresh, lastFetched, espnState } = useEnglandFixtures();
  const { assignments, manualMedals } = state;
  const participants = Object.keys(assignments);

  const ladder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals),
    [assignments, fixtures, manualMedals]
  );

  const [whoAmI, setWhoAmI] = useState(() => {
    try { return localStorage.getItem('epl_whoami') || ''; } catch { return ''; }
  });
  const [showWho, setShowWho] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (promptedRef.current) return;
    if (whoAmI) { promptedRef.current = true; return; }
    if (participants.length > 0) { promptedRef.current = true; setShowWho(true); }
  }, [participants.length, whoAmI]);

  const pickWho = (name) => {
    setWhoAmI(name); setShowWho(false);
    try { localStorage.setItem('epl_whoami', name); } catch { /* ignore */ }
  };
  const skipWho = () => setShowWho(false);

  const [teamSheet, setTeamSheet] = useState(null);
  const [matchSheet, setMatchSheet] = useState(null);

  const mainRef = useRef(null);
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [tab]);

  // Phone/browser Back and Escape close the topmost overlay
  const closeTopRef = useRef(() => {});
  closeTopRef.current = () => {
    if (showWho) setShowWho(false);
    else if (teamSheet) setTeamSheet(null);
    else if (matchSheet) setMatchSheet(null);
  };
  const closeTop = useCallback(() => closeTopRef.current(), []);
  useDismissable(Boolean(showWho || teamSheet || matchSheet), closeTop);

  // Matchweek shown in the strap — the next one still to be played
  const matchweek = useMemo(() => {
    const now = Date.now();
    const up = fixtures
      .filter((f) => f.utcDate && Date.parse(f.utcDate) > now - 36 * 3600 * 1000)
      .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
    return up.length ? up[0].matchday : null;
  }, [fixtures]);

  const head = MASTHEAD[tab] || MASTHEAD.table;
  const wallCount = (state.wallPosts || []).length;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-top">
          <div className="masthead-word">{head.word}</div>
          <button className="masthead-issue" onClick={() => setShowWho(true)}>
            {tab === 'wall'
              ? `${wallCount} bit${wallCount === 1 ? '' : 's'}`
              : whoAmI || 'Who are you?'}
          </button>
        </div>
        <div className="strap">
          <span>Season Sweep {SEASON}</span>
          <span>{matchweek ? `Matchweek ${matchweek}` : 'Pre-season'}</span>
        </div>
      </header>

      <Ticker fixtures={fixtures} assignments={assignments} ladder={ladder} />

      <main className="main" ref={mainRef}>
        {error && (
          <div className="error-bar">
            <span>{error}</span>
            <button className="btn" onClick={refresh}>Retry</button>
          </div>
        )}
        {loading && fixtures.length === 0 && (
          <div className="empty-state"><p>Fetching the fixtures…</p></div>
        )}

        {tab === 'table' && (
          <Leaderboard
            assignments={assignments}
            fixtures={fixtures}
            manualMedals={manualMedals}
            whoAmI={whoAmI}
            onSelectTeam={setTeamSheet}
          />
        )}
        {tab === 'fixtures' && (
          <Fixtures
            fixtures={fixtures}
            assignments={assignments}
            onOpenMatch={setMatchSheet}
            whoAmI={whoAmI}
          />
        )}
        {tab === 'clubs' && (
          <Tables fixtures={fixtures} assignments={assignments} onSelectTeam={setTeamSheet} />
        )}
        {tab === 'wall' && (
          <Wall state={state} update={update} whoAmI={whoAmI} synced={synced} />
        )}
        {tab === 'shed' && (
          <Shed
            state={state}
            update={update}
            synced={synced}
            whoAmI={whoAmI}
            onChangeUser={() => setShowWho(true)}
            fixtures={fixtures}
            lastFetched={lastFetched}
            refresh={refresh}
            espnState={espnState}
            onSelectTeam={setTeamSheet}
          />
        )}
      </main>

      {showWho && (
        <WhoAmIModal participants={participants} onPick={pickWho} onSkip={skipWho} />
      )}

      {matchSheet && (
        <MatchSheet
          fixture={matchSheet}
          fixtures={fixtures}
          assignments={assignments}
          onClose={() => setMatchSheet(null)}
          onSelectTeam={setTeamSheet}
        />
      )}

      {teamSheet && (
        <TeamSheet
          team={teamSheet}
          fixtures={fixtures}
          assignments={assignments}
          onClose={() => setTeamSheet(null)}
          onOpenMatch={(f) => { setTeamSheet(null); setMatchSheet(f); }}
        />
      )}

      <Navigation tab={tab} setTab={setTab} />
    </div>
  );
}
