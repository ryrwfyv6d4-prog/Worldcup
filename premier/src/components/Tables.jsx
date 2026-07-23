import { useState } from 'react';
import { leagueTable } from '../utils/scoring.js';
import { getTeam } from '../data/england2027.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

export default function Tables({ fixtures, assignments }) {
  const [div, setDiv] = useState(1);
  const table = leagueTable(fixtures, div);
  const relegationFrom = div === 1 ? 18 : 22; // 1-indexed positions in the drop
  const promotionTo = div === 2 ? 2 : 0;

  return (
    <div className="panel">
      <h2 className="panel-title">The Map Room</h2>
      <div className="seg-row">
        <button className={`seg ${div === 1 ? 'on' : ''}`} onClick={() => setDiv(1)}>Premier League</button>
        <button className={`seg ${div === 2 ? 'on' : ''}`} onClick={() => setDiv(2)}>Championship</button>
      </div>
      <div className="card table-card">
        <table className="league-table">
          <thead>
            <tr><th>#</th><th className="tl">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const info = getTeam(r.team);
              const owner = ownerOf(r.team, assignments);
              const pos = i + 1;
              const zone = pos >= relegationFrom ? 'drop' : (promotionTo && pos <= promotionTo ? 'up' : '');
              return (
                <tr key={r.team} className={zone}>
                  <td>{pos}</td>
                  <td className="tl">
                    {info ? info.short : r.team}
                    {owner && <em className="fx-owner"> {owner}</em>}
                  </td>
                  <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                  <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pts">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        {div === 1
          ? 'Bottom three go down — Infantry owners lose their Survival Medal.'
          : 'Top two promoted (Battlefield Promotion +20). Bottom three demoted to the Pioneers.'}
      </p>
    </div>
  );
}
