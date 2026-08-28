import { useMemo, useState, useEffect, useRef } from 'react';
import { leagueTable } from '../../utils/scoring.js';
import { clubLabel } from '../../utils/teamMatch.js';
import Stripe from '../Stripe.jsx';

const MODES = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
];

// The league table with these two clubs picked out.
//
// Built from the app's own fixture feed rather than the table the match feed
// ships alongside the summary. Two tables from two sources would eventually
// disagree, and the one on the Clubs tab is the one the sweep is scored off —
// so this is that table, filtered, not a second opinion.
export default function StandingsTab({ fixtures, division, sides, onSelectTeam }) {
  const [mode, setMode] = useState('all');
  const rows = useMemo(
    () => leagueTable(fixtures, division, mode),
    [fixtures, division, mode]
  );
  const inMatch = new Set([sides[0].name, sides[1].name]);

  // Twenty-four rows is a lot of scrolling to find the two clubs you came for.
  // Bring the higher of the pair into view once the table is drawn — but only
  // if it is below the fold, so a club sitting second does not pull the tab
  // header off the top of the screen.
  const firstRef = useRef(null);
  useEffect(() => {
    const el = firstRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.top > window.innerHeight - 120) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [mode]);

  let marked = false;
  return (
    <div className="mp-pane">
      <div className="seg-row">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`seg ${mode === m.key ? 'on' : ''}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mp-tbl">
        <div className="mp-tbl-head">
          <span className="c-pos">#</span>
          <span className="c-club">Club</span>
          <span>P</span><span>W</span><span>D</span><span>L</span>
          <span>GD</span><span className="c-pts">Pts</span>
        </div>
        {rows.map((r, i) => {
          const here = inMatch.has(r.team);
          const first = here && !marked;
          if (first) marked = true;
          return (
          <button
            className={`mp-tbl-row ${here ? 'here' : ''}`}
            key={r.team}
            ref={first ? firstRef : null}
            onClick={() => onSelectTeam && onSelectTeam(r.team)}
          >
            <span className="c-pos">{i + 1}</span>
            <span className="c-club">
              <Stripe team={r.team} variant="tbl" />
              {clubLabel(r.team)}
            </span>
            <span>{r.p}</span><span>{r.w}</span><span>{r.d}</span><span>{r.l}</span>
            <span>{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            <span className="c-pts">{r.pts}</span>
          </button>
          );
        })}
      </div>
      <p className="muted small">
        {mode === 'all'
          ? 'Full table, every match played so far.'
          : `Points won at ${mode} only.`}
      </p>
    </div>
  );
}
