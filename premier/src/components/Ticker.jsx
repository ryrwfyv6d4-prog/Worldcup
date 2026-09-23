import { useMemo } from 'react';
import { getTeam } from '../data/england2027.js';
import { ownerOf } from '../utils/format.js';

// A strip of match chips under the header: live games while they're on, the
// last day's results otherwise, nothing between rounds. Swipe along it, tap a
// chip to open the match. Your own clubs' games come first.
export default function Ticker({ fixtures, assignments, whoAmI, onOpenMatch }) {
  const { live, items } = useMemo(() => {
    const since = Date.now() - 24 * 3600 * 1000;
    const mine = new Set((assignments?.[whoAmI] || []).filter(Boolean));
    const isMine = (f) => mine.has(f.homeTeam.name) || mine.has(f.awayTeam.name);
    const liveNow = fixtures.filter((f) => f.status === 'IN_PLAY');
    const pool = liveNow.length
      ? liveNow
      : fixtures.filter((f) => f.status === 'FINISHED' && f.utcDate && Date.parse(f.utcDate) > since);
    const sorted = [...pool].sort((a, b) => (isMine(b) - isMine(a)) || (b.utcDate || '').localeCompare(a.utcDate || ''));
    return { live: liveNow.length > 0, items: sorted.slice(0, 12) };
  }, [fixtures, assignments, whoAmI]);

  if (!items.length) return null;

  return (
    <div className={`strip ${live ? 'live' : ''}`} data-noswipe>
      <span className="strip-flag">{live ? <><i className="live-dot" />Live</> : 'Latest'}</span>
      {items.map((f) => {
        const h = getTeam(f.homeTeam.name), a = getTeam(f.awayTeam.name);
        const owners = [ownerOf(f.homeTeam.name, assignments), ownerOf(f.awayTeam.name, assignments)];
        const yours = whoAmI && owners.includes(whoAmI);
        return (
          <button key={f.id} className={`chip-match ${yours ? 'yours' : ''}`} onClick={() => onOpenMatch(f)}>
            <span className="cm-min">{f.status === 'IN_PLAY' ? `${f.liveClock || ''}'` : 'FT'}</span>
            <span className="cm-teams">{h?.tla || h?.short} <b>{f.score.home ?? 0}–{f.score.away ?? 0}</b> {a?.tla || a?.short}</span>
          </button>
        );
      })}
    </div>
  );
}
