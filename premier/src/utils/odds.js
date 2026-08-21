// Match pricing: what is a result worth?
//
// Every club has a pre-season odds rank within its division (1 = shortest
// odds). From the two ranks plus home advantage we estimate the probability of
// each result, then price a win at K / P(win) — so the less likely the win, the
// more it pays. Draws are flat.
//
// The model is an ordered logistic on club ratings, fitted so that the
// aggregate top-half/bottom-half probabilities match real English football:
//   PL top-half at home to a bottom-half side  ~60% win
//   PL bottom-half away at a top-half side      ~18% win
//   Championship is deliberately flatter.
// Parameters were grid-fitted against those targets; see the modelling notes.

import { TEAMS, DIV_SIZE, SCORING, getTeam } from '../data/england2027.js';

// A Championship season is 46 games, the Premier League 38. Without correcting
// for that, a Championship club is worth ~21% more over a season purely for
// playing more often — which stays hidden while everyone holds the same mix of
// divisions, and becomes real unfairness the moment they don't. Scaling each
// division's prices by 38/rounds makes a full season worth the same either way.
// Premier League values are unchanged; Championship values come down ~17%.
export const SEASON_ROUNDS = { 1: 38, 2: 46 };
const BASE_ROUNDS = 38;
const lengthFactor = (div) => BASE_ROUNDS / SEASON_ROUNDS[div];

const CAL = {
  spread: { 1: 0.6, 2: 0.3 }, // rating half-range per division (Ch is flatter)
  home: 0.2,                  // home advantage
  tau: 0.5,                   // draw band
  s: 1.0,                     // logistic scale
};

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// rank 1 -> +spread, worst rank -> -spread, linear between
export function ratingForRank(div, rank) {
  const n = DIV_SIZE[div];
  return CAL.spread[div] * (1 - (2 * (rank - 1)) / (n - 1));
}

// [P(home win), P(draw), P(away win)]
export function matchProbs(homeRating, awayRating) {
  const d = homeRating - awayRating + CAL.home;
  const pH = sigmoid((d - CAL.tau) / CAL.s);
  const pA = sigmoid((-d - CAL.tau) / CAL.s);
  return [pH, Math.max(0.02, 1 - pH - pA), pA];
}

// Probability that `team` beats `opp`, at the given venue
export function winProbability(teamName, oppName, isHome, phase = 'pre') {
  const t = getTeam(teamName);
  const o = getTeam(oppName);
  if (!t || !o || t.div !== o.div) return null;
  const rT = ratingForRank(t.div, effectiveRank(t, phase));
  const rO = ratingForRank(o.div, effectiveRank(o, phase));
  const [pH, , pA] = isHome ? matchProbs(rT, rO) : matchProbs(rO, rT);
  return isHome ? pH : pA;
}

// ── One mid-season recalibration ────────────────────────────────────────────
// Prices come off the pre-season odds until New Year. From 1 January they are
// re-derived from where each club ACTUALLY sits, so a side that turned out far
// better or worse than tipped is priced honestly for the second half.
//
// Deliberately once, not weekly: the price on any given fixture is knowable in
// advance and never changes after the fact, so nobody can argue a result was
// re-scored. A match is priced by its own kick-off date, which means results
// already banked can never be rewritten by a later recalibration.
//
// Note this does NOT re-baseline the overachievement bonus — that stays
// measured against the pre-season tip all season, or the whole 'beat your
// prediction' idea would reset in January.
export const RECALIBRATION = Date.parse('2027-01-01T00:00:00Z');

let midseasonRanks = null;

export function phaseFor(utcDate) {
  if (!utcDate) return 'pre';
  return Date.parse(utcDate) >= RECALIBRATION ? 'mid' : 'pre';
}

// League position per club as at the recalibration date, used as the new rank
export function computeMidseasonRanks(fixtures) {
  const played = fixtures.filter(
    (f) => f.status === 'FINISHED' && f.utcDate && Date.parse(f.utcDate) < RECALIBRATION
  );
  if (!played.length) return null;
  const ranks = {};
  for (const div of [1, 2]) {
    const rows = {};
    for (const t of TEAMS.filter((x) => x.div === div)) rows[t.name] = { t, pts: 0, gd: 0, p: 0 };
    for (const f of played) {
      if (f.division !== div) continue;
      const h = rows[f.homeTeam.name], a = rows[f.awayTeam.name];
      if (!h || !a) continue;
      const hs = f.score.home, as = f.score.away;
      if (hs == null || as == null) continue;
      h.p++; a.p++; h.gd += hs - as; a.gd += as - hs;
      if (hs > as) h.pts += 3; else if (as > hs) a.pts += 3; else { h.pts++; a.pts++; }
    }
    // Not enough of the season gone? Leave this division on its pre-season odds.
    const minPlayed = Math.min(...Object.values(rows).map((r) => r.p));
    if (minPlayed < 10) continue;
    Object.values(rows)
      .sort((x, y) => y.pts - x.pts || y.gd - x.gd || x.t.rank - y.t.rank)
      .forEach((r, i) => { ranks[r.t.name] = i + 1; });
  }
  return Object.keys(ranks).length ? ranks : null;
}

export function setMidseasonRanks(ranks) {
  const before = midseasonRanks ? JSON.stringify(midseasonRanks) : null;
  const after = ranks ? JSON.stringify(ranks) : null;
  if (before === after) return;
  midseasonRanks = ranks;
  priceCache.clear();
}

export function midseasonRankFor(teamName) {
  return midseasonRanks ? midseasonRanks[teamName] ?? null : null;
}

export function isRecalibrated() {
  return Boolean(midseasonRanks);
}

const priceCache = new Map();

// The rank a club is priced on for a given phase
function effectiveRank(t, phase) {
  if (phase === 'mid' && midseasonRanks && midseasonRanks[t.name] != null) return midseasonRanks[t.name];
  return t.rank;
}

// What `team` earns for a win / a draw in this specific fixture.
export function matchValue(teamName, oppName, isHome, phase = 'pre') {
  const key = `${teamName}|${oppName}|${isHome}|${phase}`;
  if (priceCache.has(key)) return priceCache.get(key);
  const p = winProbability(teamName, oppName, isHome, phase);
  const t = getTeam(teamName);
  const f = t ? lengthFactor(t.div) : 1;
  const value = p == null
    ? { win: 0, draw: 0, pWin: null }
    : {
        win: Math.max(2, Math.round((SCORING.K * f) / p)),
        draw: Math.max(1, Math.round(SCORING.DRAW * f)),
        pWin: p,
      };
  priceCache.set(key, value);
  return value;
}

// Convenience: value of a fixture from one side's perspective
// A fixture is always priced by its own kick-off date, so banked results can
// never be re-scored by a later recalibration.
export function valueForFixture(fixture, teamName) {
  const isHome = fixture.homeTeam.name === teamName;
  const opp = isHome ? fixture.awayTeam.name : fixture.homeTeam.name;
  return matchValue(teamName, opp, isHome, phaseFor(fixture.utcDate));
}

// Highest and lowest win price a club can earn all season — used for copy
export function priceRangeFor(teamName) {
  const t = getTeam(teamName);
  if (!t) return null;
  let lo = Infinity, hi = 0;
  for (const o of TEAMS) {
    if (o.div !== t.div || o.name === t.name) continue;
    for (const home of [true, false]) {
      const { win } = matchValue(t.name, o.name, home, 'pre');
      lo = Math.min(lo, win); hi = Math.max(hi, win);
    }
  }
  return { lo, hi };
}
