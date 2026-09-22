import { MEDALS, SCORING, TEAMS, DIV_SIZE, getTeam } from '../data/england2027.js';
import { valueForFixture } from './odds.js';

// Pre-season odds rank, used as the final table tiebreak so an all-zero table
// isn't alphabetical.
const RANK = new Map(TEAMS.map((t) => [t.name, t.rank + (t.div === 1 ? 0 : 100)]));

const ROUNDS = { 1: 38, 2: 46 };

// ── Real league tables (3/1/0) ───────────────────────────────────────────────
// mode: 'all' (default) | 'home' | 'away' | 'form' (each club's last 6)
function blankRow(team) {
  return { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

function applyResult(row, f, teamName) {
  const isHome = f.homeTeam.name === teamName;
  const my = isHome ? f.score.home : f.score.away;
  const their = isHome ? f.score.away : f.score.home;
  if (my == null || their == null) return;
  row.p++; row.gf += my; row.ga += their;
  if (my > their) { row.w++; row.pts += 3; }
  else if (my < their) { row.l++; }
  else { row.d++; row.pts++; }
}

// Every finished match a club played, newest first
function playedBy(team, fixtures, div) {
  return fixtures
    .filter((f) => f.division === div && f.status === 'FINISHED' &&
      (f.homeTeam.name === team || f.awayTeam.name === team))
    .sort((a, b) => (b.utcDate || '').localeCompare(a.utcDate || ''));
}

export const TABLE_MODES = [
  { key: 'all', label: 'Overall' },
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
  { key: 'form', label: 'Form 6' },
];

export function leagueTable(fixtures, div, mode = 'all') {
  const rows = {};
  for (const t of TEAMS.filter((x) => x.div === div)) {
    rows[t.name] = blankRow(t.name);
    let mine = playedBy(t.name, fixtures, div);
    if (mode === 'home') mine = mine.filter((f) => f.homeTeam.name === t.name);
    else if (mode === 'away') mine = mine.filter((f) => f.awayTeam.name === t.name);
    else if (mode === 'form') mine = mine.slice(0, 6);
    for (const f of mine) applyResult(rows[t.name], f, t.name);
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

// What one fixture is worth to one club, and what it actually paid once
// settled. Same arithmetic teamPoints runs, exposed per match so a result can
// show its own price instead of leaving you to work it out from the score.
export function fixturePoints(fixture, team) {
  const isHome = fixture.homeTeam.name === team;
  const isAway = fixture.awayTeam.name === team;
  if (!isHome && !isAway) return null;

  const val = valueForFixture(fixture, team);
  const base = { win: val.win, draw: val.draw, settled: false, pts: null, outcome: null };
  if (fixture.status !== 'FINISHED') return base;

  const w = fixture.score.winner;
  const outcome = w === 'DRAW' ? 'D'
    : (w === 'HOME_TEAM' && isHome) || (w === 'AWAY_TEAM' && isAway) ? 'W' : 'L';
  return {
    ...base,
    settled: true,
    outcome,
    pts: outcome === 'W' ? val.win : outcome === 'D' ? val.draw : 0,
  };
}

// Who banked what across a set of fixtures — the matchweek's bottom line.
export function pointsHaul(fixtures, assignments) {
  const owner = new Map();
  for (const [name, teams] of Object.entries(assignments)) {
    for (const t of teams || []) if (t) owner.set(t, name);
  }
  const haul = {};
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    for (const side of [f.homeTeam.name, f.awayTeam.name]) {
      const who = owner.get(side);
      if (!who) continue;
      const fp = fixturePoints(f, side);
      haul[who] = (haul[who] || 0) + (fp?.pts || 0);
    }
  }
  return Object.entries(haul)
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, pts]) => ({ name, pts }));
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
    // bottom-half PL club by pre-season odds that stays up
    if (t.rank > DIV_SIZE[1] / 2 && pos <= 17) medals.push('SURVIVAL');
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
// Shed bonuses that don't come off a club — draw-night forfeits, shithousery
// points, whatever HQ has awarded by hand. Stored per player as
// { key: { pts, label } } so each one can be adjusted or withdrawn on its own.
function bonusListFor(player, bonusPoints) {
  const entries = Object.entries((bonusPoints && bonusPoints[player]) || {});
  return entries.map(([key, b]) => ({ key, pts: b.pts, label: b.label }));
}

export function calculatePoints(player, assignments, tables, complete, fixtures, manualMedals, bonusPoints) {
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
  const bonuses = bonusListFor(player, bonusPoints);
  const bonusTotal = bonuses.reduce((s, b) => s + b.pts, 0);
  total += bonusTotal;
  return { total, breakdown, bonuses, bonusTotal };
}

// Tiebreak: points -> wins -> aggregate goal difference -> goals scored
export function buildLadder(assignments, fixtures, manualMedals = {}, bonusPoints = {}) {
  const tables = buildTables(fixtures);
  const complete = buildComplete(fixtures);
  return Object.keys(assignments)
    .map((name) => {
      const { total, breakdown, bonuses, bonusTotal } =
        calculatePoints(name, assignments, tables, complete, fixtures, manualMedals, bonusPoints);
      const wins = breakdown.reduce((s, b) => s + b.w, 0);
      const gf = breakdown.reduce((s, b) => s + b.gf, 0);
      const ga = breakdown.reduce((s, b) => s + b.ga, 0);
      const oaPts = breakdown.reduce((s, b) => s + b.oa.pts, 0);
      return {
        name, total, breakdown, oaPts, bonuses, bonusTotal,
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

// ── Time-window helpers ─────────────────────────────────────────────────────
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

// ── Next 5 / recent form, priced ─────────────────────────────────────────────
// The run of games ahead, with what a win in each is worth. Same idea as a
// fantasy "fixture difficulty" ticker, except denominated in sweep points.
export function nextFixtures(team, fixtures, n = 5) {
  const t = getTeam(team);
  if (!t) return [];
  const now = Date.now();
  return fixtures
    .filter((f) => f.status !== 'FINISHED' && (f.homeTeam.name === team || f.awayTeam.name === team))
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''))
    .filter((f) => !f.utcDate || new Date(f.utcDate).getTime() > now - 3 * 3600 * 1000)
    .slice(0, n)
    .map((f) => {
      const isHome = f.homeTeam.name === team;
      const opp = isHome ? f.awayTeam.name : f.homeTeam.name;
      return { fixture: f, opp, isHome, ...valueForFixture(f, team) };
    });
}

// Last n results with the opponent, score and what it earned
export function recentResults(team, fixtures, n = 6) {
  const t = getTeam(team);
  if (!t) return [];
  return playedBy(team, fixtures, t.div).slice(0, n).map((f) => {
    const isHome = f.homeTeam.name === team;
    const my = isHome ? f.score.home : f.score.away;
    const their = isHome ? f.score.away : f.score.home;
    const val = valueForFixture(f, team);
    const result = my > their ? 'W' : my < their ? 'L' : 'D';
    return {
      fixture: f,
      opp: isHome ? f.awayTeam.name : f.homeTeam.name,
      isHome, my, their, result,
      pts: result === 'W' ? val.win : result === 'D' ? val.draw : 0,
    };
  });
}
