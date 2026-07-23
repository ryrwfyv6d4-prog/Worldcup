import { useState } from 'react';
import Draw from './Draw.jsx';

function useWhoAmI(participants) {
  const [who, setWho] = useState(() => {
    try { return localStorage.getItem('epl_whoami') || ''; } catch { return ''; }
  });
  const save = (name) => {
    setWho(name);
    try { localStorage.setItem('epl_whoami', name); } catch { /* ignore */ }
  };
  return [who, save, participants];
}

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
          placeholder={who ? 'Post to the mess hall…' : 'Report in first (pick your name above)'}
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
        <h3>Call a council of war</h3>
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

export default function HQ({ state, update, synced }) {
  const [view, setView] = useState('wall');
  const participants = Object.keys(state.assignments);
  const [who, setWho] = useWhoAmI(participants);

  return (
    <div className="panel">
      <h2 className="panel-title">HQ</h2>

      <div className="card whoami">
        <span className="whoami-label">Reporting in as</span>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">— pick your name —</option>
          {participants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {!synced && <span className="sync-note">offline preview — visible only on this device</span>}
      </div>

      <div className="seg-row">
        <button className={`seg ${view === 'wall' ? 'on' : ''}`} onClick={() => setView('wall')}>The Wall</button>
        <button className={`seg ${view === 'polls' ? 'on' : ''}`} onClick={() => setView('polls')}>War Council</button>
        <button className={`seg ${view === 'draw' ? 'on' : ''}`} onClick={() => setView('draw')}>Conscription</button>
      </div>

      {view === 'wall' && <Wall state={state} update={update} who={who} />}
      {view === 'polls' && <Polls state={state} update={update} who={who} />}
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
