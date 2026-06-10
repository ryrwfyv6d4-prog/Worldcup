import { useMemo, useState, useEffect } from 'react';
import { buildLeaderboard } from '../utils/scoring.js';
import { SCORING, SCORING_LABELS, getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import ActivityFeed from './ActivityFeed.jsx';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const EMOJIS = ['😂', '🔥', '❤️', '😭', '👏', '🍻'];

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

function getOwner(team, assignments, drawType) {
  for (const name of Object.keys(assignments)) {
    const teams = getTeamsForParticipant(name, assignments, drawType);
    if (teams.includes(team)) return name;
  }
  return null;
}

function isMatchToday(utcDate) {
  if (!utcDate) return false;
  const opts = { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'numeric', year: 'numeric' };
  const matchDay = new Date(utcDate).toLocaleDateString('en-AU', opts);
  const today = new Date().toLocaleDateString('en-AU', opts);
  return matchDay === today;
}

function TodayMatches({ fixtures, assignments, drawType }) {
  const todayFixtures = useMemo(() => (
    fixtures.filter((f) => isMatchToday(f.utcDate))
  ), [fixtures]);

  if (todayFixtures.length === 0) return null;

  return (
    <div className="today-matches chalkboard">
      <div className="today-label">TODAY AT THE NEST</div>
      {todayFixtures.map((f) => {
        const home = normaliseTeamName(f.homeTeam.name);
        const away = normaliseTeamName(f.awayTeam.name);
        const homeOwner = getOwner(home, assignments, drawType);
        const awayOwner = getOwner(away, assignments, drawType);
        const isLive = f.status === 'IN_PLAY';
        const isDone = f.status === 'FINISHED';
        const owners = [homeOwner, awayOwner].filter(Boolean);
        const uniqueOwners = [...new Set(owners)];

        return (
          <div key={f.id} className={`today-match-row ${isLive ? 'live-row' : ''}`}>
            {isLive && <span className="today-live-dot" />}
            <div style={{ flex: 1 }}>
              <div className="today-teams">
                {getFlag(home)} {home} vs {getFlag(away)} {away}
              </div>
              {uniqueOwners.length > 0 && (
                <div className="today-owner">{uniqueOwners.join(' & ')}</div>
              )}
            </div>
            {isDone ? (
              <span className="today-score">{f.score.home}–{f.score.away}</span>
            ) : isLive ? (
              <span className="today-score" style={{ color: 'var(--live-red)' }}>
                {f.score.home ?? 0}–{f.score.away ?? 0}
              </span>
            ) : (
              <span className="today-time">{formatTimeAEST(f.utcDate)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NextMatch({ fixtures, onSelectTeam }) {
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
  const dateStr = formatDateAEST(next.ts);
  const timeStr = formatTimeAEST(next.ts) + ' AEST';

  return (
    <div className="next-match">
      <div className="next-match-label">Next up</div>
      <div className="next-match-teams">
        <button className="team-btn" style={{ color: 'var(--text-on-dark)', fontWeight: 700, fontSize: '0.95rem' }} onClick={() => onSelectTeam(home)}>
          {getFlag(home)} {home}
        </button>
        <span className="next-match-vs">vs</span>
        <button className="team-btn" style={{ color: 'var(--text-on-dark)', fontWeight: 700, fontSize: '0.95rem' }} onClick={() => onSelectTeam(away)}>
          {getFlag(away)} {away}
        </button>
      </div>
      <div className="next-match-meta">{dateStr} · {timeStr}</div>
      <div className="next-match-countdown">{formatCountdown(ms)}</div>
    </div>
  );
}

function YourNextMatch({ fixtures, currentUser, assignments, drawType, onSelectTeam }) {
  const myTeams = useMemo(() => (
    currentUser && currentUser !== '__guest__'
      ? getTeamsForParticipant(currentUser, assignments, drawType)
      : []
  ), [currentUser, assignments, drawType]);

  const next = useMemo(() => {
    if (!myTeams.length) return null;
    const now = Date.now();
    return fixtures
      .filter((f) => f.status !== 'FINISHED' && f.utcDate)
      .map((f) => ({ ...f, ts: new Date(f.utcDate).getTime() }))
      .filter((f) => !isNaN(f.ts) && f.ts > now - 2 * 60 * 60 * 1000)
      .filter((f) =>
        myTeams.includes(normaliseTeamName(f.homeTeam.name)) ||
        myTeams.includes(normaliseTeamName(f.awayTeam.name))
      )
      .sort((a, b) => a.ts - b.ts)[0];
  }, [fixtures, myTeams]);

  if (!next) return null;
  const home = normaliseTeamName(next.homeTeam.name);
  const away = normaliseTeamName(next.awayTeam.name);
  const mine = myTeams.includes(home) ? home : away;

  return (
    <div className="ticket">
      <div className="ticket-stub">GAME<b>DAY</b><span>★</span></div>
      <div className="ticket-body">
        <div className="ticket-eyebrow">★ YOUR NEXT MATCH ★</div>
        <button className="team-btn ticket-match" onClick={() => onSelectTeam(mine)}>
          {getFlag(home)} {home} vs {getFlag(away)} {away}
        </button>
        <div className="ticket-meta">{formatDateAEST(next.ts)} · {formatTimeAEST(next.ts)} AEST</div>
      </div>
    </div>
  );
}

export default function Leaderboard({
  assignments, drawType, fixtures, apiError, lastFetched, onSelectTeam,
  currentUser, lbReactions = {}, onLbReact,
}) {
  const [expanded, setExpanded] = useState(null);

  const board = useMemo(
    () => buildLeaderboard(assignments, drawType, fixtures),
    [assignments, drawType, fixtures]
  );

  // Standings as of start of today (Brisbane) — powers "+pts today" and movement arrows
  const prevStats = useMemo(() => {
    const prevFixtures = fixtures.filter((f) => f.status === 'FINISHED' && !isMatchToday(f.utcDate));
    const prevBoard = buildLeaderboard(assignments, drawType, prevFixtures);
    const map = {};
    prevBoard.forEach((e, i) => { map[e.name] = { rank: i, total: e.total }; });
    return map;
  }, [assignments, drawType, fixtures]);

  const hasAssignments = Object.keys(assignments).length > 0;
  const hasResults = fixtures.some((f) => f.status === 'FINISHED');

  if (!hasAssignments) {
    return (
      <div className="page">
        <div className="page-header"><h2>The Polls</h2></div>
        <NextMatch fixtures={fixtures} onSelectTeam={onSelectTeam} />
        <TodayMatches fixtures={fixtures} assignments={assignments} drawType={drawType} />
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
        <h2>The Polls</h2>
        {!hasResults && (
          <p className="subtitle">
            {apiError ? 'Points will update once results load.' : 'Waiting for first results…'}
          </p>
        )}
        {lastFetched && (
          <p className="subtitle">
            Updated {new Date(lastFetched).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <NextMatch fixtures={fixtures} onSelectTeam={onSelectTeam} />
      <YourNextMatch fixtures={fixtures} currentUser={currentUser} assignments={assignments} drawType={drawType} onSelectTeam={onSelectTeam} />
      <TodayMatches fixtures={fixtures} assignments={assignments} drawType={drawType} />

      <div className="leaderboard">
        {board.map((entry, i) => {
          const reactions = lbReactions[entry.name] || {};
          const isExpanded = expanded === entry.name;
          const prev = prevStats[entry.name];
          const todayPts = prev ? entry.total - prev.total : entry.total;
          const delta = prev ? prev.rank - i : 0;
          const isMe = currentUser && currentUser === entry.name;
          return (
            <div
              key={entry.name}
              className={`lb-row ${isMe ? 'me' : ''}`}
              onClick={() => setExpanded(isExpanded ? null : entry.name)}
            >
              <div className="lb-main">
                <span className={`rosette ${i < 3 ? 'gold' : ''}`}>{i + 1}</span>
                {hasResults && (
                  delta > 0 ? <span className="lb-delta up">▲{delta}</span>
                  : delta < 0 ? <span className="lb-delta down">▼{-delta}</span>
                  : <span className="lb-delta flat">–</span>
                )}
                <div className="lb-info">
                  <span className="lb-name">
                    {entry.name}
                    {isMe && <span className="tag you">YOU</span>}
                    {hasResults && i === 0 && <span className="tag front">FRONT RUNNER</span>}
                    {hasResults && i === board.length - 1 && <span className="tag disaster">TOTAL DISASTER</span>}
                  </span>
                  <span className="lb-teams">
                    {entry.teams.slice(0, 2).map((t) => (
                      <button
                        key={t}
                        className="team-chip team-btn"
                        onClick={(e) => { e.stopPropagation(); onSelectTeam(t); }}
                      >
                        {getFlag(t)} {t}
                      </button>
                    ))}
                    {entry.teams.length > 2 && (
                      <span className="lb-more">+{entry.teams.length - 2} more</span>
                    )}
                  </span>
                </div>
                <span className="lb-pts">
                  {entry.total}<small>pts</small>
                  {todayPts > 0 && <span className="lb-today">+{todayPts} today</span>}
                </span>
                <span className={`lb-chev ${isExpanded ? 'open' : ''}`}>▶</span>
              </div>

              {isExpanded && (
                <div className="lb-reactions" onClick={(e) => e.stopPropagation()}>
                  {EMOJIS.map((emoji) => {
                    const people = reactions[emoji] || [];
                    const mine = currentUser && people.includes(currentUser);
                    return (
                      <button
                        key={emoji}
                        className={`lb-reaction-btn ${mine ? 'mine' : ''}`}
                        onClick={() => onLbReact && onLbReact(entry.name, emoji)}
                      >
                        <span>{emoji}</span>
                        {people.length > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{people.length}</span>}
                      </button>
                    );
                  })}
                  {EMOJIS.map((emoji) => {
                    const people = reactions[emoji] || [];
                    if (people.length === 0) return null;
                    return (
                      <div key={`who-${emoji}`} className="lb-reaction-who" style={{ width: '100%' }}>
                        {emoji} {people.join(', ')}
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && entry.breakdown.length > 0 && (
                <div className="lb-breakdown">
                  <table className="breakdown-table">
                    <thead>
                      <tr><th>Team</th><th>Match</th><th>Result</th><th>+pts</th></tr>
                    </thead>
                    <tbody>
                      {entry.breakdown.map((b, j) => (
                        <tr key={j}>
                          <td>
                            <button className="team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(b.team); }}>
                              {getFlag(b.team)} {b.team}
                            </button>
                          </td>
                          <td className="small-text">{b.match.homeTeam.name} v {b.match.awayTeam.name}</td>
                          <td className="small-text">{b.reason}</td>
                          <td className="pts-cell">+{b.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && entry.breakdown.length === 0 && (
                <div className="lb-breakdown">
                  <p className="hint">No points yet — check back when matches start.</p>
                </div>
              )}

              {isExpanded && entry.teams.length > 2 && (
                <div className="lb-breakdown">
                  <strong className="small-text" style={{ display: 'block', marginBottom: 6 }}>All teams</strong>
                  <div className="team-list">
                    {entry.teams.map((t) => (
                      <button
                        key={t}
                        className="badge sm team-btn"
                        onClick={(e) => { e.stopPropagation(); onSelectTeam(t); }}
                      >
                        {getFlag(t)} {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="tap-hint">👆 Tap any bloke for the full story</div>
      </div>

      <ActivityFeed
        fixtures={fixtures}
        assignments={assignments}
        drawType={drawType}
        onSelectTeam={onSelectTeam}
      />

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

