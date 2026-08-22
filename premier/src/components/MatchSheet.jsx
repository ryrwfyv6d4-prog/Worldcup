import { useMemo, useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { phaseFor, midseasonRankFor } from '../utils/odds.js';
import { getMatchup, FIRMS_FOOTNOTE } from '../data/rivalries.js';
import { coloursFor } from '../data/colours.js';
import Crest from './Crest.jsx';
import Stripe from './Stripe.jsx';
import { useMatchDetail } from '../hooks/useMatchDetail.js';
import { useHighlight } from '../hooks/useHighlight.js';
import { buildShape, shirtColours } from '../utils/formation.js';
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
const fmtTime = (iso) => (iso
  ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : '');

const TABS = [
  { key: 'report', label: 'Report' },
  { key: 'lineups', label: 'Line-ups' },
  { key: 'stats', label: 'Stats' },
];

const EVENT_MARK = { goal: '⚽', own: '⚽', yellow: '▮', red: '▮', sub: '⇄' };

export default function MatchSheet({ fixture, fixtures, assignments, onClose, onSelectTeam }) {
  const [tab, setTab] = useState('report');
  const { detail, state } = useMatchDetail(fixture);

  const table = useMemo(
    () => leagueTable(fixtures, fixture.division),
    [fixtures, fixture.division]
  );

  const home = getTeam(fixture.homeTeam.name);
  const away = getTeam(fixture.awayTeam.name);
  const matchup = getMatchup(fixture.homeTeam.name, fixture.awayTeam.name, home, away);
  const rev = reverseFixture(fixture, fixtures);
  const phase = phaseFor(fixture.utcDate);

  const done = fixture.status === 'FINISHED';
  const live = fixture.status === 'IN_PLAY';
  const highlight = useHighlight(
    fixture.homeTeam.name, fixture.awayTeam.name, done, fixture.score?.home, fixture.score?.away
  );
  const played = done || live;

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
    <div className="mp">
      <div className="mp-bar">
        <button className="mp-back" onClick={onClose}>← Back</button>
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
              <span className="mp-club">{s.info?.short || s.name}</span>
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
                <span className="mp-kick">{fmtTime(fixture.utcDate)}</span>
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
        <div className="seg-row mp-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`seg ${tab === t.key ? 'on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'report' && (
          <Report
            fixture={fixture} fixtures={fixtures} table={table} sides={sides}
            detail={detail} matchup={matchup} rev={rev} played={played}
            phase={phase} home={home} away={away}
          />
        )}
        {tab === 'lineups' && <Lineups detail={detail} state={state} sides={sides} played={played} />}
        {tab === 'stats' && <Stats detail={detail} state={state} sides={sides} played={played} />}
      </div>
    </div>
  );
}

const s0 = (n) => (n == null ? 0 : n);

// ── Report ────────────────────────────────────────────────────────────────
function Report({ fixture, fixtures, table, sides, detail, matchup, rev, played, phase, home, away }) {
  const timeline = played ? detail?.events || [] : [];

  return (
    <div className="mp-pane">
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
            <span className="mp-money-club">{s.info?.short || s.name}</span>
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
        <p className="mp-money-note">
          {phase === 'mid' && home && midseasonRankFor(home.name) ? (
            <>Priced off the January re-rating: {home.short} {ordinal(midseasonRankFor(home.name))},
            {' '}{away?.short} {ordinal(midseasonRankFor(away?.name))} at New Year.</>
          ) : home && away ? (
            <>Priced off the pre-season odds: {home.short} tipped {ordinal(home.rank)},
            {' '}{away.short} tipped {ordinal(away.rank)}.</>
          ) : null}
          {' '}A win away from home, or over a club rated above you, pays more.
        </p>
      </div>

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

      <div className="section-title">The sides</div>
      <div className="mp-form">
        {sides.map((s) => {
          const row = table.find((r) => r.team === s.name);
          const pos = positionOf(s.name, table);
          const form = formForTeam(s.name, fixtures);
          return (
            <div className="mp-form-col" key={s.key}>
              <div className="mp-form-club">{s.info?.short || s.name}</div>
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

      {played && (detail?.venue || detail?.attendance || detail?.referee) && (
        <div className="mp-venue">
          {detail.venue && <span>{detail.venue}{detail.city ? `, ${detail.city}` : ''}</span>}
          {detail.attendance && <span>{detail.attendance.toLocaleString()} in</span>}
          {detail.referee && <span>Ref {detail.referee}</span>}
        </div>
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
              <span className="mp-xi-club">{s.info?.short || s.name}</span>
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

// ── Stats ─────────────────────────────────────────────────────────────────
function Stats({ detail, state, sides, played }) {
  if (!detail?.stats?.length) return <Empty state={state} played={played} what="Match stats" />;
  const [hc] = coloursFor(sides[0].name);
  const [ac] = coloursFor(sides[1].name);

  return (
    <div className="mp-pane">
      <div className="mp-stat-key">
        <span><i style={{ background: hc }} />{sides[0].info?.short || sides[0].name}</span>
        <span><i style={{ background: ac }} />{sides[1].info?.short || sides[1].name}</span>
      </div>
      {detail.stats.map((r) => (
        <div className="mp-stat" key={r.label}>
          <div className="mp-stat-top">
            <span className="mp-stat-h">{r.home}</span>
            <span className="mp-stat-lab">{r.label}</span>
            <span className="mp-stat-a">{r.away}</span>
          </div>
          <div className="mp-stat-bar">
            <span style={{ width: `${r.homeShare}%`, background: hc }} />
            <span style={{ width: `${100 - r.homeShare}%`, background: ac }} />
          </div>
        </div>
      ))}
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
