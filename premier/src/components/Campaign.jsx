import { monthlyRace } from '../utils/scoring.js';
import { MEDALS } from '../data/england2027.js';

export default function Campaign({ assignments, fixtures }) {
  const race = monthlyRace(assignments, fixtures);
  const now = new Date();
  const currentIdx = race.findIndex((r) => r.y === now.getFullYear() && r.m === now.getMonth());

  return (
    <div className="panel">
      <h2 className="panel-title">The Campaign</h2>
      <p className="muted">
        Campaign Medals — most points in each calendar month takes the monthly side pot.
        Nine months, nine medals, nine chances to matter even when you're cooked.
      </p>

      {Object.keys(assignments).length === 0 && (
        <p className="muted">Run Conscription first — no troops, no campaign.</p>
      )}

      {Object.keys(assignments).length > 0 && race.map((mo, i) => (
        <div className={`card month-card ${i === currentIdx ? 'current' : ''} ${mo.over ? 'over' : ''}`} key={mo.label}>
          <div className="month-head">
            <span className="month-label">{mo.label}</span>
            {mo.over && mo.winners.length > 0 && (
              <span className="month-winner">🎖 {mo.winners.join(' & ')}</span>
            )}
            {mo.over && mo.winners.length === 0 && <span className="month-none">no points scored</span>}
            {i === currentIdx && !mo.over && <span className="month-live">IN PROGRESS</span>}
          </div>
          {(i === currentIdx || (mo.over && mo.winners.length > 0)) && (
            <div className="month-rows">
              {mo.rows.slice(0, i === currentIdx ? 10 : 3).map((r, j) => (
                <div className="month-row" key={r.name}>
                  <span className="month-pos">{j + 1}</span>
                  <span className="month-name">{r.name}</span>
                  <span className="month-pts">{r.pts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="card">
        <h3>Honours list</h3>
        {Object.entries(MEDALS).map(([k, m]) => (
          <div className="medal-row" key={k}>
            <span className="medal-label">🎖 {m.label}</span>
            <span className="medal-detail">{m.detail}</span>
            <span className="medal-pts">+{m.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
