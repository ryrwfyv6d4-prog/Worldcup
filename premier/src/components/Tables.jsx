import { useMemo, useState } from 'react';
import { leagueTable, formForTeam, TABLE_MODES } from '../utils/scoring.js';
import { getTeam, SCORING } from '../data/england2027.js';
import Crest from './Crest.jsx';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

// Zone per 1-indexed position
function zoneFor(div, pos) {
  if (div === 1) {
    if (pos <= 4) return 'up';       // DSO places
    if (pos >= 18) return 'drop';    // relegation
    return '';
  }
  if (pos <= 2) return 'up';         // automatic promotion
  if (pos <= 6) return 'play';       // play-offs
  if (pos >= 22) return 'drop';      // relegation
  return '';
}

export default function Tables({ fixtures, assignments, onSelectTeam }) {
  const [div, setDiv] = useState(1);
  const [mode, setMode] = useState('all');

  // The real table always exists; splits are a second view of the same data
  const overall = useMemo(() => leagueTable(fixtures, div, 'all'), [fixtures, div]);
  const started = overall.some((r) => r.p > 0);
  const effectiveMode = started ? mode : 'all';
  const shown = useMemo(
    () => (effectiveMode === 'all' ? overall : leagueTable(fixtures, div, effectiveMode)),
    [fixtures, div, effectiveMode, overall]
  );
  const realPos = (team) => overall.findIndex((r) => r.team === team) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <h2>The Map Room</h2>
        <span className="subtitle">The real tables. Tap a regiment for its file.</span>
      </div>

      <div className="seg-row">
        <button className={`seg ${div === 1 ? 'on' : ''}`} onClick={() => setDiv(1)}>Premier League</button>
        <button className={`seg ${div === 2 ? 'on' : ''}`} onClick={() => setDiv(2)}>Championship</button>
      </div>

      {started && (
        <div className="seg-row">
          {TABLE_MODES.map((m) => (
            <button
              key={m.key}
              className={`seg seg-sm ${mode === m.key ? 'on' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {!started && (
        <p className="muted small preseason-note">
          Pre-season. No matches played, so this is the bookies' pecking order, not a table.
          Zones, and the home, away and form splits, light up once results land.
        </p>
      )}

      <div className="zone-legend">
        {div === 1 ? (
          <>
            <span className="zl up">Top 4 — DSO medal (+{8})</span>
            <span className="zl drop">Bottom 3 — relegated</span>
          </>
        ) : (
          <>
            <span className="zl up">Top 2 — promoted (+{10})</span>
            <span className="zl play">3–6 — play-offs</span>
            <span className="zl drop">Bottom 3 — demoted</span>
          </>
        )}
      </div>

      <div className="card table-card">
        <table className="league-table">
          <thead>
            <tr>
              <th>#</th><th className="tl">Team</th>
              <th>P</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
              <th>Tip</th><th className="tl">Form</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const info = getTeam(r.team);
              const owner = ownerOf(r.team, assignments);
              const pos = i + 1;
              const form = formForTeam(r.team, fixtures);
              const gained = info && overall.find((x) => x.team === r.team)?.p >= SCORING.OVERACHIEVE_MIN_GAMES
                && info.rank > realPos(r.team)
                ? info.rank - realPos(r.team) : 0;
              return (
                <tr key={r.team} className={started && effectiveMode === 'all' ? zoneFor(div, pos) : ''}>
                  <td>{pos}</td>
                  <td className="tl team-cell">
                    <button className="team-btn tbl-team" onClick={() => onSelectTeam && onSelectTeam(r.team)}>
                      <Crest team={r.team} size={18} />
                      {info ? info.short : r.team}
                    </button>
                    {owner && <em className="team-co">{owner}</em>}
                  </td>
                  <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                  <td>{r.gf}</td><td>{r.ga}</td>
                  <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pts">{r.pts}</td>
                  <td className={gained > 0 ? 'oa-good' : ''}>
                    {gained > 0 ? `+${gained}` : (info ? info.rank : '—')}
                  </td>
                  <td className="tl form-cell">
                    {form.length
                      ? form.slice(0, 5).reverse().map((x, j) => <span key={j} className={`pip pip-${x.toLowerCase()}`}>{x}</span>)
                      : <span className="pip-none">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted small">
        Swipe the table sideways for the full stats. The name under each club is its
        commanding officer. <b>Tip</b> is where the bookies tipped them, turning green with
        places gained once six games are played, worth +{SCORING.OVERACHIEVE} each.
        {effectiveMode !== 'all' && ' Zones and Tip always reflect the real overall table.'}
      </p>
    </div>
  );
}
