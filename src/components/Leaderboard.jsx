import { useMemo, useState, useEffect } from 'react';
import { buildLeaderboard } from '../utils/scoring.js';
import { SCORING, SCORING_LABELS, getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import ActivityFeed from './ActivityFeed.jsx';
import MatchSheet from './MatchSheet.jsx';
import { formatTimeAEST, formatDateAEST } from '../utils/time.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const EMOJIS = ['😂', '🔥', '❤️', '😭', '👏', '🍻'];

function formatCountdown(ms) {
  if (ms <= 0) return 'Kicking off now';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getOwner(team, assignments, drawType) {
  for (const name of Object.keys(assignments)) {
    const teams = getTeamsForParticipant(name, assignments, drawType);
    if (teams.includes(team)) return name;
  }
  return null;
}

function isMatchToday(utcDate) {
  if (!utcDate) return false;
  const opts = { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'numeric', year: 'numeric' };
  const matchDay = new Date(utcDate).toLocaleDateString('en-AU', opts);
  const today = new Date().toLocaleDateString('en-AU', opts);
  return matchDay === today;
}

function TodayMatches({ fixtures, assignments, drawType, onOpenMatch }) {
  const todayFixtures = useMemo(() => (
    fixtures.filter((f) => isMatchToday(f.utcDate))
  ), [fixtures]);

  if (todayFixtures.length === 0) return null;

  return (
    <>
      <div className="lb-eyebrow">Today at the Nest</div>
      <div className="today-carousel">
        {todayFixtures.map((f) => {
          const home = normaliseTeamName(f.homeTeam.name);
          const away = normaliseTeamName(f.awayTeam.name);
          const homeOwner = getOwner(home, assignments, drawType);
          const awayOwner = getOwner(away, assignments, drawType);
          const isLive = f.status === 'IN_PLAY';
          const isDone = f.status === 'FINISHED';
          const owners = [...new Set([homeOwner, awayOwner].filter(Boolean))];
          const hs = f.score?.home ?? 0;
          const as_ = f.score?.away ?? 0;

          return (
            <div key={f.id} className={`today-card ${isLive ? 'live' : ''}`} onClick={() => onOpenMatch && onOpenMatch(f)}>
              <div className={`mc-status ${isLive ? 'live' : 'upcoming'}`}>
                {isLive && <span className="today-live-dot" />}
                {isLive ? 'LIVE' : isDone ? 'FULL TIME' : formatTimeAEST(f.utcDate) + ' AEST'}
              </div>
              <div className="mc-line">
                <span className="mc-team">{getFlag(home)} {home}</span>
                {(isLive || isDone)
                  ? <span className={`mc-score ${hs > as_ ? 'winning' : ''}`}>{hs}</span>
                  : <span className="mc-time">–</span>}
              </div>
              <div className="mc-line">
                <span className="mc-team">{getFlag(away)} {away}</span>
                {(isLive || isDone)
                  ? <span className={`mc-score ${as_ > hs ? 'winning' : ''}`}>{as_}</span>
                  : <span className="mc-time">–</span>}
              </div>
              {owners.length > 0 && (
                <div className="mc-owners">
                  {owners.map((o) => <span key={o} className="owner-pill">{o}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function NextMatch({ fixtures, onSelectTeam }) {
  const [, tick] = useState(0);

  const next = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter((f) => f.status !== 'FINISHED' && f.utcDate)
      .map((f) => ({ ...f, ts: new Date(f.utcDate).getTime() }))
      .filter((f) => !isNaN(f.ts) && f.ts > now - 2 * 60 * 60 * 1000)
      .sort((a, b) => a.ts - b.ts)[0];
  }, [fixtures]);

  useEffect(() => {
    if (!next) return;
    const id = setInterval(() => tick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [next]);

  if (!next) return null;

  const home = normaliseTeamName(next.homeTeam.name);
  const away = normaliseTeamName(next.awayTeam.name);
  const ms = next.ts - Date.now();
  const dateStr = formatDateAEST(next.ts);
  const timeStr = formatTimeAEST(next.ts) + ' AEST';

  return (
    <div className="next-match">
      <div className="next-match-label">Next up</div>
      <div className="next-match-teams">
        <button className="team-btn" style={{ color: 'var(--text-on-dark)', fontWeight: 700, fontSize: '0.95rem' }} onClick={() => onSelectTeam(home)}>
          {getFlag(home)} {home}
        </button>
        <span className="next-match-vs">vs</span>
        <button className="team-btn" style={{ color: 'var(--text-on-dark)', fontWeight: 700, fontSize: '0.95rem' }} onClick={() => onSelectTeam(away)}>
          {getFlag(away)} {away}
        </button>
      </div>
      <div className="next-match-meta">{dateStr} · {timeStr}</div>
      <div className="next-match-countdown">{formatCountdown(ms)}</div>
    </div>
  );
}

function YourNextMatch({ fixtures, currentUser, assignments, drawType, onSelectTeam }) {
  const myTeams = useMemo(() => (
    currentUser && currentUser !== '__guest__'
      ? getTeamsForParticipant(currentUser, assignments, drawType)
      : []
  ), [currentUser, assignments, drawType]);

  const next = useMemo(() => {
    if (!myTeams.length) return null;
    const now = Date.now();
    return fixtures
      .filter((f) => f.status !== 'FINISHED' && f.utcDate)
      .map((f) => ({ ...f, ts: new Date(f.utcDate).getTime() }))
      .filter((f) => !isNaN(f.ts) && f.ts > now - 2 * 60 * 60 * 1000)
      .filter((f) =>
        myTeams.includes(normaliseTeamName(f.homeTeam.name)) ||
        myTeams.includes(normaliseTeamName(f.awayTeam.name))
      )
      .sort((a, b) => a.ts - b.ts)[0];
  }, [fixtures, myTeams]);

  if (!next) return null;
  const home = normaliseTeamName(next.homeTeam.name);
  const away = normaliseTeamName(next.awayTeam.name);
  const mine = myTeams.includes(home) ? home : away;

  return (
    <div className="ticket">
      <div className="ticket-stub">GAME<b>DAY</b><span>★</span></div>
      <div className="ticket-body">
        <div className="ticket-eyebrow">★ YOUR NEXT MATCH ★</div>
        <button className="team-btn ticket-match" onClick={() => onSelectTeam(mine)}>
          {getFlag(home)} {home} vs {getFlag(away)} {away}
        </button>
        <div className="ticket-meta">{formatDateAEST(next.ts)} · {formatTimeAEST(next.ts)} AEST</div>
      </div>
    </div>
  );
}


async function shareStandingsCard(board, prevStats, hasResults) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  try { await document.fonts.load('60px Ultra'); await document.fonts.load('30px Graduate'); } catch {}

  // Corrugated steel background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3A342D'); bg.addColorStop(0.35, '#2B2723'); bg.addColorStop(1, '#2B2723');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 28) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + 14, 0, 8, H);
    ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(x, 0, 2, H);
  }

  // Bunting
  const buntColors = ['#B22234', '#F2E6CE', '#1E3A66'];
  const bw = W / 14;
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = buntColors[i % 3];
    ctx.beginPath();
    ctx.moveTo(i * bw + 2, 0); ctx.lineTo((i + 1) * bw - 2, 0); ctx.lineTo(i * bw + bw / 2, 46);
    ctx.closePath(); ctx.fill();
  }

  // Masthead
  ctx.textAlign = 'center';
  ctx.font = '52px serif'; ctx.fillText('🦅', W / 2, 110);
  ctx.font = '64px Ultra, serif';
  ctx.fillStyle = '#6b4a10'; ctx.fillText("THE EAGLE'S NEST", W / 2, 186);
  ctx.fillStyle = '#E8B84B'; ctx.fillText("THE EAGLE'S NEST", W / 2, 181);
  ctx.font = '20px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.8)';
  ctx.fillText('W O R L D   C U P   S W E E P   ·   D A N \u2019 S   S H E D', W / 2, 222);

  const dateStr = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  ctx.font = '24px Graduate, serif'; ctx.fillStyle = '#E8B84B';
  ctx.fillText(`\u2605  THE POLLS \u2014 ${dateStr}  \u2605`, W / 2, 268);

  // Poster board
  const bx = 56, by = 292, bwd = W - 112, rowH = Math.min(78, 860 / board.length);
  const bh = rowH * board.length + 20;
  ctx.fillStyle = '#C9962E'; ctx.fillRect(bx - 4, by - 4, bwd + 8, bh + 8);
  ctx.fillStyle = '#F2E6CE'; ctx.fillRect(bx, by, bwd, bh);

  let topToday = { name: null, pts: 0 }, bigMove = { name: null, d: 0 };
  board.forEach((entry, i) => {
    const y = by + 10 + i * rowH;
    const prev = prevStats[entry.name];
    const todayPts = prev ? entry.total - prev.total : entry.total;
    const delta = prev ? prev.rank - i : 0;
    if (todayPts > topToday.pts) topToday = { name: entry.name, pts: todayPts };
    if (Math.abs(delta) > Math.abs(bigMove.d)) bigMove = { name: entry.name, d: delta };

    if (i > 0) { ctx.strokeStyle = '#d8c9a6'; ctx.beginPath(); ctx.moveTo(bx + 14, y); ctx.lineTo(bx + bwd - 14, y); ctx.stroke(); }

    // Rosette
    const cx = bx + 52, cy = y + rowH / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#B22234'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#F2E6CE'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = i < 3 ? '#C9962E' : '#1E3A66'; ctx.fill();
    ctx.font = 'bold 22px Graduate, serif';
    ctx.fillStyle = i < 3 ? '#3a2a08' : '#F2E6CE';
    ctx.fillText(String(i + 1), cx, cy + 8);

    // Name + tag
    ctx.textAlign = 'left';
    ctx.font = '700 34px "Barlow Condensed", sans-serif'; ctx.fillStyle = '#26201A';
    ctx.fillText(entry.name, bx + 96, cy + 11);
    const nameW = ctx.measureText(entry.name).width;
    let tag = null, tagBg = null;
    if (hasResults && i === 0) { tag = 'FRONT RUNNER'; tagBg = '#1E3A66'; }
    if (hasResults && i === board.length - 1) { tag = 'TOTAL DISASTER'; tagBg = '#B22234'; }
    if (tag) {
      ctx.font = '14px Graduate, serif';
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = tagBg; ctx.fillRect(bx + 104 + nameW, cy - 6, tw + 14, 24);
      ctx.fillStyle = '#F2E6CE'; ctx.fillText(tag, bx + 111 + nameW, cy + 11);
    }

    // Movement
    ctx.textAlign = 'center'; ctx.font = '700 26px "Barlow Condensed", sans-serif';
    if (hasResults && delta > 0) { ctx.fillStyle = '#2c7a3f'; ctx.fillText(`\u25B2${delta}`, bx + bwd - 220, cy + 9); }
    else if (hasResults && delta < 0) { ctx.fillStyle = '#B22234'; ctx.fillText(`\u25BC${-delta}`, bx + bwd - 220, cy + 9); }
    else if (hasResults) { ctx.fillStyle = '#b3a584'; ctx.fillText('\u2013', bx + bwd - 220, cy + 9); }

    // Points + today
    ctx.textAlign = 'right';
    ctx.font = '40px Ultra, serif'; ctx.fillStyle = '#1E3A66';
    ctx.fillText(String(entry.total), bx + bwd - 110, cy + 13);
    if (todayPts > 0 && hasResults) {
      ctx.font = '700 24px "Barlow Condensed", sans-serif'; ctx.fillStyle = '#2c7a3f';
      ctx.fillText(`+${todayPts}`, bx + bwd - 28, cy + 9);
    }
    ctx.textAlign = 'center';
  });

  // Stat bar
  const sy = by + bh + 36;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, sy, bwd, 52);
  ctx.font = '20px Graduate, serif'; ctx.fillStyle = '#F2E6CE';
  let statLine = hasResults && topToday.name
    ? `TOP SCORE TODAY: ${topToday.name.toUpperCase()} +${topToday.pts}` + (bigMove.name && bigMove.d !== 0 ? `   ·   BIGGEST MOVER: ${bigMove.name.toUpperCase()} ${bigMove.d > 0 ? '\u25B2' : '\u25BC'}${Math.abs(bigMove.d)}` : '')
    : 'TOURNAMENT KICKS OFF \u2014 ALL TO PLAY FOR';
  ctx.fillText(statLine, W / 2, sy + 34);

  ctx.font = '18px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.55)';
  ctx.fillText("\u2605  T H E   E A G L E ' S   N E S T   \u00B7   W C   ' 2 6  \u2605", W / 2, H - 40);

  // Share or download
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'eagles-nest-polls.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'eagles-nest-polls.png'; a.click();
  URL.revokeObjectURL(a.href);
}


function ordinal(n) {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function teamStoryToday(teams, fixtures) {
  for (const f of fixtures) {
    if (!isMatchToday(f.utcDate)) continue;
    const home = normaliseTeamName(f.homeTeam.name);
    const away = normaliseTeamName(f.awayTeam.name);
    const mine = teams.includes(home) ? home : teams.includes(away) ? away : null;
    if (!mine) continue;
    if (f.status === 'IN_PLAY') return `${mine} are live right now`;
    if (f.status !== 'FINISHED') return `${mine} kick off at ${formatTimeAEST(f.utcDate)}`;
  }
  return null;
}

function HeroCard({ board, currentUser, fixtures, prevStats, hasResults }) {
  if (!currentUser) return null;
  const idx = board.findIndex((e) => e.name === currentUser);
  if (idx === -1) return null;
  const me = board[idx];
  const prev = prevStats[me.name];
  const todayPts = prev ? me.total - prev.total : me.total;
  const isLeader = idx === 0;
  const gap = isLeader
    ? (board.length > 1 ? me.total - board[1].total : 0)
    : board[0].total - me.total;
  const story = teamStoryToday(me.teams, fixtures)
    || (hasResults ? 'No fixtures for your teams today.' : 'Tournament about to kick off.');

  return (
    <section className="lb-hero">
      <div className="lb-hero-top">
        <div className="lb-hero-rank">
          <span className="pos">{idx + 1}</span>
          <span className="ord">{ordinal(idx + 1)} PLACE</span>
        </div>
        <div className="lb-hero-stats">
          <div className="hstat"><b>{me.total}</b><span>Points</span></div>
          {hasResults && todayPts > 0 && (
            <div className="hstat gain"><b>+{todayPts}</b><span>Today</span></div>
          )}
          <div className="hstat">
            <b>{gap}</b><span>{isLeader ? 'Clear' : 'Off lead'}</span>
          </div>
        </div>
      </div>
      <div className="lb-hero-foot">🦅 <span>{story}</span></div>
    </section>
  );
}

export default function Leaderboard({
  assignments, drawType, fixtures, apiError, lastFetched, onSelectTeam,
  currentUser, lbReactions = {}, onLbReact,
}) {
  const [expanded, setExpanded] = useState(null);
  const [openMatch, setOpenMatch] = useState(null);

  const board = useMemo(
    () => buildLeaderboard(assignments, drawType, fixtures),
    [assignments, drawType, fixtures]
  );

  // Standings as of start of today (Brisbane) — powers "+pts today" and movement arrows
  const prevStats = useMemo(() => {
    const prevFixtures = fixtures.filter((f) => f.status === 'FINISHED' && !isMatchToday(f.utcDate));
    const prevBoard = buildLeaderboard(assignments, drawType, prevFixtures);
    const map = {};
    prevBoard.forEach((e, i) => { map[e.name] = { rank: i, total: e.total }; });
    return map;
  }, [assignments, drawType, fixtures]);

  const hasAssignments = Object.keys(assignments).length > 0;
  const hasResults = fixtures.some((f) => f.status === 'FINISHED');

  if (!hasAssignments) {
    return (
      <div className="page">
        <div className="page-header"><h2>The Polls</h2></div>
        <NextMatch fixtures={fixtures} onSelectTeam={onSelectTeam} />
        <TodayMatches fixtures={fixtures} assignments={assignments} drawType={drawType} onOpenMatch={setOpenMatch} />
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>No draw yet — head to the Draw tab to set up your sweep.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>The Polls</h2>
        {!hasResults && (
          <p className="subtitle">
            {apiError ? 'Points will update once results load.' : 'Waiting for first results…'}
          </p>
        )}
        {lastFetched && (
          <p className="subtitle">
            Updated {new Date(lastFetched).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <HeroCard board={board} currentUser={currentUser} fixtures={fixtures} prevStats={prevStats} hasResults={hasResults} />
      <TodayMatches fixtures={fixtures} assignments={assignments} drawType={drawType} onOpenMatch={setOpenMatch} />
      <YourNextMatch fixtures={fixtures} currentUser={currentUser} assignments={assignments} drawType={drawType} onSelectTeam={onSelectTeam} />
      <NextMatch fixtures={fixtures} onSelectTeam={onSelectTeam} />

      <div className="leaderboard">
        {board.map((entry, i) => {
          const reactions = lbReactions[entry.name] || {};
          const isExpanded = expanded === entry.name;
          const prev = prevStats[entry.name];
          const todayPts = prev ? entry.total - prev.total : entry.total;
          const delta = prev ? prev.rank - i : 0;
          const isMe = currentUser && currentUser === entry.name;
          return (
            <div
              key={entry.name}
              className={`lb-row ${isMe ? 'me' : ''}`}
              onClick={() => setExpanded(isExpanded ? null : entry.name)}
            >
              <div className="lb-main">
                <span className="rank-block">
                  <span className={`rosette ${i < 3 ? 'gold' : ''}`}>{i + 1}</span>
                  {hasResults && (
                    delta > 0 ? <span className="lb-delta up">▲{delta}</span>
                    : delta < 0 ? <span className="lb-delta down">▼{-delta}</span>
                    : <span className="lb-delta flat">–</span>
                  )}
                </span>
                <div className="lb-info">
                  <span className="lb-name">
                    {entry.name}
                    {isMe && <span className="tag you">YOU</span>}
                    {hasResults && i === 0 && <span className="tag front">FRONT RUNNER</span>}
                    {hasResults && i === board.length - 1 && <span className="tag disaster">TOTAL DISASTER</span>}
                  </span>
                  <span className="lb-sub">
                    <span className="lb-sub-flags">{entry.teams.map((t) => getFlag(t)).join(' ')}</span>
                    {teamStoryToday(entry.teams, fixtures) && (
                      <span> · {teamStoryToday(entry.teams, fixtures)}</span>
                    )}
                  </span>
                </div>
                <span className="lb-pts">
                  {entry.total}<small>pts</small>
                  {todayPts > 0 && <span className="lb-today">+{todayPts} today</span>}
                </span>
                <span className={`lb-chev ${isExpanded ? 'open' : ''}`}>{'\u25B8'}</span>
              </div>

              {isExpanded && (
                <div className="lb-reactions" onClick={(e) => e.stopPropagation()}>
                  {EMOJIS.map((emoji) => {
                    const people = reactions[emoji] || [];
                    const mine = currentUser && people.includes(currentUser);
                    return (
                      <button
                        key={emoji}
                        className={`lb-reaction-btn ${mine ? 'mine' : ''}`}
                        onClick={() => onLbReact && onLbReact(entry.name, emoji)}
                      >
                        <span>{emoji}</span>
                        {people.length > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{people.length}</span>}
                      </button>
                    );
                  })}
                  {EMOJIS.map((emoji) => {
                    const people = reactions[emoji] || [];
                    if (people.length === 0) return null;
                    return (
                      <div key={`who-${emoji}`} className="lb-reaction-who" style={{ width: '100%' }}>
                        {emoji} {people.join(', ')}
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && entry.breakdown.length > 0 && (
                <div className="lb-breakdown">
                  <table className="breakdown-table">
                    <thead>
                      <tr><th>Team</th><th>Match</th><th>Result</th><th>+pts</th></tr>
                    </thead>
                    <tbody>
                      {entry.breakdown.map((b, j) => (
                        <tr key={j}>
                          <td>
                            <button className="team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(b.team); }}>
                              {getFlag(b.team)} {b.team}
                            </button>
                          </td>
                          <td className="small-text">{b.match.homeTeam.name} v {b.match.awayTeam.name}</td>
                          <td className="small-text">{b.reason}</td>
                          <td className="pts-cell">+{b.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && entry.breakdown.length === 0 && (
                <div className="lb-breakdown">
                  <p className="hint">No points yet — check back when matches start.</p>
                </div>
              )}

              {isExpanded && entry.teams.length > 0 && (
                <div className="lb-breakdown">
                  <strong className="small-text" style={{ display: 'block', marginBottom: 6 }}>All teams</strong>
                  <div className="team-list">
                    {entry.teams.map((t) => (
                      <button
                        key={t}
                        className="badge sm team-btn"
                        onClick={(e) => { e.stopPropagation(); onSelectTeam(t); }}
                      >
                        {getFlag(t)} {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="tap-hint">👆 Tap any bloke for the full story</div>
      </div>

      <button className="share-polls-btn" onClick={() => shareStandingsCard(board, prevStats, hasResults)}>
        📤 SHARE THE POLLS
      </button>

      <ActivityFeed
        fixtures={fixtures}
        assignments={assignments}
        drawType={drawType}
        onSelectTeam={onSelectTeam}
      />

      {openMatch && (
        <MatchSheet
          match={openMatch}
          assignments={assignments}
          drawType={drawType}
          onClose={() => setOpenMatch(null)}
          onSelectTeam={onSelectTeam}
        />
      )}

      <div className="card mt">
        <h3 className="section-title">Scoring System</h3>
        <div className="score-grid">
          {Object.entries(SCORING_LABELS).map(([key, label]) => (
            <div key={key} className="score-row">
              <span>{label}</span>
              <span className="score-pts">+{SCORING[key]} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

