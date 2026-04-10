import { useMemo, useState, useEffect } from 'react';
import { buildLeaderboard } from '../utils/scoring.js';
import { SCORING, SCORING_LABELS, getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName } from '../utils/scoring.js';
import ActivityFeed from './ActivityFeed.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatCountdown(ms) {
  if (ms <= 0) return 'Kicking off now';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function NextMatch({ fixtures }) {
  const [, tick] = useState(0);

  const next = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter((f) => f.status !== 'FINISHED' && f.utcDate)
      .map((f) => ({ ...f, ts: new Date(f.utcDate).getTime() }))
      .filter((f) => !isNaN(f.ts) && f.ts > now - 2 * 60 * 60 * 1000)
      .sort((a, b) => a.ts - b.ts)[0];
  }, [fixtures]);

  useEffect(() => {
    if (!next) return;
    const id = setInterval(() => tick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [next]);

  if (!next) return null;

  const home = normaliseTeamName(next.homeTeam.name);
  const away = normaliseTeamName(next.awayTeam.name);
  const ms = next.ts - Date.now();
  const kickoff = new Date(next.ts);
  const dateStr = kickoff.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = kickoff.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="next-match">
      <div className="next-match-label">Next up</div>
      <div className="next-match-teams">
        <span>{getFlag(home)} {home}</span>
        <span className="next-match-vs">vs</span>
        <span>{getFlag(away)} {away}</span>
      </div>
      <div className="next-match-meta">{dateStr} · {timeStr}</div>
      <div className="next-match-countdown">{formatCountdown(ms)}</div>
    </div>
  );
}

export default function Leaderboard({ assignments, drawType, fixtures, apiError, lastFetched }) {
  const [expanded, setExpanded] = useState(null);

  const board = useMemo(
    () => buildLeaderboard(assignments, drawType, fixtures),
    [assignments, drawType, fixtures]
  );

  const hasAssignments = Object.keys(assignments).length > 0;
  const hasResults = fixtures.some((f) => f.status === 'FINISHED');

  if (!hasAssignments) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Standings</h2>
        </div>
        <NextMatch fixtures={fixtures} />
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>No draw yet — head to the Draw tab to set up your sweep.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Standings</h2>
        {!hasResults && (
          <p className="subtitle">
            {apiError
              ? 'Points will update once match results are loaded.'
              : 'Waiting for first results…'}
          </p>
        )}
        {lastFetched && (
          <p className="subtitle">
            Updated {new Date(lastFetched).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <NextMatch fixtures={fixtures} />

      <div className="leaderboard">
        {board.map((entry, i) => (
          <div
            key={entry.name}
            className="lb-row"
            onClick={() => setExpanded(expanded === entry.name ? null : entry.name)}
          >
            <div className="lb-main">
              <span className="lb-rank">
                {i < 3 ? MEDALS[i] : <span className="lb-num">{i + 1}</span>}
              </span>
              <div className="lb-info">
                <span className="lb-name">{entry.name}</span>
                <span className="lb-teams">
                  {entry.teams.slice(0, 2).map((t) => (
                    <span key={t} className="team-chip">
                      {getFlag(t)} {t}
                    </span>
                  ))}
                  {entry.teams.length > 2 && (
                    <span className="lb-more">+{entry.teams.length - 2} more</span>
                  )}
                </span>
              </div>
              <span className="lb-pts">{entry.total}<small>pts</small></span>
            </div>

            {expanded === entry.name && entry.breakdown.length > 0 && (
              <div className="lb-breakdown">
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Match</th>
                      <th>Result</th>
                      <th>+pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.breakdown.map((b, j) => (
                      <tr key={j}>
                        <td>{getFlag(b.team)} {b.team}</td>
                        <td className="small-text">
                          {b.match.homeTeam.name} v {b.match.awayTeam.name}
                        </td>
                        <td className="small-text">{b.reason}</td>
                        <td className="pts-cell">+{b.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expanded === entry.name && entry.breakdown.length === 0 && (
              <div className="lb-breakdown">
                <p className="hint">No points yet — check back when matches start.</p>
              </div>
            )}

            {expanded === entry.name && entry.teams.length > 2 && (
              <div className="lb-breakdown">
                <strong className="small-text" style={{ display: 'block', marginBottom: 6 }}>
                  All teams
                </strong>
                <div className="team-list">
                  {entry.teams.map((t) => (
                    <span key={t} className="badge sm">
                      {getFlag(t)} {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ActivityFeed fixtures={fixtures} assignments={assignments} drawType={drawType} />

      <div className="card mt">
        <h3 className="section-title">Scoring System</h3>
        <div className="score-grid">
          {Object.entries(SCORING_LABELS).map(([key, label]) => (
            <div key={key} className="score-row">
              <span>{label}</span>
              <span className="score-pts">+{SCORING[key]} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
