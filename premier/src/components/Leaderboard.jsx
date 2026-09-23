import { useMemo, useState } from 'react';
import { buildLadder } from '../utils/scoring.js';
import { getProjection } from '../utils/projection.js';
import { MEDALS, ENTRY_FEE, getTeam } from '../data/england2027.js';
import { valueForFixture } from '../utils/odds.js';
import { clubLabel } from '../utils/teamMatch.js';
import { RowStripes } from './Stripe.jsx';
import { tableLine, lastPlaceJibe } from '../utils/editorial.js';
import UpNext from './UpNext.jsx';
import YouCard, { Move } from './YouCard.jsx';
import { roundMovement } from '../utils/movement.js';
import { liveLadder, asItStands } from '../utils/matchday.js';
import RaceChart from './RaceChart.jsx';
import RecapCard from './RecapCard.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { ordinal } from '../utils/format.js';

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
      {/* First, second and last are not an arbitrary three — they are the
          only places that pay, so this is really "am I in the money". */}
      <div className="forecast-note">
        The three places that pay. Typical finish {ordinal(o.medianRank)} of {n}.
      </div>
    </div>
  );
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
      // the same price the ladder used, January re-pricing and all
      const val = valueForFixture(f, b.team);
      const pts = my > their ? val.win : my === their ? val.draw : 0;
      events.push({
        ts: f.utcDate || '',
        label: `${info?.short || clubLabel(b.team)} ${my}–${their} `
             + `${opp?.short || clubLabel(isHome ? f.awayTeam.name : f.homeTeam.name)}`
             + (f.provisional ? ' (live)' : ''),
        pts,
      });
    }
    // banked extras
    if (b.oa?.pts > 0) {
      events.push({ ts: 'zzz', label: `${info?.short || clubLabel(b.team)} ${ordinal(b.oa.pos)}, tipped ${ordinal(b.oa.tipped)}`, pts: b.oa.pts });
    }
    for (const m of b.medals) {
      events.push({ ts: 'zzz', label: `${info?.short || clubLabel(b.team)} — ${MEDALS[m].label}`, pts: MEDALS[m].pts });
    }
  }
  // Shed bonuses aren't tied to a club, so they sort to the very top
  for (const bonus of row.bonuses || []) {
    events.push({ ts: 'zzzz', label: bonus.label, pts: bonus.pts });
  }
  return events.sort((a, b) => b.ts.localeCompare(a.ts));
}

function Pts({ value }) {
  return <>{useCountUp(value)}</>;
}

export default function Leaderboard({
  assignments, fixtures, manualMedals, bonusPoints, whoAmI, onSelectTeam, onOpenMatch,
  onOpenSquad, onPickName, onShowRules,
}) {
  const realLadder = useMemo(
    () => buildLadder(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  // While games are on, the table as it stands: every game in play counted at
  // its current score. Same scoring, just not final yet.
  const lv = useMemo(
    () => liveLadder(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const [asStands, setAsStands] = useState(true);
  const showLive = lv.live && asStands;
  const ladder = showLive ? lv.ladder : realLadder;
  const shownFixtures = useMemo(() => (showLive ? asItStands(fixtures) : fixtures), [showLive, fixtures]);
  const outlook = useMemo(
    () => getProjection(assignments, fixtures, manualMedals, bonusPoints).players,
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const move = useMemo(
    () => roundMovement(assignments, fixtures, manualMedals, bonusPoints, realLadder).byName,
    [assignments, fixtures, manualMedals, bonusPoints, realLadder]
  );
  const [open, setOpen] = useState(null);
  const [full, setFull] = useState(false);

  const anyResults = fixtures.some((f) => f.status === 'FINISHED');
  const pot = ladder.length * ENTRY_FEE;

  if (!ladder.length) {
    return (
      <div className="page">
        <p className="editorial">{tableLine(ladder, anyResults)}</p>
        <div className="empty-state"><p>Run the draw under More (the ⋯ button) to get started.</p></div>
      </div>
    );
  }

  const leaderTotal = ladder[0].total;

  return (
    <div className="page">
      <YouCard
        ladder={ladder}
        move={move}
        live={showLive ? lv.delta : null}
        whoAmI={whoAmI}
        onOpenSquad={onOpenSquad}
        onPickName={onPickName}
      />

      <UpNext
        fixtures={fixtures}
        assignments={assignments}
        whoAmI={whoAmI}
        onOpenMatch={onOpenMatch}
      />

      <RecapCard
        assignments={assignments}
        fixtures={fixtures}
        manualMedals={manualMedals}
        bonusPoints={bonusPoints}
        whoAmI={whoAmI}
      />

      <div className="list-head">
        <span>Standings <small>{ladder.length} in · ${pot} pot</small></span>
        <button className="link-btn" onClick={onShowRules}>How points work</button>
      </div>

      {lv.live && (
        <div className={`live-bar ${showLive ? 'on' : ''}`}>
          <span><i className="live-dot" /> {showLive ? 'Live: the table as it stands' : 'Games on: showing before kick-off'}</span>
          <button className="link-btn" onClick={() => setAsStands(!asStands)}>
            {showLive ? 'Before kick-off' : 'As it stands'}
          </button>
        </div>
      )}

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
              className={`lb-row ${isLeader ? 'leader' : ''} ${isLast ? 'last' : ''} ${whoAmI === row.name ? 'me' : ''}`}
              onClick={() => { setOpen(isOpen ? null : row.name); setFull(false); }}
            >
              <RowStripes teams={row.teams} />
              <div className="lb-main">
                <div className="lb-rank">
                  {i + 1}
                  {showLive
                    ? <Move up={lv.delta[row.name]?.up} />
                    : anyResults && <Move up={move[row.name]?.up} />}
                </div>
                <div className="lb-info">
                  <div className="lb-name">{row.name}</div>
                  <div className="lb-clubs">
                    {row.teams.map((t, j) => (
                      <span key={t}>
                        {j > 0 && ' · '}
                        <button
                          className="team-btn lb-club"
                          onClick={(e) => { e.stopPropagation(); onSelectTeam?.(t); }}
                        >
                          {clubLabel(t)}
                        </button>
                      </span>
                    ))}
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
                  <div className="lb-pts"><Pts value={row.total} /></div>
                  {showLive && lv.delta[row.name]?.pts > 0 && (
                    <div className="live-gain">+{lv.delta[row.name].pts} live</div>
                  )}
                  {/* "−5" read as a negative score. Say what it is. */}
                  <div className="lb-ptslabel">
                    {isLeader ? 'points' : `${gap} behind`}
                  </div>
                  {/* Where this ends up, not the chance of winning. The chance
                      inverts against the current order — a shorter total with
                      better clubs is the likelier winner — which is true but
                      reads as a mistake sitting under the points with nothing
                      to explain it. A projected total says the same thing and
                      cannot contradict itself. The full odds are a tap away. */}
                  {o.projected != null && (
                    <div className="lb-odds" title="Projected total by the end of the season">
                      on for {o.projected}
                    </div>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="ledger" onClick={(e) => e.stopPropagation()}>
                  {o.projected != null && <Forecast o={o} n={ladder.length} />}
                  {(() => {
                    const events = ledgerFor(row, shownFixtures);
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
                        {(full ? events : events.slice(0, 12)).map((e, j) => (
                          <div key={j} className={`ledger-row ${e.pts === 0 ? 'zero' : ''}`}>
                            <span>{e.label}</span>
                            <b>{e.pts > 0 ? `+${e.pts}` : e.pts}</b>
                          </div>
                        ))}
                        {events.length > 12 && !full && (
                          <button className="ledger-more ledger-more-btn" onClick={() => setFull(true)}>
                            Show {events.length - 12} more
                          </button>
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


      <RaceChart
        assignments={assignments}
        fixtures={fixtures}
        manualMedals={manualMedals}
        bonusPoints={bonusPoints}
        whoAmI={whoAmI}
      />
    </div>
  );
}
