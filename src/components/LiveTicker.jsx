import { useState, useEffect, useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { tla } from '../utils/tla.js';
import { normaliseTeamName } from '../utils/scoring.js';

// Slim live-score bar pinned above the bottom nav on every tab.
// Rotates through games when more than one is live.
export default function LiveTicker({ fixtures, onOpen, flash }) {
  const live = useMemo(
    () => fixtures.filter((f) => f.status === 'IN_PLAY' || f.status === 'PAUSED'),
    [fixtures]
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (live.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % live.length), 5000);
    return () => clearInterval(id);
  }, [live.length]);

  if (!live.length) return null;
  const m = live[idx % live.length];
  const home = normaliseTeamName(m.homeTeam.name);
  const away = normaliseTeamName(m.awayTeam.name);

  return (
    <button className={`live-ticker${flash ? ' flash' : ''}`} onClick={() => onOpen(m)}>
      <span className="lt-dot" />
      <span className="lt-score">
        {getFlag(home)} {tla(home)}
        <b> {m.score?.home ?? 0}–{m.score?.away ?? 0} </b>
        {tla(away)} {getFlag(away)}
      </span>
      <span className="lt-clock">{m.liveClock ? `${m.liveClock}'` : 'LIVE'}</span>
      {live.length > 1 && <span className="lt-more">+{live.length - 1}</span>}
    </button>
  );
}
