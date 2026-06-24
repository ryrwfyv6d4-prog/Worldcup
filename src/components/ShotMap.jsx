import { useState } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName } from '../utils/scoring.js';

// ── Pitch constants ───────────────────────────────────────────────────────────
// viewBox "0 0 100 65": goal line at y=0, halfway line at y=65, full width=100

const W = 100, H = 65;

// Markings
const GOAL_X1 = 44.5, GOAL_X2 = 55.5, GOAL_DEPTH = 2.2;
const SB_X1 = 36.8, SB_X2 = 63.2, SB_Y = 6;
const BOX_X1 = 18.3, BOX_X2 = 81.7, BOX_Y = 18;
const PEN_SPOT_Y = 11.5;
const ARC_R = 9.15;   // penalty arc radius (same scale)

// Shot placement zones (attacking toward goal at y=0)
const ZONES = {
  goal:      { xMin: 43,  xMax: 57,  yMin: 0.5, yMax: 3.5  },
  onTarget:  { xMin: 30,  xMax: 70,  yMin: 2,   yMax: 13   },
  missed:    { xMin: 12,  xMax: 88,  yMin: 4,   yMax: 21   },
  longRange: { xMin: 8,   xMax: 92,  yMin: 19,  yMax: 52   },
};

function hash(n) {
  const x = Math.sin(n + 1) * 43758.5453;
  return x - Math.floor(x);
}

function placeInZone(zone, seed) {
  return {
    x: zone.xMin + hash(seed) * (zone.xMax - zone.xMin),
    y: zone.yMin + hash(seed + 77) * (zone.yMax - zone.yMin),
  };
}

function buildShots(teams, keyEvents, idx) {
  const team = (teams || [])[idx] || {};
  const get = key => parseInt((team.statistics || []).find(s => s.name === key)?.displayValue) || 0;

  const totalShots = get('totalShots');
  const onTarget   = get('shotsOnTarget');

  const teamName = normaliseTeamName(team.team?.displayName || team.team?.name || '');
  let goals = 0;
  for (const ev of (keyEvents || [])) {
    const t = (ev.type?.text || '').toLowerCase();
    if (!t.includes('goal') && !t.includes('penalty - scored')) continue;
    const evTeam = normaliseTeamName(ev.team?.displayName || ev.team?.name || '');
    const isOG = t.includes('own goal');
    if (isOG ? evTeam !== teamName : evTeam === teamName) goals++;
  }

  const blocked   = Math.max(0, onTarget - goals);
  const offTarget = Math.max(0, totalShots - onTarget);
  const longRange = Math.floor(offTarget * 0.3);
  const missedNorm = offTarget - longRange;

  const shots = [];
  let seed = idx * 1000;
  for (let i = 0; i < goals; i++)     shots.push({ type: 'goal',      ...placeInZone(ZONES.goal,      seed++) });
  for (let i = 0; i < blocked; i++)   shots.push({ type: 'onTarget',  ...placeInZone(ZONES.onTarget,  seed++) });
  for (let i = 0; i < missedNorm; i++) shots.push({ type: 'missed',   ...placeInZone(ZONES.missed,    seed++) });
  for (let i = 0; i < longRange; i++) shots.push({ type: 'longRange', ...placeInZone(ZONES.longRange, seed++) });

  return { shots, goals, onTarget, total: totalShots };
}

// ── Pitch SVG ─────────────────────────────────────────────────────────────────

function PitchSVG({ shots }) {
  return (
    <svg
      className="sm-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Base grass */}
      <rect x={0} y={0} width={W} height={H} fill="#1a3d25" />
      {/* Mown stripes (horizontal on portrait half-pitch) */}
      {[0,1,2,3].map(i => (
        <rect key={i} x={0} y={i * 16} width={W} height={8} fill="#1e4429" />
      ))}

      {/* Halfway hint line */}
      <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.4} />

      {/* Penalty area */}
      <rect x={BOX_X1} y={0} width={BOX_X2 - BOX_X1} height={BOX_Y}
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />

      {/* Penalty arc (only the portion outside the box) */}
      <path
        d={`M ${50 - ARC_R * Math.cos(Math.asin((BOX_Y - PEN_SPOT_Y) / ARC_R))} ${BOX_Y}
            A ${ARC_R} ${ARC_R} 0 0 0
            ${50 + ARC_R * Math.cos(Math.asin((BOX_Y - PEN_SPOT_Y) / ARC_R))} ${BOX_Y}`}
        fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.5}
      />

      {/* 6-yard box */}
      <rect x={SB_X1} y={0} width={SB_X2 - SB_X1} height={SB_Y}
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.25)" strokeWidth={0.4} />

      {/* Goal mouth */}
      <rect x={GOAL_X1} y={-GOAL_DEPTH} width={GOAL_X2 - GOAL_X1} height={GOAL_DEPTH}
        fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth={0.6} />
      {/* Goal line */}
      <line x1={0} y1={0} x2={W} y2={0} stroke="rgba(255,255,255,0.4)" strokeWidth={0.5} />

      {/* Penalty spot */}
      <circle cx={50} cy={PEN_SPOT_Y} r={0.8} fill="rgba(255,255,255,0.5)" />

      {/* Shots — render goals on top */}
      {[...shots].sort((a, b) => (a.type === 'goal' ? 1 : 0) - (b.type === 'goal' ? 1 : 0))
        .map((s, i) => {
          if (s.type === 'goal') {
            return (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r={5.5} fill="rgba(245,200,66,0.25)" />
                <circle cx={s.x} cy={s.y} r={3.8} fill="#F5C842" stroke="#C49A10" strokeWidth={0.8} />
              </g>
            );
          }
          if (s.type === 'onTarget') {
            return (
              <circle key={i} cx={s.x} cy={s.y} r={3.2}
                fill="rgba(76,207,146,0.15)" stroke="#4CCF92" strokeWidth={1.8} />
            );
          }
          if (s.type === 'missed') {
            return (
              <circle key={i} cx={s.x} cy={s.y} r={2.8}
                fill="none" stroke="#E85D5D" strokeWidth={1.4} strokeDasharray="2 1.5" opacity={0.8} />
            );
          }
          // longRange
          return (
            <circle key={i} cx={s.x} cy={s.y} r={2.2}
              fill="none" stroke="#8899CC" strokeWidth={1.2} strokeDasharray="1.5 2" opacity={0.7} />
          );
        })}
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ShotMap({ boxscore, keyEvents, home, away }) {
  const [activeTeam, setActiveTeam] = useState('home');

  const teams = boxscore?.teams || [];
  if (!teams.length) return <p className="ms-fine">Shot data not yet available.</p>;

  const homeStats = buildShots(teams, keyEvents, 0);
  const awayStats = buildShots(teams, keyEvents, 1);

  const noShots = homeStats.total === 0 && awayStats.total === 0;
  if (noShots) return <p className="ms-fine">Shot data not yet available.</p>;

  const homeFlag = getFlag(normaliseTeamName(home));
  const awayFlag = getFlag(normaliseTeamName(away));

  const current = activeTeam === 'home' ? homeStats : awayStats;

  return (
    <div className="sm-wrap">
      {/* Team toggle */}
      <div className="sm-toggle">
        <button
          className={`sm-toggle-btn${activeTeam === 'home' ? ' active' : ''}`}
          onClick={() => setActiveTeam('home')}
        >
          {homeFlag} {home}
        </button>
        <button
          className={`sm-toggle-btn${activeTeam === 'away' ? ' active' : ''}`}
          onClick={() => setActiveTeam('away')}
        >
          {awayFlag} {away}
        </button>
      </div>

      {/* Shot stat chips */}
      <div className="sm-stat-chips">
        <span className="sm-chip goal">
          <span className="sm-chip-num">{current.goals}</span>
          <span className="sm-chip-label">Goals</span>
        </span>
        <span className="sm-chip on">
          <span className="sm-chip-num">{current.onTarget}</span>
          <span className="sm-chip-label">On target</span>
        </span>
        <span className="sm-chip total">
          <span className="sm-chip-num">{current.total}</span>
          <span className="sm-chip-label">Total shots</span>
        </span>
      </div>

      {/* Pitch */}
      <div className="sm-pitch-wrap">
        <PitchSVG shots={current.shots} />
      </div>

      {/* Legend */}
      <div className="sm-legend">
        <span className="sm-legend-item">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={4} fill="#F5C842" stroke="#C49A10" strokeWidth={0.8}/>
          </svg>
          Goal
        </span>
        <span className="sm-legend-item">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={3.5} fill="rgba(76,207,146,0.15)" stroke="#4CCF92" strokeWidth={1.8}/>
          </svg>
          On target
        </span>
        <span className="sm-legend-item">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={3} fill="none" stroke="#E85D5D" strokeWidth={1.4} strokeDasharray="2 1.5"/>
          </svg>
          Missed
        </span>
        <span className="sm-legend-item">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={2.5} fill="none" stroke="#8899CC" strokeWidth={1.2} strokeDasharray="1.5 2"/>
          </svg>
          Long range
        </span>
      </div>
    </div>
  );
}
