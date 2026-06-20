import { useState, useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';

// ── Bracket data (official 2026 FIFA draw) ────────────────────────────────────

const R32 = [
  { num: 73, s1: '2A',        s2: '2B',        date: '28 Jun' },
  { num: 74, s1: '1E',        s2: '3A/B/C/D/F',date: '29 Jun' },
  { num: 75, s1: '1F',        s2: '2C',        date: '29 Jun' },
  { num: 76, s1: '1C',        s2: '2F',        date: '29 Jun' },
  { num: 77, s1: '1I',        s2: '3C/D/F/G/H',date: '30 Jun' },
  { num: 78, s1: '2E',        s2: '2I',        date: '30 Jun' },
  { num: 79, s1: '1A',        s2: '3C/E/F/H/I',date: '30 Jun' },
  { num: 80, s1: '1L',        s2: '3E/H/I/J/K',date: '1 Jul' },
  { num: 81, s1: '1D',        s2: '3B/E/F/I/J',date: '1 Jul' },
  { num: 82, s1: '1G',        s2: '3A/E/H/I/J',date: '1 Jul' },
  { num: 83, s1: '2K',        s2: '2L',        date: '2 Jul' },
  { num: 84, s1: '1H',        s2: '2J',        date: '2 Jul' },
  { num: 85, s1: '1B',        s2: '3E/F/G/I/J',date: '2 Jul' },
  { num: 86, s1: '1J',        s2: '2H',        date: '3 Jul' },
  { num: 87, s1: '1K',        s2: '3D/E/I/J/L',date: '3 Jul' },
  { num: 88, s1: '2D',        s2: '2G',        date: '3 Jul' },
];

const R16 = [
  { num: 89,  s1: 'W74', s2: 'W77', date: '4 Jul' },
  { num: 90,  s1: 'W73', s2: 'W75', date: '4 Jul' },
  { num: 91,  s1: 'W76', s2: 'W78', date: '5 Jul' },
  { num: 92,  s1: 'W79', s2: 'W80', date: '5 Jul' },
  { num: 93,  s1: 'W83', s2: 'W84', date: '6 Jul' },
  { num: 94,  s1: 'W81', s2: 'W82', date: '6 Jul' },
  { num: 95,  s1: 'W86', s2: 'W88', date: '7 Jul' },
  { num: 96,  s1: 'W85', s2: 'W87', date: '7 Jul' },
];

const QF = [
  { num: 97,  s1: 'W89', s2: 'W90', date: '9 Jul' },
  { num: 98,  s1: 'W93', s2: 'W94', date: '10 Jul' },
  { num: 99,  s1: 'W91', s2: 'W92', date: '11 Jul' },
  { num: 100, s1: 'W95', s2: 'W96', date: '11 Jul' },
];

const SF = [
  { num: 101, s1: 'W97',  s2: 'W98',  date: '14 Jul' },
  { num: 102, s1: 'W99',  s2: 'W100', date: '15 Jul' },
];

const FINAL = [
  { num: 104, s1: 'W101', s2: 'W102', date: '19 Jul' },
];

const ROUNDS = [
  { id: 'R32',   label: 'R32',   full: 'Round of 32',    matches: R32   },
  { id: 'R16',   label: 'R16',   full: 'Round of 16',    matches: R16   },
  { id: 'QF',    label: 'QF',    full: 'Quarter-finals', matches: QF    },
  { id: 'SF',    label: 'SF',    full: 'Semi-finals',    matches: SF    },
  { id: 'FINAL', label: 'Final', full: 'Final',          matches: FINAL },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildGroupTables(fixtures) {
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
    letter: g,
    rows: Object.values(groups[g]).sort((x, y) =>
      y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team)
    ),
  }));
}

// Resolve a slot string to { team, projected } or null
function resolveSlot(slot, groupTables, fixtureByNum) {
  if (!slot) return null;

  // "1A", "2B" — direct group position
  const posMatch = slot.match(/^([12])([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]) - 1;
    const letter = posMatch[2];
    const table = groupTables.find((t) => t.letter === letter);
    if (table?.rows[pos]?.p > 0) return { team: table.rows[pos].team, projected: true };
    return null;
  }

  // "3A/B/C/D/F" — best 3rd from pool
  const thirdMatch = slot.match(/^3([A-L](?:\/[A-L])*)$/);
  if (thirdMatch) {
    const letters = thirdMatch[1].split('/');
    const thirds = letters
      .map((g) => groupTables.find((t) => t.letter === g)?.rows[2])
      .filter((r) => r && r.p > 0);
    if (!thirds.length) return null;
    thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return { team: thirds[0].team, projected: true };
  }

  // "W73" — winner of a knockout match
  const winnerMatch = slot.match(/^W(\d+)$/);
  if (winnerMatch) {
    const n = parseInt(winnerMatch[1]);
    const fix = fixtureByNum[n];
    if (fix?.status === 'FINISHED') {
      const w = fix.score.winner === 'HOME_TEAM'
        ? normaliseTeamName(fix.homeTeam.name)
        : normaliseTeamName(fix.awayTeam.name);
      return { team: w, projected: false };
    }
    return null;
  }

  return null;
}

// ── BracketCard ────────────────────────────────────────────────────────────────

function BracketCard({ def, groupTables, fixtureByNum, ownerMap, currentUser, onSelectTeam }) {
  const fixture = fixtureByNum[def.num];
  const isLive = fixture?.status === 'IN_PLAY' || fixture?.status === 'PAUSED';
  const isDone = fixture?.status === 'FINISHED';
  const showScore = isDone || isLive;

  const r1 = resolveSlot(def.s1, groupTables, fixtureByNum);
  const r2 = resolveSlot(def.s2, groupTables, fixtureByNum);

  // Confirmed fixture overrides projections
  const team1 = fixture ? normaliseTeamName(fixture.homeTeam.name) : r1?.team;
  const team2 = fixture ? normaliseTeamName(fixture.awayTeam.name) : r2?.team;
  const proj1 = !fixture && r1?.projected;
  const proj2 = !fixture && r2?.projected;

  const own1 = team1 ? ownerMap[team1] : null;
  const own2 = team2 ? ownerMap[team2] : null;
  const hasOwner = !!(own1 || own2);

  const TeamRow = ({ team, owner, projected, score }) => (
    <div className="mc-team-row">
      {team ? (
        <button className="mc-team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(team); }}>
          <span className="mc-flag">{getFlag(team)}</span>
          <div className="mc-team-info">
            <span className={`mc-name${owner ? ' owned' : ''}${projected ? ' bk-projected' : ''}`}>{team}</span>
            {owner && <span className={`mc-owner${currentUser === owner ? ' me' : ''}`}>{owner}</span>}
          </div>
        </button>
      ) : (
        <span className="bk-tbd">TBD</span>
      )}
      {showScore && <span className="mc-score-val">{score ?? '–'}</span>}
    </div>
  );

  const anyProjected = proj1 || proj2;

  return (
    <div className={`match-card${isLive ? ' live' : ''}${hasOwner && !isLive ? ' has-owner' : ''}`}>
      <div className="mc-meta">
        <span className="mc-time">{def.date}</span>
        <span className="mc-meta-right">
          {isLive && <span className="status-badge badge-live">{fixture.liveClock ? `${fixture.liveClock}'` : 'LIVE'}</span>}
          {isDone && <span className="status-badge badge-done">FT</span>}
          {!isDone && !isLive && anyProjected && <span className="bk-proj-tag">projected</span>}
        </span>
      </div>
      <TeamRow team={team1} owner={own1} projected={proj1} score={fixture?.score?.home} />
      <TeamRow team={team2} owner={own2} projected={proj2} score={fixture?.score?.away} />
    </div>
  );
}

// ── Bracket page ───────────────────────────────────────────────────────────────

export default function Bracket({ fixtures, assignments, drawType, onSelectTeam, currentUser }) {
  const [round, setRound] = useState('R32');

  const ownerMap = useMemo(() => {
    const map = {};
    for (const name of Object.keys(assignments)) {
      for (const t of getTeamsForParticipant(name, assignments, drawType)) map[t] = name;
    }
    return map;
  }, [assignments, drawType]);

  const groupTables = useMemo(() => buildGroupTables(fixtures), [fixtures]);

  const fixtureByNum = useMemo(() => {
    const map = {};
    for (const f of fixtures) {
      if (typeof f.id === 'number' && f.id >= 73) map[f.id] = f;
    }
    return map;
  }, [fixtures]);

  const currentRound = ROUNDS.find((r) => r.id === round);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Bracket</h2>
        <p className="subtitle">Projected from live standings · fills in as teams qualify</p>
      </div>

      <div className="stage-filters" style={{ marginBottom: 12 }}>
        {ROUNDS.map((r) => (
          <button
            key={r.id}
            className={`filter-btn${round === r.id ? ' active' : ''}`}
            onClick={() => setRound(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bk-round-title">{currentRound?.full}</div>

      {currentRound?.matches.map((def) => (
        <BracketCard
          key={def.num}
          def={def}
          groupTables={groupTables}
          fixtureByNum={fixtureByNum}
          ownerMap={ownerMap}
          currentUser={currentUser}
          onSelectTeam={onSelectTeam}
        />
      ))}
    </div>
  );
}
