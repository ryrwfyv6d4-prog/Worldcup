// Matchday: the table as it stands while games are on, the season race week
// by week, and the recap of a finished round.
//
// None of this changes how points are scored. It replays the same
// buildLadder over a different set of results: games in play counted at
// their current score ("if it ended now"), or the season cut off at the end
// of each week. The app shows it; the worker uses the recap for Monday's
// notification. Pure, so both can import it.
import { buildLadder, fixturePoints } from './scoring.js';
import { asOf } from './movement.js';
import { getTeam } from '../data/england2027.js';

const WEEK = 7 * 864e5;
const TUESDAY_EPOCH = Date.UTC(1970, 0, 6);
export const weekStartOf = (t) => TUESDAY_EPOCH + Math.floor((t - TUESDAY_EPOCH) / WEEK) * WEEK;
const short = (n) => getTeam(n)?.short || n;
const ownerOf = (team, assignments) => {
  for (const [name, teams] of Object.entries(assignments || {})) if ((teams || []).includes(team)) return name;
  return null;
};

// ── As it stands ────────────────────────────────────────────────────────────
// Every game in play treated as if the whistle went now.
export function asItStands(fixtures) {
  return fixtures.map((f) => {
    if (f.status !== 'IN_PLAY' || f.score?.home == null || f.score?.away == null) return f;
    const { home, away } = f.score;
    return {
      ...f,
      status: 'FINISHED',
      provisional: true,
      score: { home, away, winner: home > away ? 'HOME_TEAM' : away > home ? 'AWAY_TEAM' : 'DRAW' },
    };
  });
}

// The real ladder and the live one side by side. `live` is false when no
// game is on, and then the two are the same thing.
export function liveLadder(assignments, fixtures, manualMedals, bonusPoints) {
  const base = buildLadder(assignments, fixtures, manualMedals, bonusPoints);
  const live = fixtures.some((f) => f.status === 'IN_PLAY');
  if (!live) return { live, ladder: base, delta: {} };
  const now = buildLadder(assignments, asItStands(fixtures), manualMedals, bonusPoints);
  const baseRank = Object.fromEntries(base.map((r, i) => [r.name, { rank: i + 1, total: r.total }]));
  const delta = {};
  now.forEach((r, i) => {
    const b = baseRank[r.name] || { rank: i + 1, total: r.total };
    delta[r.name] = { pts: r.total - b.total, up: b.rank - (i + 1) };
  });
  return { live, ladder: now, delta };
}

// ── The season race ─────────────────────────────────────────────────────────
// Each player's total at the end of every week (Tuesday to Monday in
// England) that had a result in it, from before the first ball to now.
export function raceSeries(assignments, fixtures, manualMedals, bonusPoints) {
  const done = fixtures.filter((f) => f.status === 'FINISHED' && f.utcDate);
  const names = Object.keys(assignments);
  if (!done.length || !names.length) return { weeks: [], series: {}, ranks: {} };
  const first = weekStartOf(Math.min(...done.map((f) => Date.parse(f.utcDate))));
  const last = weekStartOf(Math.max(...done.map((f) => Date.parse(f.utcDate))));
  const cuts = [first];
  for (let t = first; t <= last; t += WEEK) cuts.push(t + WEEK);

  const weeks = [];
  const series = Object.fromEntries(names.map((n) => [n, []]));
  const ranks = Object.fromEntries(names.map((n) => [n, []]));
  cuts.forEach((cut, i) => {
    const ladder = buildLadder(assignments, asOf(fixtures, cut), manualMedals, bonusPoints);
    ladder.forEach((r, k) => { series[r.name].push(r.total); ranks[r.name].push(k + 1); });
    weeks.push({
      end: cut,
      label: i === 0 ? 'Start' : new Date(cut - 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    });
  });
  return { weeks, series, ranks };
}

// ── The recap ───────────────────────────────────────────────────────────────
// The most recent week that is over (its Monday has passed) and had results.
export function lastRoundWeek(fixtures, now = Date.now()) {
  const thisWeek = weekStartOf(now);
  const played = fixtures
    .filter((f) => f.status === 'FINISHED' && f.utcDate && Date.parse(f.utcDate) < thisWeek)
    .map((f) => weekStartOf(Date.parse(f.utcDate)));
  return played.length ? Math.max(...played) : null;
}

export function roundRecap(assignments, fixtures, manualMedals, bonusPoints, now = Date.now(), start = lastRoundWeek(fixtures, now)) {
  if (start == null || !Object.keys(assignments).length) return null;
  const end = start + WEEK;
  const before = buildLadder(assignments, asOf(fixtures, start), manualMedals, bonusPoints);
  const after = buildLadder(assignments, asOf(fixtures, end), manualMedals, bonusPoints);
  const was = Object.fromEntries(before.map((r, i) => [r.name, { rank: i + 1, total: r.total }]));
  const rows = after.map((r, i) => ({
    name: r.name, rank: i + 1, total: r.total,
    gained: r.total - (was[r.name]?.total ?? r.total),
    up: (was[r.name]?.rank ?? i + 1) - (i + 1),
  }));

  const byGain = [...rows].sort((a, b) => b.gained - a.gained || a.rank - b.rank);
  const byUp = [...rows].sort((a, b) => b.up - a.up || b.gained - a.gained);

  // The single best result of the week: the most points one club banked
  const games = fixtures.filter((f) => f.status === 'FINISHED' && f.utcDate
    && Date.parse(f.utcDate) >= start && Date.parse(f.utcDate) < end);
  let best = null;
  for (const f of games) {
    for (const side of [f.homeTeam.name, f.awayTeam.name]) {
      const owner = ownerOf(side, assignments);
      const fp = fixturePoints(f, side);
      if (!owner || !fp || !fp.settled || fp.outcome !== 'W') continue;
      if (!best || fp.pts > best.pts) {
        const home = f.homeTeam.name === side;
        const opp = home ? f.awayTeam.name : f.homeTeam.name;
        best = {
          owner, pts: fp.pts,
          text: `${short(side)} ${home ? 'beat' : 'won at'} ${short(opp)} ${Math.max(f.score.home, f.score.away)}–${Math.min(f.score.home, f.score.away)}`,
        };
      }
    }
  }

  const leader = rows[0];
  const second = rows[1];
  const last = rows[rows.length - 1];
  const label = `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}–${new Date(end - 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;

  return {
    start, end, label, games: games.length,
    winner: byGain[0],
    worst: byGain[byGain.length - 1],
    climber: byUp[0]?.up > 0 ? byUp[0] : null,
    faller: byUp[byUp.length - 1]?.up < 0 ? byUp[byUp.length - 1] : null,
    best,
    leader: { name: leader.name, total: leader.total, lead: second ? leader.total - second.total : 0 },
    last: last && last !== leader ? { name: last.name, total: last.total } : null,
    rows,
  };
}

// One line for a notification or a share
export function recapHeadline(r) {
  if (!r) return null;
  return `${r.winner.name} won the week (+${r.winner.gained})`;
}
export function recapLines(r) {
  if (!r) return [];
  const out = [];
  if (r.climber) out.push(`${r.climber.name} up ${r.climber.up} to ${ordinal(r.climber.rank)}`);
  out.push(`${r.leader.name} top${r.leader.lead ? ` by ${r.leader.lead}` : ', level'}`);
  if (r.best) out.push(`Result of the week: ${r.best.text} (+${r.best.pts}, ${r.best.owner})`);
  if (r.worst && r.worst.name !== r.winner.name) out.push(`Worst week: ${r.worst.name} (+${r.worst.gained})`);
  if (r.last) out.push(`${r.last.name} propping up the table`);
  return out;
}
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
