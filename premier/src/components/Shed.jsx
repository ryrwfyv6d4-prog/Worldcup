import { useState } from 'react';
import Draw from './Draw.jsx';
import Regiments from './Regiments.jsx';
import Honours from './Honours.jsx';
import Rules from './Rules.jsx';
import Campaign from './Campaign.jsx';
import GoalAlerts from './GoalAlerts.jsx';

// Everything that isn't a live screen: the rules, the monthly prize,
// hand-awarded honours, the draw and the club list. Reached from the ⋯ button.
const VIEWS = [
  { key: 'rules', label: 'Rules' },
  { key: 'months', label: 'Months' },
  { key: 'honours', label: 'Honours' },
  { key: 'draw', label: 'Draw' },
  { key: 'clubs', label: 'Club list' },
];

export default function Shed({
  state, act, synced, unsaved, whoAmI, onChangeUser, fixtures, lastFetched, refresh, espnState,
  onSelectTeam,
}) {
  const [view, setView] = useState('rules');
  const stamp = lastFetched && new Date(lastFetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page">
      <GoalAlerts who={whoAmI} />
      <div className="seg-row">
        {VIEWS.map((v) => (
          <button key={v.key} className={`seg ${view === v.key ? 'on' : ''}`} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'rules' && <Rules playerCount={Object.keys(state.assignments).length} />}
      {view === 'draw' && (
        <Draw
          assignments={state.assignments}
          drawLocked={state.drawLocked}
          act={act}
          who={whoAmI}
        />
      )}
      {view === 'months' && <Campaign assignments={state.assignments} fixtures={fixtures} />}
      {view === 'clubs' && <Regiments assignments={state.assignments} onSelectTeam={onSelectTeam} />}
      {view === 'honours' && <Honours state={state} act={act} who={whoAmI} />}

      {/* One quiet line at the foot: who you are, whether it's saved, and
          whether the scores are live. Only says more when something is wrong. */}
      <p className="muted small shed-foot">
        {whoAmI && (
          <button className="team-btn link" onClick={onChangeUser}>Not {whoAmI}?</button>
        )}
        {whoAmI && ' · '}
        {!synced ? 'This device only' : unsaved ? `${unsaved} change${unsaved === 1 ? '' : 's'} waiting for signal` : 'Saved'}
        {stamp && ` · scores ${stamp}`}
        {' · '}
        <button className="team-btn link" onClick={refresh}>refresh</button>
        {espnState?.ok === false && <span className="signals-warn"> · live scores unreachable</span>}
        {espnState?.missing?.length > 0 && (
          <span className="signals-warn"> · no answer from {espnState.missing.join(', ')}</span>
        )}
        {espnState?.unmatched?.length > 0 && (
          <span className="signals-warn"> · unrecognised: {espnState.unmatched.join(', ')}</span>
        )}
        <br />
        Version {new Date(__BUILT__).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
