import { POT_POINTS, MEDALS, potFor, TEAMS } from '../data/england2027.js';

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
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team));
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
  if (!pot) return { total: 0, w: 0, d: 0, l: 0, pot };
  const rate = POT_POINTS[pot];
  let total = 0, w = 0, d = 0, l = 0;
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    const isHome = f.homeTeam.name === team;
    const isAway = f.awayTeam.name === team;
    if (!isHome && !isAway) continue;
    if (f.score.winner === 'DRAW') { total += rate.draw; d++; }
    else if ((f.score.winner === 'HOME_TEAM' && isHome) || (f.score.winner === 'AWAY_TEAM' && isAway)) { total += rate.win; w++; }
    else l++;
  }
  return { total, w, d, l, pot };
}

// ── Medals — only awarded once a division's season is complete ──────────────
// (Play-off final & cups aren't in the league feeds: BIG_PUSH and CUP are
// flagged manually via the medal overrides in settings/state later.)
export function medalsForTeam(team, fixtures, tables, complete) {
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
  return medals;
}

// ── Player totals & the ladder ───────────────────────────────────────────────
export function calculatePoints(player, assignments, fixtures, tables, complete) {
  const myTeams = assignments[player] || [];
  let total = 0;
  const breakdown = [];
  for (const team of myTeams) {
    const pts = teamPoints(team, fixtures);
    const medalKeys = medalsForTeam(team, fixtures, tables, complete);
    const medalPts = medalKeys.reduce((s, k) => s + MEDALS[k].pts, 0);
    total += pts.total + medalPts;
    breakdown.push({ team, ...pts, medals: medalKeys, medalPts });
  }
  return { total, breakdown };
}

export function buildLadder(assignments, fixtures) {
  const tables = { d1: leagueTable(fixtures, 1), d2: leagueTable(fixtures, 2) };
  const complete = { d1: divisionComplete(fixtures, 1), d2: divisionComplete(fixtures, 2) };
  return Object.keys(assignments)
    .map((name) => {
      const { total, breakdown } = calculatePoints(name, assignments, fixtures, tables, complete);
      return { name, total, breakdown, teams: assignments[name] || [] };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

// ── Match-sheet helpers ──────────────────────────────────────────────────────
// Last n finished results for a team, newest first: ['W','D','L',...]
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

// The reverse fixture of the same pairing this season
export function reverseFixture(fixture, fixtures) {
  return fixtures.find(
    (f) => f.division === fixture.division &&
      f.homeTeam.name === fixture.awayTeam.name &&
      f.awayTeam.name === fixture.homeTeam.name
  ) || null;
}

// ── Projections & badges ─────────────────────────────────────────────────────
// Ceiling for one team: win every remaining game + every medal it could still win
export function maxForTeam(team, fixtures) {
  const t = TEAMS.find((x) => x.name === team);
  if (!t) return 0;
  const rate = POT_POINTS[t.pot];
  const current = teamPoints(team, fixtures).total;
  const remaining = fixtures.filter(
    (f) => f.status !== 'FINISHED' && (f.homeTeam.name === team || f.awayTeam.name === team)
  ).length;
  let medalMax = 0;
  if (t.div === 1) {
    medalMax = MEDALS.VC.pts + MEDALS.DSO.pts + (t.pot === 'B' ? MEDALS.SURVIVAL.pts : 0);
  } else {
    medalMax = MEDALS.PROMOTION.pts + MEDALS.CHAMP_TITLE.pts + MEDALS.BIG_PUSH.pts;
  }
  return current + remaining * rate.win + medalMax;
}

export function maxForPlayer(player, assignments, fixtures) {
  return (assignments[player] || []).reduce((s, t) => s + maxForTeam(t, fixtures), 0);
}

// Points a player earned from matches finished on the viewer's local date
export function todayPoints(player, assignments, fixtures) {
  const today = new Date().toLocaleDateString('en-CA');
  const todays = fixtures.filter(
    (f) => f.status === 'FINISHED' && f.utcDate &&
      new Date(f.utcDate).toLocaleDateString('en-CA') === today
  );
  let sum = 0;
  for (const team of assignments[player] || []) sum += teamPoints(team, todays).total;
  return sum;
}

// Points earned from matches finished inside [from, to) — Dates
export function pointsBetween(player, assignments, fixtures, from, to) {
  const inWindow = fixtures.filter((f) => {
    if (f.status !== 'FINISHED' || !f.utcDate) return false;
    const t = new Date(f.utcDate);
    return t >= from && t < to;
  });
  let sum = 0;
  for (const team of assignments[player] || []) sum += teamPoints(team, inWindow).total;
  return sum;
}

// Campaign months of the season: [{y, m, label}]
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

// Scoring events for the dispatches feed, newest first
export function feedEvents(assignments, fixtures, limit = 20) {
  const owner = (team) => {
    for (const [name, teams] of Object.entries(assignments)) if (teams.includes(team)) return name;
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
      const rate = POT_POINTS[t.pot];
      const won = (f.score.winner === 'HOME_TEAM' && side === 'home') || (f.score.winner === 'AWAY_TEAM' && side === 'away');
      const drew = f.score.winner === 'DRAW';
      const pts = won ? rate.win : drew ? rate.draw : 0;
      events.push({ fixture: f, team, owner: who, pts, result: won ? 'W' : drew ? 'D' : 'L', ts: f.utcDate });
    }
  }
  return events.sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, limit);
}
