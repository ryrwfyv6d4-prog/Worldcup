import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import MatchSheet from './MatchSheet.jsx';
import { getFlag } from '../data/worldcup2026.js';
import { DEF_BY_NUM, BRACKET_PAIRS } from '../data/bracket2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';
import { tla } from '../utils/tla.js';
import { downloadFixturesIcs } from '../utils/ics.js';
import { useYouTubeHighlight } from '../hooks/useYouTubeHighlight.js';

const MODES = [
  { id: 'all',     label: 'Matches' },
  { id: 'tables',  label: 'Groups'  },
  { id: 'bracket', label: 'Bracket' },
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

// Honest slot resolution — never guesses a winner.
// Returns { type: 'team', team }        — confirmed (group decided or match won)
//         { type: 'either', teams }     — match not played yet: both possibilities
//         { type: 'tbd', label }        — can't be narrowed to two teams yet
function isGroupComplete(table) {
  return !!table && table.rows.length === 4 && table.rows.every((r) => r.p >= 3);
}

function resolveSide(slot, groupTables, fixtureByNum) {
  if (!slot) return { type: 'tbd', label: 'TBD' };

  const posMatch = slot.match(/^([12])([A-L])$/);
  if (posMatch) {
    const table = groupTables.find((t) => t.letter === posMatch[2]);
    if (isGroupComplete(table)) {
      return { type: 'team', team: table.rows[parseInt(posMatch[1]) - 1].team };
    }
    return { type: 'tbd', label: `${posMatch[1] === '1' ? '1st' : '2nd'} Grp ${posMatch[2]}` };
  }

  const thirdMatch = slot.match(/^3([A-L](?:\/[A-L])*)$/);
  if (thirdMatch) {
    const letters = thirdMatch[1].split('/');
    const tables = letters.map((g) => groupTables.find((t) => t.letter === g));
    if (tables.every(isGroupComplete)) {
      const thirds = tables.map((t) => t.rows[2]);
      thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
      return { type: 'team', team: thirds[0].team };
    }
    return { type: 'tbd', label: '3rd place' };
  }

  const winnerMatch = slot.match(/^W(\d+)$/);
  if (winnerMatch) {
    const n = parseInt(winnerMatch[1]);
    const fix = fixtureByNum[n];
    if (fix?.status === 'FINISHED' && fix.score?.winner && fix.score.winner !== 'DRAW') {
      const w = fix.score.winner === 'HOME_TEAM' ? fix.homeTeam.name : fix.awayTeam.name;
      return { type: 'team', team: normaliseTeamName(w) };
    }
    if (fix) {
      return {
        type: 'either',
        teams: [normaliseTeamName(fix.homeTeam.name), normaliseTeamName(fix.awayTeam.name)],
      };
    }
    const def = DEF_BY_NUM[n];
    if (def) {
      const a = resolveSide(def.s1, groupTables, fixtureByNum);
      const b = resolveSide(def.s2, groupTables, fixtureByNum);
      if (a.type === 'team' && b.type === 'team') {
        return { type: 'either', teams: [a.team, b.team] };
      }
    }
    return { type: 'tbd', label: `Winner M${n}` };
  }

  return { type: 'tbd', label: slot };
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

// ── Swipeable bracket ─────────────────────────────────────────────────────────

// Windows: each pairs a round with where its winners go
const SW_WINDOWS = BRACKET_PAIRS; // R32|R16, R16|QF, QF|SF, SF|Final
const SW_PILLS = [
  { label: 'R32',   window: 0 },
  { label: 'R16',   window: 1 },
  { label: 'QF',    window: 2 },
  { label: 'SF',    window: 3 },
  { label: 'Final', window: 3 },
];

function SwSideRow({ side, score, showScore, isWinner, isLoser, ownerMap, currentUser }) {
  if (side.type === 'team') {
    const owner = ownerMap[side.team];
    return (
      <div className={`sw-row${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}`}>
        <span className="sw-flag">{getFlag(side.team)}</span>
        <span className="sw-name">{side.team}</span>
        {owner && <span className={`sw-owner${currentUser === owner ? ' me' : ''}`}>{owner}</span>}
        {showScore && <span className="sw-score">{score ?? '–'}</span>}
      </div>
    );
  }
  if (side.type === 'either') {
    return (
      <div className="sw-row either">
        <span className="sw-either-team">{getFlag(side.teams[0])} {tla(side.teams[0])}</span>
        <span className="sw-or">or</span>
        <span className="sw-either-team">{getFlag(side.teams[1])} {tla(side.teams[1])}</span>
      </div>
    );
  }
  return (
    <div className="sw-row tbd">
      <span className="sw-tbd-label">{side.label}</span>
    </div>
  );
}

function SwMatchCard({ def, groupTables, fixtureByNum, ownerMap, currentUser, onOpenMatch, isFinal }) {
  const fixture = fixtureByNum[def.num];
  const isLive = fixture?.status === 'IN_PLAY' || fixture?.status === 'PAUSED';
  const isDone = fixture?.status === 'FINISHED';
  const showScore = isDone || isLive;

  const sideA = fixture
    ? { type: 'team', team: normaliseTeamName(fixture.homeTeam.name) }
    : resolveSide(def.s1, groupTables, fixtureByNum);
  const sideB = fixture
    ? { type: 'team', team: normaliseTeamName(fixture.awayTeam.name) }
    : resolveSide(def.s2, groupTables, fixtureByNum);

  const winner = isDone
    ? (fixture.score.winner === 'HOME_TEAM' ? 1 : fixture.score.winner === 'AWAY_TEAM' ? 2 : 0)
    : 0;
  const undecided = sideA.type !== 'team' || sideB.type !== 'team';

  return (
    <div
      className={`sw-match${isLive ? ' live' : ''}${undecided && !fixture ? ' pending' : ''}${isFinal ? ' final' : ''}`}
      onClick={fixture ? () => onOpenMatch(fixture) : undefined}
    >
      <SwSideRow
        side={sideA} score={fixture?.score?.home} showScore={showScore}
        isWinner={winner === 1} isLoser={winner === 2}
        ownerMap={ownerMap} currentUser={currentUser}
      />
      <SwSideRow
        side={sideB} score={fixture?.score?.away} showScore={showScore}
        isWinner={winner === 2} isLoser={winner === 1}
        ownerMap={ownerMap} currentUser={currentUser}
      />
      <div className="sw-meta">
        <span>{isFinal ? '🏆 ' : ''}{fixture?.utcDate ? formatDateAEST(fixture.utcDate) : def.date}</span>
        <span>
          {isLive && <span className="sw-live-badge">{fixture.liveClock ? `${fixture.liveClock}'` : 'LIVE'}</span>}
          {isDone && <span className="sw-ft">FT</span>}
        </span>
      </div>
    </div>
  );
}

function SwipeBracket({ groupTables, fixtureByNum, ownerMap, currentUser, onOpenMatch }) {
  const viewportRef = useRef(null);
  const [active, setActive] = useState(0);
  const initialised = useRef(false);

  // Open on the deepest window whose left round still has games to play
  useEffect(() => {
    if (initialised.current) return;
    const hasFixtures = Object.keys(fixtureByNum).length > 0;
    if (!hasFixtures) return;
    initialised.current = true;
    let idx = 0;
    while (idx < SW_WINDOWS.length - 1) {
      const nums = SW_WINDOWS[idx].pairs.flatMap((p) => p.matches);
      const allDone = nums.every((n) => fixtureByNum[n]?.status === 'FINISHED');
      if (!allDone) break;
      idx++;
    }
    if (idx > 0 && viewportRef.current) {
      const w = viewportRef.current.clientWidth;
      viewportRef.current.scrollTo({ left: idx * w * 0.92, behavior: 'instant' });
      setActive(idx);
    }
  }, [fixtureByNum]);

  const handleScroll = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const idx = Math.min(
      SW_WINDOWS.length - 1,
      Math.round(vp.scrollLeft / (vp.clientWidth * 0.92))
    );
    setActive((prev) => (prev === idx ? prev : idx));
  }, []);

  const jumpTo = useCallback((idx) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ left: idx * vp.clientWidth * 0.92, behavior: 'smooth' });
  }, []);

  return (
    <div className="sw-outer">
      <div className="sw-pills">
        {SW_PILLS.map((p) => {
          const isActive = p.label === SW_WINDOWS[active].round;
          const isPeek = p.label === SW_WINDOWS[active].feedLabel;
          return (
            <button
              key={p.label}
              className={`sw-pill${isActive ? ' active' : ''}${isPeek ? ' peek' : ''}`}
              onClick={() => jumpTo(p.window)}
            >{p.label}</button>
          );
        })}
        <span className="sw-swipe-hint">← swipe →</span>
      </div>

      <div className="sw-viewport" ref={viewportRef} onScroll={handleScroll}>
        {SW_WINDOWS.map((win) => (
          <div key={win.round} className="sw-window">
            <div className="sw-col-hdrs">
              <span className="sw-col-hdr">{win.label}</span>
              <span className="sw-col-hdr dim">{win.feedLabel === 'Final' ? 'Final' : win.feedLabel}</span>
            </div>
            {win.pairs.map((pair) => (
              <div key={pair.feedsInto} className="sw-pair-row">
                <div className="sw-left">
                  {pair.matches.map((num) => (
                    <SwMatchCard
                      key={num}
                      def={DEF_BY_NUM[num]}
                      groupTables={groupTables}
                      fixtureByNum={fixtureByNum}
                      ownerMap={ownerMap}
                      currentUser={currentUser}
                      onOpenMatch={onOpenMatch}
                    />
                  ))}
                </div>
                <div className="sw-conn"><div className="sw-conn-line" /></div>
                <div className="sw-next">
                  <SwMatchCard
                    def={DEF_BY_NUM[pair.feedsInto]}
                    groupTables={groupTables}
                    fixtureByNum={fixtureByNum}
                    ownerMap={ownerMap}
                    currentUser={currentUser}
                    onOpenMatch={onOpenMatch}
                    isFinal={pair.feedsInto === 104}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="sw-hint">Undecided spots show both possible teams — no guesswork.</p>
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

function SkeletonList({ count = 6 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel-card">
          <div className="skel-bar w40" />
          <div className="skel-bar w75" />
          <div className="skel-bar w60" />
        </div>
      ))}
    </div>
  );
}

// ── Fixtures page ─────────────────────────────────────────────────────────────

export default function Fixtures({ fixtures, loading, error, lastFetched, onRefresh, assignments, drawType, onSelectTeam, currentUser }) {
  const [mode, setMode] = useState('all');
  const [openMatch, setOpenMatch] = useState(null);
  const [showFinished, setShowFinished] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [mode, showFinished, search]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fixtures;
    // When searching, include finished games — you're looking for a team's story
    if (!showFinished && !q) list = list.filter((f) => f.status !== 'FINISHED');
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

      {/* Search + show-finished toggle (match list mode only) */}
      {mode === 'all' && fixtures.length > 0 && (
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
          <div className="filter-bar-row">
            <label className="toggle-label">
              <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} />
              <span>Show finished</span>
            </label>
            <button
              className="ics-btn"
              onClick={() => {
                const myTeams = currentUser
                  ? getTeamsForParticipant(currentUser, assignments, drawType)
                  : [];
                const upcoming = fixtures.filter((f) => f.status !== 'FINISHED' && f.utcDate);
                const mine = upcoming.filter((f) =>
                  myTeams.includes(normaliseTeamName(f.homeTeam.name)) ||
                  myTeams.includes(normaliseTeamName(f.awayTeam.name))
                );
                const list = mine.length ? mine : upcoming;
                downloadFixturesIcs(list, mine.length ? 'my-world-cup-games.ics' : 'world-cup-games.ics');
              }}
            >
              📆 {currentUser ? 'My games' : 'Games'} → calendar
            </button>
          </div>
        </div>
      )}

      {loading && fixtures.length === 0 && mode !== 'all' && <SkeletonList count={4} />}

      {/* Group tables */}
      {mode === 'tables' && (
        <GroupTablesSection
          groupTables={groupTables}
          ownerMap={ownerMap}
          currentUser={currentUser}
          onSelectTeam={onSelectTeam}
        />
      )}

      {/* Swipeable bracket */}
      {mode === 'bracket' && (
        <SwipeBracket
          groupTables={groupTables}
          fixtureByNum={fixtureByNum}
          ownerMap={ownerMap}
          currentUser={currentUser}
          onOpenMatch={setOpenMatch}
        />
      )}

      {/* Match list */}
      {mode === 'all' && (
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
          {loading && fixtures.length === 0 && <SkeletonList />}
          {fixtures.length > 0 && Array.from(grouped.entries()).map(([day, matches]) => (
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
