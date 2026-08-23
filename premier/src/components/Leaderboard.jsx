import { useMemo, useState } from 'react';
import { buildLadder, formForTeam, feedEvents } from '../utils/scoring.js';
import { getProjection } from '../utils/projection.js';
import { MEDALS, SCORING, ENTRY_FEE, PAYOUTS, getTeam } from '../data/england2027.js';
import { matchValue, priceRangeFor, SEASON_ROUNDS } from '../utils/odds.js';
import { clubLabel } from '../utils/teamMatch.js';
import { RowStripes } from './Stripe.jsx';
import { tableLine, lastPlaceJibe } from '../utils/editorial.js';

// Chances of the three things that pay, straight off the simulation. Shown as
// bars because the exact percentage matters far less than who is in the hunt.
function Forecast({ o, n }) {
  const pct = (v) => (v >= 0.995 ? 100 : Math.round(v * 100));
  const bars = [
    { key: 'first', label: '1st', v: o.pFirst },
    { key: 'second', label: '2nd', v: o.pSecond },
    { key: 'last', label: 'Last', v: o.pLast },
  ];
  return (
    <div className="forecast">
      <div className="forecast-head">Where this ends up</div>
      {bars.map((b) => (
        <div className={`forecast-row ${b.key}`} key={b.key}>
          <span className="forecast-lab">{b.label}</span>
          <span className="forecast-track">
            <span className="forecast-fill" style={{ width: `${Math.max(pct(b.v), b.v > 0 ? 2 : 0)}%` }} />
          </span>
          <span className="forecast-val">{b.v < 0.005 ? '<1%' : `${pct(b.v)}%`}</span>
        </div>
      ))}
      <div className="forecast-note">
        Typical finish {ordinalOf(o.medianRank)} of {n}, over 800 simulated seasons.
      </div>
    </div>
  );
}

function ordinalOf(x) {
  if (x == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = x % 100;
  return x + (s[(v - 20) % 10] || s[v] || s[0]);
}

// The leader's recent form, taken across all their clubs, newest first
function combinedForm(row, fixtures, n = 5) {
  const all = [];
  for (const t of row.teams) {
    for (const f of fixtures) {
      if (f.status !== 'FINISHED') continue;
      if (f.homeTeam.name !== t && f.awayTeam.name !== t) continue;
      const isHome = f.homeTeam.name === t;
      const my = isHome ? f.score.home : f.score.away;
      const their = isHome ? f.score.away : f.score.home;
      if (my == null || their == null) continue;
      all.push({ ts: f.utcDate || '', r: my > their ? 'W' : my < their ? 'L' : 'D' });
    }
  }
  return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, n).map((x) => x.r);
}

// Every scoring event for one player, newest first — feeds the ledger
function ledgerFor(row, fixtures) {
  const events = [];
  for (const b of row.breakdown) {
    const info = getTeam(b.team);
    for (const f of fixtures) {
      if (f.status !== 'FINISHED') continue;
      const isHome = f.homeTeam.name === b.team;
      const isAway = f.awayTeam.name === b.team;
      if (!isHome && !isAway) continue;
      const opp = getTeam(isHome ? f.awayTeam.name : f.homeTeam.name);
      const my = isHome ? f.score.home : f.score.away;
      const their = isHome ? f.score.away : f.score.home;
      if (my == null || their == null) continue;
      const val = matchValue(b.team, isHome ? f.awayTeam.name : f.homeTeam.name, isHome,
        f.utcDate && Date.parse(f.utcDate) >= Date.parse('2027-01-01T00:00:00Z') ? 'mid' : 'pre');
      const pts = my > their ? val.win : my === their ? val.draw : 0;
      events.push({
        ts: f.utcDate || '',
        label: `${info?.short} ${my}–${their} ${opp?.short}`,
        pts,
      });
    }
    // banked extras
    if (b.oa?.pts > 0) {
      events.push({ ts: 'zzz', label: `${info?.short} ${ordinalOf(b.oa.pos)}, tipped ${ordinalOf(b.oa.tipped)}`, pts: b.oa.pts });
    }
    for (const m of b.medals) {
      events.push({ ts: 'zzz', label: `${info?.short} — ${MEDALS[m].label}`, pts: MEDALS[m].pts });
    }
  }
  // Shed bonuses aren't tied to a club, so they sort to the very top
  for (const bonus of row.bonuses || []) {
    events.push({ ts: 'zzzz', label: bonus.label, pts: bonus.pts });
  }
  return events.sort((a, b) => b.ts.localeCompare(a.ts));
}

export default function Leaderboard({
  assignments, fixtures, manualMedals, bonusPoints, whoAmI, onSelectTeam,
}) {
  const ladder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const outlook = useMemo(
    () => getProjection(assignments, fixtures, manualMedals, bonusPoints).players,
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const [open, setOpen] = useState(null);

  const anyResults = fixtures.some((f) => f.status === 'FINISHED');
  const pot = ladder.length * ENTRY_FEE;

  if (!ladder.length) {
    return (
      <div className="page">
        <div className="page-header"><h2>The Table</h2></div>
        <p className="editorial">{tableLine(ladder, anyResults)}</p>
        <div className="empty-state"><p>Run the draw in the Shed to get started.</p></div>
      </div>
    );
  }

  const leaderTotal = ladder[0].total;

  return (
    <div className="page">
      <div className="page-header">
        <h2>The Table</h2>
        <span className="subtitle">{ladder.length} in · ${pot} pot</span>
      </div>

      <p className="editorial">{tableLine(ladder, anyResults)}</p>

      <div className="leaderboard">
        {ladder.map((row, i) => {
          const isLeader = i === 0;
          const isLast = i === ladder.length - 1 && ladder.length > 1;
          const isOpen = open === row.name;
          const gap = leaderTotal - row.total;
          const form = isLeader ? combinedForm(row, fixtures) : [];
          const o = outlook[row.name] || {};
          return (
            <div
              key={row.name}
              className={`lb-row ${isLeader ? 'leader' : ''} ${isLast ? 'last' : ''}`}
              onClick={() => setOpen(isOpen ? null : row.name)}
            >
              <RowStripes teams={row.teams} />
              <div className="lb-main">
                <div className="lb-rank">{i + 1}</div>
                <div className="lb-info">
                  <div className="lb-name">{row.name}{whoAmI === row.name ? ' ·' : ''}</div>
                  <div className="lb-clubs">
                    {row.teams.map((t) => clubLabel(t)).join(' · ')}
                  </div>
                  {isLeader && form.length > 0 && (
                    <div className="form-squares">
                      {form.map((r, j) => (
                        <span key={j} className={`fsq fsq-${r.toLowerCase()}`}>{r}</span>
                      ))}
                    </div>
                  )}
                  {isLast && anyResults && (
                    <div className="lb-jibe">{lastPlaceJibe(row)}</div>
                  )}
                </div>
                <div className="lb-right">
                  <div className="lb-pts">{row.total}</div>
                  <div className="lb-ptslabel">
                    {isLeader ? 'points' : `−${gap}`}
                  </div>
                  {o.pFirst != null && (
                    <div className="lb-odds" title="Chance of finishing first">
                      {o.pFirst >= 0.005 ? `${Math.round(o.pFirst * 100)}%` : '<1%'} to win
                    </div>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="ledger" onClick={(e) => e.stopPropagation()}>
                  {o.projected != null && <Forecast o={o} n={ladder.length} />}
                  {(() => {
                    const events = ledgerFor(row, fixtures);
                    if (!events.length) {
                      return (
                        <div className="ledger-empty">
                          Nothing banked yet.{' '}
                          {o.projected != null && `Projected ${o.projected} by May.`}
                        </div>
                      );
                    }
                    return (
                      <>
                        {events.slice(0, 12).map((e, j) => (
                          <div key={j} className={`ledger-row ${e.pts === 0 ? 'zero' : ''}`}>
                            <span>{e.label}</span>
                            <b>{e.pts > 0 ? `+${e.pts}` : e.pts}</b>
                          </div>
                        ))}
                        {events.length > 12 && (
                          <div className="ledger-more">{events.length - 12} more</div>
                        )}
                        {o.projected != null && (
                          <div className="ledger-more">
                            Projected {o.projected} by May ({o.floor}–{o.ceiling})
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ScoringPanel />

      <div className="tap-hint">Tap a row for the ledger</div>
    </div>
  );
}

// Reads live from the scoring config — never hard-coded, so it always matches
// whatever the engine is actually doing.
function ScoringPanel() {
  const arsenal = priceRangeFor('Arsenal FC');
  const hull = priceRangeFor('Hull City AFC');
  const lo = Math.min(arsenal?.lo ?? 3, hull?.lo ?? 3);
  const hi = Math.max(arsenal?.hi ?? 15, hull?.hi ?? 15);

  return (
    <div className="scoring">
      <div className="scoring-head">How points are earned</div>
      <div className="scoring-row">
        <span>Your club wins</span>
        <b>{lo}–{hi}</b>
      </div>
      <div className="scoring-row">
        <span>Draw</span>
        <b>{SCORING.DRAW}</b>
      </div>
      <div className="scoring-row">
        <span>Each place finished above its tip</span>
        <b>{SCORING.OVERACHIEVE}</b>
      </div>
      <div className="scoring-row">
        <span>{MEDALS.VC.label}</span>
        <b>{MEDALS.VC.pts}</b>
      </div>
      <div className="scoring-row">
        <span>{MEDALS.PROMOTION.label}</span>
        <b>{MEDALS.PROMOTION.pts}</b>
      </div>
      <div className="scoring-why">
        <p className="scoring-lead">
          <b>The harder the win, the more it pays.</b> Every club has a chance of winning
          each match, and that chance sets the price: if they were always going to win it
          is worth very little, and if nobody gave them a hope it is worth a lot. Most wins
          land somewhere between {lo} and {hi} points. A draw is always {SCORING.DRAW},
          whoever you played.
        </p>

        <div className="scoring-block">
          <h4>Where the chances come from</h4>
          <p>
            The bookies' pre-season order, plus a bit extra for playing at home. That is all
            it is. The price is printed on every fixture before kick-off, so you always know
            what a game is worth before it is played.
          </p>
        </div>

        <div className="scoring-block">
          <h4>Prices change once, in January</h4>
          <p>
            At New Year the prices are worked out again, this time from where clubs have
            actually ended up rather than where they were tipped. A club that has been far
            better or worse than expected gets priced honestly for the second half. Every
            match keeps whatever price it had on the day it kicked off, so nothing you have
            already banked can be re-scored afterwards.
          </p>
        </div>

        <div className="scoring-block">
          <h4>Championship wins pay a little less</h4>
          <p>
            The Championship plays {SEASON_ROUNDS[2]} games to the Premier League's{' '}
            {SEASON_ROUNDS[1]}. Left alone, a Championship club would earn about a fifth more
            over a season purely for playing more often. Their prices come down by roughly
            the same amount to cancel that out, so a full season is worth the same either
            way and nobody is better off for the mix they were dealt.
          </p>
        </div>

        <div className="scoring-block">
          <h4>Beating your tip never resets</h4>
          <p>
            The {SCORING.OVERACHIEVE} points a place is always measured against where the
            bookies put your club before a ball was kicked, even after the January
            re-pricing. If it reset halfway, beating your prediction would stop meaning
            anything.
          </p>
        </div>
      </div>
    </div>
  );
}
