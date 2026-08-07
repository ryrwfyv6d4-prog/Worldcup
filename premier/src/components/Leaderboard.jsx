import { useMemo, useState } from 'react';
import { buildLadder, computeOutlook, formForTeam, feedEvents } from '../utils/scoring.js';
import { MEDALS, SCORING, ENTRY_FEE, PAYOUTS, getTeam } from '../data/england2027.js';
import { matchValue, priceRangeFor } from '../utils/odds.js';
import { RowStripes } from './Stripe.jsx';
import { tableLine, lastPlaceJibe } from '../utils/editorial.js';

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
      events.push({ ts: 'zzz', label: `${info?.short} ${b.oa.pos}th, tipped ${b.oa.tipped}`, pts: b.oa.pts });
    }
    for (const m of b.medals) {
      events.push({ ts: 'zzz', label: `${info?.short} — ${MEDALS[m].label}`, pts: MEDALS[m].pts });
    }
  }
  return events.sort((a, b) => b.ts.localeCompare(a.ts));
}

export default function Leaderboard({
  assignments, fixtures, manualMedals, whoAmI, onSelectTeam,
}) {
  const ladder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals),
    [assignments, fixtures, manualMedals]
  );
  const outlook = useMemo(
    () => computeOutlook(assignments, fixtures, manualMedals),
    [assignments, fixtures, manualMedals]
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
                    {row.teams.map((t) => getTeam(t)?.short || t).join(' · ')}
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
                </div>
              </div>

              {isOpen && (
                <div className="ledger" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const events = ledgerFor(row, fixtures);
                    if (!events.length) {
                      return (
                        <div className="ledger-empty">
                          Nothing banked yet. {o.projected != null && `Projected ${o.projected} by May.`}
                        </div>
                      );
                    }
                    return (
                      <>
                        {events.slice(0, 12).map((e, j) => (
                          <div key={j} className={`ledger-row ${e.pts === 0 ? 'zero' : ''}`}>
                            <span>{e.label}</span>
                            <b>{e.pts > 0 ? `+${e.pts}` : '0'}</b>
                          </div>
                        ))}
                        {events.length > 12 && (
                          <div className="ledger-more">{events.length - 12} more</div>
                        )}
                        {o.projected != null && (
                          <div className="ledger-more">Projected {o.projected} by May</div>
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
      <p className="scoring-note">
        A win is priced on how likely it was — beat a better club, or win away, and it
        pays more. The app prints the price on every fixture before kick-off.
      </p>
    </div>
  );
}
