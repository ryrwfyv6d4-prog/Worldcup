import { useState, useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName } from '../utils/scoring.js';

const STAGE_ORDER = [
  'GROUP_STAGE', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL',
];

const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS: 'Semi-finals',
  FINAL: 'Final',
};

const STATUS_BADGE = {
  FINISHED: { label: 'FT', cls: 'badge-done' },
  IN_PLAY: { label: 'LIVE', cls: 'badge-live' },
  PAUSED: { label: 'HT', cls: 'badge-live' },
  SCHEDULED: { label: 'vs', cls: 'badge-upcoming' },
  TIMED: { label: 'vs', cls: 'badge-upcoming' },
  POSTPONED: { label: 'PPD', cls: 'badge-ppd' },
};

function formatDate(utcDate) {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(utcDate) {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function MatchCard({ match, assignments, drawType }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const { label, cls } = STATUS_BADGE[match.status] || { label: match.status, cls: 'badge-upcoming' };

  // Highlight teams owned by any participant
  const ownedTeams = Object.values(assignments).flat();
  const homeOwned = ownedTeams.includes(home);
  const awayOwned = ownedTeams.includes(away);

  return (
    <div className={`match-card ${match.status === 'IN_PLAY' || match.status === 'PAUSED' ? 'live' : ''}`}>
      <div className="match-date">
        {formatDate(match.utcDate)} · {formatTime(match.utcDate)}
        {match.group && <span className="match-group">{match.group.replace('GROUP_', 'Group ')}</span>}
      </div>
      <div className="match-row">
        <div className={`team-side ${homeOwned ? 'owned' : ''}`}>
          {match.homeTeam.crest
            ? <img src={match.homeTeam.crest} alt="" className="crest" loading="lazy" />
            : <span className="flag">{getFlag(home)}</span>}
          <span className="team-name">{home || match.homeTeam.name}</span>
        </div>

        <div className="score-center">
          {match.status === 'FINISHED' || match.status === 'IN_PLAY' || match.status === 'PAUSED' ? (
            <span className="score">
              {match.score.home ?? '–'} <span className={`status-badge ${cls}`}>{label}</span> {match.score.away ?? '–'}
            </span>
          ) : (
            <span className={`status-badge ${cls}`}>{label}</span>
          )}
        </div>

        <div className={`team-side right ${awayOwned ? 'owned' : ''}`}>
          <span className="team-name">{away || match.awayTeam.name}</span>
          {match.awayTeam.crest
            ? <img src={match.awayTeam.crest} alt="" className="crest" loading="lazy" />
            : <span className="flag">{getFlag(away)}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Fixtures({ fixtures, loading, error, lastFetched, onRefresh, assignments, drawType }) {
  const [stageFilter, setStageFilter] = useState('ALL');
  const [showFinished, setShowFinished] = useState(true);

  const stages = useMemo(() => {
    const set = new Set(fixtures.map((f) => f.stage));
    return STAGE_ORDER.filter((s) => set.has(s));
  }, [fixtures]);

  const filtered = useMemo(() => {
    let list = fixtures;
    if (stageFilter !== 'ALL') list = list.filter((f) => f.stage === stageFilter);
    if (!showFinished) list = list.filter((f) => f.status !== 'FINISHED');
    return list.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }, [fixtures, stageFilter, showFinished]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const day = formatDate(m.utcDate) || 'TBD';
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(m);
    }
    return map;
  }, [filtered]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-row">
          <h2>Fixtures</h2>
          <button className="btn-sm" onClick={onRefresh} disabled={loading}>
            {loading ? '⏳' : '↺'} Refresh
          </button>
        </div>
        {lastFetched && (
          <p className="hint">
            Updated {new Date(lastFetched).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {error && <p className="error-msg">{error}</p>}
      </div>

      {fixtures.length > 0 && (
        <div className="filter-bar">
          <div className="stage-filters">
            <button
              className={`filter-btn ${stageFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStageFilter('ALL')}
            >
              All
            </button>
            {stages.map((s) => (
              <button
                key={s}
                className={`filter-btn ${stageFilter === s ? 'active' : ''}`}
                onClick={() => setStageFilter(s)}
              >
                {STAGE_LABELS[s] || s}
              </button>
            ))}
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showFinished}
              onChange={(e) => setShowFinished(e.target.checked)}
            />
            <span>Show finished</span>
          </label>
        </div>
      )}

      {fixtures.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          {error ? (
            <p>Add your API key in Settings to load live fixtures from football-data.org</p>
          ) : (
            <p>No fixtures found. Try refreshing or check your API key in Settings.</p>
          )}
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Loading fixtures…</p>
        </div>
      )}

      {!loading && Array.from(grouped.entries()).map(([day, matches]) => (
        <div key={day} className="day-group">
          <div className="day-header">{day}</div>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} assignments={assignments} drawType={drawType} />
          ))}
        </div>
      ))}
    </div>
  );
}
