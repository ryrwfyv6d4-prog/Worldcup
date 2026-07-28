import { getTeam } from '../data/england2027.js';
import { coloursFor, inkOn } from '../data/colours.js';

// Regiment insignia: a shield in the club's colours carrying its three-letter
// code. Drawn inline so it costs no request, survives offline, and scales
// cleanly at every size we use it.
//
// size: px height. Used at 14 (chips) up to 44 (sheet headers).
export default function Crest({ team, size = 20, className = '' }) {
  const info = getTeam(team);
  if (!info) return null;
  const [primary, secondary] = coloursFor(info.name);
  const ink = inkOn(primary);
  const w = size * 0.86;

  return (
    <svg
      className={`crest ${className}`}
      width={w}
      height={size}
      viewBox="0 0 43 50"
      role="img"
      aria-label={info.short}
    >
      {/* shield */}
      <path
        d="M2 3h39v25c0 10-9.5 16.5-19.5 20C11.5 44.5 2 38 2 28V3z"
        fill={primary}
        stroke={secondary}
        strokeWidth="2.5"
      />
      {/* accent bar, so two-colour clubs read as themselves */}
      <path d="M2 15h39v5H2z" fill={secondary} opacity="0.85" />
      <text
        x="21.5"
        y="35"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fontFamily="'Barlow Condensed', Impact, sans-serif"
        letterSpacing="0.5"
        fill={ink}
      >
        {info.tla}
      </text>
    </svg>
  );
}
