import { useCountUp } from '../hooks/useCountUp.js';
import { ordinal } from '../utils/format.js';
import { getTeam } from '../data/england2027.js';

// The first thing on the home screen: how you're going. Rank, points (which
// count up as they land), how far you moved this round and what it earned,
// and the gap that matters: to the top, or to whoever is chasing you.
export function Move({ up }) {
  if (!up) return <span className="move same" aria-label="no change">–</span>;
  return (
    <span className={`move ${up > 0 ? 'up' : 'down'}`} aria-label={`${up > 0 ? 'up' : 'down'} ${Math.abs(up)}`}>
      {up > 0 ? '▲' : '▼'}{Math.abs(up)}
    </span>
  );
}

export default function YouCard({ ladder, move, whoAmI, onOpenSquad, onPickName }) {
  const i = ladder.findIndex((r) => r.name === whoAmI);
  const row = ladder[i];
  const pts = useCountUp(row ? row.total : 0);

  if (!row) {
    return (
      <button className="you-card you-empty" onClick={onPickName}>
        <span>
          <b>Which one are you?</b>
          <small>Pick your name to see how you're going</small>
        </span>
        <span className="chev" aria-hidden="true">›</span>
      </button>
    );
  }

  const m = move?.[whoAmI] || {};
  const ahead = ladder[i - 1];
  const behind = ladder[i + 1];
  const gap = i === 0
    ? (behind ? `${row.total - behind.total} clear of ${behind.name}` : 'out on your own')
    : `${ahead.total - row.total} behind ${ahead.name}`;
  const best = [...row.breakdown].sort((a, b) => (b.total + b.oa.pts + b.medalPts) - (a.total + a.oa.pts + a.medalPts))[0];

  return (
    <button className="you-card" onClick={onOpenSquad}>
      <div className="you-top">
        <div>
          <div className="you-rank">
            {ordinal(i + 1)} <small>of {ladder.length}</small> {m.up ? <Move up={m.up} /> : null}
          </div>
          <div className="you-gap">{gap}</div>
        </div>
        <div className="you-pts">
          <b>{pts}</b>
          <small>points</small>
        </div>
      </div>
      <div className="you-foot">
        <span>{m.gained > 0 ? `+${m.gained} this round` : 'Nothing banked this round'}</span>
        {best && <span>Top earner: {getTeam(best.team)?.short || best.team}</span>}
        <span className="chev" aria-hidden="true">›</span>
      </div>
    </button>
  );
}
