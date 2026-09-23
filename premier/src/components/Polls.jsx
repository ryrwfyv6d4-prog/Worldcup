import { useState } from 'react';

// A poll this person hasn't voted in yet
export const unanswered = (polls, who) =>
  (who ? (polls || []).filter((p) => !(who in (p.votes || {}))) : []);

export default function Polls({ state, act, who }) {
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

