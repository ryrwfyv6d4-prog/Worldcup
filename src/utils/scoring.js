import { GROUPS, STAGE_MAP, SCORING } from '../data/worldcup2026.js';

// Normalise a team name from API to match our static list
export function normaliseTeamName(apiName) {
  const map = {
    'United States': 'USA',
    'United States of America': 'USA',
    'Republic of Korea': 'South Korea',
    'Korea Republic': 'South Korea',
    'Côte d\'Ivoire': 'Ivory Coast',
    "Cote d'Ivoire": 'Ivory Coast',
    'Congo DR': 'DR Congo',
    'IR Iran': 'Iran',
    'Türkiye': 'Turkey',
    'New Zealand': 'New Zealand',
    'England': 'England',
    'Netherlands': 'Netherlands',
  };
  return map[apiName] || apiName;
}

// Get all teams that a participant "owns" based on draw type
export function getTeamsForParticipant(participant, assignments, drawType) {
  const assigned = assignments[participant] || [];
  if (drawType === 'teams') return assigned;
  // drawType === 'groups': return all teams in assigned groups
  return assigned.flatMap((g) => {
    const letter = g.replace('Group ', '');
    return GROUPS[letter] || [];
  });
}

// Calculate points for a participant from an array of match results
export function calculatePoints(participant, assignments, drawType, fixtures) {
  const myTeams = getTeamsForParticipant(participant, assignments, drawType);
  if (!myTeams.length) return { total: 0, breakdown: [] };

  let total = 0;
  const breakdown = [];

  for (const match of fixtures) {
    if (match.status !== 'FINISHED') continue;

    const home = normaliseTeamName(match.homeTeam.name);
    const away = normaliseTeamName(match.awayTeam.name);
    const winner = match.score.winner; // HOME_TEAM | AWAY_TEAM | DRAW | null

    const scoreKey = STAGE_MAP[match.stage];
    if (!scoreKey) continue;

    const isGroupStage = match.stage === 'GROUP_STAGE';

    if (isGroupStage) {
      if (myTeams.includes(home)) {
        if (winner === 'HOME_TEAM') {
          total += SCORING.GROUP_WIN;
          breakdown.push({ match, team: home, pts: SCORING.GROUP_WIN, reason: 'Win' });
        } else if (winner === 'DRAW') {
          total += SCORING.GROUP_DRAW;
          breakdown.push({ match, team: home, pts: SCORING.GROUP_DRAW, reason: 'Draw' });
        }
      }
      if (myTeams.includes(away)) {
        if (winner === 'AWAY_TEAM') {
          total += SCORING.GROUP_WIN;
          breakdown.push({ match, team: away, pts: SCORING.GROUP_WIN, reason: 'Win' });
        } else if (winner === 'DRAW') {
          total += SCORING.GROUP_DRAW;
          breakdown.push({ match, team: away, pts: SCORING.GROUP_DRAW, reason: 'Draw' });
        }
      }
    } else {
      // Knockout: only the winner earns points
      const pts = SCORING[scoreKey];
      if (winner === 'HOME_TEAM' && myTeams.includes(home)) {
        total += pts;
        breakdown.push({ match, team: home, pts, reason: stageLabel(match.stage) });
      } else if (winner === 'AWAY_TEAM' && myTeams.includes(away)) {
        total += pts;
        breakdown.push({ match, team: away, pts, reason: stageLabel(match.stage) });
      }

      // Runner-up bonus
      if (match.stage === 'FINAL') {
        const loser = winner === 'HOME_TEAM' ? away : home;
        if (myTeams.includes(loser)) {
          total += SCORING.RUNNER_UP;
          breakdown.push({ match, team: loser, pts: SCORING.RUNNER_UP, reason: 'Runner-up' });
        }
      }
    }
  }

  return { total, breakdown };
}

function stageLabel(stage) {
  const labels = {
    LAST_32: 'R32 win',
    LAST_16: 'R16 win',
    QUARTER_FINALS: 'QF win',
    SEMI_FINALS: 'SF win',
    FINAL: 'Champion',
  };
  return labels[stage] || stage;
}

// Build full leaderboard
export function buildLeaderboard(assignments, drawType, fixtures) {
  return Object.keys(assignments)
    .map((name) => {
      const { total, breakdown } = calculatePoints(name, assignments, drawType, fixtures);
      return { name, total, breakdown, teams: getTeamsForParticipant(name, assignments, drawType) };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
