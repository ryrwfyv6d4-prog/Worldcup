import { POT_POINTS, MEDALS, potFor, TEAMS } from '../data/england2027.js';

// Pre-season rank (TEAMS is listed best-first by bookies' odds within each pot),
// used as the final table tiebreak so an all-zero table isn't alphabetical.
const RANK = new Map(TEAMS.map((t, i) => [t.name, i]));

const PL_ROUNDS = 38;
const CH_ROUNDS = 46;

// ── Real league tables (3/1/0, sorted pts → GD → GF) ─────────────────────────
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
  const rounds = div === 1 ? PL_ROUNDS : CH_ROUNDS;
  const teams = TEAMS.filter((t) => t.div === div).length;
  const finished = fixtures.filter((f) => f.division === div && f.status === 'FINISHED').length;
  return finished >= (rounds * teams) / 2;
}

// ── Weekly sweep points for one team ─────────────────────────────────────────
export function teamPoints(team, fixtures) {
  const pot = potFor(team);
  if (!pot) return { total: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pot };
  const rate = POT_POINTS[pot];
  let total = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    const isHome = f.homeTeam.name === team;
    const isAway = f.awayTeam.name === team;
    if (!isHome && !isAway) continue;
    gf += isHome ? f.score.home : f.score.away;
    ga += isHome ? f.score.away : f.score.home;
    if (f.score.winner === 'DRAW') { total += rate.draw; d++; }
    else if ((f.score.winner === 'HOME_TEAM' && isHome) || (f.score.winner === 'AWAY_TEAM' && isAway)) { total += rate.win; w++; }
    else l++;
  }
  return { total, w, d, l, gf, ga, pot };
}

// ── Medals ───────────────────────────────────────────────────────────────────
// League-decided medals land automatically once a division's season completes.
// BIG_PUSH (play-off final) and CUP aren't in the league feeds, so they're
// awarded by hand in HQ → Honours and passed in as `manualMedals`.
export function medalsForTeam(team, tables, complete, manualMedals = {}) {
  const medals = [];
  const t = TEAMS.find((x) => x.name === team);
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

// ── Player totals & the ladder ───────────────────────────────────────────────
export function calculatePoints(player, assignments, tables, complete, fixtures, manualMedals) {
  const myTeams = (assignments[player] || []).filter(Boolean);
  let total = 0;
  const breakdown = [];
  for (const team of myTeams) {
    const pts = teamPoints(team, fixtures);
    const medalKeys = medalsForTeam(team, tables, complete, manualMedals);
    const medalPts = medalKeys.reduce((s, k) => s + MEDALS[k].pts, 0);
    total += pts.total + medalPts;
    breakdown.push({ team, ...pts, medals: medalKeys, medalPts });
  }
  return { total, breakdown };
}

// Tiebreak cascade, in order: sweep points → wins → aggregate goal difference
// → goals scored → (finally) name, so the order is never undefined.
export function buildLadder(assignments, fixtures, manualMedals = {}) {
  const tables = { d1: leagueTable(fixtures, 1), d2: leagueTable(fixtures, 2) };
  const complete = { d1: divisionComplete(fixtures, 1), d2: divisionComplete(fixtures, 2) };
  return Object.keys(assignments)
    .map((name) => {
      const { total, breakdown } = calculatePoints(name, assignments, tables, complete, fixtures, manualMedals);
      const wins = breakdown.reduce((s, b) => s + b.w, 0);
      const gf = breakdown.reduce((s, b) => s + b.gf, 0);
      const ga = breakdown.reduce((s, b) => s + b.ga, 0);
      return {
        name, total, breakdown,
        teams: (assignments[name] || []).filter(Boolean),
        tb: { wins, gd: gf - ga, gf },
      };
    })
    .sort((a, b) =>
      b.total - a.total ||
      b.tb.wins - a.tb.wins ||
      b.tb.gd - a.tb.gd ||
      b.tb.gf - a.tb.gf ||
      a.name.localeCompare(b.name)
    );
}

// ── Match-sheet helpers ──────────────────────────────────────────────────────
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

// ── Projections (Monte Carlo) ────────────────────────────────────────────────
// The old version assumed a team wins every remaining match, which put opening
// ceilings near 800 against a realistic winning total of ~230 — so nobody was
// ever "cooked". This simulates the rest of the season instead.

// Deterministic PRNG so badges don't flicker between renders
function mulberry32(seed) {
  return function rand() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pre-season win/draw rates by pot, from the pot's competitive level
const PRIOR = {
  A: { w: 0.50, d: 0.24 },
  B: { w: 0.30, d: 0.26 },
  C: { w: 0.42, d: 0.27 },
  D: { w: 0.32, d: 0.27 },
};
const PRIOR_WEIGHT = 6; // games of "belief" in the prior before form takes over

function ratesForTeam(team, fixtures) {
  const t = TEAMS.find((x) => x.name === team);
  if (!t) return { w: 0, d: 0 };
  const prior = PRIOR[t.pot];
  const { w, d, l } = teamPoints(team, fixtures);
  const played = w + d + l;
  const n = played + PRIOR_WEIGHT;
  return {
    w: (prior.w * PRIOR_WEIGHT + w) / n,
    d: (prior.d * PRIOR_WEIGHT + d) / n,
  };
}

// Medals a team could still mathematically reach (can't gain >3 league pts/game)
function reachableMedalPoints(team, tables, manualMedals = {}) {
  const t = TEAMS.find((x) => x.name === team);
  if (!t) return 0;
  const table = t.div === 1 ? tables.d1 : tables.d2;
  const row = table.find((r) => r.team === team);
  if (!row) return 0;
  const rounds = t.div === 1 ? PL_ROUNDS : CH_ROUNDS;
  const maxGain = 3 * Math.max(0, rounds - row.p);
  const canReach = (targetPos) => {
    const target = table[targetPos - 1];
    if (!target) return false;
    if (row === target || table.indexOf(row) < targetPos) return true;
    return row.pts + maxGain >= target.pts;
  };
  let pts = 0;
  if (t.div === 1) {
    if (canReach(1)) pts += MEDALS.VC.pts;
    if (canReach(4)) pts += MEDALS.DSO.pts;
    if (t.pot === 'B') {
      const safety = table[16]; // 17th
      if (!safety || row.pts + maxGain >= safety.pts) pts += MEDALS.SURVIVAL.pts;
    }
  } else {
    if (canReach(1)) pts += MEDALS.CHAMP_TITLE.pts;
    if (canReach(2)) pts += MEDALS.PROMOTION.pts;
    if (canReach(6)) pts += MEDALS.BIG_PUSH.pts; // play-offs are top six
  }
  // Already-awarded manual medals are banked, not upside
  for (const k of manualMedals[team] || []) {
    if (k === 'BIG_PUSH') pts = Math.max(0, pts - MEDALS.BIG_PUSH.pts);
  }
  return pts;
}

const SIMS = 300;

function pct(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const i = Math.min(sortedArr.length - 1, Math.max(0, Math.round((p / 100) * (sortedArr.length - 1))));
  return sortedArr[i];
}

// Simulate the remaining season and return per-player projections.
// projected = median outcome, ceiling = 95th percentile + reachable medals.
export function computeOutlook(assignments, fixtures, manualMedals = {}) {
  const players = Object.keys(assignments);
  if (!players.length) return {};

  const tables = { d1: leagueTable(fixtures, 1), d2: leagueTable(fixtures, 2) };
  const complete = { d1: divisionComplete(fixtures, 1), d2: divisionComplete(fixtures, 2) };

  // Per-team: banked points now, plus SIMS simulated remaining-season totals
  const owned = [...new Set(players.flatMap((p) => (assignments[p] || []).filter(Boolean)))];
  const teamSims = {};
  const teamBanked = {};
  const teamMedalUpside = {};
  const rand = mulberry32(20262027);

  for (const team of owned) {
    const t = TEAMS.find((x) => x.name === team);
    const rate = POT_POINTS[t?.pot] || { win: 0, draw: 0 };
    const { w: pw, d: pd } = ratesForTeam(team, fixtures);
    const remaining = fixtures.filter(
      (f) => f.status !== 'FINISHED' && (f.homeTeam.name === team || f.awayTeam.name === team)
    ).length;

    const banked = teamPoints(team, fixtures).total +
      medalsForTeam(team, tables, complete, manualMedals).reduce((s, k) => s + MEDALS[k].pts, 0);
    teamBanked[team] = banked;
    teamMedalUpside[team] = complete.d1 && complete.d2 ? 0 : reachableMedalPoints(team, tables, manualMedals);

    const sims = new Array(SIMS);
    for (let s = 0; s < SIMS; s++) {
      let pts = 0;
      for (let g = 0; g < remaining; g++) {
        const r = rand();
        if (r < pw) pts += rate.win;
        else if (r < pw + pd) pts += rate.draw;
      }
      sims[s] = pts;
    }
    teamSims[team] = sims;
  }

  const out = {};
  for (const p of players) {
    const teams = (assignments[p] || []).filter(Boolean);
    const banked = teams.reduce((s, t) => s + (teamBanked[t] || 0), 0);
    const medalUpside = teams.reduce((s, t) => s + (teamMedalUpside[t] || 0), 0);
    const totals = new Array(SIMS);
    for (let s = 0; s < SIMS; s++) {
      let sum = banked;
      for (const t of teams) sum += teamSims[t][s];
      totals[s] = sum;
    }
    totals.sort((a, b) => a - b);
    out[p] = {
      banked,
      projected: Math.round(pct(totals, 50)),
      floor: Math.round(pct(totals, 5)),
      ceiling: Math.round(pct(totals, 95)) + medalUpside,
    };
  }

  // Cooked: even a top-5% run leaves you short of the leader's median outcome
  const leader = players.reduce((best, p) => (out[p].projected > out[best].projected ? p : best), players[0]);
  const bar = out[leader].projected;
  for (const p of players) out[p].cooked = p !== leader && out[p].ceiling < bar;

  return out;
}

// ── Time-window helpers ──────────────────────────────────────────────────────
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
      const t = TEAMS.find((x) => x.name === team);
      if (!t) continue;
      const rate = POT_POINTS[t.pot];
      const won = (f.score.winner === 'HOME_TEAM' && side === 'home') || (f.score.winner === 'AWAY_TEAM' && side === 'away');
      const drew = f.score.winner === 'DRAW';
      const pts = won ? rate.win : drew ? rate.draw : 0;
      events.push({ fixture: f, team, owner: who, pts, result: won ? 'W' : drew ? 'D' : 'L', ts: f.utcDate });
    }
  }
  return events.sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, limit);
}

// ── My Weekend ───────────────────────────────────────────────────────────────
// The next (or current) weekend's fixtures involving a player's four clubs,
// across both divisions. Window runs Fri 00:00 → Mon 06:00 around the next
// fixture, so midweek rounds get their own "weekend" too.
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
  start.setDate(start.getDate() - ((a.getDay() + 2) % 7)); // back to Friday
  const end = new Date(start); end.setDate(end.getDate() + 4); // through Monday

  const matches = mine
    .filter((f) => {
      if (!f.utcDate) return false;
      const t = new Date(f.utcDate);
      return t >= start && t < end;
    })
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));

  return { window: { start, end }, matches };
}
