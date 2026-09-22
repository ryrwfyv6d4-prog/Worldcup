import { useState } from 'react';
import Draw from './Draw.jsx';
import Regiments from './Regiments.jsx';
import Honours from './Honours.jsx';
import Rules from './Rules.jsx';
import Campaign from './Campaign.jsx';

// Everything that isn't a live screen: the votes, the rules, the monthly
// prize, hand-awarded honours, the draw and the club list.
const VIEWS = [
  { key: 'polls', label: 'Votes' },
  { key: 'rules', label: 'Rules' },
  { key: 'months', label: 'Months' },
  { key: 'honours', label: 'Honours' },
  { key: 'draw', label: 'Draw' },
  { key: 'clubs', label: 'Club list' },
];

// A poll this person hasn't voted in yet
export const unanswered = (polls, who) =>
  (who ? (polls || []).filter((p) => !(who in (p.votes || {}))) : []);

function Polls({ state, act, who }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState('');
  const [asking, setAsking] = useState(false);
  const create = () => {
    const question = q.trim();
    const options = opts.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2 || !who) return;
    act({ type: 'poll.add', poll: { id: Date.now(), person: who, q: question, options, votes: {}, ts: Date.now() } });
    setQ(''); setOpts(''); setAsking(false);
  };
  const vote = (p, idx) => {
    if (!who) return;
    act({ type: 'poll.vote', id: p.id, person: who, option: p.votes?.[who] === idx ? null : idx });
  };

  // Ones you still owe a vote on first, then newest
  const open = new Set(unanswered(state.polls, who).map((p) => p.id));
  const polls = [...state.polls].sort((a, b) => (open.has(b.id) - open.has(a.id)) || (b.ts - a.ts));

  return (
    <>
      {polls.length === 0 && <p className="muted small">Nothing to vote on.</p>}
      {polls.map((p) => {
        const votes = p.votes || {};
        const counts = p.options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
        const total = counts.reduce((a, b) => a + b, 0);
        return (
          <div className={`card ${open.has(p.id) ? 'poll-open' : ''}`} key={p.id}>
            <div className="wall-meta"><b>{p.person}</b><span>asks</span></div>
            <h3>{p.q}</h3>
            {p.options.map((o, i) => (
              <button key={i} className={`poll-opt ${votes[who] === i ? 'mine' : ''}`} onClick={() => vote(p, i)}>
                <span className="poll-bar" style={{ width: total ? `${(counts[i] / total) * 100}%` : 0 }} />
                <span className="poll-label">{o}</span>
                <span className="poll-count">{counts[i]}</span>
              </button>
            ))}
            {open.has(p.id) && <p className="muted small">You haven't voted.</p>}
          </div>
        );
      })}

      {!asking && (
        <button className="btn" onClick={() => setAsking(true)} disabled={!who}>+ Ask the shed</button>
      )}
      {asking && (
        <div className="card">
          <input className="poll-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="The question…" />
          <textarea className="wall-input" rows="3" value={opts} onChange={(e) => setOpts(e.target.value)}
            placeholder={'One option per line\nYes\nNo'} />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={create} disabled={!q.trim() || opts.split('\n').filter((o) => o.trim()).length < 2}>Open the vote</button>
            <button className="btn" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Shed({
  state, act, synced, unsaved, whoAmI, onChangeUser, fixtures, lastFetched, refresh, espnState,
  onSelectTeam,
}) {
  const [view, setView] = useState(() => (unanswered(state.polls, whoAmI).length ? 'polls' : 'rules'));
  const owed = unanswered(state.polls, whoAmI).length;
  const stamp = lastFetched && new Date(lastFetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page">
      <div className="seg-row">
        {VIEWS.map((v) => (
          <button key={v.key} className={`seg ${view === v.key ? 'on' : ''}`} onClick={() => setView(v.key)}>
            {v.label}
            {v.key === 'polls' && owed > 0 && <span className="seg-dot" aria-label={`${owed} to vote on`} />}
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
      {view === 'polls' && <Polls state={state} act={act} who={whoAmI} />}

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
      </p>
    </div>
  );
}
