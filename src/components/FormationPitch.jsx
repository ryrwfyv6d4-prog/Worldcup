import { useState } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName } from '../utils/scoring.js';

// ── Data helpers ──────────────────────────────────────────────────────────────

function buildStatMap(boxscorePlayers) {
  const map = {};
  for (const team of (boxscorePlayers || [])) {
    for (const group of (team.statistics || [])) {
      const names = group.names || [];
      for (const entry of (group.athletes || [])) {
        const id = entry.athlete?.id;
        if (!id) continue;
        if (!map[id]) map[id] = {};
        names.forEach((name, i) => {
          const v = entry.stats?.[i];
          if (v != null && v !== '') map[id][name] = v;
        });
      }
    }
  }
  return map;
}

// Parse formation + ESPN order field → array of player rows.
// Natural order: [GK-row, DEF-row, ..., FWD-row]
function buildRows(formation, starters) {
  const counts = (formation || '4-4-2').split('-').map(Number).filter(n => n > 0);
  const sorted = [...starters].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  if (!sorted.length) return [];
  const rows = [[sorted[0]]]; // GK
  let idx = 1;
  for (const count of counts) {
    rows.push(sorted.slice(idx, idx + count));
    idx += count;
  }
  // Any remainder (data mismatch) → append to last row
  if (idx < sorted.length) rows[rows.length - 1].push(...sorted.slice(idx));
  return rows.filter(r => r.length);
}

function passAcc(s) {
  const att = parseInt(s?.passesAttempted) || 0;
  const cmp = parseInt(s?.passesCompleted) || 0;
  if (!att) return null;
  return Math.round((cmp / att) * 100) + '%';
}

// ── Player stats panel ────────────────────────────────────────────────────────

function StatsPanel({ player, teamFlag, stats, onClose }) {
  if (!player) return null;
  const s = stats[player.athlete?.id] || {};
  const isGK = (player.position?.abbreviation || '').toUpperCase() === 'GK';
  const pa = passAcc(s);
  const yc = parseInt(s.yellowCards) || 0;
  const rc = parseInt(s.redCards) || 0;
  const mins = s.minutesPlayed != null ? s.minutesPlayed + "'" : '–';

  const cells = isGK
    ? [
        { val: s.saves ?? '0',  label: 'Saves',    gold: parseInt(s.saves) > 0 },
        { val: pa ?? '–',       label: 'Pass acc.', gold: false },
        { val: mins,            label: 'Minutes',  gold: false },
      ]
    : [
        { val: s.goals   ?? '0', label: 'Goals',    gold: parseInt(s.goals) > 0 },
        { val: s.assists ?? '0', label: 'Assists',  gold: parseInt(s.assists) > 0 },
        { val: s.shots   ?? '0', label: 'Shots',    gold: false },
        { val: s.tackles ?? '0', label: 'Tackles',  gold: false },
        { val: pa ?? '–',        label: 'Pass acc.', gold: false },
        { val: mins,             label: 'Minutes',  gold: false },
      ];

  return (
    <div className="sp-panel">
      <div className="sp-header">
        <span className="sp-flag">{teamFlag}</span>
        <div className="sp-info">
          <span className="sp-name">
            {player.athlete?.displayName || '–'}
            {yc > 0 && <span className="sp-card-chip">🟨</span>}
            {rc > 0 && <span className="sp-card-chip">🟥</span>}
          </span>
          <span className="sp-pos">{player.position?.displayName}</span>
        </div>
        <span className="sp-jersey">#{player.jersey}</span>
        <button className="sp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={`sp-grid sp-grid-${cells.length}`}>
        {cells.map(c => (
          <div key={c.label} className="sp-stat">
            <span className={`sp-val${c.gold ? ' gold' : ''}`}>{c.val}</span>
            <span className="sp-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team half ─────────────────────────────────────────────────────────────────

function TeamHalf({ side, isHome, statMap, selectedId, onSelect }) {
  const starters = (side.roster || []).filter(p => p.starter);
  const rows = buildRows(side.formation, starters);
  // Home: GK at bottom (flex end) → display rows reversed (FWD first in DOM)
  const display = isHome ? [...rows].reverse() : rows;

  const teamName = side.team?.displayName || '';
  const abbr = side.team?.abbreviation || teamName.slice(0, 3).toUpperCase();
  const flag = getFlag(normaliseTeamName(teamName));
  const isScorer = p => parseInt(statMap[p.athlete?.id]?.goals) > 0;

  const label = (
    <div className={`fp-team-strip ${isHome ? 'home' : 'away'}`}>
      <span className="fp-strip-flag">{flag}</span>
      <span className="fp-strip-name">{abbr}</span>
      {side.formation && <span className="fp-strip-form">{side.formation}</span>}
    </div>
  );

  return (
    <div className={`fp-half ${isHome ? 'home' : 'away'}`}>
      {!isHome && label}
      {display.map((row, ri) => (
        <div key={ri} className="fp-row">
          {row.map(p => (
            <button
              key={p.athlete?.id || p.jersey}
              className={[
                'fp-player',
                isHome ? 'home' : 'away',
                isScorer(p) ? 'scorer' : '',
                selectedId === p.athlete?.id ? 'selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(p, flag)}
            >
              <div className="fp-circle">{p.jersey}</div>
              <div className="fp-surname">
                {(p.athlete?.shortName || p.athlete?.displayName || '').split(' ').pop()}
              </div>
            </button>
          ))}
        </div>
      ))}
      {isHome && label}
    </div>
  );
}

// ── Bench strip ───────────────────────────────────────────────────────────────

function BenchStrip({ sides }) {
  return (
    <div className="fp-bench">
      {sides.map((side, si) => {
        const bench = (side.roster || []).filter(p => !p.starter && !p.didNotPlay);
        if (!bench.length) return null;
        const teamName = side.team?.displayName || '';
        const flag = getFlag(normaliseTeamName(teamName));
        return (
          <div key={si} className="fp-bench-team">
            <span className="fp-bench-label">{flag} Bench</span>
            <div className="fp-bench-chips">
              {bench.map(p => (
                <span key={p.athlete?.id || p.jersey} className="fp-bench-chip">
                  <span className="fp-bench-num">{p.jersey}</span>
                  {(p.athlete?.shortName || p.athlete?.displayName || '').split(' ').pop()}
                  {p.subbedIn && <span className="fp-sub-in">↑</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function FormationPitch({ rosters, boxscore, home, away, gameInfo }) {
  const [selected, setSelected] = useState(null);

  const sides = (rosters || []).filter(r => (r.roster || []).some(p => p.starter));
  if (sides.length < 2) return null;

  const statMap = buildStatMap(boxscore?.players);

  // Match roster sides to home/away
  const normHome = normaliseTeamName(home);
  const homeIdx = sides.findIndex(s => normaliseTeamName(s.team?.displayName || '') === normHome);
  const homeSide = sides[homeIdx !== -1 ? homeIdx : 0];
  const awaySide = sides[homeIdx !== -1 ? 1 - homeIdx : 1];

  const handleSelect = (player, teamFlag) => {
    setSelected(prev =>
      prev?.player?.athlete?.id === player.athlete?.id ? null : { player, teamFlag }
    );
  };

  const venue = gameInfo?.venue;
  const attendance = gameInfo?.attendance;
  const referee = (gameInfo?.officials || []).find(o => o.position?.displayName?.toLowerCase().includes('referee'));

  return (
    <div className="fp-wrap">
      {/* Pitch */}
      <div className="fp-pitch">
        <div className="fp-penbox top" />
        <div className="fp-goalbox top" />
        <div className="fp-penbox bot" />
        <div className="fp-goalbox bot" />

        <TeamHalf
          side={awaySide}
          isHome={false}
          statMap={statMap}
          selectedId={selected?.player?.athlete?.id}
          onSelect={handleSelect}
        />

        <div className="fp-center">
          <div className="fp-center-line" />
          <div className="fp-center-circle" />
          <div className="fp-center-spot" />
        </div>

        <TeamHalf
          side={homeSide}
          isHome={true}
          statMap={statMap}
          selectedId={selected?.player?.athlete?.id}
          onSelect={handleSelect}
        />
      </div>

      {/* Player stats */}
      {selected && (
        <StatsPanel
          player={selected.player}
          teamFlag={selected.teamFlag}
          stats={statMap}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Bench */}
      <BenchStrip sides={[homeSide, awaySide]} />

      {/* Venue chips */}
      {(venue?.fullName || attendance || referee) && (
        <div className="fp-info-strip">
          {venue?.fullName && (
            <div className="fp-info-chip">
              <span className="fp-info-label">Venue</span>
              <span className="fp-info-val">{venue.fullName}{venue.address?.city ? `, ${venue.address.city}` : ''}</span>
            </div>
          )}
          {attendance > 0 && (
            <div className="fp-info-chip">
              <span className="fp-info-label">Attendance</span>
              <span className="fp-info-val">{Number(attendance).toLocaleString()}</span>
            </div>
          )}
          {referee && (
            <div className="fp-info-chip">
              <span className="fp-info-label">Referee</span>
              <span className="fp-info-val">{referee.official?.displayName || referee.displayName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
