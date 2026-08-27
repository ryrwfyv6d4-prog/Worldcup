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

const STAT_ROWS = [
  { key: 'possessionPct', label: 'Possession', pct: true },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'wonCorners', label: 'Corners' },
  { key: 'saves', label: 'Saves' },
  { key: 'passPct', label: 'Pass accuracy', pct: true },
  { key: 'foulsCommitted', label: 'Fouls' },
  { key: 'offsides', label: 'Offside' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
  { key: 'totalTackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
];

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
    events: normaliseEvents(s.keyEvents, home?.teamId),
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
