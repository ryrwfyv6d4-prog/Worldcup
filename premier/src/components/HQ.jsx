import { useState } from 'react';
import Draw from './Draw.jsx';
import Regiments from './Regiments.jsx';
import Honours from './Honours.jsx';

function Wall({ state, update, who }) {
  const [text, setText] = useState('');
  const post = () => {
    const t = text.trim();
    if (!t || !who) return;
    update((s) => ({ wallPosts: [{ id: Date.now(), person: who, text: t, ts: Date.now() }, ...s.wallPosts].slice(0, 200) }));
    setText('');
  };
  return (
    <>
      <div className="card">
        <textarea
          className="wall-input" rows="2" value={text}
          placeholder={who ? 'Post to the mess hall…' : 'Report in first (tap your name above)'}
          disabled={!who}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary" onClick={post} disabled={!who || !text.trim()}>Post dispatch</button>
      </div>
      {state.wallPosts.length === 0 && <p className="muted">Silence in the mess hall. Someone say something regrettable.</p>}
      {state.wallPosts.map((p) => (
        <div className="card wall-post" key={p.id}>
          <div className="wall-meta">
            <b>{p.person}</b>
            <span>{new Date(p.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(p.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            {who === p.person && (
              <button className="chip-x" onClick={() => update((s) => ({ wallPosts: s.wallPosts.filter((x) => x.id !== p.id) }))}>×</button>
            )}
          </div>
          <p className="wall-text">{p.text}</p>
        </div>
      ))}
    </>
  );
}

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
        <h3 className="section-title">Call a council of war</h3>
        <input className="poll-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="The question…" disabled={!who} />
        <textarea className="wall-input" rows="3" value={opts} onChange={(e) => setOpts(e.target.value)}
          placeholder={'One option per line\nAye\nNay'} disabled={!who} />
        <button className="btn btn-primary" onClick={create} disabled={!who || !q.trim()}>Open the vote</button>
      </div>
      {state.polls.length === 0 && <p className="muted">No motions before the council.</p>}
      {state.polls.map((p) => {
        const counts = p.options.map((_, i) => Object.values(p.votes).filter((v) => v === i).length);
        const total = counts.reduce((a, b) => a + b, 0);
        return (
          <div className="card" key={p.id}>
            <div className="wall-meta"><b>{p.person}</b><span>asks</span></div>
            <h3 className="section-title">{p.q}</h3>
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

export default function HQ({ state, update, synced, whoAmI, onChangeUser, lastFetched, refresh, espnState }) {
  const [view, setView] = useState('wall');

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-row">
          <h2>HQ</h2>
          <button className="ch-identity" onClick={onChangeUser}>
            {whoAmI || 'Report in'} <span className="ch-switch">switch ▾</span>
          </button>
        </div>
        <span className="subtitle">
          {synced ? 'Shared with the whole shed' : 'Offline preview — this device only'}
          {lastFetched && ` · updated ${new Date(lastFetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
          {' · '}
          <button className="team-btn" onClick={refresh} style={{ textDecoration: 'underline' }}>refresh</button>
        </span>
        <span className="subtitle signals">
          {espnState?.ok === true && `📡 Live scores connected · ${espnState.count} match${espnState.count === 1 ? '' : 'es'} in window`}
          {espnState?.ok === false && '📡 Live scores unreachable — results still land from the league feed'}
          {espnState?.ok == null && '📡 Live scores: checking…'}
          {espnState?.unmatched?.length > 0 && (
            <span className="signals-warn"> · unrecognised club{espnState.unmatched.length === 1 ? '' : 's'}: {espnState.unmatched.join(', ')}</span>
          )}
        </span>
      </div>

      <div className="seg-row">
        <button className={`seg ${view === 'wall' ? 'on' : ''}`} onClick={() => setView('wall')}>The Wall</button>
        <button className={`seg ${view === 'polls' ? 'on' : ''}`} onClick={() => setView('polls')}>War Council</button>
        <button className={`seg ${view === 'regiments' ? 'on' : ''}`} onClick={() => setView('regiments')}>Regiments</button>
        <button className={`seg ${view === 'honours' ? 'on' : ''}`} onClick={() => setView('honours')}>Honours</button>
        <button className={`seg ${view === 'draw' ? 'on' : ''}`} onClick={() => setView('draw')}>Conscription</button>
      </div>

      {view === 'wall' && <Wall state={state} update={update} who={whoAmI} />}
      {view === 'polls' && <Polls state={state} update={update} who={whoAmI} />}
      {view === 'regiments' && <Regiments assignments={state.assignments} />}
      {view === 'honours' && <Honours state={state} update={update} />}
      {view === 'draw' && (
        <Draw
          assignments={state.assignments}
          setAssignments={(a) => update({ assignments: a })}
          drawLocked={state.drawLocked}
          setDrawLocked={(v) => update({ drawLocked: v })}
        />
      )}
    </div>
  );
}
