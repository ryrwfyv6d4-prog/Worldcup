import { useMemo } from 'react';
import { buildLadder, maxForPlayer, todayPoints, feedEvents } from '../utils/scoring.js';
import { buildDispatch } from '../utils/dispatch.js';
import { RANKS, MEDALS, getTeam, ENTRY_FEE, PAYOUTS } from '../data/england2027.js';

export default function Leaderboard({ assignments, fixtures }) {
  const ladder = useMemo(() => buildLadder(assignments, fixtures), [assignments, fixtures]);
  const dispatch = useMemo(() => buildDispatch(assignments, fixtures), [assignments, fixtures]);
  const feed = useMemo(() => feedEvents(assignments, fixtures, 15), [assignments, fixtures]);

  if (!ladder.length) {
    return (
      <div className="panel">
        <h2 className="panel-title">The Front</h2>
        <p className="muted">No troops in the field yet — run Conscription (HQ tab) first.</p>
      </div>
    );
  }

  const pot = ladder.length * ENTRY_FEE;
  const leaderTotal = ladder[0].total;
  const anyPoints = leaderTotal > 0;

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

      {ladder.map((row, i) => {
        const max = maxForPlayer(row.name, assignments, fixtures);
        const today = todayPoints(row.name, assignments, fixtures);
        const cooked = anyPoints && max < leaderTotal;
        const frontRunner = anyPoints && i === 0;
        return (
          <div className="card lb-card" key={row.name}>
            <div className="lb-head">
              <span className="lb-pos">{i + 1}</span>
              <span className="lb-name">{row.name}</span>
              {frontRunner && <span className="badge badge-front">FRONT RUNNER</span>}
              {cooked && <span className="badge badge-cooked">MIA</span>}
              <span className="lb-rank">{RANKS[i] || 'Private'}</span>
              <span className="lb-right">
                <span className="lb-pts">{row.total}<small>pts</small></span>
                {today > 0 && <span className="lb-today">+{today} today</span>}
                {!cooked && <span className="lb-max">max {max}</span>}
              </span>
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
        );
      })}

      {dispatch && (
        <div className="card dispatch-card">
          <div className="dispatch-title">📻 {dispatch.title}</div>
          {dispatch.lines.map((l, i) => <p className="dispatch-line" key={i}>{l}</p>)}
        </div>
      )}

      {feed.length > 0 && (
        <div className="card">
          <h3>Latest from the front</h3>
          {feed.map((e, i) => {
            const info = getTeam(e.team);
            const isHome = e.fixture.homeTeam.name === e.team;
            const opp = isHome ? e.fixture.awayTeam.name : e.fixture.homeTeam.name;
            const oppInfo = getTeam(opp);
            const my = isHome ? e.fixture.score.home : e.fixture.score.away;
            const their = isHome ? e.fixture.score.away : e.fixture.score.home;
            return (
              <div className="feed-row" key={i}>
                <span className={`pip pip-${e.result.toLowerCase()}`}>{e.result}</span>
                <span className="feed-text">
                  {info?.short} {my}–{their} {oppInfo?.short}
                  <em> {e.owner}</em>
                </span>
                <span className={`feed-pts ${e.pts > 0 ? 'gain' : ''}`}>{e.pts > 0 ? `+${e.pts}` : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
