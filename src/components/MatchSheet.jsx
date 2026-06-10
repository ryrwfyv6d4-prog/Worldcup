import { useState, useEffect } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { getBanter } from '../data/matchBanter.js';
import { espnName } from '../hooks/useFixtures.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';

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

// Stats worth showing, in display order
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

function StatRows({ boxscore }) {
  const teams = boxscore?.teams || [];
  if (teams.length !== 2) return null;
  const get = (t, key) => {
    const s = (t.statistics || []).find((x) => x.name === key);
    return s ? s.displayValue : null;
  };
  const rows = Object.entries(STAT_LABELS)
    .map(([key, label]) => {
      const h = get(teams[0], key);
      const a = get(teams[1], key);
      if (h == null && a == null) return null;
      return { label, h: h ?? '–', a: a ?? '–' };
    })
    .filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <div className="ms-section">
      <div className="ms-eyebrow">Match stats</div>
      {rows.map((r) => (
        <div key={r.label} className="ms-stat-row">
          <span className="ms-stat-val">{r.h}</span>
          <span className="ms-stat-label">{r.label}</span>
          <span className="ms-stat-val">{r.a}</span>
        </div>
      ))}
    </div>
  );
}

function Lineups({ rosters }) {
  const sides = (rosters || []).filter((r) => (r.roster || []).length > 0);
  if (sides.length === 0) return null;
  return (
    <div className="ms-section">
      <div className="ms-eyebrow">Starting XI</div>
      <div className="ms-lineups">
        {sides.map((side, i) => {
          const starters = (side.roster || []).filter((p) => p.starter);
          if (starters.length === 0) return null;
          return (
            <div key={i} className="ms-lineup-col">
              <div className="ms-lineup-team">
                {side.team?.displayName}
                {side.formation && <span className="ms-formation">{side.formation}</span>}
              </div>
              {starters.map((p) => (
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
    .map((e) => ({ icon: EVENT_ICON(e.type?.text), clock: e.clock?.displayValue, text: e.text || e.shortText }))
    .filter((e) => e.icon && e.text);
  if (evs.length === 0) return null;
  return (
    <div className="ms-section">
      <div className="ms-eyebrow">How it happened</div>
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

function Odds({ pickcenter }) {
  const o = (pickcenter || [])[0];
  if (!o) return null;
  const ml = (x) => (x && x.moneyLine != null ? (x.moneyLine > 0 ? `+${x.moneyLine}` : x.moneyLine) : null);
  const home = ml(o.homeTeamOdds);
  const away = ml(o.awayTeamOdds);
  const draw = o.drawOdds && o.drawOdds.moneyLine != null ? (o.drawOdds.moneyLine > 0 ? `+${o.drawOdds.moneyLine}` : o.drawOdds.moneyLine) : null;
  if (!home && !away && !o.details) return null;
  return (
    <div className="ms-section">
      <div className="ms-eyebrow">The bookies say</div>
      <div className="ms-odds">
        {home && <span className="ms-odds-chip">HOME {home}</span>}
        {draw && <span className="ms-odds-chip">DRAW {draw}</span>}
        {away && <span className="ms-odds-chip">AWAY {away}</span>}
        {!home && !away && o.details && <span className="ms-odds-chip">{o.details}</span>}
      </div>
      {o.provider?.name && <p className="ms-fine">via {o.provider.name} — for entertainment, like Macri's draw picks</p>}
    </div>
  );
}

export default function MatchSheet({ match, assignments, drawType, onClose, onSelectTeam }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const homeOwner = getOwner(home, assignments, drawType);
  const awayOwner = getOwner(away, assignments, drawType);
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isDone = match.status === 'FINISHED';
  const showScore = isLive || isDone;

  const [summary, setSummary] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | ready | none

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const base = new Date(match.utcDate).getTime();
        for (const off of [0, -1, 1]) {
          const r = await fetch(`${SCOREBOARD}?dates=${ymd(base + off * 86400000)}`);
          if (!r.ok) continue;
          const j = await r.json();
          const ev = (j.events || []).find((e) => {
            const names = (e.competitions?.[0]?.competitors || [])
              .map((c) => normaliseTeamName(espnName(c.team?.displayName || '')));
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
  const pickTeam = (t) => { onClose(); onSelectTeam(t); };

  return (
    <div className="ms-backdrop" onClick={onClose}>
      <div className="ms-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ms-grab" />
        <button className="ms-close" onClick={onClose}>✕</button>

        {/* Header */}
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

        {/* The history — above the game information, as requested */}
        <div className="ms-history">
          <div className="ms-history-label">★ THE HISTORY ★</div>
          <p>{getBanter(home, away)}</p>
        </div>

        {phase === 'loading' && <p className="ms-loading">Ringing ESPN…</p>}

        {phase === 'ready' && (
          <>
            {!isDone && !isLive && <Odds pickcenter={summary.pickcenter} />}
            <Timeline keyEvents={summary.keyEvents} />
            <StatRows boxscore={summary.boxscore} />
            <Lineups rosters={summary.rosters} />
            {(summary.rosters || []).every((r) => (r.roster || []).length === 0) && !isDone && (
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
  );
}
