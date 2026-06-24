import { useState, useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName } from '../utils/scoring.js';

// ── Pitch constants (viewBox 100×65) ─────────────────────────────────────────

const W = 100, H = 65;
const GOAL_LINE_X = 5;
const BOX_X = 16.5, BOX_Y_TOP = 13.84, BOX_Y_BOT = 51.16;   // penalty area
const SMALL_BOX_X = 5.5, SB_Y_TOP = 24.84, SB_Y_BOT = 40.16; // 6-yard box
const GOAL_Y_TOP = 27.68, GOAL_Y_BOT = 37.32;                  // goal mouth

// ── Pseudo-random scatter ─────────────────────────────────────────────────────

function hash(n) {
  let x = Math.sin(n + 1) * 43758.5453;
  return x - Math.floor(x);
}

// Zones for shot placement (attacking left → right, goal on right)
const ZONES = {
  goal:      { xMin: GOAL_LINE_X, xMax: SMALL_BOX_X + 2,  yMin: GOAL_Y_TOP,   yMax: GOAL_Y_BOT   },
  onTarget:  { xMin: SMALL_BOX_X, xMax: BOX_X - 1,        yMin: BOX_Y_TOP + 3, yMax: BOX_Y_BOT - 3 },
  blocked:   { xMin: BOX_X - 4,   xMax: BOX_X,            yMin: BOX_Y_TOP + 2, yMax: BOX_Y_BOT - 2 },
  missed:    { xMin: BOX_X - 6,   xMax: BOX_X + 2,        yMin: BOX_Y_TOP,    yMax: BOX_Y_BOT    },
  longRange: { xMin: BOX_X + 2,   xMax: W / 2,            yMin: 10,            yMax: H - 10       },
};

function placeInZone(zone, seed) {
  const x = zone.xMin + hash(seed) * (zone.xMax - zone.xMin);
  const y = zone.yMin + hash(seed + 100) * (zone.yMax - zone.yMin);
  return { x, y };
}

function buildShots(teams, keyEvents, side) {
  const idx = side === 'home' ? 0 : 1;
  const team = (teams || [])[idx] || {};
  const get = key => parseInt((team.statistics || []).find(s => s.name === key)?.displayValue) || 0;

  const totalShots = get('totalShots');
  const onTarget = get('shotsOnTarget');

  // Count goals for this side from keyEvents
  const teamName = normaliseTeamName(team.team?.displayName || team.team?.name || '');
  let goals = 0;
  for (const ev of (keyEvents || [])) {
    const t = (ev.type?.text || '').toLowerCase();
    if (!t.includes('goal') && !t.includes('penalty - scored')) continue;
    const evTeam = normaliseTeamName(ev.team?.displayName || ev.team?.name || '');
    const isOG = t.includes('own goal');
    // own goal → credited to opposing team
    if (isOG) {
      if (evTeam !== teamName) goals++;
    } else {
      if (evTeam === teamName) goals++;
    }
  }

  const blocked = Math.max(0, onTarget - goals);
  const offTarget = Math.max(0, totalShots - onTarget);
  const longRange = Math.floor(offTarget * 0.3);
  const missedNorm = offTarget - longRange;

  const shots = [];
  let seed = idx * 1000;

  for (let i = 0; i < goals; i++) shots.push({ type: 'goal', ...placeInZone(ZONES.goal, seed++) });
  for (let i = 0; i < blocked; i++) shots.push({ type: 'onTarget', ...placeInZone(ZONES.onTarget, seed++) });
  for (let i = 0; i < missedNorm; i++) shots.push({ type: 'missed', ...placeInZone(ZONES.missed, seed++) });
  for (let i = 0; i < longRange; i++) shots.push({ type: 'longRange', ...placeInZone(ZONES.longRange, seed++) });

  return { shots, goals, onTarget, total: totalShots };
}

const SHOT_STYLE = {
  goal:      { fill: '#F5C842', stroke: '#C49A10', r: 4.5 },
  onTarget:  { fill: 'none',   stroke: '#4CAF92', r: 3.5, strokeWidth: 2 },
  missed:    { fill: 'none',   stroke: '#E85D5D', r: 3,   strokeWidth: 1.5, strokeDasharray: '2 1.5' },
  longRange: { fill: 'none',   stroke: '#8899CC', r: 2.5, strokeWidth: 1.5, strokeDasharray: '2 2' },
};

// ── Half-pitch SVG ─────────────────────────────────────────────────────────────

function HalfPitch({ shots, mirrored, label, stats }) {
  // mirrored = away team (flip x so they also attack right→left on right half)
  const tx = mirrored ? x => W - x : x => x;

  return (
    <div className="sm-half-wrap">
      <svg
        className="sm-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Grass */}
        <rect x={0} y={0} width={W} height={H} fill="#1a3d25" rx={3} />
        {/* Stripes */}
        {[0,1,2,3,4].map(i => (
          <rect key={i} x={i * 20} y={0} width={10} height={H} fill="#1e4429" />
        ))}

        {/* Penalty area */}
        <rect
          x={mirrored ? W - BOX_X : GOAL_LINE_X}
          y={BOX_Y_TOP}
          width={BOX_X - GOAL_LINE_X}
          height={BOX_Y_BOT - BOX_Y_TOP}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.5}
        />
        {/* 6-yard box */}
        <rect
          x={mirrored ? W - SMALL_BOX_X : GOAL_LINE_X}
          y={SB_Y_TOP}
          width={SMALL_BOX_X - GOAL_LINE_X}
          height={SB_Y_BOT - SB_Y_TOP}
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.5}
        />
        {/* Goal line */}
        <line
          x1={mirrored ? W - GOAL_LINE_X : GOAL_LINE_X}
          y1={GOAL_Y_TOP}
          x2={mirrored ? W - GOAL_LINE_X : GOAL_LINE_X}
          y2={GOAL_Y_BOT}
          stroke="rgba(255,255,255,0.5)" strokeWidth={2}
        />
        {/* Penalty spot */}
        <circle
          cx={mirrored ? W - 11 : 11}
          cy={H / 2}
          r={0.7}
          fill="rgba(255,255,255,0.4)"
        />

        {/* Shots */}
        {shots.map((s, i) => {
          const sx = SHOT_STYLE[s.type] || SHOT_STYLE.missed;
          const cx = mirrored ? W - s.x : s.x;
          return (
            <circle
              key={i}
              cx={cx}
              cy={s.y}
              r={sx.r}
              fill={sx.fill || 'none'}
              stroke={sx.stroke}
              strokeWidth={sx.strokeWidth || 1.5}
              strokeDasharray={sx.strokeDasharray}
              opacity={0.9}
            />
          );
        })}
      </svg>

      {/* Team label + stat chips */}
      <div className="sm-team-row">
        <span className="sm-team-label">{label}</span>
        <div className="sm-stat-chips">
          <span className="sm-chip goal">{stats.goals} <span className="sm-chip-label">Goals</span></span>
          <span className="sm-chip on">{stats.onTarget} <span className="sm-chip-label">On tgt</span></span>
          <span className="sm-chip total">{stats.total} <span className="sm-chip-label">Total</span></span>
        </div>
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="sm-legend">
      <span className="sm-legend-item"><svg width={12} height={12} viewBox="0 0 12 12"><circle cx={6} cy={6} r={4.5} fill="#F5C842" stroke="#C49A10" strokeWidth={1}/></svg> Goal</span>
      <span className="sm-legend-item"><svg width={12} height={12} viewBox="0 0 12 12"><circle cx={6} cy={6} r={3.5} fill="none" stroke="#4CAF92" strokeWidth={2}/></svg> On target</span>
      <span className="sm-legend-item"><svg width={12} height={12} viewBox="0 0 12 12"><circle cx={6} cy={6} r={3} fill="none" stroke="#E85D5D" strokeWidth={1.5} strokeDasharray="2 1.5"/></svg> Missed</span>
      <span className="sm-legend-item"><svg width={12} height={12} viewBox="0 0 12 12"><circle cx={6} cy={6} r={2.5} fill="none" stroke="#8899CC" strokeWidth={1.5} strokeDasharray="2 2"/></svg> Long range</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ShotMap({ boxscore, keyEvents, home, away }) {
  const teams = boxscore?.teams || [];
  if (!teams.length) return <p className="ms-fine">Shot data not yet available.</p>;

  const homeStats = buildShots(teams, keyEvents, 'home');
  const awayStats = buildShots(teams, keyEvents, 'away');

  const homeFlag = getFlag(normaliseTeamName(home));
  const awayFlag = getFlag(normaliseTeamName(away));

  const noShots = homeStats.total === 0 && awayStats.total === 0;
  if (noShots) return <p className="ms-fine">Shot data not yet available.</p>;

  return (
    <div className="sm-wrap">
      <div className="sm-pitches">
        <HalfPitch
          shots={homeStats.shots}
          mirrored={false}
          label={`${homeFlag} ${home}`}
          stats={homeStats}
        />
        <HalfPitch
          shots={awayStats.shots}
          mirrored={true}
          label={`${awayFlag} ${away}`}
          stats={awayStats}
        />
      </div>
      <Legend />
    </div>
  );
}
