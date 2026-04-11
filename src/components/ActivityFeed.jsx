import { useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { SCORING, STAGE_MAP } from '../data/worldcup2026.js';

function getOwner(team, assignments, drawType) {
  for (const name of Object.keys(assignments)) {
    const teams = getTeamsForParticipant(name, assignments, drawType);
    if (teams.includes(team)) return name;
  }
  return null;
}

function buildFeedItems(fixtures, assignments, drawType) {
  const items = [];
  const finished = fixtures
    .filter((f) => f.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0, 20);

  for (const match of finished) {
    const home = normaliseTeamName(match.homeTeam.name);
    const away = normaliseTeamName(match.awayTeam.name);
    const winner = match.score.winner;
    const scoreKey = STAGE_MAP[match.stage];
    if (!scoreKey) continue;
    const homeOwner = getOwner(home, assignments, drawType);
    const awayOwner = getOwner(away, assignments, drawType);
    if (!homeOwner && !awayOwner) continue;

    const isGroupStage = match.stage === 'GROUP_STAGE';
    const pts = SCORING[scoreKey];

    if (isGroupStage) {
      if (winner === 'DRAW') {
        if (homeOwner) items.push({ id: `${match.id}-hd`, utcDate: match.utcDate, team: home, emoji: getFlag(home), text: `${home} drew ${match.score.home}–${match.score.away} with ${away}`, owner: homeOwner, pts: SCORING.GROUP_DRAW, positive: true });
        if (awayOwner && awayOwner !== homeOwner) items.push({ id: `${match.id}-ad`, utcDate: match.utcDate, team: away, emoji: getFlag(away), text: `${away} drew ${match.score.away}–${match.score.home} with ${home}`, owner: awayOwner, pts: SCORING.GROUP_DRAW, positive: true });
      } else if (winner === 'HOME_TEAM') {
        if (homeOwner) items.push({ id: `${match.id}-hw`, utcDate: match.utcDate, team: home, emoji: getFlag(home), text: `${home} beat ${away} ${match.score.home}–${match.score.away}`, owner: homeOwner, pts: SCORING.GROUP_WIN, positive: true });
        if (awayOwner) items.push({ id: `${match.id}-al`, utcDate: match.utcDate, team: away, emoji: getFlag(away), text: `${away} lost ${match.score.away}–${match.score.home} to ${home}`, owner: awayOwner, pts: 0, positive: false });
      } else if (winner === 'AWAY_TEAM') {
        if (awayOwner) items.push({ id: `${match.id}-aw`, utcDate: match.utcDate, team: away, emoji: getFlag(away), text: `${away} beat ${home} ${match.score.away}–${match.score.home}`, owner: awayOwner, pts: SCORING.GROUP_WIN, positive: true });
        if (homeOwner) items.push({ id: `${match.id}-hl`, utcDate: match.utcDate, team: home, emoji: getFlag(home), text: `${home} lost ${match.score.home}–${match.score.away} to ${away}`, owner: homeOwner, pts: 0, positive: false });
      }
    } else {
      if (winner === 'HOME_TEAM' && homeOwner) items.push({ id: `${match.id}-hko`, utcDate: match.utcDate, team: home, emoji: getFlag(home), text: `${home} won ${match.score.home}–${match.score.away} vs ${away}`, owner: homeOwner, pts, positive: true });
      if (winner === 'AWAY_TEAM' && awayOwner) items.push({ id: `${match.id}-ako`, utcDate: match.utcDate, team: away, emoji: getFlag(away), text: `${away} won ${match.score.away}–${match.score.home} vs ${home}`, owner: awayOwner, pts, positive: true });
      if (match.stage === 'FINAL') {
        const loser = winner === 'HOME_TEAM' ? away : home;
        const loserOwner = getOwner(loser, assignments, drawType);
        if (loserOwner) items.push({ id: `${match.id}-ru`, utcDate: match.utcDate, team: loser, emoji: getFlag(loser), text: `${loser} finished runner-up`, owner: loserOwner, pts: SCORING.RUNNER_UP, positive: true });
      }
    }
  }

  return items.sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate)).slice(0, 15);
}

function timeAgo(utcDate) {
  if (!utcDate) return '';
  const diff = Date.now() - new Date(utcDate).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'recently';
}

export default function ActivityFeed({ fixtures, assignments, drawType, onSelectTeam }) {
  const hasAssignments = Object.keys(assignments).length > 0;
  const items = useMemo(
    () => (hasAssignments ? buildFeedItems(fixtures, assignments, drawType) : []),
    [fixtures, assignments, drawType, hasAssignments]
  );

  if (!hasAssignments || items.length === 0) return null;

  return (
    <div className="card mt">
      <h3 className="section-title">Activity</h3>
      <div className="feed">
        {items.map((item) => (
          <div key={item.id} className={`feed-item ${item.positive ? '' : 'feed-loss'}`}>
            <button className="team-btn" style={{ fontSize: 22, flexShrink: 0 }} onClick={() => onSelectTeam(item.team)}>
              {item.emoji}
            </button>
            <div className="feed-body">
              <span className="feed-text">
                <button className="team-btn" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }} onClick={() => onSelectTeam(item.team)}>
                  {item.text}
                </button>
              </span>
              <span className="feed-meta">
                <span className="feed-owner">{item.owner}</span>
                {item.pts > 0 && <span className="feed-pts">+{item.pts} pts</span>}
                <span className="feed-time">{timeAgo(item.utcDate)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
