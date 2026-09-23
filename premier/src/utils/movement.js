import { buildLadder } from './scoring.js';

// Who moved this round.
//
// A "round" is the week the latest results fall in, Tuesday to Monday in
// England (the same weeks the Matches tab pages by). The ladder is rebuilt as
// it stood before that week's first kick-off, and each player's rank and total
// then is compared with now. Scoring itself is untouched: this only replays
// the same buildLadder over fewer results.
const WEEK = 7 * 864e5;
const TUESDAY_EPOCH = Date.UTC(1970, 0, 6);

export function roundStart(fixtures) {
  const done = fixtures.filter((f) => f.status === 'FINISHED' && f.utcDate);
  if (!done.length) return null;
  const latest = Math.max(...done.map((f) => Date.parse(f.utcDate)));
  return TUESDAY_EPOCH + Math.floor((latest - TUESDAY_EPOCH) / WEEK) * WEEK;
}

export function asOf(fixtures, cutoff) {
  return fixtures.map((f) => (f.utcDate && Date.parse(f.utcDate) >= cutoff && f.status !== 'SCHEDULED'
    ? { ...f, status: 'SCHEDULED', score: { home: null, away: null, winner: null } }
    : f));
}

// { name: { rank, total, rankNow, totalNow, up, gained } }
export function roundMovement(assignments, fixtures, manualMedals, bonusPoints, ladderNow) {
  const cutoff = roundStart(fixtures);
  const out = {};
  const now = ladderNow || buildLadder(assignments, fixtures, manualMedals, bonusPoints);
  if (cutoff == null) {
    now.forEach((r, i) => { out[r.name] = { rankNow: i + 1, totalNow: r.total, up: 0, gained: 0 }; });
    return { cutoff, byName: out };
  }
  const before = buildLadder(assignments, asOf(fixtures, cutoff), manualMedals, bonusPoints);
  const prev = Object.fromEntries(before.map((r, i) => [r.name, { rank: i + 1, total: r.total }]));
  now.forEach((r, i) => {
    const p = prev[r.name] || { rank: i + 1, total: r.total };
    out[r.name] = { rank: p.rank, total: p.total, rankNow: i + 1, totalNow: r.total, up: p.rank - (i + 1), gained: r.total - p.total };
  });
  return { cutoff, byName: out };
}
