import { useMemo, useState } from 'react';
import { buildLeaderboard } from '../utils/scoring.js';
import { SCORING, SCORING_LABELS, getFlag } from '../data/worldcup2026.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ assignments, drawType, fixtures, apiError }) {
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
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>No draw yet — go to the Draw tab to set up your sweep.</p>
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
      </div>

      <div className="leaderboard">
        {board.map((entry, i) => (
          <div key={entry.name} className="lb-row" onClick={() => setExpanded(expanded === entry.name ? null : entry.name)}>
            <div className="lb-main">
              <span className="lb-rank">
                {i < 3 ? MEDALS[i] : <span className="lb-num">{i + 1}</span>}
              </span>
              <div className="lb-info">
                <span className="lb-name">{entry.name}</span>
                <span className="lb-teams">
                  {entry.teams.slice(0, 3).map((t) => (
                    <span key={t} title={t}>
                      {getFlag(t)}
                    </span>
                  ))}
                  {entry.teams.length > 3 && (
                    <span className="lb-more">+{entry.teams.length - 3}</span>
                  )}
                </span>
              </div>
              <span className="lb-pts">{entry.total} <small>pts</small></span>
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
          </div>
        ))}
      </div>

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
