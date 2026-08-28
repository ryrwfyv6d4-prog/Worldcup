import { useState } from 'react';

// Minute-by-minute text, newest at the top.
//
// A full match runs to about a hundred entries, most of them "Foul by X" — so
// the default view is the incidents only, with the whole feed one tap away.
// That keeps the tab useful at a glance for a settled match without throwing
// away the play-by-play for anyone actually scrolling it.
export default function CommentaryTab({ detail }) {
  const all = detail?.commentary || [];
  const keyOnly = all.filter((c) => c.key);
  const [full, setFull] = useState(false);

  // Nothing to filter down to: show the lot rather than an empty "key moments"
  const canFilter = keyOnly.length >= 3 && keyOnly.length < all.length;
  const shown = full || !canFilter ? all : keyOnly;

  return (
    <div className="mp-pane">
      {canFilter && (
        <div className="seg-row mp-comm-filter">
          <button className={`seg ${!full ? 'on' : ''}`} onClick={() => setFull(false)}>
            Key moments
          </button>
          <button className={`seg ${full ? 'on' : ''}`} onClick={() => setFull(true)}>
            Everything ({all.length})
          </button>
        </div>
      )}

      <div className="mp-comm">
        {shown.map((c) => (
          <div className={`mp-comm-row ${c.goal ? 'goal' : ''}`} key={c.seq}>
            <span className="mp-comm-min">{c.minute || '·'}</span>
            <span className="mp-comm-text">
              {c.text}
              {c.kind && c.key && <em className="mp-comm-kind">{c.kind}</em>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
