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
