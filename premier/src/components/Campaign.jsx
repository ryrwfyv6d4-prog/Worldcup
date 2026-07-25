import { monthlyRace } from '../utils/scoring.js';
import { MEDALS } from '../data/england2027.js';

// How many matches involving owned clubs fall in a given month — so an empty
// month reads as "not started yet" rather than "nobody scored".
function monthFixtureCount(fixtures, assignments, y, m) {
  const owned = new Set(Object.values(assignments).flat().filter(Boolean));
  return fixtures.filter((f) => {
    if (!f.utcDate) return false;
    const d = new Date(f.utcDate);
    if (d.getFullYear() !== y || d.getMonth() !== m) return false;
    return owned.has(f.homeTeam.name) || owned.has(f.awayTeam.name);
  }).length;
}

export default function Campaign({ assignments, fixtures }) {
  const race = monthlyRace(assignments, fixtures);
  const now = new Date();
  const drawn = Object.keys(assignments).length > 0;

  // Highlight the live month, or the next one to start if we're pre-season
  let currentIdx = race.findIndex((r) => r.y === now.getFullYear() && r.m === now.getMonth());
  if (currentIdx === -1) {
    currentIdx = race.findIndex((r) => new Date(r.y, r.m, 1) > now);
  }

  // Running medal count per player
  const tally = {};
  for (const mo of race) {
    if (!mo.over) continue;
    for (const w of mo.winners) tally[w] = (tally[w] || 0) + 1;
  }
  const tallyRows = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tours of Duty</h2>
        <span className="subtitle">Monthly medals · nine side pots · season honours</span>
      </div>
      <p className="muted">
        A Tour a month — most points in each calendar month takes the side pot.
        Nine tours, nine medals, nine chances to matter even when you're cooked.
      </p>

      {!drawn && <p className="muted">Run Conscription first — no troops, no tours.</p>}

      {drawn && (
        <>
          {tallyRows.length > 0 && (
            <div className="card">
              <h3 className="section-title">Medals so far</h3>
              {tallyRows.map(([name, n]) => (
                <div className="month-row" key={name}>
                  <span className="month-name">{name}</span>
                  <span className="month-pts">{'🎖'.repeat(n)}</span>
                </div>
              ))}
            </div>
          )}

          {race.map((mo, i) => {
            const games = monthFixtureCount(fixtures, assignments, mo.y, mo.m);
            const isCurrent = i === currentIdx;
            const notStarted = !mo.over && games > 0 && mo.rows.every((r) => r.pts === 0);
            return (
              <div className={`card month-card ${isCurrent ? 'current' : ''}`} key={mo.label}>
                <div className="month-head">
                  <span className="month-label">{mo.label}</span>
                  {mo.over && mo.winners.length > 0 && (
                    <span className="month-winner">🎖 {mo.winners.join(' & ')}</span>
                  )}
                  {mo.over && mo.winners.length === 0 && <span className="month-none">no points scored</span>}
                  {!mo.over && isCurrent && <span className="month-live">IN PROGRESS</span>}
                  {!mo.over && !isCurrent && (
                    <span className="month-none">{games} match{games === 1 ? '' : 'es'} scheduled</span>
                  )}
                </div>

                {isCurrent && notStarted && (
                  <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>
                    {games} match{games === 1 ? '' : 'es'} involving your clubs — nothing settled yet.
                  </p>
                )}

                {((isCurrent && !notStarted) || (mo.over && mo.winners.length > 0)) && (
                  <div className="month-rows">
                    {mo.rows.slice(0, isCurrent ? 10 : 3).map((r, j) => (
                      <div className="month-row" key={r.name}>
                        <span className="month-pos">{j + 1}</span>
                        <span className="month-name">{r.name}</span>
                        <span className="month-pts">{r.pts}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="card">
        <h3 className="section-title">Honours list</h3>
        {Object.entries(MEDALS).map(([k, m]) => (
          <div className="medal-row" key={k}>
            <span className="medal-label">🎖 {m.label}</span>
            <span className="medal-detail">{m.detail}</span>
            <span className="medal-pts">+{m.pts}</span>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          Tour medals are pride and a monthly side pot, agreed at the table — they don't
          add to your ladder total. Only the honours above score points.
        </p>
      </div>
    </div>
  );
}
