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
      { key: 'foulsCommitted', label: 'Fouls' },
      { key: 'yellowCards', label: 'Yellow cards' },
      { key: 'redCards', label: 'Red cards' },
      { key: 'offsides', label: 'Offsides' },
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

const STAT_ROWS = STAT_GROUPS.flatMap((g) => g.rows);

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

// One stat row: the two values, and how much of the bar each side owns.
function statRow(r, h, a) {
  let hv = h[r.key];
  let av = a[r.key];
  if (hv == null && av == null) return null;
  hv = hv ?? 0; av = av ?? 0;
  if (r.pct) { hv = asPct(r.key, hv); av = asPct(r.key, av); }
  const total = hv + av;
  return {
    key: r.key,
    label: r.label,
    home: r.pct ? `${Math.round(hv)}%` : String(hv),
    away: r.pct ? `${Math.round(av)}%` : String(av),
    homeRaw: hv,
    awayRaw: av,
    // share of the bar each side takes; an all-zero row splits evenly
    homeShare: total > 0 ? (hv / total) * 100 : 50,
  };
}

function normaliseStatGroups(box, homeId, awayId) {
  const byId = {};
  for (const t of box?.teams || []) {
    const map = {};
    for (const st of t.statistics || []) map[st.name] = num(st.displayValue ?? st.value);
    byId[t.team?.id] = map;
  }
  const h = byId[homeId] || {};
  const a = byId[awayId] || {};
  return STAT_GROUPS
    .map((g) => ({ title: g.title, rows: g.rows.map((r) => statRow(r, h, a)).filter(Boolean) }))
    .filter((g) => g.rows.length);
}

function normaliseStats(box, homeId, awayId) {
  const byId = {};
  for (const t of box?.teams || []) {
    const map = {};
    for (const s of t.statistics || []) map[s.name] = num(s.displayValue ?? s.value);
    byId[t.team?.id] = map;
  }
  const h = byId[homeId] || {};
  const a = byId[awayId] || {};
  const rows = [];
  for (const r of STAT_ROWS) {
    let hv = h[r.key];
    let av = a[r.key];
    if (hv == null && av == null) continue;
    hv = hv ?? 0; av = av ?? 0;
    if (r.pct) { hv = asPct(r.key, hv); av = asPct(r.key, av); }
    const total = hv + av;
    rows.push({
      label: r.label,
      home: r.pct ? `${Math.round(hv)}%` : String(hv),
      away: r.pct ? `${Math.round(av)}%` : String(av),
      // share of the bar each side takes; an all-zero row splits evenly
      homeShare: total > 0 ? (hv / total) * 100 : 50,
    });
  }
  return rows;
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

// Minute-by-minute text. ESPN returns it oldest-first; a running commentary
// reads newest-first, the way you would scroll back through a match.
function normaliseCommentary(list) {
  const out = [];
  for (const c of list || []) {
    const text = (c.text || '').trim();
    if (!text) continue;
    out.push({
      minute: c.time?.displayValue || c.clock?.displayValue || '',
      text,
      // ESPN flags the entries that are also key events, which lets the feed
      // pick them out rather than reading as an undifferentiated wall
      key: Boolean(c.play?.scoringPlay || c.play?.type?.text),
      kind: c.play?.type?.text || null,
    });
  }
  return out.reverse();
}

// Previous meetings between these two clubs, newest first.
function normaliseH2H(seasonseries, homeId) {
  const series = (seasonseries || [])[0];
  const events = series?.events || [];
  const out = [];
  for (const e of events) {
    const comp = (e.competitions || [])[0] || e;
    const cs = comp.competitors || [];
    const h = cs.find((c) => c.homeAway === 'home');
    const a = cs.find((c) => c.homeAway === 'away');
    if (!h || !a) continue;
    const hs = num(h.score), as_ = num(a.score);
    out.push({
      id: e.id,
      date: e.date || comp.date || null,
      homeName: h.team?.displayName || h.team?.shortDisplayName || '',
      awayName: a.team?.displayName || a.team?.shortDisplayName || '',
      homeScore: hs,
      awayScore: as_,
      // result from the perspective of THIS match's home side
      result: hs == null || as_ == null ? null
        : String(h.team?.id) === String(homeId)
          ? (hs > as_ ? 'W' : hs < as_ ? 'L' : 'D')
          : (as_ > hs ? 'W' : as_ < hs ? 'L' : 'D'),
      note: comp.status?.type?.shortDetail || null,
    });
  }
  return out;
}

// The slice of the league table ESPN ships with the match.
function normaliseStandings(standings, homeName, awayName) {
  const group = (standings?.groups || [])[0];
  const entries = group?.standings?.entries || standings?.entries || [];
  const rows = [];
  for (const e of entries) {
    const stat = (name) => {
      const st = (e.stats || []).find((x) => x.name === name || x.abbreviation === name);
      return st ? (st.displayValue ?? st.value) : null;
    };
    rows.push({
      team: e.team?.displayName || e.team?.shortDisplayName || '',
      pos: num(stat('rank')) ?? null,
      played: num(stat('gamesPlayed')),
      wins: num(stat('wins')),
      draws: num(stat('ties')),
      losses: num(stat('losses')),
      gd: num(stat('pointDifferential')) ?? num(stat('pointsDifference')),
      points: num(stat('points')),
    });
  }
  rows.sort((x, y) => (x.pos ?? 99) - (y.pos ?? 99));
  return { rows, homeName, awayName };
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
    stats: normaliseStats(s.boxscore, home?.teamId, away?.teamId),
    statGroups: normaliseStatGroups(s.boxscore, home?.teamId, away?.teamId),
    events: normaliseEvents(s.keyEvents, home?.teamId),
    commentary: normaliseCommentary(s.commentary),
    h2h: normaliseH2H(s.seasonseries, home?.teamId),
    standings: normaliseStandings(s.standings, fixture.homeTeam.name, fixture.awayTeam.name),
    venue: gi.venue?.fullName || null,
    city: gi.venue?.address?.city || null,
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
