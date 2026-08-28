import { useState, useEffect, useRef } from 'react';
import { resolveClub } from '../utils/teamMatch.js';

// ESPN's per-match summary: line-ups, team stats, goals and cards. Fetched only
// when a match is opened, so the fixture list stays cheap.
//
// The scoreboard is queried by the fixture's own date rather than reusing the
// live overlay's ±36h window, so an old match still resolves to its event id.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CODE = { 1: 'eng.1', 2: 'eng.2' };

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

// Percentage-style stats arrive as ratios except possession, which is already 0-100
const asPct = (key, raw) => (key === 'possessionPct' ? raw : raw * 100);

// Every stat ESPN actually publishes for a match, grouped the way a match
// centre reads them: the headline handful first, then the detail by phase of
// play. Probed against the live feed — all 28 keys below are really there.
// There is no expected-goals in this feed, so there is no xG row anywhere.
const STAT_GROUPS = [
  {
    title: 'Match overview',
    rows: [
      { key: 'possessionPct', label: 'Ball possession', pct: true },
      { key: 'totalShots', label: 'Total shots' },
      { key: 'shotsOnTarget', label: 'Shots on target' },
      { key: 'wonCorners', label: 'Corner kicks' },
      { key: 'saves', label: 'Saves' },
      // nobody wins a foul count, so these read the other way round
      { key: 'foulsCommitted', label: 'Fouls', low: true },
      { key: 'yellowCards', label: 'Yellow cards', low: true },
      { key: 'redCards', label: 'Red cards', low: true },
      { key: 'offsides', label: 'Offsides', low: true },
    ],
  },
  {
    title: 'Shooting',
    rows: [
      { key: 'totalShots', label: 'Total shots' },
      { key: 'shotsOnTarget', label: 'On target' },
      { key: 'blockedShots', label: 'Blocked' },
      { key: 'shotPct', label: 'Shot accuracy', pct: true },
      { key: 'penaltyKickShots', label: 'Penalties taken' },
      { key: 'penaltyKickGoals', label: 'Penalties scored' },
    ],
  },
  {
    title: 'Passing',
    rows: [
      { key: 'totalPasses', label: 'Passes' },
      { key: 'accuratePasses', label: 'Accurate passes' },
      { key: 'passPct', label: 'Pass accuracy', pct: true },
      { key: 'totalCrosses', label: 'Crosses' },
      { key: 'accurateCrosses', label: 'Accurate crosses' },
      { key: 'crossPct', label: 'Cross accuracy', pct: true },
      { key: 'totalLongBalls', label: 'Long balls' },
      { key: 'accurateLongBalls', label: 'Accurate long balls' },
      { key: 'longballPct', label: 'Long ball accuracy', pct: true },
    ],
  },
  {
    title: 'Defending',
    rows: [
      { key: 'totalTackles', label: 'Tackles' },
      { key: 'effectiveTackles', label: 'Tackles won' },
      { key: 'tacklePct', label: 'Tackle success', pct: true },
      { key: 'interceptions', label: 'Interceptions' },
      { key: 'effectiveClearance', label: 'Clearances' },
    ],
  },
];

// The handful the summary shows as a teaser above the full list
const TOP_STATS = ['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'foulsCommitted'];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normaliseRoster(side) {
  const players = (side.roster || []).map((p) => ({
    id: p.athlete?.id,
    name: p.athlete?.shortName || p.athlete?.displayName || '—',
    full: p.athlete?.displayName,
    jersey: p.jersey || '',
    pos: p.position?.abbreviation || '',
    starter: !!p.starter,
    subbedIn: !!p.subbedIn,
    subbedOut: !!p.subbedOut,
    place: num(p.formationPlace) ?? 99,
  }));
  return {
    homeAway: side.homeAway,
    teamId: side.team?.id,
    team: side.team?.displayName,
    formation: side.formation || null,
    xi: players.filter((p) => p.starter).sort((a, b) => a.place - b.place),
    bench: players.filter((p) => !p.starter),
  };
}

// One stat row: the two values, how much of the bar each side owns, and which
// side "won" it. Winning is not always the bigger number — nobody wins fouls
// or yellow cards — so the direction is declared on the row, not inferred.
export function statRow(r, h, a) {
  let hv = h[r.key];
  let av = a[r.key];
  if (hv == null && av == null) return null;
  hv = hv ?? 0; av = av ?? 0;
  // A row where neither side did the thing at all says nothing. Sofascore drops
  // it rather than printing a pair of grey noughts, and the list reads better
  // for it. Possession is exempt: 0-0 there means the feed is empty, not that
  // nobody had the ball, and dropping it would hide that.
  if (hv === 0 && av === 0 && r.key !== 'possessionPct') return null;
  if (r.pct) { hv = asPct(r.key, hv); av = asPct(r.key, av); }
  const total = hv + av;
  const cmp = hv === av ? 0 : (hv > av ? 1 : -1) * (r.low ? -1 : 1);
  return {
    key: r.key,
    label: r.label,
    home: r.pct ? `${Math.round(hv)}%` : String(hv),
    away: r.pct ? `${Math.round(av)}%` : String(av),
    homeRaw: hv,
    awayRaw: av,
    better: cmp > 0 ? 'home' : cmp < 0 ? 'away' : null,
    // share of the bar each side takes; an all-zero row splits evenly
    homeShare: total > 0 ? (hv / total) * 100 : 50,
  };
}

function teamStatMaps(box, homeId, awayId) {
  const byId = {};
  for (const t of box?.teams || []) {
    const map = {};
    for (const st of t.statistics || []) map[st.name] = num(st.displayValue ?? st.value);
    byId[t.team?.id] = map;
  }
  return [byId[homeId] || {}, byId[awayId] || {}];
}

export function normaliseStatGroups(box, homeId, awayId) {
  const [h, a] = teamStatMaps(box, homeId, awayId);
  return STAT_GROUPS
    .map((g) => ({ title: g.title, rows: g.rows.map((r) => statRow(r, h, a)).filter(Boolean) }))
    .filter((g) => g.rows.length);
}

// The teaser on the summary: the same rows, in the same order, cut to five.
function normaliseTopStats(box, homeId, awayId) {
  const [h, a] = teamStatMaps(box, homeId, awayId);
  const lookup = STAT_GROUPS[0].rows;
  return TOP_STATS
    .map((k) => lookup.find((r) => r.key === k))
    .filter(Boolean)
    .map((r) => statRow(r, h, a))
    .filter(Boolean);
}

// Goals, cards and substitutions, oldest first. ESPN puts the minute in
// clock.displayValue and flags goals with scoringPlay.
function normaliseEvents(keyEvents, homeId) {
  const out = [];
  for (const e of keyEvents || []) {
    const type = e.type?.text || '';
    let kind = null;
    if (e.scoringPlay || /goal/i.test(type)) kind = /own/i.test(e.text || '') ? 'own' : 'goal';
    else if (/red card/i.test(type)) kind = 'red';
    else if (/yellow card/i.test(type)) kind = 'yellow';
    else if (/substitution/i.test(type)) kind = 'sub';
    if (!kind) continue;

    const who = (e.participants || e.athletesInvolved || [])
      .map((p) => p.athlete?.displayName || p.displayName)
      .filter(Boolean);
    out.push({
      kind,
      minute: e.clock?.displayValue || '',
      // Without a roster there is no home id to compare against, and every
      // event used to come back tagged 'away' — which stacked both teams'
      // scorers in the away column.
      side: (e.team?.id != null && homeId != null)
        ? (String(e.team.id) === String(homeId) ? 'home' : 'away')
        : null,
      who: who[0] || null,
      off: kind === 'sub' ? who[1] || null : null,
      text: e.text || '',
    });
  }
  return out;
}

// Which commentary lines are incidents rather than running description. ESPN
// does not set scoringPlay on the commentary feed — only play.type.text is
// there — so the incidents are picked out by type, not by a flag that is
// always undefined. Left as a flag check, every line came back marked key.
const KEY_PLAY = /goal|card|substitut|penalt|var|kickoff|end of|half/i;

// Minute-by-minute text. ESPN returns it oldest-first; a running commentary
// reads newest-first, the way you would scroll back through a match.
export function normaliseCommentary(list) {
  const out = [];
  for (const c of list || []) {
    const text = (c.text || '').trim();
    if (!text) continue;
    const kind = c.play?.type?.text || null;
    out.push({
      seq: num(c.sequence) ?? out.length,
      minute: c.time?.displayValue || c.clock?.displayValue || '',
      text,
      kind,
      key: Boolean(kind && KEY_PLAY.test(kind)),
      goal: Boolean(kind && /goal/i.test(kind)),
    });
  }
  return out.reverse();
}

// Previous meetings between these two clubs, newest first.
//
// seasonseries[0].events carries competitors directly — there is no nested
// competitions array — and the status lives on statusType, not status.type.
// The competitors always carry a winner flag; the score is read when present
// and the result falls back to that flag when it is not.
export function normaliseH2H(seasonseries, homeId) {
  const series = (seasonseries || [])[0];
  const events = series?.events || [];
  const out = [];
  let w = 0, d = 0, l = 0;
  for (const e of events) {
    const cs = e.competitors || [];
    const h = cs.find((c) => c.homeAway === 'home');
    const a = cs.find((c) => c.homeAway === 'away');
    if (!h || !a) continue;
    const hs = num(h.score);
    const as_ = num(a.score);
    // 'us' is whichever competitor is this match's home club
    const us = String(h.team?.id) === String(homeId) ? h : a;
    const them = us === h ? a : h;
    let result = null;
    if (hs != null && as_ != null) {
      const uw = us === h ? hs : as_;
      const tw = us === h ? as_ : hs;
      result = uw > tw ? 'W' : uw < tw ? 'L' : 'D';
    } else if (us.winner === true) result = 'W';
    else if (them.winner === true) result = 'L';
    else if (e.statusType?.completed) result = 'D';

    if (result === 'W') w++; else if (result === 'L') l++; else if (result === 'D') d++;
    out.push({
      id: e.id,
      date: e.date || null,
      homeName: h.team?.displayName || h.team?.shortDisplayName || '',
      awayName: a.team?.displayName || a.team?.shortDisplayName || '',
      homeAbbr: h.team?.abbreviation || '',
      awayAbbr: a.team?.abbreviation || '',
      homeScore: hs,
      awayScore: as_,
      result,           // from THIS match's home side's point of view
      comp: e.competitionName || null,
      note: e.statusType?.shortDetail || null,
    });
  }
  out.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  return { games: out, homeWins: w, draws: d, awayWins: l, summary: series?.summary || null };
}

// Each side's last five, straight from the feed. gameResult is already given
// from that team's point of view, so nothing has to be worked out here.
export function normaliseForm(lastFiveGames) {
  const out = {};
  for (const side of lastFiveGames || []) {
    const name = side.team?.displayName;
    if (!name) continue;
    out[String(side.team?.id ?? name)] = {
      team: name,
      games: (side.events || []).map((e) => ({
        id: e.id,
        date: e.gameDate || null,
        score: e.score || null,
        result: e.gameResult || null,
        comp: e.competitionName || null,
        atVs: e.atVs || null,
      })),
    };
  }
  return out;
}

async function loadDetail(fixture, signal) {
  const code = CODE[fixture.division];
  if (!code || !fixture.utcDate) return null;

  const kick = new Date(fixture.utcDate);
  const from = ymd(new Date(kick.getTime() - 864e5));
  const to = ymd(new Date(kick.getTime() + 864e5));

  const sb = await fetch(`${BASE}/${code}/scoreboard?dates=${from}-${to}`, { signal });
  if (!sb.ok) throw new Error(`scoreboard ${sb.status}`);
  const board = await sb.json();

  const match = (board.events || []).find((e) => {
    const comp = (e.competitions || [])[0];
    if (!comp) return false;
    const hc = (comp.competitors || []).find((c) => c.homeAway === 'home');
    const ac = (comp.competitors || []).find((c) => c.homeAway === 'away');
    return resolveClub(hc?.team?.displayName) === fixture.homeTeam.name
      && resolveClub(ac?.team?.displayName) === fixture.awayTeam.name;
  });
  if (!match) return { found: false };

  const res = await fetch(`${BASE}/${code}/summary?event=${match.id}`, { signal });
  if (!res.ok) throw new Error(`summary ${res.status}`);
  const s = await res.json();

  const rosters = (s.rosters || []).map(normaliseRoster);
  const home = rosters.find((r) => r.homeAway === 'home') || rosters[0] || null;
  const away = rosters.find((r) => r !== home) || null;

  const gi = s.gameInfo || {};
  return {
    found: true,
    eventId: match.id,
    lineups: home && (home.xi.length || home.bench.length) ? { home, away } : null,
    statGroups: normaliseStatGroups(s.boxscore, home?.teamId, away?.teamId),
    topStats: normaliseTopStats(s.boxscore, home?.teamId, away?.teamId),
    events: normaliseEvents(s.keyEvents, home?.teamId),
    commentary: normaliseCommentary(s.commentary),
    h2h: normaliseH2H(s.seasonseries, home?.teamId),
    form: normaliseForm(s.lastFiveGames),
    homeId: home?.teamId ?? null,
    awayId: away?.teamId ?? null,
    venue: gi.venue?.fullName || null,
    city: gi.venue?.address?.city || null,
    capacity: gi.venue?.capacity || null,
    attendance: gi.attendance || null,
    referee: (gi.officials || []).find((o) => /referee/i.test(o.position?.displayName || ''))?.displayName || null,
  };
}

export function useMatchDetail(fixture) {
  const [detail, setDetail] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | none | error
  const liveRef = useRef(fixture?.status === 'IN_PLAY');
  liveRef.current = fixture?.status === 'IN_PLAY';

  useEffect(() => {
    if (!fixture) return undefined;
    const ctrl = new AbortController();
    let timer = null;
    let alive = true;

    const run = async () => {
      try {
        const d = await loadDetail(fixture, ctrl.signal);
        if (!alive) return;
        if (!d || !d.found) { setDetail(null); setState('none'); }
        else { setDetail(d); setState('ready'); }
      } catch (err) {
        if (!alive || err.name === 'AbortError') return;
        setDetail(null);
        setState('error');
      }
      // a match in play refreshes its stats while you watch
      if (alive && liveRef.current) timer = setTimeout(run, 60000);
    };
    setState('loading');
    run();

    return () => { alive = false; ctrl.abort(); if (timer) clearTimeout(timer); };
  }, [fixture?.id, fixture?.status]);

  return { detail, state };
}
