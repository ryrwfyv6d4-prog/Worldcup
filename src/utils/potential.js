// Maximum-remaining-points engine: for each participant, what's the most they
// could still score if every remaining result broke their way? Exact DP over
// the knockout tree — handles two owned teams colliding (only one advances).
import { DEF_BY_NUM, FINAL_MATCH, scoringKeyForMatch } from '../data/bracket2026.js';
import { SCORING } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from './scoring.js';

function buildGroupTables(fixtures) {
  const groups = {};
  for (const m of fixtures) {
    if (m.stage !== 'GROUP_STAGE' || !m.group) continue;
    const home = normaliseTeamName(m.homeTeam.name);
    const away = normaliseTeamName(m.awayTeam.name);
    if (!groups[m.group]) groups[m.group] = {};
    for (const t of [home, away]) {
      if (!groups[m.group][t]) groups[m.group][t] = { team: t, p: 0, gf: 0, ga: 0, pts: 0 };
    }
    if (m.status !== 'FINISHED') continue;
    const h = groups[m.group][home];
    const a = groups[m.group][away];
    h.p++; a.p++;
    h.gf += m.score.home; h.ga += m.score.away;
    a.gf += m.score.away; a.ga += m.score.home;
    if (m.score.winner === 'HOME_TEAM') h.pts += 3;
    else if (m.score.winner === 'AWAY_TEAM') a.pts += 3;
    else { h.pts++; a.pts++; }
  }
  const out = {};
  for (const g of Object.keys(groups)) {
    out[g] = Object.values(groups[g]).sort(
      (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team)
    );
  }
  return out;
}

function groupComplete(rows) {
  return rows && rows.length === 4 && rows.every((r) => r.p >= 3);
}

// Teams that could arrive from a slot, before playing this match.
// Returns [{ team|null, pts }] — pts is max P-points already earned downstream.
function slotArrivals(slot, ctx) {
  const posMatch = slot?.match(/^([12])([A-L])$/);
  if (posMatch) {
    const rows = ctx.tables[posMatch[2]];
    if (groupComplete(rows)) return [{ team: rows[parseInt(posMatch[1]) - 1].team, pts: 0 }];
    return [{ team: null, pts: 0 }];
  }
  const thirdMatch = slot?.match(/^3([A-L](?:\/[A-L])*)$/);
  if (thirdMatch) {
    const letters = thirdMatch[1].split('/');
    const rowsList = letters.map((g) => ctx.tables[g]);
    if (rowsList.every(groupComplete)) {
      const thirds = rowsList.map((r) => r[2]);
      thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
      return [{ team: thirds[0].team, pts: 0 }];
    }
    return [{ team: null, pts: 0 }];
  }
  const winnerMatch = slot?.match(/^W(\d+)$/);
  if (winnerMatch) return outcomes(parseInt(winnerMatch[1]), ctx);
  return [{ team: null, pts: 0 }];
}

// Possible winners of match `num` with the max P-points earned in its subtree
// (including the points for winning this match).
function outcomes(num, ctx) {
  if (ctx.memo[num]) return ctx.memo[num];
  const fix = ctx.fixtureByNum[num];
  const owned = (t) => t != null && ctx.myTeams.has(t);
  const winPts = SCORING[scoringKeyForMatch(num)] || 0;
  const isFinal = num === 104;
  let result;

  if (fix?.status === 'FINISHED' && fix.score?.winner && fix.score.winner !== 'DRAW') {
    const w = fix.score.winner === 'HOME_TEAM' ? fix.homeTeam.name : fix.awayTeam.name;
    result = [{ team: normaliseTeamName(w), pts: 0 }]; // already banked in current total
  } else {
    const def = DEF_BY_NUM[num];
    const sideA = fix
      ? [{ team: normaliseTeamName(fix.homeTeam.name), pts: 0 }]
      : slotArrivals(def?.s1, ctx);
    const sideB = fix
      ? [{ team: normaliseTeamName(fix.awayTeam.name), pts: 0 }]
      : slotArrivals(def?.s2, ctx);

    // Loser's side still keeps its subtree points; in the final the loser can
    // also add runner-up points.
    const bestLoss = (side) => Math.max(...side.map(
      (o) => o.pts + (isFinal && owned(o.team) ? SCORING.RUNNER_UP : 0)
    ));
    const lossA = bestLoss(sideA);
    const lossB = bestLoss(sideB);

    const byTeam = new Map();
    for (const [side, otherLoss] of [[sideA, lossB], [sideB, lossA]]) {
      for (const o of side) {
        const v = o.pts + (owned(o.team) ? winPts : 0) + otherLoss;
        const key = o.team ?? '__unknown__';
        if (!byTeam.has(key) || byTeam.get(key).pts < v) {
          byTeam.set(key, { team: o.team, pts: v });
        }
      }
    }
    result = [...byTeam.values()];
  }
  ctx.memo[num] = result;
  return result;
}

// Max points a participant can still add from here.
export function maxRemainingPoints(myTeams, fixtures) {
  const fixtureByNum = {};
  for (const f of fixtures) {
    if (typeof f.id === 'number' && f.id >= 73) fixtureByNum[f.id] = f;
  }
  const ctx = {
    myTeams: new Set(myTeams),
    tables: buildGroupTables(fixtures),
    fixtureByNum,
    memo: {},
  };
  const finals = outcomes(FINAL_MATCH[0].num, ctx);
  return Math.max(0, ...finals.map((o) => o.pts));
}

// Outlook for every participant: points ceiling + whether they're cooked
// (mathematically unable to catch the current leader).
export function computeOutlook(assignments, drawType, fixtures, currentTotals) {
  const outlook = {};
  const leaderTotal = Math.max(0, ...Object.values(currentTotals));
  for (const name of Object.keys(assignments)) {
    const teams = getTeamsForParticipant(name, assignments, drawType);
    const ceiling = (currentTotals[name] || 0) + maxRemainingPoints(teams, fixtures);
    outlook[name] = {
      ceiling,
      cooked: ceiling < leaderTotal,
    };
  }
  return outlook;
}
