import { useState } from 'react';

// How many entries stand on the page before the reader asks for the rest.
// A full match runs to about 105 lines, which is far too long to open cold.
const PAGE = 40;

// Text-only marks, in the same vocabulary as the report timeline
const MARK = {
  goal: '⚽',
  own: '⚽',
  yellow: '▮',
  red: '▮',
  sub: '⇄',
  note: '•',
};

// The feed's `kind` is a label like 'Goal' or 'Yellow Card' when the provider
// gives one. When it does not, fall back to a tight read of the text: loose
// matching turns every "goal kick" into a goal, so the patterns stay narrow
// and anything unsure lands on the generic mark.
function classify(kind, text) {
  const k = String(kind || '').toLowerCase();
  if (k) {
    if (k.includes('own')) return 'own';
    if (k.includes('miss') || k.includes('saved')) return 'note';
    if (k.includes('goal') || k.includes('scored')) return 'goal';
    if (k.includes('yellow') || k.includes('booking') || k.includes('booked')) return 'yellow';
    if (k.includes('red') || k.includes('sent off') || k.includes('dismiss')) return 'red';
    if (k.includes('sub')) return 'sub';
  }
  const t = String(text || '').toLowerCase();
  if (t.includes('own goal')) return 'own';
  if (t.includes('substitution')) return 'sub';
  if (t.includes('yellow card')) return 'yellow';
  if (t.includes('red card')) return 'red';
  if (t.includes('goal!')) return 'goal';
  return 'note';
}

export default function Commentary({ items, state, played }) {
  const [all, setAll] = useState(false);

  // Real feeds arrive half-built: null rows, rows with a minute and no words.
  // Anything without something to read is not worth a line.
  const feed = (Array.isArray(items) ? items : [])
    .filter((it) => it && String(it.text || it.kind || '').trim());

  if (!feed.length) {
    const msg = state === 'loading' ? 'Loading…'
      : state === 'error' ? 'Commentary could not be loaded for this match.'
      : played ? 'Commentary is not available for this match.'
      : 'Commentary starts once the match kicks off.';
    return <div className="mp-pane"><p className="muted small mp-empty">{msg}</p></div>;
  }

  const shown = all ? feed : feed.slice(0, PAGE);
  const more = feed.length - shown.length;

  return (
    <div className="mp-pane">
      <div className="cm-head">
        Newest first · {feed.length} {feed.length === 1 ? 'entry' : 'entries'}
      </div>

      <div className="cm-feed">
        {shown.map((it, i) => {
          const isKey = !!it.key;
          const mark = classify(it.kind, it.text);
          return (
            <div className={`cm-row ${isKey ? 'cm-key' : ''}`} key={i}>
              <span className="cm-min">{it.minute || ''}</span>
              <span className={`cm-mark cm-${mark}`} aria-hidden="true">
                {isKey ? MARK[mark] || MARK.note : ''}
              </span>
              <span className="cm-text">
                {isKey && it.kind ? <span className="cm-kind">{it.kind}</span> : null}
                {it.text || it.kind}
              </span>
            </div>
          );
        })}
      </div>

      {more > 0 && (
        <button className="btn cm-more" onClick={() => setAll(true)}>
          Show all · {more} more
        </button>
      )}
      {all && feed.length > PAGE && (
        <p className="cm-foot">Kick-off to full time</p>
      )}
    </div>
  );
}
