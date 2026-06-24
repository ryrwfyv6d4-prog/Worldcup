import { useState, useEffect } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { getBanter } from '../data/matchBanter.js';
import { espnName } from '../hooks/useFixtures.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';
import { useYouTubeHighlight } from '../hooks/useYouTubeHighlight.js';

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=';

function ymd(d) {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, '0')}${String(x.getUTCDate()).padStart(2, '0')}`;
}

function getOwner(team, assignments, drawType) {
  for (const name of Object.keys(assignments)) {
    if (getTeamsForParticipant(name, assignments, drawType).includes(team)) return name;
  }
  return null;
}

const STAT_LABELS = {
  possessionPct: 'Possession %',
  totalShots: 'Shots',
  shotsOnTarget: 'On target',
  wonCorners: 'Corners',
  foulsCommitted: 'Fouls',
  totalPasses: 'Passes',
  offsides: 'Offsides',
  saves: 'Saves',
};

// ── Goal summary chips ────────────────────────────────────────────────────────

function GoalSummary({ keyEvents }) {
  const goals = (keyEvents || [])
    .map(e => {
      const t = (e.type?.text || '').toLowerCase();
      const isGoal = t.includes('goal') || t.includes('penalty - scored');
      if (!isGoal) return null;
      return {
        icon: t.includes('own goal') ? '🥴' : '⚽',
        clock: e.clock?.displayValue,
        text: e.shortText || e.text,
      };
    })
    .filter(Boolean);
  if (!goals.length) return null;
  return (
    <div className="ms-goals">
      {goals.map((g, i) => (
        <span key={i} className="ms-goal-chip">
          {g.icon} {g.clock}' {g.text}
        </span>
      ))}
    </div>
  );
}

// ── Stat bars ─────────────────────────────────────────────────────────────────

function StatBars({ boxscore }) {
  const teams = boxscore?.teams || [];
  if (teams.length !== 2) return <p className="ms-fine">Stats not yet available.</p>;
  const get = (t, key) => {
    const s = (t.statistics || []).find(x => x.name === key);
    return s ? s.displayValue : null;
  };
  const rows = Object.entries(STAT_LABELS)
    .map(([key, label]) => {
      const hStr = get(teams[0], key);
      const aStr = get(teams[1], key);
      if (hStr == null && aStr == null) return null;
      const hNum = parseFloat(hStr) || 0;
      const aNum = parseFloat(aStr) || 0;
      const total = hNum + aNum;
      const hPct = total > 0 ? (hNum / total) * 100 : 50;
      return { label, h: hStr ?? '–', a: aStr ?? '–', hPct };
    })
    .filter(Boolean);
  if (!rows.length) return <p className="ms-fine">Stats not yet available.</p>;
  return (
    <div className="ms-statbars">
      {rows.map(r => (
        <div key={r.label} className="ms-statbar-row">
          <div className="ms-statbar-vals">
            <span className="ms-statbar-num">{r.h}</span>
            <span className="ms-statbar-label">{r.label}</span>
            <span className="ms-statbar-num">{r.a}</span>
          </div>
          <div className="ms-statbar-track">
            <div className="ms-statbar-fill" style={{ width: `${r.hPct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

const EVENT_ICON = (txt = '') => {
  const t = txt.toLowerCase();
  if (t.includes('own goal')) return '🥴';
  if (t.includes('goal') || t.includes('penalty - scored')) return '⚽';
  if (t.includes('red')) return '🟥';
  if (t.includes('yellow')) return '🟨';
  return null;
};

function Timeline({ keyEvents }) {
  const evs = (keyEvents || [])
    .map(e => ({ icon: EVENT_ICON(e.type?.text), clock: e.clock?.displayValue, text: e.text || e.shortText }))
    .filter(e => e.icon && e.text);
  if (!evs.length) return <p className="ms-fine">No key events recorded yet.</p>;
  return (
    <div className="ms-section">
      {evs.map((e, i) => (
        <div key={i} className="ms-event">
          <span className="ms-event-clock">{e.clock}</span>
          <span>{e.icon}</span>
          <span className="ms-event-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Lineups ───────────────────────────────────────────────────────────────────

function Lineups({ rosters }) {
  const sides = (rosters || []).filter(r => (r.roster || []).length > 0);
  if (!sides.length) return null;
  return (
    <div className="ms-section">
      <div className="ms-lineups">
        {sides.map((side, i) => {
          const starters = (side.roster || []).filter(p => p.starter);
          if (!starters.length) return null;
          return (
            <div key={i} className="ms-lineup-col">
              <div className="ms-lineup-team">
                {side.team?.displayName}
                {side.formation && <span className="ms-formation">{side.formation}</span>}
              </div>
              {starters.map(p => (
                <div key={p.athlete?.id || p.athlete?.displayName} className="ms-player">
                  <span className="ms-jersey">{p.jersey}</span>
                  <span className="ms-player-name">{p.athlete?.shortName || p.athlete?.displayName}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Odds ──────────────────────────────────────────────────────────────────────

function toDecimal(ml) {
  if (ml == null || isNaN(ml)) return null;
  const dec = ml > 0 ? 1 + ml / 100 : 1 + 100 / Math.abs(ml);
  return `$${dec.toFixed(2)}`;
}

function Odds({ pickcenter, home, away, homeFlag, awayFlag }) {
  const o = (pickcenter || [])[0];
  if (!o) return <p className="ms-fine">No odds available yet.</p>;
  const h = toDecimal(o.homeTeamOdds?.moneyLine);
  const a = toDecimal(o.awayTeamOdds?.moneyLine);
  const d = toDecimal(o.drawOdds?.moneyLine);
  if (!h && !a && !o.details) return <p className="ms-fine">No odds available yet.</p>;
  return (
    <div className="ms-section">
      <div className="ms-odds">
        {h && <span className="ms-odds-chip">{homeFlag} {home} <b>{h}</b></span>}
        {d && <span className="ms-odds-chip">Draw <b>{d}</b></span>}
        {a && <span className="ms-odds-chip">{awayFlag} {away} <b>{a}</b></span>}
        {!h && !a && o.details && <span className="ms-odds-chip">{o.details}</span>}
      </div>
      <p className="ms-fine">AUD-style decimal odds{o.provider?.name ? ` via ${o.provider.name}` : ''} — for entertainment, like Macri's draw picks</p>
    </div>
  );
}

// ── MatchSheet ────────────────────────────────────────────────────────────────

export default function MatchSheet({ match, assignments, drawType, onClose, onSelectTeam }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const homeOwner = getOwner(home, assignments, drawType);
  const awayOwner = getOwner(away, assignments, drawType);
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isDone = match.status === 'FINISHED';
  const showScore = isLive || isDone;

  const [summary, setSummary] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [activeTab, setActiveTab] = useState(isDone || isLive ? 'events' : 'lineup');

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const base = new Date(match.utcDate).getTime();
        for (const off of [0, -1, 1]) {
          const r = await fetch(`${SCOREBOARD}?dates=${ymd(base + off * 86400000)}`);
          if (!r.ok) continue;
          const j = await r.json();
          const ev = (j.events || []).find(e => {
            const names = (e.competitions?.[0]?.competitors || [])
              .map(c => normaliseTeamName(espnName(c.team?.displayName || '')));
            return names.includes(home) && names.includes(away);
          });
          if (ev) {
            const s = await fetch(SUMMARY + ev.id);
            if (s.ok) {
              const sum = await s.json();
              if (!dead) { setSummary(sum); setPhase('ready'); }
              return;
            }
          }
        }
        if (!dead) setPhase('none');
      } catch {
        if (!dead) setPhase('none');
      }
    })();
    return () => { dead = true; };
  }, [match.id]);

  const venue = summary?.gameInfo?.venue;
  const pickTeam = t => { onClose(); onSelectTeam(t); };

  const ytDirect = useYouTubeHighlight(
    home, away, isLive || isDone,
    isDone ? (match.score?.home ?? null) : null,
    isDone ? (match.score?.away ?? null) : null,
  );

  const TABS = [
    { id: 'events', label: isDone || isLive ? 'Events' : 'Odds' },
    { id: 'stats',  label: 'Stats'  },
    { id: 'lineup', label: 'Lineup' },
  ];

  return (
    <div className="ms-backdrop" onClick={onClose}>
      <div className="ms-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-grab" />
        <button className="ms-close" onClick={onClose}>✕</button>

        {/* Score header */}
        <div className="ms-header">
          <button className="ms-team" onClick={() => pickTeam(home)}>
            <span className="ms-flag">{getFlag(home)}</span>
            <span className="ms-team-name">{home}</span>
            {homeOwner && <span className="ms-owner">{homeOwner}</span>}
          </button>
          <div className="ms-center">
            {showScore ? (
              <div className={`ms-score ${isLive ? 'live' : ''}`}>
                {match.score.home ?? 0}–{match.score.away ?? 0}
              </div>
            ) : (
              <div className="ms-ko">{formatTimeAEST(match.utcDate)}</div>
            )}
            <div className="ms-status">
              {isLive ? '● LIVE' : isDone ? 'FULL TIME' : formatDateAEST(match.utcDate)}
            </div>
          </div>
          <button className="ms-team" onClick={() => pickTeam(away)}>
            <span className="ms-flag">{getFlag(away)}</span>
            <span className="ms-team-name">{away}</span>
            {awayOwner && <span className="ms-owner">{awayOwner}</span>}
          </button>
        </div>

        {/* Highlights */}
        {(ytDirect || isLive || isDone) && (
          <a
            href={ytDirect || `https://www.youtube.com/@FIFA/search?query=${encodeURIComponent(`${home} v ${away} highlights`)}`}
            target="_blank"
            rel="noreferrer"
            className="ms-highlights"
          >
            <span className="ms-yt-icon">▶</span>
            <span>{ytDirect ? 'Watch highlights on YouTube' : 'Search FIFA YouTube for highlights'}</span>
            <span className="ms-yt-arrow">›</span>
          </a>
        )}

        {/* Banter */}
        <div className="ms-history">
          <div className="ms-history-label">★ THE HISTORY ★</div>
          <p>{getBanter(home, away)}</p>
        </div>

        {/* Goal chips — prominent, above tabs */}
        {(isLive || isDone) && summary && (
          <GoalSummary keyEvents={summary.keyEvents} />
        )}

        {/* Tabs */}
        <div className="ms-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ms-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ms-tab-content">
          {phase === 'loading' && <p className="ms-loading">Ringing ESPN…</p>}

          {phase === 'ready' && activeTab === 'events' && (
            isDone || isLive
              ? <Timeline keyEvents={summary.keyEvents} />
              : <Odds pickcenter={summary.pickcenter} home={home} away={away} homeFlag={getFlag(home)} awayFlag={getFlag(away)} />
          )}

          {phase === 'ready' && activeTab === 'stats' && (
            <StatBars boxscore={summary.boxscore} />
          )}

          {phase === 'ready' && activeTab === 'lineup' && (
            <>
              <Lineups rosters={summary.rosters} />
              {(summary.rosters || []).every(r => (r.roster || []).length === 0) && !isDone && (
                <p className="ms-fine">Lineups land about an hour before kickoff.</p>
              )}
              {venue?.fullName && (
                <p className="ms-venue">📍 {venue.fullName}{venue.address?.city ? `, ${venue.address.city}` : ''}</p>
              )}
            </>
          )}

          {phase === 'none' && (
            <p className="ms-fine">ESPN has nothing extra on this one yet — check back closer to kickoff.</p>
          )}
        </div>
      </div>
    </div>
  );
}
