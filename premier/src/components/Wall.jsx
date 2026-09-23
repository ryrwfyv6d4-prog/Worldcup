import { useState } from 'react';

// The group chat, newest at the top. A composer that is always there beats a
// button that opens one. Your own posts sit on the right, like every
// messaging app; swaps and honours the app posted itself read as notes.

const initials = (name) => (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
// A steady colour per person, so a glance says who's talking
const HUES = [8, 28, 145, 200, 225, 265, 300, 330, 180, 95, 50];
const hueFor = (name) => HUES[[...(name || '')].reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length];

function when(ts) {
  const d = new Date(ts);
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Wall({ state, act, whoAmI }) {
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(null);
  const posts = state.wallPosts || [];

  const post = () => {
    const t = text.trim();
    if (!t || !whoAmI) return;
    act({ type: 'wall.add', post: { id: Date.now(), person: whoAmI, text: t, ts: Date.now() } });
    setText('');
  };

  return (
    <>
      <div className="composer">
        <textarea
          rows="1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(); } }}
          placeholder={whoAmI ? 'Say something regrettable…' : 'Pick your name first'}
          disabled={!whoAmI}
        />
        <button className="composer-send" onClick={post} disabled={!text.trim() || !whoAmI} aria-label="Post">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5l2.6 7.2L14 12l-8.4 1.3z" /></svg>
        </button>
      </div>

      {posts.length === 0 && (
        <div className="empty-state"><p>Nothing here yet.</p></div>
      )}

      <div className="chat">
        {posts.map((p) => {
          const mine = whoAmI && whoAmI === p.person;
          if (p.note) {
            return <div className="chat-note" key={p.id}>{p.text} <span>{when(p.ts)}</span></div>;
          }
          return (
            <div className={`chat-row ${mine ? 'mine' : ''}`} key={p.id}>
              {!mine && (
                <span className="chat-av" style={{ background: `hsl(${hueFor(p.person)} 55% 45%)` }}>{initials(p.person)}</span>
              )}
              <div className="chat-bubble">
                {!mine && <div className="chat-by">{p.person}</div>}
                <div className="chat-text">{p.text}</div>
                <div className="chat-meta">
                  {when(p.ts)}
                  {mine && (
                    <button
                      className={`chat-del ${confirm === p.id ? 'sure' : ''}`}
                      onClick={() => (confirm === p.id ? (act({ type: 'wall.remove', id: p.id }), setConfirm(null)) : setConfirm(p.id))}
                      onBlur={() => setConfirm(null)}
                    >
                      {confirm === p.id ? 'Delete?' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
