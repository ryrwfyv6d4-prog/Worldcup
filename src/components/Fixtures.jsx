import { useState, useMemo, useEffect } from 'react';
import MatchSheet from './MatchSheet.jsx';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';
import { useYouTubeHighlight } from '../hooks/useYouTubeHighlight.js';

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

function GroupTables({ fixtures, ownerMap, currentUser, onSelectTeam }) {
  const [open, setOpen] = useState(false);

  const tables = useMemo(() => {
    const groups = {};
    for (const m of fixtures) {
      if (m.stage !== 'GROUP_STAGE' || !m.group) continue;
      const home = normaliseTeamName(m.homeTeam.name);
      const away = normaliseTeamName(m.awayTeam.name);
      if (!groups[m.group]) groups[m.group] = {};
      for (const t of [home, away]) {
        if (!groups[m.group][t]) groups[m.group][t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      }
      if (m.status !== 'FINISHED') continue;
      const h = groups[m.group][home];
      const a = groups[m.group][away];
      h.p++; a.p++;
      h.gf += m.score.home; h.ga += m.score.away;
      a.gf += m.score.away; a.ga += m.score.home;
      if (m.score.winner === 'HOME_TEAM') { h.w++; h.pts += 3; a.l++; }
      else if (m.score.winner === 'AWAY_TEAM') { a.w++; a.pts += 3; h.l++; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    }
    return Object.keys(groups).sort().map((g) => ({
      group: g,
      rows: Object.values(groups[g]).sort((x, y) =>
        y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team)
      ),
    }));
  }, [fixtures]);

  if (tables.length === 0) return null;

  return (
    <div className="card group-tables">
      <button className="group-tables-toggle" onClick={() => setOpen(!open)}>
        📊 Group Tables <span className="chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="group-tables-grid">
          {tables.map(({ group, rows }) => (
            <div key={group} className="group-table">
              <div className="group-table-title">Group {group}</div>
              <table>
                <thead>
                  <tr><th></th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GD</th><th className="num">Pts</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const owner = ownerMap[r.team];
                    const isMine = currentUser && owner === currentUser;
                    return (
                      <tr key={r.team} className={`${i < 2 ? 'qualifying' : ''} ${isMine ? 'mine' : ''}`}>
                        <td>
                          <button className="team-btn" onClick={() => onSelectTeam(r.team)}>
                            {getFlag(r.team)} {r.team}
                          </button>
                          {owner && <span className={`owner-tag ${isMine ? 'me' : ''}`}> {owner}</span>}
                        </td>
                        <td className="num">{r.p}</td>
                        <td className="num">{r.w}</td>
                        <td className="num">{r.d}</td>
                        <td className="num">{r.l}</td>
                        <td className="num">{r.gf - r.ga}</td>
                        <td className="num pts">{r.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 4 }}>Top 2 qualify automatically; best 3rd-placed teams may also advance.</p>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, ownerMap, currentUser, onSelectTeam, onOpenMatch }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const { label, cls } = STATUS_BADGE[match.status] || { label: match.status, cls: 'badge-upcoming' };
  const homeOwner = ownerMap[home];
  const awayOwner = ownerMap[away];
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isDone = match.status === 'FINISHED';
  const showScore = isDone || isLive;
  const hasOwner = !!(homeOwner || awayOwner);

  const hs = match.score?.home;
  const as_ = match.score?.away;
  const ytDirect = useYouTubeHighlight(home, away, isDone || isLive, isDone ? hs : null, isDone ? as_ : null);
  const sbsUrl = (isDone || isLive)
    ? `https://www.sbs.com.au/ondemand/search?q=${encodeURIComponent(`${home} ${away} FIFA World Cup highlights`)}`
    : null;
  const ytUrl = ytDirect
    || sbsUrl
    || ((isDone || isLive)
      ? `https://www.youtube.com/@FIFA/search?query=${encodeURIComponent(`${home} v ${away} highlights`)}`
      : null);

  return (
    <div className={`match-card ${isLive ? 'live' : ''} ${hasOwner && !isLive ? 'has-owner' : ''}`} onClick={() => onOpenMatch(match)}>
      <div className="match-date">
        <span>{formatTimeAEST(match.utcDate)} AEST</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {match.group && <span className="match-group">{match.group.replace('GROUP_', 'Group ')}</span>}
          {ytUrl && (
            <a
              href={ytUrl}
              target="_blank"
              rel="noreferrer"
              className="match-yt-btn"
              onClick={(e) => e.stopPropagation()}
            >
              ▶ Highlights
            </a>
          )}
        </span>
      </div>
      <div className="match-row">
        <div className={`team-side ${homeOwner ? 'owned' : ''}`}>
          <button className="team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(home); }} style={{ gap: 6 }}>
            <span className="flag">{getFlag(home)}</span>
            <div className="team-col">
              <span className="team-name">{home || match.homeTeam.name}</span>
              {homeOwner && <span className={`owner-tag ${currentUser === homeOwner ? 'me' : ''}`}>({homeOwner})</span>}
            </div>
          </button>
        </div>
        <div className="score-center">
          {showScore ? (
            <span className={`score ${isLive ? 'live-big' : ''}`}>
              {match.score.home ?? '–'}
              <span className={`status-badge ${cls}`}>
                {isLive && match.liveClock ? match.liveClock : label}
              </span>
              {match.score.away ?? '–'}
            </span>
          ) : (
            <span className={`status-badge ${cls}`}>{label}</span>
          )}
        </div>
        <div className={`team-side right ${awayOwner ? 'owned' : ''}`}>
          <button className="team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(away); }} style={{ gap: 6, flexDirection: 'row-reverse' }}>
            <span className="flag">{getFlag(away)}</span>
            <div className="team-col" style={{ alignItems: 'flex-end' }}>
              <span className="team-name">{away || match.awayTeam.name}</span>
              {awayOwner && <span className={`owner-tag ${currentUser === awayOwner ? 'me' : ''}`}>({awayOwner})</span>}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Fixtures({ fixtures, loading, error, lastFetched, onRefresh, assignments, drawType, onSelectTeam, currentUser }) {
  const [stageFilter, setStageFilter] = useState('ALL');
  const [openMatch, setOpenMatch] = useState(null);
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

      {fixtures.length > 0 && (
        <GroupTables fixtures={fixtures} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} />
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
            <MatchCard key={m.id} match={m} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={setOpenMatch} />
          ))}
        </div>
      ))}

      {hasMore && (
        <button className="show-more-btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Show more · {filtered.length - limit} remaining
        </button>
      )}
      {openMatch && (
        <MatchSheet
          match={openMatch}
          assignments={assignments}
          drawType={drawType}
          onClose={() => setOpenMatch(null)}
          onSelectTeam={onSelectTeam}
        />
      )}
    </div>
  );
}

