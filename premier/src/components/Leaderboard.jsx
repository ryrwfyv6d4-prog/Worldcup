import { buildLadder } from '../utils/scoring.js';
import { RANKS, MEDALS, getTeam, ENTRY_FEE, PAYOUTS } from '../data/england2027.js';

export default function Leaderboard({ assignments, fixtures }) {
  const ladder = buildLadder(assignments, fixtures);
  if (!ladder.length) {
    return (
      <div className="panel">
        <h2 className="panel-title">The Front</h2>
        <p className="muted">No troops in the field yet — run Conscription first.</p>
      </div>
    );
  }

  const pot = ladder.length * ENTRY_FEE;

  return (
    <div className="panel">
      <h2 className="panel-title">The Front</h2>

      <div className="prize-row">
        {PAYOUTS.map((p) => (
          <div className="prize" key={p.key}>
            <div className="prize-amt">${Math.round(pot * p.pct)}</div>
            <div className="prize-label">{p.label}</div>
          </div>
        ))}
      </div>

      {ladder.map((row, i) => (
        <div className="card lb-card" key={row.name}>
          <div className="lb-head">
            <span className="lb-pos">{i + 1}</span>
            <span className="lb-name">{row.name}</span>
            <span className="lb-rank">{RANKS[i] || 'Private'}</span>
            <span className="lb-pts">{row.total}<small>pts</small></span>
          </div>
          <div className="lb-teams">
            {row.breakdown.map((b) => {
              const info = getTeam(b.team);
              return (
                <div className="lb-team" key={b.team}>
                  <span className={`pot-dot pot-${b.pot?.toLowerCase()}`} />
                  <span className="lb-team-name">{info ? info.short : b.team}</span>
                  <span className="lb-record">{b.w}W {b.d}D {b.l}L</span>
                  <span className="lb-team-pts">
                    {b.total + b.medalPts}
                    {b.medals.length > 0 && b.medals.map((m) => (
                      <em key={m} title={MEDALS[m].label}> 🎖</em>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
