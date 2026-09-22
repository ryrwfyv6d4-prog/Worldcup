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
import Shed, { unanswered } from './components/Shed.jsx';
import TeamSheet from './components/TeamSheet.jsx';
import MatchSheet from './components/MatchSheet.jsx';
import MySquad from './components/MySquad.jsx';
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

// Masthead wordmark per screen
const MASTHEAD = {
  table: "Dan's Shed",
  fixtures: 'Fixtures',
  clubs: 'Clubs',
  wall: 'The Wall',
  shed: 'The Shed',
};

export default function App() {
  const [tab, setTab] = useState('table');
  const { state, act, synced, unsaved } = useSharedState();
  const { fixtures, loading, error, refresh, lastFetched, espnState } = useEnglandFixtures();
  const { assignments, manualMedals, bonusPoints } = state;
  const participants = Object.keys(assignments);

  const ladder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );

  const [whoAmI, setWhoAmI] = useState(() => {
    try { return localStorage.getItem('epl_whoami') || ''; } catch { return ''; }
  });
  const [showWho, setShowWho] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
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
    else if (showSquad) setShowSquad(false);
    else if (teamSheet) setTeamSheet(null);
    else if (matchSheet) setMatchSheet(null);
  };
  const closeTop = useCallback(() => closeTopRef.current(), []);
  useDismissable(Boolean(showWho || showSquad || teamSheet || matchSheet), closeTop);

  const word = MASTHEAD[tab] || MASTHEAD.table;
  const owed = unanswered(state.polls, whoAmI).length;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-top">
          <div className="masthead-word">{word}</div>
          <button
            className="masthead-issue"
            onClick={() => (whoAmI && assignments[whoAmI] ? setShowSquad(true) : setShowWho(true))}
          >
            {whoAmI || 'Who are you?'}
          </button>
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
            bonusPoints={bonusPoints}
            whoAmI={whoAmI}
            onSelectTeam={setTeamSheet}
            onOpenMatch={setMatchSheet}
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
          <Tables
            fixtures={fixtures}
            assignments={assignments}
            manualMedals={manualMedals}
            bonusPoints={bonusPoints}
            onSelectTeam={setTeamSheet}
          />
        )}
        {tab === 'wall' && (
          <Wall state={state} act={act} whoAmI={whoAmI} synced={synced} />
        )}
        {tab === 'shed' && (
          <Shed
            state={state}
            act={act}
            synced={synced}
            unsaved={unsaved}
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

      {showSquad && (
        <MySquad
          who={whoAmI}
          ladder={ladder}
          fixtures={fixtures}
          onSelectTeam={setTeamSheet}
          onChangeUser={() => { setShowSquad(false); setShowWho(true); }}
          onClose={() => setShowSquad(false)}
        />
      )}

      {matchSheet && (
        <MatchSheet
          /* Resolved fresh out of the current list rather than the object that
             was captured on tap. Holding the snapshot meant a sheet opened on a
             live match never saw the goal go in, never reached Full time, and
             kept re-fetching the ESPN summary every minute for as long as it
             stayed open. */
          fixture={fixtures.find((f) => f.id === matchSheet.id) || matchSheet}
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
          manualMedals={manualMedals}
          bonusPoints={bonusPoints}
          onClose={() => setTeamSheet(null)}
          onSelectTeam={setTeamSheet}
          onOpenMatch={(f) => { setTeamSheet(null); setMatchSheet(f); }}
        />
      )}

      <Navigation tab={tab} setTab={setTab} dots={{ shed: owed > 0 }} />
    </div>
  );
}
