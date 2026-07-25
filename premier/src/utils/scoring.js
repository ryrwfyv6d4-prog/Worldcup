import { MEDALS, SCORING, TEAMS, getTeam } from '../data/england2027.js';
import { valueForFixture, matchValue, winProbability } from './odds.js';

// Pre-season odds rank, used as the final table tiebreak so an all-zero table
// isn't alphabetical.
const RANK = new Map(TEAMS.map((t) => [t.name, t.rank + (t.div === 1 ? 0 : 100)]));

const ROUNDS = { 1: 38, 2: 46 };

// ── Real league tables (3/1/0) ───────────────────────────────────────────────
export function leagueTable(fixtures, div) {
  const rows = {};
  for (const t of TEAMS.filter((t) => t.div === div)) {
    rows[t.name] = { team: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }
  for (const f of fixtures) {
    if (f.division !== div || f.status !== 'FINISHED') continue;
    const h = rows[f.homeTeam.name];
    const a = rows[f.awayTeam.name];
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += f.score.home; h.ga += f.score.away;
    a.gf += f.score.away; a.ga += f.score.home;
    if (f.score.winner === 'HOME_TEAM') { h.w++; a.l++; h.pts += 3; }
    else if (f.score.winner === 'AWAY_TEAM') { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  for (const r of Object.values(rows)) r.gd = r.gf - r.ga;
  return Object.values(rows).sort(
    (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || RANK.get(x.team) - RANK.get(y.team)
  );
}

export function divisionComplete(fixtures, div) {
  const teams = TEAMS.filter((t) => t.div === div).length;
  const finished = fixtures.filter((f) => f.division === div && f.status === 'FINISHED').length;
  return finished >= (ROUNDS[div] * teams) / 2;
}

export function buildTables(fixtures) {
  return { d1: leagueTable(fixtures, 1), d2: leagueTable(fixtures, 2) };
}
export function buildComplete(fixtures) {
  return { d1: divisionComplete(fixtures, 1), d2: divisionComplete(fixtures, 2) };
}

// ── Match points: priced per fixture from the odds ───────────────────────────
export function teamPoints(team, fixtures) {
  let total = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    const isHome = f.homeTeam.name === team;
    const isAway = f.awayTeam.name === team;
    if (!isHome && !isAway) continue;
    gf += isHome ? f.score.home : f.score.away;
    ga += isHome ? f.score.away : f.score.home;
    const val = valueForFixture(f, team);
    if (f.score.winner === 'DRAW') { total += val.draw; d++; }
    else if ((f.score.winner === 'HOME_TEAM' && isHome) || (f.score.winner === 'AWAY_TEAM' && isAway)) {
      total += val.win; w++;
    } else l++;
  }
  return { total, w, d, l, gf, ga };
}

// ── Overachievement: places finished above your pre-season rank ──────────────
export function overachieveForTeam(team, tables, complete) {
  const t = getTeam(team);
  const blank = { places: 0, pts: 0, pos: null, tipped: t ? t.rank : null, live: false, settled: false };
  if (!t) return blank;
  const table = t.div === 1 ? tables.d1 : tables.d2;
  const row = table.find((r) => r.team === team);
  if (!row) return blank;
  const pos = table.findIndex((r) => r.team === team) + 1;
  // Before a handful of games the table is noise, so this doesn't count yet
  if (row.p < SCORING.OVERACHIEVE_MIN_GAMES) {
    return { ...blank, pos, live: false };
  }
  const places = Math.max(0, t.rank - pos);
  return {
    places,
    pts: places * SCORING.OVERACHIEVE,
    pos,
    tipped: t.rank,
    live: true,
    settled: t.div === 1 ? complete.d1 : complete.d2,
  };
}

// ── Honours ─────────────────────────────────────────────────────────────────
export function medalsForTeam(team, tables, complete, manualMedals = {}) {
  const medals = [];
  const t = getTeam(team);
  if (!t) return medals;
  if (t.div === 1 && complete.d1) {
    const pos = tables.d1.findIndex((r) => r.team === team) + 1;
    if (pos === 1) medals.push('VC');
    if (pos >= 1 && pos <= 4) medals.push('DSO');
    if (t.pot === 'B' && pos <= 17) medals.push('SURVIVAL');
  }
  if (t.div === 2 && complete.d2) {
    const pos = tables.d2.findIndex((r) => r.team === team) + 1;
    if (pos === 1) medals.push('CHAMP_TITLE');
    if (pos <= 2) medals.push('PROMOTION');
  }
  for (const k of manualMedals[team] || []) {
    if (MEDALS[k] && !medals.includes(k)) medals.push(k);
  }
  return medals;
}

// ── Player totals & the ladder ──────────────────────────────────────────────
export function calculatePoints(player, assignments, tables, complete, fixtures, manualMedals) {
  const myTeams = (assignments[player] || []).filter(Boolean);
  let total = 0;
  const breakdown = [];
  for (const team of myTeams) {
    const pts = teamPoints(team, fixtures);
    const medalKeys = medalsForTeam(team, tables, complete, manualMedals);
    const medalPts = medalKeys.reduce((s, k) => s + MEDALS[k].pts, 0);
    const oa = overachieveForTeam(team, tables, complete);
    total += pts.total + medalPts + oa.pts;
    breakdown.push({ team, ...pts, medals: medalKeys, medalPts, oa, pot: getTeam(team)?.pot });
  }
  return { total, breakdown };
}

// Tiebreak: points -> wins -> aggregate goal difference -> goals scored
export function buildLadder(assignments, fixtures, manualMedals = {}) {
  const tables = buildTables(fixtures);
  const complete = buildComplete(fixtures);
  return Object.keys(assignments)
    .map((name) => {
      const { total, breakdown } = calculatePoints(name, assignments, tables, complete, fixtures, manualMedals);
      const wins = breakdown.reduce((s, b) => s + b.w, 0);
      const gf = breakdown.reduce((s, b) => s + b.gf, 0);
      const ga = breakdown.reduce((s, b) => s + b.ga, 0);
      const oaPts = breakdown.reduce((s, b) => s + b.oa.pts, 0);
      return {
        name, total, breakdown, oaPts,
        teams: (assignments[name] || []).filter(Boolean),
        tb: { wins, gd: gf - ga, gf },
      };
    })
    .sort((a, b) =>
      b.total - a.total || b.tb.wins - a.tb.wins || b.tb.gd - a.tb.gd || b.tb.gf - a.tb.gf ||
      a.name.localeCompare(b.name)
    );
}

// ── Match-sheet helpers ─────────────────────────────────────────────────────
export function formForTeam(team, fixtures, n = 5) {
  return fixtures
    .filter((f) => f.status === 'FINISHED' && (f.homeTeam.name === team || f.awayTeam.name === team))
    .sort((a, b) => (b.utcDate || '').localeCompare(a.utcDate || ''))
    .slice(0, n)
    .map((f) => {
      if (f.score.winner === 'DRAW') return 'D';
      const won = (f.score.winner === 'HOME_TEAM' && f.homeTeam.name === team) ||
                  (f.score.winner === 'AWAY_TEAM' && f.awayTeam.name === team);
      return won ? 'W' : 'L';
    });
}

export function positionOf(team, table) {
  const i = table.findIndex((r) => r.team === team);
  return i === -1 ? null : i + 1;
}

export function reverseFixture(fixture, fixtures) {
  return fixtures.find(
    (f) => f.division === fixture.division &&
      f.homeTeam.name === fixture.awayTeam.name &&
      f.awayTeam.name === fixture.homeTeam.name
  ) || null;
}

// ── Projections (Monte Carlo) ───────────────────────────────────────────────
function mulberry32(seed) {
  return function rand() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FORM_WEIGHT = 8; // games of belief in the odds before form takes over

// Blend the pre-season odds probability with how the club is actually going
function shrunkWinProb(team, opp, isHome, form) {
  const base = winProbability(team, opp, isHome);
  if (base == null) return 0;
  const played = form.w + form.d + form.l;
  if (!played) return base;
  const actual = form.w / played;
  return (base * FORM_WEIGHT + actual * played) / (FORM_WEIGHT + played);
}

// Places a club could still climb, bounded by 3 league points per game remaining
function reachableClimb(team, tables) {
  const t = getTeam(team);
  if (!t) return 0;
  const table = t.div === 1 ? tables.d1 : tables.d2;
  const row = table.find((r) => r.team === team);
  if (!row) return 0;
  const pos = table.findIndex((r) => r.team === team) + 1;
  const maxGain = 3 * Math.max(0, ROUNDS[t.div] - row.p);
  const blockers = table.slice(0, pos - 1).filter((r) => r.pts > row.pts + maxGain).length;
  const bestPos = blockers + 1;
  return Math.max(0, t.rank - bestPos);
}

function reachableMedalPoints(team, tables, manualMedals = {}) {
  const t = getTeam(team);
  if (!t) return 0;
  const table = t.div === 1 ? tables.d1 : tables.d2;
  const row = table.find((r) => r.team === team);
  if (!row) return 0;
  const pos = table.findIndex((r) => r.team === team) + 1;
  const maxGain = 3 * Math.max(0, ROUNDS[t.div] - row.p);
  const canReach = (targetPos) => {
    const target = table[targetPos - 1];
    if (!target) return false;
    if (pos <= targetPos) return true;
    return row.pts + maxGain >= target.pts;
  };
  let pts = 0;
  if (t.div === 1) {
    if (canReach(1)) pts += MEDALS.VC.pts;
    if (canReach(4)) pts += MEDALS.DSO.pts;
    if (t.pot === 'B') {
      const safety = table[16];
      if (!safety || row.pts + maxGain >= safety.pts) pts += MEDALS.SURVIVAL.pts;
    }
  } else {
    if (canReach(1)) pts += MEDALS.CHAMP_TITLE.pts;
    if (canReach(2)) pts += MEDALS.PROMOTION.pts;
    if (canReach(6)) pts += MEDALS.BIG_PUSH.pts;
  }
  if ((manualMedals[team] || []).includes('BIG_PUSH')) pts = Math.max(0, pts - MEDALS.BIG_PUSH.pts);
  return pts;
}

const SIMS = 300;
const pct = (sorted, p) => (sorted.length
  ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))]
  : 0);

export function computeOutlook(assignments, fixtures, manualMedals = {}) {
  const players = Object.keys(assignments);
  if (!players.length) return {};

  const tables = buildTables(fixtures);
  const complete = buildComplete(fixtures);
  const seasonOver = complete.d1 && complete.d2;
  const owned = [...new Set(players.flatMap((p) => (assignments[p] || []).filter(Boolean)))];

  const banked = {}, upside = {}, sims = {};
  const rand = mulberry32(20262027);

  for (const team of owned) {
    const form = teamPoints(team, fixtures);
    const medalKeys = medalsForTeam(team, tables, complete, manualMedals);
    const oa = overachieveForTeam(team, tables, complete);
    banked[team] = form.total + medalKeys.reduce((s, k) => s + MEDALS[k].pts, 0) + oa.pts;
    upside[team] = seasonOver
      ? 0
      : reachableMedalPoints(team, tables, manualMedals) + reachableClimb(team, tables) * SCORING.OVERACHIEVE;

    const remaining = fixtures.filter(
      (f) => f.status !== 'FINISHED' && (f.homeTeam.name === team || f.awayTeam.name === team)
    );
    const priced = remaining.map((f) => {
      const isHome = f.homeTeam.name === team;
      const opp = isHome ? f.awayTeam.name : f.homeTeam.name;
      return { win: matchValue(team, opp, isHome).win, p: shrunkWinProb(team, opp, isHome, form) };
    });

    const arr = new Array(SIMS);
    for (let s = 0; s < SIMS; s++) {
      let pts = 0;
      for (const m of priced) {
        const r = rand();
        if (r < m.p) pts += m.win;
        else if (r < m.p + 0.25) pts += SCORING.DRAW;
      }
      arr[s] = pts;
    }
    sims[team] = arr;
  }

  const out = {};
  for (const p of players) {
    const teams = (assignments[p] || []).filter(Boolean);
    const base = teams.reduce((s, t) => s + (banked[t] || 0), 0);
    const up = teams.reduce((s, t) => s + (upside[t] || 0), 0);
    const totals = new Array(SIMS);
    for (let s = 0; s < SIMS; s++) {
      let sum = base;
      for (const t of teams) sum += sims[t][s];
      totals[s] = sum;
    }
    totals.sort((a, b) => a - b);
    out[p] = {
      banked: base,
      projected: Math.round(pct(totals, 50)),
      floor: Math.round(pct(totals, 5)),
      ceiling: Math.round(pct(totals, 95)) + up,
    };
  }

  const leader = players.reduce((best, p) => (out[p].projected > out[best].projected ? p : best), players[0]);
  const bar = out[leader].projected;
  for (const p of players) out[p].cooked = p !== leader && out[p].ceiling < bar;
  return out;
}

// ── Time-window helpers ─────────────────────────────────────────────────────
export function todayPoints(player, assignments, fixtures) {
  const today = new Date().toLocaleDateString('en-CA');
  const todays = fixtures.filter(
    (f) => f.status === 'FINISHED' && f.utcDate &&
      new Date(f.utcDate).toLocaleDateString('en-CA') === today
  );
  let sum = 0;
  for (const team of (assignments[player] || []).filter(Boolean)) sum += teamPoints(team, todays).total;
  return sum;
}

export function pointsBetween(player, assignments, fixtures, from, to) {
  const inWindow = fixtures.filter((f) => {
    if (f.status !== 'FINISHED' || !f.utcDate) return false;
    const t = new Date(f.utcDate);
    return t >= from && t < to;
  });
  let sum = 0;
  for (const team of (assignments[player] || []).filter(Boolean)) sum += teamPoints(team, inWindow).total;
  return sum;
}

export function campaignMonths() {
  const out = [];
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const [y, m] of [[2026,7],[2026,8],[2026,9],[2026,10],[2026,11],[2027,0],[2027,1],[2027,2],[2027,3],[2027,4]]) {
    out.push({ y, m, label: `${names[m]} ${String(y).slice(2)}` });
  }
  return out;
}

export function monthlyRace(assignments, fixtures) {
  return campaignMonths().map(({ y, m, label }) => {
    const from = new Date(y, m, 1);
    const to = new Date(m === 11 ? y + 1 : y, (m + 1) % 12, 1);
    const rows = Object.keys(assignments)
      .map((p) => ({ name: p, pts: pointsBetween(p, assignments, fixtures, from, to) }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
    const over = to <= new Date();
    const top = rows[0]?.pts || 0;
    return { y, m, label, rows, over, winners: top > 0 ? rows.filter((r) => r.pts === top).map((r) => r.name) : [] };
  });
}

export function feedEvents(assignments, fixtures, limit = 20) {
  const owner = (team) => {
    for (const [name, teams] of Object.entries(assignments)) if ((teams || []).includes(team)) return name;
    return null;
  };
  const events = [];
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    for (const side of ['home', 'away']) {
      const team = side === 'home' ? f.homeTeam.name : f.awayTeam.name;
      const who = owner(team);
      if (!who) continue;
      const val = valueForFixture(f, team);
      const won = (f.score.winner === 'HOME_TEAM' && side === 'home') || (f.score.winner === 'AWAY_TEAM' && side === 'away');
      const drew = f.score.winner === 'DRAW';
      events.push({
        fixture: f, team, owner: who,
        pts: won ? val.win : drew ? val.draw : 0,
        result: won ? 'W' : drew ? 'D' : 'L',
        ts: f.utcDate,
      });
    }
  }
  return events.sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, limit);
}

// ── My Weekend ──────────────────────────────────────────────────────────────
export function myWeekend(player, assignments, fixtures) {
  const teams = (assignments[player] || []).filter(Boolean);
  if (!teams.length) return { window: null, matches: [] };
  const mine = fixtures.filter(
    (f) => teams.includes(f.homeTeam.name) || teams.includes(f.awayTeam.name)
  );
  const now = Date.now();
  const upcoming = mine
    .filter((f) => f.utcDate && (f.status !== 'FINISHED' || new Date(f.utcDate).getTime() > now - 48 * 3600 * 1000))
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
  const anchor = upcoming[0] || mine[mine.length - 1];
  if (!anchor || !anchor.utcDate) return { window: null, matches: [] };

  const a = new Date(anchor.utcDate);
  const start = new Date(a); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((a.getDay() + 2) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 4);

  const matches = mine
    .filter((f) => {
      if (!f.utcDate) return false;
      const t = new Date(f.utcDate);
      return t >= start && t < end;
    })
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));

  return { window: { start, end }, matches };
}
