import { MEDALS, SCORING, TEAMS, DIV_SIZE, getTeam } from '../data/england2027.js';
import { matchProbs, ratingForRank, matchValue, phaseFor } from './odds.js';
import { leagueTable, teamPoints, buildTables, buildComplete, medalsForTeam } from './scoring.js';

// ── Where this season is heading ────────────────────────────────────────────
//
// One simulation of the remaining fixtures answers both questions at once:
// where each club finishes in its league, and where each player finishes in the
// sweep. Running them together matters — a club's league position decides its
// overachievement bonus and its honours, so the two can't be computed apart
// without them disagreeing.
//
// This predicts. It never scores. Match prices come from matchValue, which is
// fixed by the pre-season odds and the January re-rating, exactly as in the
// live scoring; only the PROBABILITIES here carry current form.

export const RUNS = 800;
const FORM_WEIGHT = 8; // games of belief in the odds before the table takes over

// Deterministic, so the same table doesn't shuffle its projections on every
// render or read differently on two phones
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A club's strength for prediction: its odds rating, pulled toward where it
// actually sits as the season gives us evidence.
function ratingsFor(fixtures) {
  const out = new Map();
  for (const div of [1, 2]) {
    const table = leagueTable(fixtures, div, 'all');
    table.forEach((row, i) => {
      const t = getTeam(row.team);
      if (!t) return;
      const base = ratingForRank(div, t.rank);
      const played = row.p;
      if (!played) { out.set(row.team, base); return; }
      const actual = ratingForRank(div, i + 1);
      out.set(row.team, (base * FORM_WEIGHT + actual * played) / (FORM_WEIGHT + played));
    });
  }
  return out;
}

const median = (sorted) => sorted[Math.floor(sorted.length / 2)];
const pctile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

export function projectSeason(assignments = {}, fixtures = [], manualMedals = {}, runs = RUNS, bonusPoints = {}) {
  const tables = buildTables(fixtures);
  const complete = buildComplete(fixtures);
  const ratings = ratingsFor(fixtures);

  // Standing at this moment, per division
  const standing = {};
  for (const div of [1, 2]) {
    standing[div] = leagueTable(fixtures, div, 'all').map((r) => ({
      team: r.team, pts: r.pts, gd: r.gd, rank: getTeam(r.team)?.rank || 99,
    }));
  }

  // Precompute every remaining fixture once: probabilities from form-adjusted
  // ratings, prices straight from the odds
  const pending = [];
  for (const f of fixtures) {
    if (f.status === 'FINISHED') continue;
    const h = f.homeTeam.name, a = f.awayTeam.name;
    if (!getTeam(h) || !getTeam(a)) continue;
    const [pH, pD] = matchProbs(ratings.get(h) ?? 0, ratings.get(a) ?? 0);
    const phase = phaseFor(f.utcDate);
    pending.push({
      div: f.division, h, a, pH, pHD: pH + pD,
      valH: matchValue(h, a, true, phase),
      valA: matchValue(a, h, false, phase),
    });
  }

  const players = Object.keys(assignments);
  const owner = new Map();
  for (const p of players) {
    for (const t of (assignments[p] || []).filter(Boolean)) owner.set(t, p);
  }

  // What each owned club has already banked — unchanged across runs
  const banked = {};
  for (const t of owner.keys()) {
    const form = teamPoints(t, fixtures);
    const medals = medalsForTeam(t, tables, complete, manualMedals);
    banked[t] = form.total + medals.reduce((s, k) => s + MEDALS[k].pts, 0);
  }

  // Shed bonuses sit outside any club — a flat, already-settled add per player
  const playerBonus = {};
  for (const p of players) {
    playerBonus[p] = Object.values(bonusPoints[p] || {}).reduce((s, b) => s + b.pts, 0);
  }

  const posRuns = new Map(TEAMS.map((t) => [t.name, []]));
  const sweepRuns = new Map(players.map((p) => [p, []]));
  const rankRuns = new Map(players.map((p) => [p, []]));

  const rnd = mulberry32(20262027);
  const idx = { 1: new Map(), 2: new Map() };
  for (const div of [1, 2]) standing[div].forEach((r, i) => idx[div].set(r.team, i));

  const scratch = {
    1: standing[1].map((r) => ({ ...r, sweep: 0 })),
    2: standing[2].map((r) => ({ ...r, sweep: 0 })),
  };

  for (let run = 0; run < runs; run++) {
    for (const div of [1, 2]) {
      for (const row of scratch[div]) {
        const s = standing[div][idx[div].get(row.team)];
        row.pts = s.pts; row.gd = s.gd; row.sweep = 0;
      }
    }

    for (const m of pending) {
      const r = rnd();
      const H = scratch[m.div][idx[m.div].get(m.h)];
      const A = scratch[m.div][idx[m.div].get(m.a)];
      // a rough margin, enough to keep goal difference a live tiebreak
      const margin = 1 + (rnd() < 0.34 ? 1 : 0) + (rnd() < 0.12 ? 1 : 0);
      if (r < m.pH) {
        H.pts += 3; H.gd += margin; A.gd -= margin;
        if (owner.has(m.h)) H.sweep += m.valH.win;
      } else if (r < m.pHD) {
        H.pts += 1; A.pts += 1;
        if (owner.has(m.h)) H.sweep += m.valH.draw;
        if (owner.has(m.a)) A.sweep += m.valA.draw;
      } else {
        A.pts += 3; A.gd += margin; H.gd -= margin;
        if (owner.has(m.a)) A.sweep += m.valA.win;
      }
    }

    const totals = {};
    for (const p of players) totals[p] = 0;

    for (const div of [1, 2]) {
      const final = [...scratch[div]].sort(
        (x, y) => y.pts - x.pts || y.gd - x.gd || x.rank - y.rank
      );
      final.forEach((row, i) => {
        const pos = i + 1;
        posRuns.get(row.team).push(pos);
        const who = owner.get(row.team);
        if (!who) return;
        const t = getTeam(row.team);
        let pts = banked[row.team] + row.sweep;

        // Overachievement, measured against the pre-season tip all season
        const places = Math.max(0, t.rank - pos);
        pts += places * SCORING.OVERACHIEVE;

        // Honours the final table settles. Anything awarded by hand is already
        // in banked, so only add what this run's finish would newly earn.
        const already = new Set(medalsForTeam(row.team, tables, complete, manualMedals));
        const add = (k) => { if (!already.has(k)) pts += MEDALS[k].pts; };
        if (div === 1) {
          if (pos === 1) add('VC');
          if (pos <= 4) add('DSO');
          if (t.rank > DIV_SIZE[1] / 2 && pos <= 17) add('SURVIVAL');
        } else {
          if (pos === 1) add('CHAMP_TITLE');
          if (pos <= 2) add('PROMOTION');
        }
        totals[who] += pts;
      });
    }

    for (const p of players) sweepRuns.get(p).push(totals[p] + playerBonus[p]);
    const order = [...players].sort((x, y) => (totals[y] + playerBonus[y]) - (totals[x] + playerBonus[x]));
    order.forEach((p, i) => rankRuns.get(p).push(i + 1));
  }

  // ── Club summaries ────────────────────────────────────────────────────────
  const clubs = {};
  for (const t of TEAMS) {
    const list = posRuns.get(t.name);
    if (!list || !list.length) continue;
    const sorted = [...list].sort((a, b) => a - b);
    const n = sorted.length;
    const count = (fn) => sorted.reduce((s, v) => s + (fn(v) ? 1 : 0), 0) / n;
    const table = t.div === 1 ? tables.d1 : tables.d2;
    const nowIdx = table.findIndex((r) => r.team === t.name);
    clubs[t.name] = {
      div: t.div,
      tipped: t.rank,
      now: nowIdx === -1 ? null : nowIdx + 1,
      median: median(sorted),
      best: pctile(sorted, 5),
      worst: pctile(sorted, 95),
      pTitle: count((v) => v === 1),
      pTop: t.div === 1 ? count((v) => v <= 4) : count((v) => v <= 2),
      pPlayoff: t.div === 2 ? count((v) => v >= 3 && v <= 6) : 0,
      pDown: count((v) => v > DIV_SIZE[t.div] - 3),
      owner: owner.get(t.name) || null,
    };
  }

  // ── Player summaries ──────────────────────────────────────────────────────
  const out = {};
  const last = players.length;
  for (const p of players) {
    const pts = [...sweepRuns.get(p)].sort((a, b) => a - b);
    const ranks = rankRuns.get(p);
    const n = ranks.length || 1;
    const share = (fn) => ranks.reduce((s, v) => s + (fn(v) ? 1 : 0), 0) / n;
    const bankedNow = (assignments[p] || [])
      .filter(Boolean)
      .reduce((s, t) => s + (banked[t] || 0), 0) + playerBonus[p];
    out[p] = {
      banked: bankedNow,
      projected: Math.round(median(pts)),
      floor: Math.round(pctile(pts, 5)),
      ceiling: Math.round(pctile(pts, 95)),
      pFirst: share((v) => v === 1),
      pSecond: share((v) => v === 2),
      pPaid: share((v) => v <= 2 || v === last),
      pLast: share((v) => v === last),
      medianRank: median([...ranks].sort((a, b) => a - b)),
    };
  }

  return { clubs, players: out, runs };
}

// Three screens want the same projection and it costs ~150ms, so it is computed
// once per meaningful change rather than once per component.
let cache = null;

export function getProjection(assignments = {}, fixtures = [], manualMedals = {}, bonusPoints = {}) {
  const played = fixtures.reduce((n, f) => n + (f.status === 'FINISHED' ? 1 : 0), 0);
  const key = [
    played,
    fixtures.length,
    Object.entries(assignments).map(([p, t]) => `${p}:${(t || []).join(',')}`).sort().join('|'),
    Object.entries(manualMedals).map(([t, m]) => `${t}:${(m || []).join(',')}`).sort().join('|'),
    Object.entries(bonusPoints)
      .map(([p, m]) => `${p}:${Object.entries(m || {}).map(([k, b]) => `${k}=${b.pts}`).sort().join(',')}`)
      .sort().join('|'),
  ].join('#');
  if (cache && cache.key === key) return cache.value;
  const value = projectSeason(assignments, fixtures, manualMedals, RUNS, bonusPoints);
  cache = { key, value };
  return value;
}

// The projected final table for one division, strongest first
export function projectedTable(projection, div) {
  return Object.entries(projection.clubs)
    .filter(([, c]) => c.div === div)
    .map(([team, c]) => ({ team, ...c }))
    .sort((a, b) => a.median - b.median || b.pTitle - a.pTitle || a.tipped - b.tipped)
    .map((row, i) => ({ ...row, pos: i + 1 }));
}
