import { useState } from 'react';
import { leagueTable, formForTeam } from '../utils/scoring.js';
import { getTeam } from '../data/england2027.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
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
  const table = leagueTable(fixtures, div);
  const started = table.some((r) => r.p > 0);

  return (
    <div className="page">
      <div className="page-header"><h2>The Map Room</h2><span className="subtitle">The real tables — tap a regiment for its file</span></div>
      <div className="seg-row">
        <button className={`seg ${div === 1 ? 'on' : ''}`} onClick={() => setDiv(1)}>Premier League</button>
        <button className={`seg ${div === 2 ? 'on' : ''}`} onClick={() => setDiv(2)}>Championship</button>
      </div>

      {!started && (
        <p className="muted small preseason-note">
          Pre-season — no matches played, so this is the bookies' pecking order, not a table.
          Promotion and relegation zones light up once results land.
        </p>
      )}

      <div className="zone-legend">
        {div === 1 ? (
          <>
            <span className="zl up">Top 4 — DSO medal (+15)</span>
            <span className="zl drop">Bottom 3 — relegated</span>
          </>
        ) : (
          <>
            <span className="zl up">Top 2 — promoted (+20)</span>
            <span className="zl play">3–6 — play-offs</span>
            <span className="zl drop">Bottom 3 — demoted</span>
          </>
        )}
      </div>

      <div className="card table-card">
        <table className="league-table">
          <thead>
            <tr><th>#</th><th className="tl">Team</th><th className="tl">CO</th><th>P</th><th>GD</th><th>Pts</th><th className="tl">Form</th></tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const info = getTeam(r.team);
              const owner = ownerOf(r.team, assignments);
              const pos = i + 1;
              const form = formForTeam(r.team, fixtures);
              return (
                <tr key={r.team} className={started ? zoneFor(div, pos) : ''}>
                  <td>{pos}</td>
                  <td className="tl team-cell"><button className="team-btn" onClick={() => onSelectTeam && onSelectTeam(r.team)}>{info ? info.short : r.team}</button></td>
                  <td className="tl owner-cell">{owner || <span className="unowned">—</span>}</td>
                  <td>{r.p}</td>
                  <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pts">{r.pts}</td>
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
      <p className="muted small">CO = commanding officer (the owner in the sweep). Unclaimed regiments show a dash.</p>
    </div>
  );
}
