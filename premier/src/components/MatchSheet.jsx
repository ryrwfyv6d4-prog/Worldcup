import { useMemo, useRef, useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { clubLabel } from '../utils/teamMatch.js';
import { getMatchup, FIRMS_FOOTNOTE } from '../data/rivalries.js';
import { coloursFor } from '../data/colours.js';
import Crest from './Crest.jsx';
import Stripe from './Stripe.jsx';
import { useMatchDetail } from '../hooks/useMatchDetail.js';
import { useTeamNews } from '../hooks/useTeamNews.js';
import { useHighlight } from '../hooks/useHighlight.js';
import { buildShape, shirtColours } from '../utils/formation.js';
import { useSwipeToClose } from '../hooks/useSwipeToClose.js';
import StatsTab from './match/StatsTab.jsx';
import CommentaryTab from './match/CommentaryTab.jsx';
import H2HTab from './match/H2HTab.jsx';
import StandingsTab from './match/StandingsTab.jsx';
import StatRow, { StatKey } from './match/StatRow.jsx';
import TeamNews, { ProbableXI } from './match/TeamNews.jsx';
import {
  leagueTable, formForTeam, positionOf, reverseFixture, fixturePoints,
} from '../utils/scoring.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const fmtDate = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
  : 'Date TBC');
// The phone's own timezone. A fixture the feed carries no time for says TBC
// rather than showing the placeholder the parser needed in order to sort it.
const fmtTime = (f) => {
  if (!f?.utcDate) return '';
  if (f.timeTBC) return 'TBC';
  return new Date(f.utcDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const EVENT_MARK = { goal: '⚽', own: '⚽', yellow: '▮', red: '▮', sub: '⇄' };

// Which tabs this match actually has. A tab that opens onto "not published for
// this match" is a dead end you only find by tapping it, so the ones with
// nothing behind them are not offered at all. Summary and Table always are:
// one is built from the fixture, the other from the league.
function tabsFor(detail) {
  const tabs = [{ key: 'summary', label: 'Summary' }];
  if (detail?.statGroups?.length) tabs.push({ key: 'stats', label: 'Stats' });
  if (detail?.lineups) tabs.push({ key: 'lineups', label: 'Line-ups' });
  tabs.push({ key: 'table', label: 'Table' });
  if (detail?.h2h?.games?.length) tabs.push({ key: 'h2h', label: 'H2H' });
  if (detail?.commentary?.length) tabs.push({ key: 'commentary', label: 'Commentary' });
  return tabs;
}

export default function MatchSheet({ fixture, fixtures, assignments, onClose, onSelectTeam }) {
  const [tab, setTab] = useState('summary');
  const { detail, state } = useMatchDetail(fixture);
  const sheetRef = useRef(null);
  useSwipeToClose(sheetRef, onClose);

  // Tabs appear as the feed lands. If the one you are on disappears — you
  // opened Stats on a live match and the summary later came back empty — fall
  // back to Summary rather than rendering a blank pane.
  const tabs = useMemo(() => tabsFor(detail), [detail]);
  const active = tabs.some((t) => t.key === tab) ? tab : 'summary';

  const table = useMemo(
    () => leagueTable(fixtures, fixture.division),
    [fixtures, fixture.division]
  );

  const home = getTeam(fixture.homeTeam.name);
  const away = getTeam(fixture.awayTeam.name);
  const matchup = getMatchup(fixture.homeTeam.name, fixture.awayTeam.name, home, away);
  const rev = reverseFixture(fixture, fixtures);

  const done = fixture.status === 'FINISHED';
  const live = fixture.status === 'IN_PLAY';
  const highlight = useHighlight(
    fixture.homeTeam.name, fixture.awayTeam.name,
    done && fixture.division === 1,          // Stan do not carry the Championship
    fixture.score?.home, fixture.score?.away
  );
  const played = done || live;
  // Only before kick-off. Afterwards the result is the news.
  const { news } = useTeamNews(fixture, !played);

  const sides = [
    {
      key: 'home', info: home, name: fixture.homeTeam.name, isHome: true,
      owner: ownerOf(fixture.homeTeam.name, assignments),
      pts: fixturePoints(fixture, fixture.homeTeam.name),
      goals: fixture.score?.home,
    },
    {
      key: 'away', info: away, name: fixture.awayTeam.name, isHome: false,
      owner: ownerOf(fixture.awayTeam.name, assignments),
      pts: fixturePoints(fixture, fixture.awayTeam.name),
      goals: fixture.score?.away,
    },
  ];

  const goals = played
    ? (detail?.events || []).filter((e) => e.kind === 'goal' || e.kind === 'own')
    : [];

  const openTeam = (name) => { onClose(); if (onSelectTeam) onSelectTeam(name); };

  return (
    <div className="mp" ref={sheetRef}>
      <div className="mp-bar">
        <button className="mp-back" onClick={onClose} aria-label="Back">
          <span className="mp-back-chev" aria-hidden="true">‹</span> Back
        </button>
        <span className="mp-comp">
          {fixture.division === 1 ? 'Premier League' : 'Championship'} · MW{fixture.matchday}
        </span>
      </div>

      <div className="mp-scroll">
        {/* ── Scoreline ─────────────────────────────────────────────────── */}
        <div className="mp-head">
          {sides.map((s, i) => (
            <button
              key={s.key}
              className={`mp-side ${i ? 'away' : ''}`}
              onClick={() => openTeam(s.name)}
            >
              <Crest team={s.name} size={54} />
              <span className="mp-club">{s.info?.short || clubLabel(s.name)}</span>
              <span className="mp-owner">{s.owner || 'unclaimed'}</span>
            </button>
          ))}

          <div className="mp-score">
            {played ? (
              <>
                <span className="mp-goals">{s0(sides[0].goals)}–{s0(sides[1].goals)}</span>
                <span className={`mp-state ${live ? 'live' : ''}`}>
                  {live ? `${fixture.liveClock || 'live'}'` : 'Full time'}
                </span>
              </>
            ) : (
              <>
                <span className="mp-kick">{fmtTime(fixture)}</span>
                <span className="mp-state">{fmtDate(fixture.utcDate)}</span>
              </>
            )}
          </div>
        </div>

        {goals.length > 0 && (
          <div className="mp-scorers">
            {['home', 'away'].map((sd) => (
              <div className={`mp-scorer-col ${sd}`} key={sd}>
                {goals.filter((g) => g.side === sd).map((g, i) => (
                  <div className="mp-scorer" key={i}>
                    {g.who || 'Goal'} <span>{g.minute}{g.kind === 'own' ? ' og' : ''}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {highlight && (
          <a className="mp-hl" href={highlight} target="_blank" rel="noreferrer">
            <span aria-hidden="true">▶</span> Watch the highlights
          </a>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="seg-row mp-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              className={`seg ${active === t.key ? 'on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active === 'summary' && (
          <Report
            fixture={fixture} fixtures={fixtures} table={table} sides={sides}
            detail={detail} matchup={matchup} rev={rev} played={played}
            home={home} away={away} news={news}
            onMore={() => setTab('stats')}
          />
        )}
        {active === 'lineups' && <Lineups detail={detail} state={state} sides={sides} played={played} />}
        {active === 'stats' && <StatsTab detail={detail} sides={sides} />}
        {active === 'table' && (
          <StandingsTab
            fixtures={fixtures} division={fixture.division}
            sides={sides} onSelectTeam={openTeam}
          />
        )}
        {active === 'h2h' && <H2HTab detail={detail} sides={sides} />}
        {active === 'commentary' && <CommentaryTab detail={detail} />}
      </div>
    </div>
  );
}

const s0 = (n) => (n == null ? 0 : n);

// ── Summary ───────────────────────────────────────────────────────────────
// The landing tab: a stack of cards rather than one dataset. Each is a digest
// of something with a tab of its own, in the order you want it after a result
// lands — what happened, what it was worth, how the game went, who these two
// are, where it was played.
function Report({ fixture, fixtures, table, sides, detail, matchup, rev, played, home, away, news, onMore }) {
  const timeline = played ? detail?.events || [] : [];
  const top = played ? detail?.topStats || [] : [];
  const odds = !played ? detail?.odds : null;
  const [homeColour] = coloursFor(sides[0].name);
  const [awayColour] = coloursFor(sides[1].name);

  return (
    <div className="mp-pane">
      {timeline.length > 0 && (
        <>
          <div className="section-title">How it went</div>
          <div className="mp-timeline">
            {timeline.map((e, i) => (
              <div className={`mp-tl ${e.side === 'away' ? 'away' : ''}`} key={i}>
                <span className="mp-tl-min">{e.minute}</span>
                <span className={`mp-tl-mark ${e.kind}`}>{EVENT_MARK[e.kind]}</span>
                <span className="mp-tl-who">
                  {e.who || e.text}
                  {e.kind === 'sub' && e.off && <em> for {e.off}</em>}
                  {e.kind === 'own' && <em> own goal</em>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <TeamNews news={news} sides={sides} />

      {/* ── What it paid ──────────────────────────────────────────────── */}
      <div className="mp-money">
        <div className="mp-money-head">{played ? 'What it paid' : 'What it pays'}</div>
        {sides.map((s) => {
          const p = s.pts;
          if (!p) return null;
          const banked = p.settled;
          return (
            <div className="mp-money-row" key={s.key}>
            <Stripe team={s.name} variant="tbl" />
            <span className="mp-money-club">{s.info?.short || clubLabel(s.name)}</span>
            <span className="mp-money-owner">{s.owner || '—'}</span>
            {banked ? (
              <span className={`mp-money-val ${p.outcome === 'L' ? 'nil' : ''}`}>
                {p.outcome === 'W' && `+${p.pts} won`}
                {p.outcome === 'D' && `+${p.pts} drew`}
                {p.outcome === 'L' && '0 lost'}
              </span>
            ) : (
              <span className="mp-money-val quote">+{p.win} win · +{p.draw} draw</span>
            )}
            </div>
          );
        })}
      </div>

      {top.length > 0 && (
        <>
          <div className="section-title">Top stats</div>
          <StatKey
            homeName={sides[0].info?.short || clubLabel(sides[0].name)}
            awayName={sides[1].info?.short || clubLabel(sides[1].name)}
            homeColour={homeColour}
            awayColour={awayColour}
          />
          {top.map((r) => (
            <StatRow key={r.key} row={r} homeColour={homeColour} awayColour={awayColour} />
          ))}
          <button className="mp-more" onClick={onMore}>All stats ›</button>
        </>
      )}

      {odds && (
        <>
          <div className="section-title">The market</div>
          <div className="mp-odds">
            <div className="mp-odds-bar">
              <span style={{ width: `${odds.home}%`, background: homeColour }} />
              <span style={{ width: `${odds.draw}%` }} />
              <span style={{ width: `${odds.away}%`, background: awayColour }} />
            </div>
            <div className="mp-odds-row">
              <span><b>{odds.home}%</b> {sides[0].info?.short || clubLabel(sides[0].name)}</span>
              <span className="mid"><b>{odds.draw}%</b> draw</span>
              <span><b>{odds.away}%</b> {sides[1].info?.short || clubLabel(sides[1].name)}</span>
            </div>
          </div>
        </>
      )}

      <div className="section-title">The sides</div>
      <div className="mp-form">
        {sides.map((s) => {
          const row = table.find((r) => r.team === s.name);
          const pos = positionOf(s.name, table);
          const form = formForTeam(s.name, fixtures);
          return (
            <div className="mp-form-col" key={s.key}>
              <div className="mp-form-club">{s.info?.short || clubLabel(s.name)}</div>
              <div className="mp-form-line">
                <b>{row && row.p > 0 ? ordinal(pos) : '—'}</b> in the table
              </div>
              <div className="mp-form-line">
                <b>{row ? `${row.w}-${row.d}-${row.l}` : '0-0-0'}</b> W-D-L
              </div>
              <div className="mp-form-line">
                <b>{row ? `${row.gf}:${row.ga}` : '0:0'}</b> goals
              </div>
              <div className="mp-form-pips">
                {form.length
                  ? form.map((r, i) => <span key={i} className={`fsq fsq-${r.toLowerCase()}`}>{r}</span>)
                  : <span className="muted small">no results yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      <ProbableXI news={news} sides={sides} />

      {(detail?.venue || detail?.attendance || detail?.referee || fixture.utcDate) && (
        <>
          <div className="section-title">Match info</div>
          <div className="mp-info">
            {fixture.utcDate && (
              <div className="mp-info-row">
                <span className="mp-info-lab">Kick-off</span>
                <span>{fmtDate(fixture.utcDate)}, {fmtTime(fixture)}</span>
              </div>
            )}
            {detail?.venue && (
              <div className="mp-info-row">
                <span className="mp-info-lab">Ground</span>
                <span>{detail.venue}{detail.city ? `, ${detail.city}` : ''}</span>
              </div>
            )}
            {detail?.attendance > 0 && (
              <div className="mp-info-row">
                <span className="mp-info-lab">Attendance</span>
                <span>
                  {detail.attendance.toLocaleString()}
                  {detail.capacity > 0 && ` of ${detail.capacity.toLocaleString()}`}
                </span>
              </div>
            )}
            {detail?.referee && (
              <div className="mp-info-row">
                <span className="mp-info-lab">Referee</span>
                <span>{detail.referee}</span>
              </div>
            )}
            <div className="mp-info-row">
              <span className="mp-info-lab">Round</span>
              <span>
                {fixture.division === 1 ? 'Premier League' : 'Championship'}
                , matchweek {fixture.matchday}
              </span>
            </div>
          </div>
        </>
      )}

      {matchup && (
        <>
          <div className="section-title">{matchup.title}</div>
          {matchup.derby && <span className="mp-derby-tag">Derby</span>}
          <p className="editorial">{matchup.blurb}</p>
          {matchup.firms && (
            <>
              <p className="mp-firms"><b>The firms.</b> {matchup.firms}</p>
              <p className="muted small">{FIRMS_FOOTNOTE}</p>
            </>
          )}
        </>
      )}

      {rev && (
        <div className="mp-rev">
          <span className="mp-rev-lab">Return leg</span>
          <span>
            {getTeam(rev.homeTeam.name)?.short} v {getTeam(rev.awayTeam.name)?.short}
            {rev.status === 'FINISHED'
              ? ` · ${rev.score.home}–${rev.score.away}`
              : ` · ${rev.utcDate ? new Date(rev.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBC'}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Line-ups ──────────────────────────────────────────────────────────────
// Both sides on one pitch, home attacking up. Only drawn when the feed gives
// enough to place all twenty-two honestly; otherwise the lists below stand on
// their own.
function Pitch({ home, away, sides }) {
  const hs = buildShape(home);
  const as = buildShape(away);
  if (!hs || !as) return null;

  const [homeKit, awayKit] = shirtColours(coloursFor(sides[0].name), coloursFor(sides[1].name));
  const rows = [
    { shape: hs, side: sides[0], end: 'home', kit: homeKit },
    { shape: as, side: sides[1], end: 'away', kit: awayKit },
  ];

  return (
    <div className="pitch" aria-hidden="true">
      <div className="pitch-lines">
        <span className="pitch-half" />
        <span className="pitch-circle" />
        <span className="pitch-box top" />
        <span className="pitch-box bottom" />
      </div>
      {rows.map(({ shape, end, kit }) => shape.slots.map(({ player, x, depth }) => {
        // home works up from the bottom, away down from the top, and away is
        // mirrored so the two sides face each other the right way round
        const top = end === 'home' ? 100 - depth * 48 : depth * 48;
        const left = end === 'home' ? x : 100 - x;
        return (
          <div
            className={`pp ${end} ${player.subbedOut ? 'off' : ''}`}
            key={`${end}-${player.id || player.name}`}
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <span className="pp-shirt" style={{ background: kit }}>
              {player.jersey || ''}
            </span>
            <span className="pp-name">{player.name}</span>
          </div>
        );
      }))}
    </div>
  );
}

function Lineups({ detail, state, sides, played }) {
  if (!detail?.lineups) return <Empty state={state} played={played} what="Line-ups" />;
  const { home, away } = detail.lineups;

  return (
    <div className="mp-pane">
      <Pitch home={home} away={away} sides={sides} />
      <div className="mp-xi">
        {[[home, sides[0]], [away, sides[1]]].map(([side, s], i) => (
          <div className="mp-xi-col" key={i}>
            <div className="mp-xi-head">
              <span className="mp-xi-club">{s.info?.short || clubLabel(s.name)}</span>
              {side?.formation && <span className="mp-xi-form">{side.formation}</span>}
            </div>
            {(side?.xi || []).map((p) => (
              <div className="mp-player" key={p.id || p.name}>
                <span className="mp-shirt">{p.jersey}</span>
                <span className="mp-pname">{p.name}</span>
                <span className="mp-ppos">{p.pos}</span>
                {p.subbedOut && <span className="mp-sub-mark out">↓</span>}
              </div>
            ))}
            {(side?.bench || []).some((p) => p.subbedIn) && (
              <>
                <div className="mp-xi-sub">On</div>
                {(side.bench || []).filter((p) => p.subbedIn).map((p) => (
                  <div className="mp-player" key={p.id || p.name}>
                    <span className="mp-shirt">{p.jersey}</span>
                    <span className="mp-pname">{p.name}</span>
                    <span className="mp-ppos">{p.pos}</span>
                    <span className="mp-sub-mark in">↑</span>
                  </div>
                ))}
              </>
            )}
            {(side?.bench || []).some((p) => !p.subbedIn) && (
              <>
                <div className="mp-xi-sub">Unused</div>
                <div className="mp-unused">
                  {(side.bench || []).filter((p) => !p.subbedIn).map((p) => p.name).join(' · ')}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Line-ups and stats only exist once a match is close to kicking off
function Empty({ state, played, what }) {
  const msg = state === 'loading' ? 'Loading…'
    : played ? `${what} were not published for this match.`
    : `${what} land about an hour before kick-off.`;
  return <div className="mp-pane"><p className="muted small mp-empty">{msg}</p></div>;
}
