import { useState } from 'react';
import Draw from './Draw.jsx';
import Regiments from './Regiments.jsx';
import Honours from './Honours.jsx';
import Rules from './Rules.jsx';
import Campaign from './Campaign.jsx';

// Everything that isn't a live screen: the draw, the rules, the monthly prize,
// the club list, hand-awarded honours, and the council of war.
const VIEWS = [
  { key: 'rules', label: 'Rules' },
  { key: 'draw', label: 'Draw' },
  { key: 'months', label: 'Months' },
  { key: 'clubs', label: 'Club list' },
  { key: 'honours', label: 'Honours' },
  { key: 'polls', label: 'Votes' },
];

function Polls({ state, update, who }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState('');
  const create = () => {
    const question = q.trim();
    const options = opts.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2 || !who) return;
    update((s) => ({ polls: [{ id: Date.now(), person: who, q: question, options, votes: {}, ts: Date.now() }, ...s.polls] }));
    setQ(''); setOpts('');
  };
  const vote = (pollId, idx) => {
    if (!who) return;
    update((s) => ({
      polls: s.polls.map((p) => p.id === pollId
        ? { ...p, votes: { ...p.votes, [who]: p.votes[who] === idx ? undefined : idx } }
        : p),
    }));
  };
  return (
    <>
      <div className="card">
        <h3>Put it to the shed</h3>
        <input className="poll-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="The question…" disabled={!who} />
        <textarea className="wall-input" rows="3" value={opts} onChange={(e) => setOpts(e.target.value)}
          placeholder={'One option per line\nAye\nNay'} disabled={!who} />
        <button className="btn btn-primary" onClick={create} disabled={!who || !q.trim()}>Open the vote</button>
      </div>
      {state.polls.length === 0 && <p className="muted small">Nothing to vote on.</p>}
      {state.polls.map((p) => {
        const counts = p.options.map((_, i) => Object.values(p.votes).filter((v) => v === i).length);
        const total = counts.reduce((a, b) => a + b, 0);
        return (
          <div className="card" key={p.id}>
            <div className="wall-meta"><b>{p.person}</b><span>asks</span></div>
            <h3>{p.q}</h3>
            {p.options.map((o, i) => (
              <button key={i} className={`poll-opt ${p.votes[who] === i ? 'mine' : ''}`} onClick={() => vote(p.id, i)}>
                <span className="poll-bar" style={{ width: total ? `${(counts[i] / total) * 100}%` : 0 }} />
                <span className="poll-label">{o}</span>
                <span className="poll-count">{counts[i]}</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

export default function Shed({
  state, update, synced, whoAmI, onChangeUser, fixtures, lastFetched, refresh, espnState,
}) {
  const [view, setView] = useState('rules');

  return (
    <div className="page">
      <div className="seg-row">
        {VIEWS.map((v) => (
          <button key={v.key} className={`seg ${view === v.key ? 'on' : ''}`} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <p className="muted small" style={{ paddingTop: 10 }}>
        {synced ? 'Shared with the whole shed' : 'This device only'}
        {lastFetched && ` · updated ${new Date(lastFetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
        {' · '}
        <button className="team-btn" onClick={refresh} style={{ textDecoration: 'underline' }}>refresh</button>
        {whoAmI && (
          <>
            {' · '}
            <button className="team-btn" onClick={onChangeUser} style={{ textDecoration: 'underline' }}>
              not {whoAmI}?
            </button>
          </>
        )}
        <span className="signals">
          {espnState?.ok === true && `Live scores connected · ${espnState.count} match${espnState.count === 1 ? '' : 'es'} in window`}
          {espnState?.ok === false && 'Live scores unreachable — results still land from the league feed'}
          {espnState?.ok == null && 'Live scores: checking…'}
          {espnState?.unmatched?.length > 0 && (
            <span className="signals-warn"> · unrecognised: {espnState.unmatched.join(', ')}</span>
          )}
        </span>
      </p>

      {view === 'rules' && <Rules playerCount={Object.keys(state.assignments).length} />}
      {view === 'draw' && (
        <Draw
          assignments={state.assignments}
          setAssignments={(a) => update({ assignments: a })}
          drawLocked={state.drawLocked}
          setDrawLocked={(v) => update({ drawLocked: v })}
        />
      )}
      {view === 'months' && <Campaign assignments={state.assignments} fixtures={fixtures} />}
      {view === 'clubs' && <Regiments assignments={state.assignments} />}
      {view === 'honours' && <Honours state={state} update={update} />}
      {view === 'polls' && <Polls state={state} update={update} who={whoAmI} />}
    </div>
  );
}
