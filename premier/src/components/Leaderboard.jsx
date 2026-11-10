import { useMemo, useState } from 'react';
import { buildLadder } from '../utils/scoring.js';
import { getProjection } from '../utils/projection.js';
import { MEDALS, ENTRY_FEE, getTeam } from '../data/england2027.js';
import { valueForFixture } from '../utils/odds.js';
import { clubLabel } from '../utils/teamMatch.js';
import Crest from './Crest.jsx';
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
        Typical finish {ordinal(o.medianRank)} of {n}. On for about {o.projected} points ({o.floor}–{o.ceiling}).
      </div>
    </div>
  );
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

      <div className="ladder">
        {ladder.map((row, i) => {
          const isLeader = i === 0;
          const isLast = i === ladder.length - 1 && ladder.length > 1;
          const isOpen = open === row.name;
          const gap = leaderTotal - row.total;
          const o = outlook[row.name] || {};
          const mine = whoAmI === row.name;
          const up = showLive ? lv.delta[row.name]?.up : (anyResults ? move[row.name]?.up : 0);
          const liveGain = showLive ? lv.delta[row.name]?.pts : 0;
          return (
            <div key={row.name} className={`lr ${mine ? 'me' : ''} ${isOpen ? 'open' : ''}`}>
              <button
                className="lr-main"
                aria-expanded={isOpen}
                onClick={() => { setOpen(isOpen ? null : row.name); setFull(false); }}
              >
                <span className={`lr-rank ${isLeader ? 'first' : ''}`}>{i + 1}</span>
                <span className="lr-who">
                  <span className="lr-name">
                    {row.name}
                    {mine && <span className="you-tag">You</span>}
                    {up ? <Move up={up} /> : null}
                  </span>
                  <span className="lr-crests">
                    {row.teams.map((t) => <Crest key={t} team={t} size={20} />)}
                  </span>
                  {isLast && anyResults && <em className="lr-jibe">{lastPlaceJibe(row)}</em>}
                </span>
                <span className="lr-score">
                  <b><Pts value={row.total} /></b>
                  {liveGain > 0
                    ? <small className="live-gain">+{liveGain} live</small>
                    : <small>{isLeader ? 'points' : `${gap} behind`}</small>}
                </span>
                <svg className="lr-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {isOpen && (
                <div className="ledger">
                  <div className="lr-clubgrid">
                    {row.breakdown.map((b) => (
                      <button key={b.team} className="lr-clubcard" onClick={() => onSelectTeam?.(b.team)}>
                        <Crest team={b.team} size={26} />
                        <span>
                          <b>{getTeam(b.team)?.short || clubLabel(b.team)}</b>
                          <small>{b.w}W {b.d}D {b.l}L</small>
                        </span>
                        <i>{b.total + b.oa.pts + b.medalPts}</i>
                      </button>
                    ))}
                  </div>
                  {o.projected != null && <Forecast o={o} n={ladder.length} />}
                  {(() => {
                    const events = ledgerFor(row, shownFixtures);
                    if (!events.length) {
                      return <div className="ledger-empty">Nothing banked yet.</div>;
                    }
                    return (
                      <>
                        <div className="ledger-head">Points, newest first</div>
                        {(full ? events : events.slice(0, 8)).map((e, j) => (
                          <div key={j} className={`ledger-row ${e.pts === 0 ? 'zero' : ''}`}>
                            <span>{e.label}</span>
                            <b>{e.pts > 0 ? `+${e.pts}` : e.pts}</b>
                          </div>
                        ))}
                        {events.length > 8 && !full && (
                          <button className="link-btn" onClick={() => setFull(true)}>
                            Show {events.length - 8} more
                          </button>
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
