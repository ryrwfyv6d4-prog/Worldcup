import { useMemo } from 'react';
import { GROUPS, getFlag, getGroupForTeam, SCORING, STAGE_MAP } from '../data/worldcup2026.js';
import { TEAM_DESCRIPTIONS } from '../data/teamDescriptions.js';
import { normaliseTeamName } from '../utils/scoring.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';

const STAGE_ORDER = ['GROUP_STAGE', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
const STAGE_LABELS = {
  GROUP_STAGE: 'Groups',
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  FINAL: 'Final',
};

function formatDate(utcDate) {
  if (!utcDate) return '';
  return formatDateAEST(utcDate);
}
function formatTime(utcDate) {
  if (!utcDate) return '';
  return formatTimeAEST(utcDate) + ' AEST';
}

// Compute group standing for this team
function computeGroupStanding(team, allGroupFixtures) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of allGroupFixtures) {
    if (m.status !== 'FINISHED') continue;
    const home = normaliseTeamName(m.homeTeam.name);
    const away = normaliseTeamName(m.awayTeam.name);
    const isHome = home === team;
    const isAway = away === team;
    if (!isHome && !isAway) continue;
    const myGoals = isHome ? (m.score.home ?? 0) : (m.score.away ?? 0);
    const theirGoals = isHome ? (m.score.away ?? 0) : (m.score.home ?? 0);
    gf += myGoals;
    ga += theirGoals;
    const myResult = isHome ? m.score.winner : (m.score.winner === 'HOME_TEAM' ? 'AWAY_TEAM' : m.score.winner === 'AWAY_TEAM' ? 'HOME_TEAM' : 'DRAW');
    if (myResult === 'HOME_TEAM') w++;
    else if (myResult === 'DRAW') d++;
    else l++;
  }
  return { played: w + d + l, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d };
}

// Rank all teams in a group
function computeGroupTable(groupTeams, fixtures) {
  const groupFixtures = fixtures.filter(
    (f) => f.stage === 'GROUP_STAGE' &&
      groupTeams.includes(normaliseTeamName(f.homeTeam.name)) &&
      groupTeams.includes(normaliseTeamName(f.awayTeam.name))
  );
  return groupTeams
    .map((t) => ({ team: t, ...computeGroupStanding(t, groupFixtures) }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

// Find all knockout stages a team has appeared in
function getKnockoutProgression(team, fixtures) {
  const stages = new Set();
  for (const f of fixtures) {
    if (f.stage === 'GROUP_STAGE') continue;
    const home = normaliseTeamName(f.homeTeam.name);
    const away = normaliseTeamName(f.awayTeam.name);
    if (home === team || away === team) stages.add(f.stage);
  }
  return STAGE_ORDER.filter((s) => s !== 'GROUP_STAGE' && stages.has(s));
}

// Determine if eliminated (appeared in a knockout stage but lost)
function getEliminatedAt(team, fixtures) {
  const knockoutMatches = fixtures.filter((f) => {
    if (f.stage === 'GROUP_STAGE' || f.status !== 'FINISHED') return false;
    const home = normaliseTeamName(f.homeTeam.name);
    const away = normaliseTeamName(f.awayTeam.name);
    return home === team || away === team;
  });
  for (const m of knockoutMatches.sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))) {
    const isHome = normaliseTeamName(m.homeTeam.name) === team;
    const lost = (isHome && m.score.winner === 'AWAY_TEAM') || (!isHome && m.score.winner === 'HOME_TEAM');
    if (lost) return m.stage;
  }
  return null;
}

function MatchRow({ match, thisTeam, onSelectTeam }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const isHome = home === thisTeam;
  const opponent = isHome ? away : home;
  const finished = match.status === 'FINISHED';
  const live = match.status === 'IN_PLAY' || match.status === 'PAUSED';

  let result = null;
  if (finished || live) {
    const myGoals = isHome ? match.score.home : match.score.away;
    const theirGoals = isHome ? match.score.away : match.score.home;
    if (match.score.winner === 'DRAW') result = { label: 'D', cls: 'result-d', score: `${myGoals}–${theirGoals}` };
    else if ((isHome && match.score.winner === 'HOME_TEAM') || (!isHome && match.score.winner === 'AWAY_TEAM'))
      result = { label: 'W', cls: 'result-w', score: `${myGoals}–${theirGoals}` };
    else
      result = { label: 'L', cls: 'result-l', score: `${myGoals}–${theirGoals}` };
  }

  return (
    <div className="td-match-row">
      <div className="td-match-meta">
        <span className="td-match-stage">{STAGE_LABELS[match.stage] || match.stage}</span>
        <span className="td-match-date">{formatDate(match.utcDate)}</span>
        {!finished && !live && <span className="td-match-time">{formatTime(match.utcDate)}</span>}
      </div>
      <div className="td-match-teams">
        <button
          className={`td-team-btn ${opponent === thisTeam ? 'self' : ''}`}
          onClick={() => onSelectTeam(opponent)}
        >
          {getFlag(opponent)} {opponent}
        </button>
        {result ? (
          <span className={`td-result ${result.cls}`}>
            {result.label} {result.score}
            {live && <span className="badge-live-sm">LIVE</span>}
          </span>
        ) : (
          <span className="td-result td-upcoming">vs</span>
        )}
      </div>
    </div>
  );
}

export default function TeamDetail({ team, fixtures, assignments, drawType, onBack, onSelectTeam }) {
  const flag = getFlag(team);
  const description = TEAM_DESCRIPTIONS[team] || 'A nation with everything to prove on the biggest stage.';
  const groupLetter = getGroupForTeam(team);
  const groupTeams = groupLetter ? GROUPS[groupLetter] : [];

  // Find the owner of this team
  const owner = useMemo(() => {
    for (const [name, val] of Object.entries(assignments)) {
      const teams = Array.isArray(val[0])
        ? val.flatMap((g) => GROUPS[g.replace('Group ', '')] || [])
        : val;
      if (teams.includes(team)) return name;
    }
    return null;
  }, [team, assignments]);

  const groupTable = useMemo(
    () => (groupTeams.length ? computeGroupTable(groupTeams, fixtures) : []),
    [groupTeams, fixtures]
  );

  const myStanding = groupTable.find((r) => r.team === team);
  const myPosition = groupTable.findIndex((r) => r.team === team) + 1;

  const teamMatches = useMemo(() => {
    return fixtures.filter((f) => {
      const home = normaliseTeamName(f.homeTeam.name);
      const away = normaliseTeamName(f.awayTeam.name);
      return home === team || away === team;
    }).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }, [fixtures, team]);

  const pastMatches = teamMatches.filter((f) => f.status === 'FINISHED');
  const upcomingMatches = teamMatches.filter((f) => f.status !== 'FINISHED');

  const knockoutStages = getKnockoutProgression(team, fixtures);
  const eliminatedAt = getEliminatedAt(team, fixtures);

  // Group stage: did they fail to advance? (group stage finished but no knockout matches)
  const groupStageComplete = groupTeams.length > 0 && fixtures
    .filter((f) => f.stage === 'GROUP_STAGE' &&
      groupTeams.includes(normaliseTeamName(f.homeTeam.name)) &&
      groupTeams.includes(normaliseTeamName(f.awayTeam.name)))
    .every((f) => f.status === 'FINISHED');
  const didNotAdvance = groupStageComplete && knockoutStages.length === 0 && pastMatches.some((f) => f.stage === 'GROUP_STAGE');

  return (
    <div className="team-sheet">
      {/* Back button */}
      <button className="team-sheet-back" onClick={onBack}>
        ← Back
      </button>

      {/* Hero */}
      <div className="team-sheet-hero">
        <div className="team-sheet-flag">{flag}</div>
        <div>
          <h2 className="team-sheet-name">{team}</h2>
          {groupLetter && (
            <span className="team-sheet-group">Group {groupLetter}</span>
          )}
          {owner && (
            <span className="team-sheet-owner">Owned by {owner}</span>
          )}
        </div>
      </div>

      {/* Funny description */}
      <div className="card">
        <p className="team-sheet-desc">{description}</p>
      </div>

      {/* Status banner */}
      {(eliminatedAt || didNotAdvance) && (
        <div className="team-sheet-eliminated">
          ❌ Eliminated {eliminatedAt ? `in ${STAGE_LABELS[eliminatedAt]}` : 'in Group Stage'}
        </div>
      )}
      {knockoutStages.length > 0 && !eliminatedAt && (
        <div className="team-sheet-progress">
          {knockoutStages.map((s) => (
            <span key={s} className="team-sheet-stage-badge">{STAGE_LABELS[s]} ✓</span>
          ))}
        </div>
      )}

      {/* Group table */}
      {groupTeams.length > 0 && (
        <div className="card">
          <h3 className="section-title">Group {groupLetter} Standings</h3>
          <table className="group-table">
            <thead>
              <tr>
                <th className="gt-pos">#</th>
                <th className="gt-team">Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {groupTable.map((row, i) => (
                <tr
                  key={row.team}
                  className={`${row.team === team ? 'gt-highlight' : ''} ${i < 2 && groupStageComplete ? 'gt-advance' : ''}`}
                >
                  <td className="gt-pos">{i + 1}</td>
                  <td className="gt-team">
                    <button className="td-team-link" onClick={() => onSelectTeam(row.team)}>
                      {getFlag(row.team)} {row.team}
                    </button>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.w}</td>
                  <td>{row.d}</td>
                  <td>{row.l}</td>
                  <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="gt-pts">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Past results */}
      {pastMatches.length > 0 && (
        <div className="card">
          <h3 className="section-title">Results</h3>
          <div className="td-matches">
            {pastMatches.map((m) => (
              <MatchRow key={m.id} match={m} thisTeam={team} onSelectTeam={onSelectTeam} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <div className="card">
          <h3 className="section-title">Upcoming</h3>
          <div className="td-matches">
            {upcomingMatches.map((m) => (
              <MatchRow key={m.id} match={m} thisTeam={team} onSelectTeam={onSelectTeam} />
            ))}
          </div>
        </div>
      )}

      {pastMatches.length === 0 && upcomingMatches.length === 0 && (
        <div className="card">
          <p className="hint">No fixtures loaded yet — try refreshing from the Fixtures tab.</p>
        </div>
      )}
    </div>
  );
}
