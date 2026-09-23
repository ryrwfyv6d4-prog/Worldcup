import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEnglandFixtures } from './hooks/useEnglandFixtures.js';
import { useSharedState } from './hooks/useSharedState.js';
import { buildLadder } from './utils/scoring.js';
import Navigation from './components/Navigation.jsx';
import Ticker from './components/Ticker.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Fixtures from './components/Fixtures.jsx';
import Tables from './components/Tables.jsx';
import Banter from './components/Banter.jsx';
import Shed from './components/Shed.jsx';
import { unanswered } from './components/Polls.jsx';
import Sheet from './components/Sheet.jsx';
import Rules from './components/Rules.jsx';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import TeamSheet from './components/TeamSheet.jsx';
import MatchSheet from './components/MatchSheet.jsx';
import MySquad from './components/MySquad.jsx';
import { useDismissable } from './hooks/useDismissable.js';

function WhoAmIModal({ participants, onPick, onSkip }) {
  const hasRoster = participants.length > 0;
  return (
    <Sheet onClose={onSkip} title="Who are you?">
      <p className="muted">
        {hasRoster
          ? 'Your row gets marked and your posts get signed.'
          : 'Nobody drawn yet. Run the draw under More, then come back.'}
      </p>
      {hasRoster && (
        <div className="who-grid">
          {participants.map((p) => (
            <button key={p} className="who-btn" onClick={() => onPick(p)}>{p}</button>
          ))}
        </div>
      )}
      <button className="link-btn center-btn" onClick={onSkip}>
        {hasRoster ? 'Just watching' : 'Close'}
      </button>
    </Sheet>
  );
}

// Page titles
const TITLES = {
  table: "Dan's Shed",
  fixtures: 'Matches',
  clubs: 'Clubs',
  banter: 'Banter',
  more: 'More',
};

const initials = (name) => (name || '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function App() {
  const [tab, setTab] = useState('table');
  const { state, act, synced, unsaved, reload } = useSharedState();
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
  const [showRules, setShowRules] = useState(false);
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
    else if (showRules) setShowRules(false);
    else if (showSquad) setShowSquad(false);
    else if (teamSheet) setTeamSheet(null);
    else if (matchSheet) setMatchSheet(null);
  };
  const closeTop = useCallback(() => closeTopRef.current(), []);
  useDismissable(Boolean(showWho || showRules || showSquad || teamSheet || matchSheet), closeTop);

  const onRefresh = useCallback(() => Promise.all([refresh(), reload()]), [refresh, reload]);
  const { pull, busy } = usePullToRefresh(mainRef, onRefresh);
  const openMe = () => (whoAmI && assignments[whoAmI] ? setShowSquad(true) : setShowWho(true));

  const title = TITLES[tab] || TITLES.table;
  const owed = unanswered(state.polls, whoAmI).length;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="topbar-title">{title}</h1>
        <button className="me-btn" onClick={openMe} aria-label={whoAmI ? `${whoAmI}: your squad` : 'Pick your name'}>
          <span className="me-av">{whoAmI ? initials(whoAmI) : '?'}</span>
          <span className="me-name">{whoAmI || 'Who are you?'}</span>
        </button>
        <button
          className={`icon-btn ${tab === 'more' ? 'on' : ''}`}
          onClick={() => setTab(tab === 'more' ? 'table' : 'more')}
          aria-label="More"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </header>

      <Ticker fixtures={fixtures} assignments={assignments} whoAmI={whoAmI} onOpenMatch={setMatchSheet} />

      <main className="main" ref={mainRef}>
        <div className={`ptr ${busy ? 'busy' : ''}`} style={{ height: busy ? 44 : pull * 44, opacity: busy ? 1 : Math.min(pull, 1) }}>
          <span className="ptr-spin" style={{ transform: `rotate(${pull * 300}deg)` }} />
        </div>
        {error && (
          <div className="error-bar">
            <span>{error}</span>
            <button className="btn" onClick={refresh}>Retry</button>
          </div>
        )}
        {loading && fixtures.length === 0 && (
          <div className="page" aria-label="Loading">
            <div className="skel skel-card" />
            {[0, 1, 2, 3, 4, 5].map((k) => <div className="skel skel-row" key={k} />)}
          </div>
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
            onOpenSquad={openMe}
            onPickName={() => setShowWho(true)}
            onShowRules={() => setShowRules(true)}
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
        {tab === 'banter' && (
          <Banter state={state} act={act} whoAmI={whoAmI} />
        )}
        {tab === 'more' && (
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

      {showRules && (
        <Sheet title="How points work" onClose={() => setShowRules(false)}>
          <Rules playerCount={participants.length} />
        </Sheet>
      )}

      {(matchSheet || teamSheet) && <div className="sheet-dim" onClick={closeTop} />}

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

      <Navigation tab={tab} setTab={setTab} dots={{ banter: owed > 0 }} />
    </div>
  );
}
