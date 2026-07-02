// Shared elimination logic: which teams are out, and which participants have
// lost every team (the deported). Used by the Graveyard page and nav badges.
import { GROUPS } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from './scoring.js';

export function buildGroupStandings(fixtures) {
  const groups = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    const gFixtures = fixtures.filter(
      f => f.stage === 'GROUP_STAGE' && f.group === letter && f.status === 'FINISHED'
    );
    if (gFixtures.length < 6) continue;
    const standings = {};
    for (const t of teams) standings[t] = { pts: 0, gd: 0, gf: 0 };
    for (const m of gFixtures) {
      const h = normaliseTeamName(m.homeTeam.name);
      const a = normaliseTeamName(m.awayTeam.name);
      if (!standings[h] || !standings[a]) continue;
      standings[h].gf += m.score.home; standings[h].gd += m.score.home - m.score.away;
      standings[a].gf += m.score.away; standings[a].gd += m.score.away - m.score.home;
      if (m.score.winner === 'HOME_TEAM') { standings[h].pts += 3; }
      else if (m.score.winner === 'AWAY_TEAM') { standings[a].pts += 3; }
      else { standings[h].pts += 1; standings[a].pts += 1; }
    }
    const sorted = Object.entries(standings)
      .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    groups[letter] = sorted.map(([team, stats], pos) => ({ team, ...stats, pos }));
  }
  return groups;
}

export function getEliminatedThirds(groupStandings) {
  const completedGroups = Object.keys(groupStandings);
  if (completedGroups.length < 12) return new Set();
  const thirds = completedGroups.map(g => groupStandings[g][2]);
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return new Set(thirds.slice(8).map(t => t.team));
}

export function isTeamEliminated(team, fixtures, groupStandings, eliminatedThirds) {
  for (const rows of Object.values(groupStandings)) {
    const entry = rows.find(r => r.team === team);
    if (!entry) continue;
    if (entry.pos === 3) return 'GROUP_STAGE';
    if (entry.pos === 2 && eliminatedThirds.has(team)) return 'GROUP_STAGE';
    break;
  }
  for (const f of fixtures) {
    if (f.stage === 'GROUP_STAGE' || f.status !== 'FINISHED') continue;
    const h = normaliseTeamName(f.homeTeam.name);
    const a = normaliseTeamName(f.awayTeam.name);
    if (h !== team && a !== team) continue;
    const isHome = h === team;
    const lost = (isHome && f.score.winner === 'AWAY_TEAM') || (!isHome && f.score.winner === 'HOME_TEAM');
    if (lost) return f.stage;
  }
  return null;
}

// Participants whose every team is eliminated, with per-team stages
export function computeFallen(assignments, drawType, fixtures) {
  const groupStandings = buildGroupStandings(fixtures);
  const eliminatedThirds = getEliminatedThirds(groupStandings);
  const fallen = [];
  for (const name of Object.keys(assignments)) {
    const teams = getTeamsForParticipant(name, assignments, drawType);
    if (!teams.length) continue;
    const teamStatuses = teams.map(t => ({
      team: t,
      eliminatedAt: isTeamEliminated(t, fixtures, groupStandings, eliminatedThirds),
    }));
    if (teamStatuses.every(ts => ts.eliminatedAt !== null)) {
      fallen.push({ name, teams: teamStatuses });
    }
  }
  return fallen;
}
