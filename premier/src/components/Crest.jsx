import { useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { coloursFor, inkOn } from '../data/colours.js';

// Club badge.
//
// Prefers a real crest bundled at build time (scripts/fetch-crests.mjs pulls
// them during deploy, where the runner has network access). If the file is
// missing or fails to load we fall back to generated insignia: a shield in the
// club's colours carrying its three-letter code. That means a missing or
// changed upstream image can never leave a hole in the UI, and the installed
// app still shows something sensible with no signal.
//
// size: px height. Used at 14 (chips) up to 44 (sheet headers).
function Insignia({ info, size }) {
  const [primary, secondary] = coloursFor(info.name);
  const ink = inkOn(primary);
  return (
    <svg
      className="crest crest-generated"
      width={size * 0.86}
      height={size}
      viewBox="0 0 43 50"
      role="img"
      aria-label={info.short}
    >
      <path
        d="M2 3h39v25c0 10-9.5 16.5-19.5 20C11.5 44.5 2 38 2 28V3z"
        fill={primary}
        stroke={secondary}
        strokeWidth="2.5"
      />
      <path d="M2 15h39v5H2z" fill={secondary} opacity="0.85" />
      <text
        x="21.5" y="35" textAnchor="middle"
        fontSize="15" fontWeight="800"
        fontFamily="'Barlow Condensed', Impact, sans-serif"
        letterSpacing="0.5" fill={ink}
      >
        {info.tla}
      </text>
    </svg>
  );
}

export default function Crest({ team, size = 20, className = '' }) {
  const info = getTeam(team);
  const [failed, setFailed] = useState(false);
  if (!info) return null;
  if (failed) return <Insignia info={info} size={size} />;

  return (
    <img
      className={`crest crest-img ${className}`}
      src={`${import.meta.env.BASE_URL}crests/${info.tla}.png`}
      width={size}
      height={size}
      alt={info.short}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
