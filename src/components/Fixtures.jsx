import { useState, useMemo, useEffect } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';

const STAGE_ORDER = ['GROUP_STAGE', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage', LAST_32: 'R32', LAST_16: 'R16',
  QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', FINAL: 'Final',
};
const STATUS_BADGE = {
  FINISHED: { label: 'FT', cls: 'badge-done' },
  IN_PLAY: { label: 'LIVE', cls: 'badge-live' },
  PAUSED: { label: 'HT', cls: 'badge-live' },
  SCHEDULED: { label: 'vs', cls: 'badge-upcoming' },
  TIMED: { label: 'vs', cls: 'badge-upcoming' },
  POSTPONED: { label: 'PPD', cls: 'badge-ppd' },
};
const PAGE_SIZE = 15;

function MatchCard({ match, ownerMap, onSelectTeam }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const { label, cls } = STATUS_BADGE[match.status] || { label: match.status, cls: 'badge-upcoming' };
  const homeOwner = ownerMap[home];
  const awayOwner = ownerMap[away];
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const showScore = match.status === 'FINISHED' || isLive;
  const hasOwner = !!(homeOwner || awayOwner);

  return (
    <div className={`match-card ${isLive ? 'live' : ''} ${hasOwner && !isLive ? 'has-owner' : ''}`}>
      <div className="match-date">
        {formatTimeAEST(match.utcDate)} AEST
        {match.group && <span className="match-group">{match.group.replace('GROUP_', 'Group ')}</span>}
      </div>
      <div className="match-row">
        <div className={`team-side ${homeOwner ? 'owned' : ''}`}>
          <button className="team-btn" onClick={() => onSelectTeam(home)} style={{ gap: 6 }}>
            <span className="flag">{getFlag(home)}</span>
            <div className="team-col">
              <span className="team-name">{home || match.homeTeam.name}</span>
              {homeOwner && <span className="owner-tag">({homeOwner})</span>}
            </div>
          </button>
        </div>
        <div className="score-center">
          {showScore ? (
            <span className="score">
              {match.score.home ?? '–'} <span className={`status-badge ${cls}`}>{label}</span> {match.score.away ?? '–'}
            </span>
          ) : (
            <span className={`status-badge ${cls}`}>{label}</span>
          )}
        </div>
        <div className={`team-side right ${awayOwner ? 'owned' : ''}`}>
          <button className="team-btn" onClick={() => onSelectTeam(away)} style={{ gap: 6, flexDirection: 'row-reverse' }}>
            <span className="flag">{getFlag(away)}</span>
            <div className="team-col" style={{ alignItems: 'flex-end' }}>
              <span className="team-name">{away || match.awayTeam.name}</span>
              {awayOwner && <span className="owner-tag">({awayOwner})</span>}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Fixtures({ fixtures, loading, error, lastFetched, onRefresh, assignments, drawType, onSelectTeam }) {
  const [stageFilter, setStageFilter] = useState('ALL');
  const [showFinished, setShowFinished] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [stageFilter, showFinished, search]);

  const ownerMap = useMemo(() => {
    const map = {};
    for (const name of Object.keys(assignments)) {
      const teams = getTeamsForParticipant(name, assignments, drawType);
      for (const t of teams) map[t] = name;
    }
    return map;
  }, [assignments, drawType]);

  const stages = useMemo(() => {
    const set = new Set(fixtures.map((f) => f.stage));
    return STAGE_ORDER.filter((s) => set.has(s));
  }, [fixtures]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fixtures;
    if (stageFilter !== 'ALL') list = list.filter((f) => f.stage === stageFilter);
    if (!showFinished) list = list.filter((f) => f.status !== 'FINISHED');
    if (q) {
      list = list.filter((f) => {
        const home = normaliseTeamName(f.homeTeam.name).toLowerCase();
        const away = normaliseTeamName(f.awayTeam.name).toLowerCase();
        const homeOwner = (ownerMap[normaliseTeamName(f.homeTeam.name)] || '').toLowerCase();
        const awayOwner = (ownerMap[normaliseTeamName(f.awayTeam.name)] || '').toLowerCase();
        return home.includes(q) || away.includes(q) || homeOwner.includes(q) || awayOwner.includes(q);
      });
    }
    return [...list].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }, [fixtures, stageFilter, showFinished, search, ownerMap]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of visible) {
      const day = formatDateAEST(m.utcDate) || 'TBD';
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(m);
    }
    return map;
  }, [visible]);

  const hasMore = limit < filtered.length;

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
          <p className="subtitle">
            Updated {new Date(lastFetched).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit', hour12: true })} AEST
          </p>
        )}
        {error && <p className="error-msg">{error}</p>}
      </div>

      {fixtures.length > 0 && (
        <div className="filter-bar">
          {/* Search */}
          <div className="search-row">
            <input
              className="search-input"
              type="search"
              placeholder="Search country or player…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Stage pills */}
          <div className="stage-filters">
            <button className={`filter-btn ${stageFilter === 'ALL' ? 'active' : ''}`} onClick={() => setStageFilter('ALL')}>All</button>
            {stages.map((s) => (
              <button key={s} className={`filter-btn ${stageFilter === s ? 'active' : ''}`} onClick={() => setStageFilter(s)}>
                {STAGE_LABELS[s] || s}
              </button>
            ))}
          </div>

          <label className="toggle-label">
            <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} />
            <span>Show finished</span>
          </label>
        </div>
      )}

      {fixtures.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>{error || 'No fixtures found. Pull to refresh or check your connection.'}</p>
        </div>
      )}

      {filtered.length === 0 && !loading && fixtures.length > 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>No matches found for "{search}"</p>
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
            <MatchCard key={m.id} match={m} ownerMap={ownerMap} onSelectTeam={onSelectTeam} />
          ))}
        </div>
      ))}

      {hasMore && (
        <button className="show-more-btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Show more · {filtered.length - limit} remaining
        </button>
      )}
    </div>
  );
}
