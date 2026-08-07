import { useState } from 'react';
import { WALL_LINE } from '../utils/editorial.js';

// Pinned notes on the shed wall. Behaviour is unchanged from the old text wall —
// this is the programme restyle: paper prints, drawing pins, deterministic tilt.
const TILTS = [-2.5, -1, 0, 1.2, 2.5];
const PINS = ['#8A1A18', '#1B5E8A', '#1B1A16', '#C48A1E'];

const tiltFor = (id) => TILTS[Math.abs(Number(id) || 0) % TILTS.length];
const pinFor = (id) => PINS[Math.abs(Number(id) || 0) % PINS.length];

export default function Wall({ state, update, whoAmI, synced }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const posts = state.wallPosts || [];

  const post = () => {
    const t = text.trim();
    if (!t || !whoAmI) return;
    update((s) => ({
      wallPosts: [{ id: Date.now(), person: whoAmI, text: t, ts: Date.now() }, ...s.wallPosts].slice(0, 200),
    }));
    setText('');
    setAdding(false);
  };

  const remove = (id) => {
    update((s) => ({ wallPosts: s.wallPosts.filter((x) => x.id !== id) }));
    setConfirm(null);
  };

  return (
    <div className="page">
      <div className="wall-note" style={{ padding: '14px 0 0' }}>
        <span className="wall-foot-eyebrow">
          {synced ? 'Synced across the shed' : 'Stored on this device'}
        </span>
        <button className="btn" onClick={() => setAdding((v) => !v)} disabled={!whoAmI}>
          {adding ? 'Cancel' : '+ Pin a bit'}
        </button>
      </div>

      <p className="editorial">{WALL_LINE}</p>

      {adding && (
        <div className="card">
          <textarea
            className="wall-input"
            rows="3"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What happened?"
          />
          <button className="btn btn-primary" onClick={post} disabled={!text.trim()}>Pin it</button>
        </div>
      )}

      {!whoAmI && (
        <p className="muted small">Say who you are up top before pinning anything.</p>
      )}

      {posts.length === 0 && (
        <div className="empty-state"><p>Nothing on the wall yet. Someone say something regrettable.</p></div>
      )}

      <div className="wall-grid">
        {posts.map((p) => (
          <div className="print" key={p.id} style={{ transform: `rotate(${tiltFor(p.id)}deg)` }}>
            <span className="print-pin" style={{ background: pinFor(p.id) }} />
            <div className="print-body">
              {whoAmI === p.person && (
                <button
                  className="print-x"
                  style={confirm === p.id ? { color: 'var(--spot)', fontWeight: 800 } : undefined}
                  onClick={() => (confirm === p.id ? remove(p.id) : setConfirm(p.id))}
                  onBlur={() => setConfirm(null)}
                >
                  {confirm === p.id ? 'Sure?' : '✕'}
                </button>
              )}
              <p className="print-text">{p.text}</p>
              <div className="print-meta">
                <span className="print-by">{p.person}</span>
                <span className="print-date">
                  {new Date(p.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length > 0 && (
        <div className="wall-foot">
          <span className="wall-foot-eyebrow">Pinned bits</span>
          <span className="wall-foot-count">{posts.length} up</span>
        </div>
      )}
    </div>
  );
}
