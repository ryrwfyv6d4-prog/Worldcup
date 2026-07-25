import { useMemo, useState } from 'react';
import { buildLadder, computeOutlook, todayPoints, feedEvents } from '../utils/scoring.js';
import { buildDispatch } from '../utils/dispatch.js';
import { MEDALS, getTeam, ENTRY_FEE, PAYOUTS } from '../data/england2027.js';
import MyWeekend, { PreSeason } from './MyWeekend.jsx';
import NextFive from './NextFive.jsx';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Ladder as it stood a week ago — for movement arrows
function previousLadder(assignments, fixtures, manualMedals) {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const prev = fixtures.map((f) =>
    f.status === 'FINISHED' && f.utcDate && new Date(f.utcDate).getTime() > cutoff
      ? { ...f, status: 'SCHEDULED', score: { home: null, away: null, winner: null } }
      : f
  );
  return buildLadder(assignments, prev, manualMedals);
}

export default function Leaderboard({
  assignments, fixtures, manualMedals, whoAmI, onChangeUser, onSelectTeam, onOpenMatch,
}) {
  const ladder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals),
    [assignments, fixtures, manualMedals]
  );
  const outlook = useMemo(
    () => computeOutlook(assignments, fixtures, manualMedals),
    [assignments, fixtures, manualMedals]
  );
  const prevRanks = useMemo(() => {
    const prev = previousLadder(assignments, fixtures, manualMedals);
    return Object.fromEntries(prev.map((r, i) => [r.name, i]));
  }, [assignments, fixtures, manualMedals]);
  const dispatch = useMemo(() => buildDispatch(assignments, fixtures), [assignments, fixtures]);
  const feed = useMemo(() => feedEvents(assignments, fixtures, 12), [assignments, fixtures]);
  const [expanded, setExpanded] = useState(null);

  const anyFinished = fixtures.some((f) => f.status === 'FINISHED');

  if (!ladder.length) {
    return (
      <div className="page">
        <div className="page-header"><h2>The Front</h2></div>
        <PreSeason />
        <div className="empty-state">
          <div className="empty-icon">📯</div>
          <p>No troops in the field. Run Conscription in HQ.</p>
        </div>
      </div>
    );
  }

  const pot = ladder.length * ENTRY_FEE;
  const hasResults = ladder[0].total > 0;
  const meIdx = ladder.findIndex((r) => r.name === whoAmI);
  const me = meIdx >= 0 ? ladder[meIdx] : null;
  const myToday = me ? todayPoints(me.name, assignments, fixtures) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2>The Front</h2>
        <span className="subtitle">Two divisions · one ladder · {ladder.length} conscripts</span>
      </div>

      {!anyFinished && <PreSeason />}

      {me && (
        <MyWeekend
          player={me.name}
          assignments={assignments}
          fixtures={fixtures}
          onOpenMatch={onOpenMatch}
        />
      )}

      <section className="pot-strip">
        <div className="pot-head">
          <span className="pot-sub">${ENTRY_FEE} a head · ${pot} in the tin</span>
        </div>
        <div className="pot-prizes">
          {PAYOUTS.map((p) => (
            <div key={p.key} className="pot-prize">
              <span className="pot-amt">${Math.round(pot * p.pct)}</span>
              <span className="pot-lab">{p.label}</span>
              <span className="pot-holder">
                {hasResults ? (p.key === 'first' ? ladder[0].name : p.key === 'second' ? ladder[1]?.name : ladder[ladder.length - 1].name) : '—'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {me && (
        <section className="ch-card">
          <button className="ch-identity" onClick={onChangeUser}>
            {me.name} <span className="ch-switch">switch ▾</span>
          </button>
          <div className="ch-top">
            <div className="ch-rank">
              <span className="pos">{meIdx + 1}</span>
              <span className="ord">{ordinal(meIdx + 1).toUpperCase()} PLACE</span>
            </div>
            <div className="ch-stats">
              <div className="hstat"><b>{me.total}</b><span>Points</span></div>
              {myToday > 0 && <div className="hstat gain"><b>+{myToday}</b><span>Today</span></div>}
              <div className="hstat">
                <b>{meIdx === 0 ? (me.total - (ladder[1]?.total ?? 0)) : ladder[0].total - me.total}</b>
                <span>{meIdx === 0 ? 'Clear' : 'Off lead'}</span>
              </div>
              {outlook[me.name] && (
                <div className="hstat"><b>{outlook[me.name].projected}</b><span>Projected</span></div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="leaderboard">
        {ladder.map((row, i) => {
          const o = outlook[row.name] || {};
          const today = todayPoints(row.name, assignments, fixtures);
          const prevIdx = prevRanks[row.name];
          const delta = prevIdx != null ? prevIdx - i : 0;
          const isMe = row.name === whoAmI;
          const isExpanded = expanded === row.name;
          return (
            <div
              key={row.name}
              className={`lb-row ${isMe ? 'me' : ''}`}
              onClick={() => setExpanded(isExpanded ? null : row.name)}
            >
              <div className="lb-main">
                <span className="rank-block">
                  <span className={`rosette ${i < 3 ? 'gold' : ''}`}>{i + 1}</span>
                  {hasResults && (
                    delta > 0 ? <span className="lb-delta up">▲{delta}</span>
                    : delta < 0 ? <span className="lb-delta down">▼{-delta}</span>
                    : <span className="lb-delta flat">–</span>
                  )}
                </span>
                <div className="lb-info">
                  <span className="lb-name">
                    {row.name}
                    {isMe && <span className="tag you">YOU</span>}
                    {hasResults && i === 0 && <span className="tag front">FRONT RUNNER</span>}
                    {hasResults && i === ladder.length - 1 && <span className="tag disaster">LATRINE DUTY</span>}
                    {o.cooked && <span className="tag cooked">MIA</span>}
                  </span>
                  <span className="lb-teams">
                    {row.breakdown.map((b) => {
                      const info = getTeam(b.team);
                      return (
                        <span className="team-chip" key={b.team}>
                          <span className={`pot-dot p${b.pot?.toLowerCase()}`} />
                          {info ? info.tla : b.team}
                        </span>
                      );
                    })}
                  </span>
                </div>
                <span className="lb-pts">
                  {row.total}<small>pts</small>
                  {today > 0 && <span className="lb-today">+{today} today</span>}
                  {row.oaPts > 0 && <span className="lb-oa">+{row.oaPts} vs tipped</span>}
                  {o.projected != null && <span className="lb-max">proj {o.projected}</span>}
                </span>
                <span className={`lb-chev ${isExpanded ? 'open' : ''}`}>{'▸'}</span>
              </div>
              {isExpanded && (
                <div className="lb-breakdown">
                  <table className="breakdown-table">
                    <thead>
                      <tr><th>Regiment</th><th>Record</th><th>vs prediction / honours</th><th style={{ textAlign: 'right' }}>Pts</th></tr>
                    </thead>
                    <tbody>
                      {row.breakdown.map((b) => {
                        const info = getTeam(b.team);
                        return (
                          <tr key={b.team}>
                            <td>
                              <button className="team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(b.team); }}>
                                <span className={`pot-dot p${b.pot?.toLowerCase()}`} /> {info ? info.short : b.team}
                              </button>
                            </td>
                            <td className="small-text">{b.w}W {b.d}D {b.l}L</td>
                            <td className="small-text">
                              {b.oa.live && b.oa.places > 0
                                ? <span className="oa-good">{b.oa.pos}th, tipped {b.oa.tipped} (+{b.oa.pts})</span>
                                : b.oa.live ? <span className="muted">{b.oa.pos}th, tipped {b.oa.tipped}</span> : '—'}
                              {b.medals.length > 0 && <span> · {b.medals.map((m) => MEDALS[m].label).join(', ')}</span>}
                            </td>
                            <td className="pts-cell">{b.total + b.medalPts + b.oa.pts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="lb-next">
                    {row.breakdown.map((b) => {
                      const info = getTeam(b.team);
                      return (
                        <div className="lb-next-club" key={b.team}>
                          <span className="lb-next-name">
                            <span className={`pot-dot p${b.pot?.toLowerCase()}`} /> {info ? info.short : b.team}
                          </span>
                          <NextFive team={b.team} fixtures={fixtures} n={5} compact onOpenMatch={onOpenMatch} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="lb-outlook">
                    <span>Tiebreak: {row.tb.wins} wins · {row.tb.gd > 0 ? `+${row.tb.gd}` : row.tb.gd} GD · {row.tb.gf} scored</span>
                    {o.floor != null && <span>Range {o.floor}–{o.ceiling} · projected {o.projected}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="tap-hint">👆 Tap any officer for the full record — tap a regiment for its file</div>

      {dispatch && (
        <div className="card dispatch-card mt">
          <div className="dispatch-title">📻 {dispatch.title}</div>
          {dispatch.lines.map((l, i) => <p className="dispatch-line" key={i}>{l}</p>)}
        </div>
      )}

      {feed.length > 0 && (
        <div className="card">
          <h3 className="section-title">Latest from the front</h3>
          {feed.map((e, i) => {
            const info = getTeam(e.team);
            const isHome = e.fixture.homeTeam.name === e.team;
            const opp = getTeam(isHome ? e.fixture.awayTeam.name : e.fixture.homeTeam.name);
            const my = isHome ? e.fixture.score.home : e.fixture.score.away;
            const their = isHome ? e.fixture.score.away : e.fixture.score.home;
            return (
              <div className={`feed-item ${e.pts === 0 ? 'feed-loss' : ''}`} key={i}>
                <span className={`pip pip-${e.result.toLowerCase()}`}>{e.result}</span>
                <div className="feed-body">
                  <span className="feed-text">{info?.short} {my}–{their} {opp?.short}</span>
                  <span className="feed-meta">
                    <span className="feed-owner">{e.owner}</span>
                    <span className="feed-pts">{e.pts > 0 ? `+${e.pts}` : 'nil'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
