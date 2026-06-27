import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import MatchSheet from './MatchSheet.jsx';
import { getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';
import { useYouTubeHighlight } from '../hooks/useYouTubeHighlight.js';

// ── Bracket data (official 2026 FIFA draw) ────────────────────────────────────

const R32 = [
  { num: 73,  s1: '2A',         s2: '2B',         date: '28 Jun' },
  { num: 74,  s1: '1E',         s2: '3A/B/C/D/F', date: '29 Jun' },
  { num: 75,  s1: '1F',         s2: '2C',         date: '29 Jun' },
  { num: 76,  s1: '1C',         s2: '2F',         date: '29 Jun' },
  { num: 77,  s1: '1I',         s2: '3C/D/F/G/H', date: '30 Jun' },
  { num: 78,  s1: '2E',         s2: '2I',         date: '30 Jun' },
  { num: 79,  s1: '1A',         s2: '3C/E/F/H/I', date: '30 Jun' },
  { num: 80,  s1: '1L',         s2: '3E/H/I/J/K', date: '1 Jul'  },
  { num: 81,  s1: '1D',         s2: '3B/E/F/I/J', date: '1 Jul'  },
  { num: 82,  s1: '1G',         s2: '3A/E/H/I/J', date: '1 Jul'  },
  { num: 83,  s1: '2K',         s2: '2L',         date: '2 Jul'  },
  { num: 84,  s1: '1H',         s2: '2J',         date: '2 Jul'  },
  { num: 85,  s1: '1B',         s2: '3E/F/G/I/J', date: '2 Jul'  },
  { num: 86,  s1: '1J',         s2: '2H',         date: '3 Jul'  },
  { num: 87,  s1: '1K',         s2: '3D/E/I/J/L', date: '3 Jul'  },
  { num: 88,  s1: '2D',         s2: '2G',         date: '3 Jul'  },
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
  { num: 97,  s1: 'W89', s2: 'W90', date: '9 Jul'  },
  { num: 98,  s1: 'W93', s2: 'W94', date: '10 Jul' },
  { num: 99,  s1: 'W91', s2: 'W92', date: '11 Jul' },
  { num: 100, s1: 'W95', s2: 'W96', date: '11 Jul' },
];

const SF = [
  { num: 101, s1: 'W97',  s2: 'W98',  date: '14 Jul' },
  { num: 102, s1: 'W99',  s2: 'W100', date: '15 Jul' },
];

const FINAL_MATCH = [
  { num: 104, s1: 'W101', s2: 'W102', date: '19 Jul' },
];

const KNOCKOUT_ROUNDS = [
  { id: 'R32',   label: 'R32',   full: 'Round of 32',    matches: R32        },
  { id: 'R16',   label: 'R16',   full: 'Round of 16',    matches: R16        },
  { id: 'QF',    label: 'QF',    full: 'Quarter-finals', matches: QF         },
  { id: 'SF',    label: 'SF',    full: 'Semi-finals',    matches: SF         },
  { id: 'FINAL', label: 'Final', full: 'Final',          matches: FINAL_MATCH},
];

const MODES = [
  { id: 'all',         label: 'All'         },
  { id: 'tables',      label: 'Group Table' },
  { id: 'group-stage', label: 'Group Stage' },
  { id: 'bracket',     label: 'Bracket'     },
  { id: 'R32',         label: 'R32'         },
  { id: 'R16',         label: 'R16'         },
  { id: 'QF',          label: 'QF'          },
  { id: 'SF',          label: 'SF'          },
  { id: 'FINAL',       label: 'Final'       },
];

// R32 projections for group table footer
const R32_BRACKET = {
  A: { win: { type: 'best3rd', groups: ['C','E','F','H','I'] }, run: { type: 'runner', group: 'B' } },
  B: { win: { type: 'best3rd', groups: ['E','F','G','I','J'] }, run: { type: 'runner', group: 'A' } },
  C: { win: { type: 'runner', group: 'F' },                    run: { type: 'winner', group: 'F' } },
  D: { win: { type: 'best3rd', groups: ['B','E','F','I','J'] }, run: { type: 'runner', group: 'G' } },
  E: { win: { type: 'best3rd', groups: ['A','B','C','D','F'] }, run: { type: 'runner', group: 'I' } },
  F: { win: { type: 'runner', group: 'C' },                    run: { type: 'winner', group: 'C' } },
  G: { win: { type: 'best3rd', groups: ['A','E','H','I','J'] }, run: { type: 'runner', group: 'D' } },
  H: { win: { type: 'runner', group: 'J' },                    run: { type: 'winner', group: 'J' } },
  I: { win: { type: 'best3rd', groups: ['C','D','F','G','H'] }, run: { type: 'runner', group: 'E' } },
  J: { win: { type: 'runner', group: 'H' },                    run: { type: 'winner', group: 'H' } },
  K: { win: { type: 'best3rd', groups: ['D','E','I','J','L'] }, run: { type: 'runner', group: 'L' } },
  L: { win: { type: 'best3rd', groups: ['E','H','I','J','K'] }, run: { type: 'runner', group: 'K' } },
};

// Which group-winner each 3rd-place R32 slot faces (derived from R32 bracket above)
const THIRD_PLACE_SLOTS = [
  { num: 74, groups: ['A','B','C','D','F'], opponentGroup: 'E' },
  { num: 77, groups: ['C','D','F','G','H'], opponentGroup: 'I' },
  { num: 79, groups: ['C','E','F','H','I'], opponentGroup: 'A' },
  { num: 80, groups: ['E','H','I','J','K'], opponentGroup: 'L' },
  { num: 81, groups: ['B','E','F','I','J'], opponentGroup: 'D' },
  { num: 82, groups: ['A','E','H','I','J'], opponentGroup: 'G' },
  { num: 85, groups: ['E','F','G','I','J'], opponentGroup: 'B' },
  { num: 87, groups: ['D','E','I','J','L'], opponentGroup: 'K' },
];

const PAGE_SIZE = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function resolveR32Slot(slot, tables) {
  if (slot.type === 'winner') {
    const t = tables.find((x) => x.letter === slot.group);
    return t?.rows[0]?.p > 0 ? t.rows[0].team : null;
  }
  if (slot.type === 'runner') {
    const t = tables.find((x) => x.letter === slot.group);
    return t?.rows[1]?.p > 0 ? t.rows[1].team : null;
  }
  if (slot.type === 'best3rd') {
    const thirds = slot.groups
      .map((g) => tables.find((x) => x.letter === g)?.rows[2])
      .filter((r) => r && r.p > 0);
    if (!thirds.length) return null;
    thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return thirds[0].team;
  }
  return null;
}

function resolveSlot(slot, groupTables, fixtureByNum) {
  if (!slot) return null;

  const posMatch = slot.match(/^([12])([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]) - 1;
    const letter = posMatch[2];
    const table = groupTables.find((t) => t.letter === letter);
    if (table?.rows[pos]?.p > 0) return { team: table.rows[pos].team, projected: true };
    return null;
  }

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

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match, ownerMap, currentUser, onSelectTeam, onOpenMatch }) {
  const home = normaliseTeamName(match.homeTeam.name);
  const away = normaliseTeamName(match.awayTeam.name);
  const homeOwner = ownerMap[home];
  const awayOwner = ownerMap[away];
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isDone = match.status === 'FINISHED';
  const showScore = isDone || isLive;
  const hasOwner = !!(homeOwner || awayOwner);

  const hs = match.score?.home;
  const as_ = match.score?.away;
  const ytDirect = useYouTubeHighlight(home, away, isDone || isLive, isDone ? hs : null, isDone ? as_ : null);

  return (
    <div className={`match-card ${isLive ? 'live' : ''} ${hasOwner && !isLive ? 'has-owner' : ''}`}>
      <div className="mc-meta">
        <span className="mc-time">
          {isDone || isLive ? formatDateAEST(match.utcDate) : `${formatTimeAEST(match.utcDate)} AEST`}
        </span>
        <span className="mc-meta-right">
          {match.group && <span className="match-group">Grp {match.group}</span>}
          {isLive && <span className="status-badge badge-live">{match.liveClock ? `${match.liveClock}'` : 'LIVE'}</span>}
          {isDone && <span className="status-badge badge-done">FT</span>}
          {!isDone && !isLive && <span className="mc-vs">vs</span>}
        </span>
      </div>
      <div className="mc-team-row">
        <span className="mc-flag">{getFlag(home)}</span>
        <button className="mc-team-btn" onClick={() => onSelectTeam(home)}>
          <div className="mc-team-info">
            <span className={`mc-name ${homeOwner ? 'owned' : ''}`}>{home}</span>
            {homeOwner && <span className={`mc-owner ${currentUser === homeOwner ? 'me' : ''}`}>{homeOwner}</span>}
          </div>
        </button>
        {showScore && <span className="mc-score-val">{match.score.home ?? '–'}</span>}
      </div>
      <div className="mc-team-row">
        <span className="mc-flag">{getFlag(away)}</span>
        <button className="mc-team-btn" onClick={() => onSelectTeam(away)}>
          <div className="mc-team-info">
            <span className={`mc-name ${awayOwner ? 'owned' : ''}`}>{away}</span>
            {awayOwner && <span className={`mc-owner ${currentUser === awayOwner ? 'me' : ''}`}>{awayOwner}</span>}
          </div>
        </button>
        {showScore && <span className="mc-score-val">{match.score.away ?? '–'}</span>}
      </div>
      <div className="mc-actions">
        <button className="mc-view-btn" onClick={() => onOpenMatch(match)}>View Game</button>
        {ytDirect && (
          <a href={ytDirect} target="_blank" rel="noreferrer" className="mc-hl-btn">▶ Highlights</a>
        )}
      </div>
    </div>
  );
}

// ── BracketCard ───────────────────────────────────────────────────────────────

function BracketCard({ def, groupTables, fixtureByNum, ownerMap, currentUser, onSelectTeam }) {
  const fixture = fixtureByNum[def.num];
  const isLive = fixture?.status === 'IN_PLAY' || fixture?.status === 'PAUSED';
  const isDone = fixture?.status === 'FINISHED';
  const showScore = isDone || isLive;

  const r1 = resolveSlot(def.s1, groupTables, fixtureByNum);
  const r2 = resolveSlot(def.s2, groupTables, fixtureByNum);

  const team1 = fixture ? normaliseTeamName(fixture.homeTeam.name) : r1?.team;
  const team2 = fixture ? normaliseTeamName(fixture.awayTeam.name) : r2?.team;
  const proj1 = !fixture && r1?.projected;
  const proj2 = !fixture && r2?.projected;

  const own1 = team1 ? ownerMap[team1] : null;
  const own2 = team2 ? ownerMap[team2] : null;
  const hasOwner = !!(own1 || own2);
  const anyProjected = proj1 || proj2;

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

// ── Bracket tree (classic tournament bracket) ────────────────────────────────

// R32 ordered to follow the bracket tree path — each pair feeds one R16 match
const BRACKET_TREE = [
  // Top half → SF1 (M101)
  //   QF1 (M97): R16-M89 vs R16-M90
  { round: 'R32', matches: [R32.find(m=>m.num===74), R32.find(m=>m.num===77)] }, // → R16 M89
  { round: 'R32', matches: [R32.find(m=>m.num===73), R32.find(m=>m.num===75)] }, // → R16 M90
  //   QF2 (M98): R16-M93 vs R16-M94
  { round: 'R32', matches: [R32.find(m=>m.num===83), R32.find(m=>m.num===84)] }, // → R16 M93
  { round: 'R32', matches: [R32.find(m=>m.num===81), R32.find(m=>m.num===82)] }, // → R16 M94
  // Bottom half → SF2 (M102)
  //   QF3 (M99): R16-M91 vs R16-M92
  { round: 'R32', matches: [R32.find(m=>m.num===76), R32.find(m=>m.num===78)] }, // → R16 M91
  { round: 'R32', matches: [R32.find(m=>m.num===79), R32.find(m=>m.num===80)] }, // → R16 M92
  //   QF4 (M100): R16-M95 vs R16-M96
  { round: 'R32', matches: [R32.find(m=>m.num===86), R32.find(m=>m.num===88)] }, // → R16 M95
  { round: 'R32', matches: [R32.find(m=>m.num===85), R32.find(m=>m.num===87)] }, // → R16 M96
];

const BRACKET_R16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96];
const BRACKET_QF_ORDER  = [97, 98, 99, 100];
const BRACKET_SF_ORDER  = [101, 102];

const DAYS_OF_WEEK = { 'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun' };
function addDayOfWeek(dateStr) {
  const months = { 'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11 };
  const parts = dateStr.split(' ');
  const day = parseInt(parts[0]);
  const mon = months[parts[1]];
  if (isNaN(day) || mon == null) return dateStr;
  const d = new Date(2026, mon, day);
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return `${dow} ${dateStr}`;
}

function BracketTile({ def, groupTables, fixtureByNum, ownerMap, currentUser, onSelectTeam, onOpenMatch }) {
  const fixture = fixtureByNum[def.num];
  const isLive = fixture?.status === 'IN_PLAY' || fixture?.status === 'PAUSED';
  const isDone = fixture?.status === 'FINISHED';
  const showScore = isDone || isLive;

  const r1 = resolveSlot(def.s1, groupTables, fixtureByNum);
  const r2 = resolveSlot(def.s2, groupTables, fixtureByNum);
  const team1 = fixture ? normaliseTeamName(fixture.homeTeam.name) : r1?.team;
  const team2 = fixture ? normaliseTeamName(fixture.awayTeam.name) : r2?.team;
  const proj1 = !fixture && r1?.projected;
  const proj2 = !fixture && r2?.projected;
  const own1 = team1 ? ownerMap[team1] : null;
  const own2 = team2 ? ownerMap[team2] : null;

  const winner = isDone
    ? (fixture.score.winner === 'HOME_TEAM' ? 1 : fixture.score.winner === 'AWAY_TEAM' ? 2 : 0)
    : 0;

  const cls = `bt-tile${isLive ? ' live' : ''}${isDone ? ' done' : ''}`;

  const Row = ({ team, owner, projected, score, isWinner }) => (
    <div className={`bt-row${isWinner ? ' winner' : ''}`}
      onClick={team ? (e) => { e.stopPropagation(); onSelectTeam(team); } : undefined}
    >
      {team ? (
        <>
          <span className="bt-flag">{getFlag(team)}</span>
          <span className={`bt-name${projected ? ' proj' : ''}`}>{team}</span>
        </>
      ) : (
        <span className="bt-tbd">{def.s1?.includes('/') || def.s2?.includes('/') ? 'Best 3rd' : 'TBD'}</span>
      )}
      <span className={`bt-score${isLive ? ' live' : ''}`}>
        {showScore ? (score ?? '–') : '–'}
      </span>
    </div>
  );

  return (
    <div className={cls} onClick={fixture ? () => onOpenMatch(fixture) : undefined}>
      <Row team={team1} owner={own1} projected={proj1} score={fixture?.score?.home} isWinner={winner === 1} />
      <Row team={team2} owner={own2} projected={proj2} score={fixture?.score?.away} isWinner={winner === 2} />
      <div className="bt-meta">
        <span>{addDayOfWeek(def.date)}</span>
        {isLive && <span className="bt-live-badge">{fixture.liveClock ? `${fixture.liveClock}'` : 'LIVE'}</span>}
        {isDone && <span className="bt-ft">FT</span>}
      </div>
    </div>
  );
}

function BracketColumn({ label, matchDefs, groupTables, fixtureByNum, ownerMap, currentUser, onSelectTeam, onOpenMatch }) {
  return (
    <div className="bt-col">
      <div className="bt-col-label">{label}</div>
      <div className="bt-col-slots">
        {matchDefs.map(def => (
          <div key={def.num} className="bt-slot">
            <BracketTile
              def={def}
              groupTables={groupTables}
              fixtureByNum={fixtureByNum}
              ownerMap={ownerMap}
              currentUser={currentUser}
              onSelectTeam={onSelectTeam}
              onOpenMatch={onOpenMatch}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketTree({ groupTables, fixtureByNum, ownerMap, currentUser, onSelectTeam, onOpenMatch }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const STEPS = [0.55, 0.7, 0.85, 1, 1.15];
  const stepRef = useRef(3);

  const doZoom = useCallback((dir) => {
    stepRef.current = Math.max(0, Math.min(STEPS.length - 1, stepRef.current + dir));
    setScale(STEPS[stepRef.current]);
  }, []);

  const r32ordered = BRACKET_TREE.flatMap(g => g.matches);
  const r16ordered = BRACKET_R16_ORDER.map(n => R16.find(m => m.num === n));
  const qfOrdered  = BRACKET_QF_ORDER.map(n => QF.find(m => m.num === n));
  const sfOrdered  = BRACKET_SF_ORDER.map(n => SF.find(m => m.num === n));

  const svgRef = useRef(null);
  const viewportRef = useRef(null);

  const drawConnectors = useCallback(() => {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!svg || !viewport) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth / scale);
    svg.setAttribute('height', wrap.scrollHeight / scale);
    svg.innerHTML = '';

    const cols = wrap.querySelectorAll('.bt-col');
    for (let ci = 1; ci < cols.length; ci++) {
      const prevSlots = cols[ci - 1].querySelectorAll('.bt-slot');
      const curSlots = cols[ci].querySelectorAll('.bt-slot');

      for (let si = 0; si < curSlots.length; si++) {
        const target = curSlots[si];
        const f1 = prevSlots[si * 2];
        const f2 = prevSlots[si * 2 + 1];
        if (!f1 || !f2 || !target) continue;

        const tR = target.getBoundingClientRect();
        const f1R = f1.getBoundingClientRect();
        const f2R = f2.getBoundingClientRect();

        const x1 = (f1R.right - wrapRect.left) / scale;
        const x2 = (tR.left - wrapRect.left) / scale;
        const y1 = (f1R.top + f1R.height / 2 - wrapRect.top) / scale;
        const y2 = (f2R.top + f2R.height / 2 - wrapRect.top) / scale;
        const yT = (tR.top + tR.height / 2 - wrapRect.top) / scale;
        const midX = (x1 + x2) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1},${y1} H${midX} V${yT} H${x2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(244,201,94,0.25)');
        path.setAttribute('stroke-width', '1.5');
        svg.appendChild(path);

        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', `M${x1},${y2} H${midX} V${yT}`);
        path2.setAttribute('fill', 'none');
        path2.setAttribute('stroke', 'rgba(244,201,94,0.25)');
        path2.setAttribute('stroke-width', '1.5');
        svg.appendChild(path2);
      }
    }
  }, [scale]);

  useEffect(() => {
    const t = setTimeout(drawConnectors, 100);
    return () => clearTimeout(t);
  }, [drawConnectors, scale]);

  useEffect(() => {
    const ro = new ResizeObserver(() => drawConnectors());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [drawConnectors]);

  return (
    <div className="bt-viewport" ref={viewportRef}>
      <div className="bt-wrap" ref={wrapRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <svg ref={svgRef} className="bt-svg" />
        <BracketColumn label="Round of 32" matchDefs={r32ordered} groupTables={groupTables} fixtureByNum={fixtureByNum} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={onOpenMatch} />
        <BracketColumn label="Round of 16" matchDefs={r16ordered} groupTables={groupTables} fixtureByNum={fixtureByNum} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={onOpenMatch} />
        <BracketColumn label="Quarter-finals" matchDefs={qfOrdered} groupTables={groupTables} fixtureByNum={fixtureByNum} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={onOpenMatch} />
        <BracketColumn label="Semi-finals" matchDefs={sfOrdered} groupTables={groupTables} fixtureByNum={fixtureByNum} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={onOpenMatch} />
        <BracketColumn label="Final" matchDefs={FINAL_MATCH} groupTables={groupTables} fixtureByNum={fixtureByNum} ownerMap={ownerMap} currentUser={currentUser} onSelectTeam={onSelectTeam} onOpenMatch={onOpenMatch} />
      </div>
      <div className="bt-zoom">
        <button className="bt-zoom-btn" onClick={() => doZoom(1)}>+</button>
        <span className="bt-zoom-label">{Math.round(scale * 100)}%</span>
        <button className="bt-zoom-btn" onClick={() => doZoom(-1)}>−</button>
      </div>
    </div>
  );
}

// ── Group tables (always-visible grid, no accordion) ─────────────────────────

function GroupTablesSection({ groupTables, ownerMap, currentUser, onSelectTeam }) {
  if (!groupTables.length) return null;

  // Rank all 3rd-place teams across every group to find top 8 qualifiers
  const allThirds = groupTables
    .map(({ letter, rows }) => rows[2]?.p > 0 ? { ...rows[2], group: letter } : null)
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const qualifyingThirdGroups = new Set(allThirds.slice(0, 8).map(r => r.group));

  // Greedy R32 slot assignment: process slots in match order, pick best eligible qualifying 3rd
  const thirdOppMap = {}; // group letter → opponent group letter
  const usedGroups = new Set();
  for (const slot of THIRD_PLACE_SLOTS) {
    const eligible = allThirds.filter(
      t => slot.groups.includes(t.group) && qualifyingThirdGroups.has(t.group) && !usedGroups.has(t.group)
    );
    if (eligible.length) {
      thirdOppMap[eligible[0].group] = slot.opponentGroup;
      usedGroups.add(eligible[0].group);
    }
  }

  return (
    <div className="card group-tables">
      <div className="group-tables-grid">
      {groupTables.map(({ letter, rows }) => {
        const bracket = R32_BRACKET[letter];
        const p1opp = bracket && rows[0]?.p > 0 ? resolveR32Slot(bracket.win, groupTables) : null;
        const p2opp = bracket && rows[1]?.p > 0 ? resolveR32Slot(bracket.run, groupTables) : null;
        const third = rows[2];
        const thirdQualifies = third?.p > 0 && qualifyingThirdGroups.has(letter);
        const thirdOppGroup = thirdOppMap[letter];
        const thirdOpp = thirdOppGroup
          ? groupTables.find(t => t.letter === thirdOppGroup)?.rows[0]?.team
          : null;
        return (
          <div key={letter} className="group-table">
            <div className="group-table-title">Group {letter}</div>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="num">P</th>
                  <th className="num">W</th>
                  <th className="num">D</th>
                  <th className="num">L</th>
                  <th className="num">GD</th>
                  <th className="num">Pts</th>
                </tr>
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
            {(p1opp || p2opp || third?.p > 0) && (
              <div className="r32-proj-block">
                <span className="bk-proj-tag">currently projected</span>
                <ul className="r32-projections">
                {p1opp && rows[0] && <li><b>1st:</b> {getFlag(rows[0].team)} {rows[0].team} vs {getFlag(p1opp)} {p1opp}</li>}
                {p2opp && rows[1] && <li><b>2nd:</b> {getFlag(rows[1].team)} {rows[1].team} vs {getFlag(p2opp)} {p2opp}</li>}
                {third?.p > 0 && (
                  <li style={thirdQualifies ? {} : { opacity: 0.45 }}>
                    <b>3rd:</b> {getFlag(third.team)} {third.team}{' '}
                    {thirdQualifies
                      ? <>vs {thirdOpp ? <>{getFlag(thirdOpp)} {thirdOpp}</> : 'TBD'}</>
                      : <span>— not in top 8</span>}
                  </li>
                )}
              </ul>
              </div>
            )}
          </div>
        );
      })}
      <p className="hint" style={{ marginTop: 4 }}>Top 2 qualify automatically · Best 8 of 12 third-placed teams also advance</p>
      </div>
    </div>
  );
}

// ── Fixtures page ─────────────────────────────────────────────────────────────

export default function Fixtures({ fixtures, loading, error, lastFetched, onRefresh, assignments, drawType, onSelectTeam, currentUser }) {
  const [mode, setMode] = useState('tables');
  const [openMatch, setOpenMatch] = useState(null);
  const [showFinished, setShowFinished] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [mode, showFinished, search]);

  const isKnockout = !['all', 'tables', 'group-stage', 'bracket'].includes(mode);

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

  const currentKnockout = KNOCKOUT_ROUNDS.find((r) => r.id === mode);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fixtures;
    if (mode === 'group-stage') list = list.filter((f) => f.stage === 'GROUP_STAGE');
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
  }, [fixtures, mode, showFinished, search, ownerMap]);

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

      {/* Mode pills */}
      <div className="stage-filters">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`filter-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Search + show-finished toggle (match list modes only) */}
      {!isKnockout && mode !== 'tables' && fixtures.length > 0 && (
        <div className="filter-bar">
          <div className="search-row">
            <input
              className="search-input"
              type="search"
              placeholder="Search country or player…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <label className="toggle-label">
            <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} />
            <span>Show finished</span>
          </label>
        </div>
      )}

      {/* Group tables */}
      {mode === 'tables' && (
        <GroupTablesSection
          groupTables={groupTables}
          ownerMap={ownerMap}
          currentUser={currentUser}
          onSelectTeam={onSelectTeam}
        />
      )}

      {/* Bracket tree view */}
      {mode === 'bracket' && (
        <BracketTree
          groupTables={groupTables}
          fixtureByNum={fixtureByNum}
          ownerMap={ownerMap}
          currentUser={currentUser}
          onSelectTeam={onSelectTeam}
          onOpenMatch={setOpenMatch}
        />
      )}

      {/* Knockout bracket */}
      {isKnockout && currentKnockout && (
        <>
          <div className="bk-round-title">{currentKnockout.full}</div>
          {currentKnockout.matches.map((def) => (
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
        </>
      )}

      {/* Match list (all + group-stage modes) */}
      {!isKnockout && mode !== 'tables' && (
        <>
          {fixtures.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>{error || 'No fixtures found. Pull to refresh or check your connection.'}</p>
            </div>
          )}
          {filtered.length === 0 && !loading && fixtures.length > 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No matches found{search ? ` for "${search}"` : ''}</p>
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
                <MatchCard
                  key={m.id}
                  match={m}
                  ownerMap={ownerMap}
                  currentUser={currentUser}
                  onSelectTeam={onSelectTeam}
                  onOpenMatch={setOpenMatch}
                />
              ))}
            </div>
          ))}
          {hasMore && (
            <button className="show-more-btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show more · {filtered.length - limit} remaining
            </button>
          )}
        </>
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
