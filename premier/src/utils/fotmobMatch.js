// FotMob's match page, cut down to what the match sheet draws.
//
// ESPN gives team totals and a names-only line-up. FotMob carries, for both
// divisions: where every player actually stood, a rating for each of them,
// substitution minutes, the team stats split by half (with xG), forty players'
// individual numbers, every shot with its xG, and the momentum graph. The raw
// payload is megabytes; this keeps the handful of fields we show.
//
// Runs in the worker (so the phone downloads kilobytes) and in the tests, so
// it imports nothing. Every field is optional: FotMob is not ours, and a
// missing block should leave a smaller match sheet, never a broken one.

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : null;
};
// "298 (78%)" is 298, not 29878
const lead = (v) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};
const round = (v, dp = 1) => (v == null ? null : Math.round(v * 10 ** dp) / 10 ** dp);

// Shown with the player's surname, as every match centre does. A mononym
// ("André") has no first name and keeps the whole thing.
const shortName = (p) => p?.lastName || p?.name || '';

// ── Per-player events: goals, cards, subs ───────────────────────────────────
function eventsByPlayer(md) {
  const out = {};
  const bump = (id, k) => {
    if (id == null) return;
    out[id] = out[id] || { goals: 0, og: 0, yellow: 0, red: 0 };
    out[id][k] += 1;
  };
  for (const e of md?.content?.matchFacts?.events?.events || []) {
    const id = e.playerId ?? e.player?.id;
    if (e.type === 'Goal') bump(id, e.ownGoal || e.isOwnGoal ? 'og' : 'goals');
    else if (e.type === 'Card') {
      if (/red/i.test(e.card || '')) bump(id, 'red');
      else bump(id, 'yellow');
    }
  }
  return out;
}

// ── One player's numbers ────────────────────────────────────────────────────
// Stats arrive as { "Label": { key, stat: { value, total?, type } } }. Turned
// into [label, text] pairs so the phone just prints them.
function fmtStat(s) {
  if (!s || s.value == null) return null;
  const v = s.value;
  switch (s.type) {
    case 'fractionWithPercentage':
      return s.total ? `${v}/${s.total} (${Math.round((v / s.total) * 100)}%)` : `${v}/${s.total ?? 0}`;
    case 'double': return String(round(v, 2));
    case 'distance': return `${round(v / 1000, 1)} km`;
    case 'speed': return `${round(v, 1)} km/h`;
    case 'boolean': return null;
    case 'fantasyPoints': return null;
    default: return String(v);
  }
}

const SKIP_PLAYER_STAT = new Set(['FotMob rating', 'Shotmap', 'Fantasy points', 'Minutes played']);

function trimPlayer(ps) {
  const groups = [];
  let rating = null, minutes = null, goals = 0, assists = 0;
  for (const g of ps.stats || []) {
    const rows = [];
    for (const [label, entry] of Object.entries(g.stats || {})) {
      const st = entry?.stat;
      if (label === 'FotMob rating') rating = num(st?.value);
      if (label === 'Minutes played') minutes = num(st?.value);
      if (entry?.key === 'goals') goals = num(st?.value) || 0;
      if (entry?.key === 'assists') assists = num(st?.value) || 0;
      if (SKIP_PLAYER_STAT.has(label)) continue;
      const text = fmtStat(st);
      if (text != null) rows.push([label, text]);
    }
    if (rows.length) groups.push({ title: g.title, rows });
  }
  return { rating: round(rating, 1), minutes, goals, assists, isGK: Boolean(ps.isGoalkeeper), groups };
}

// ── Line-ups ────────────────────────────────────────────────────────────────
function subTime(p, type) {
  const ev = (p?.performance?.substitutionEvents || []).find((e) => e.type === type);
  return ev ? num(ev.time) : null;
}

function trimSide(t, events, stats) {
  if (!t) return null;
  const player = (p, starter) => {
    const ps = stats[p.id] || {};
    const ev = events[p.id] || {};
    return {
      id: p.id,
      name: shortName(p),
      full: p.name || null,
      shirt: p.shirtNumber ?? null,
      // Vertical layout: x across the pitch (0 left, 1 right), y from own
      // goal (0) to the halfway line (1). Only starters have one.
      x: starter ? num(p.verticalLayout?.x) : null,
      y: starter ? num(p.verticalLayout?.y) : null,
      rating: round(num(p.performance?.rating) ?? ps.rating, 1),
      on: subTime(p, 'subIn'),
      off: subTime(p, 'subOut'),
      goals: ps.goals || ev.goals || 0,
      og: ev.og || 0,
      assists: ps.assists || 0,
      yellow: ev.yellow || 0,
      red: ev.red || 0,
      captain: Boolean(p.isCaptain),
    };
  };
  return {
    name: t.name || null,
    formation: t.formation || null,
    rating: round(num(t.rating), 1),
    coach: t.coach?.name || null,
    xi: (t.starters || []).map((p) => player(p, true)),
    subs: (t.subs || []).map((p) => player(p, false)),
  };
}

// ── Team stats by period ────────────────────────────────────────────────────
// Each group opens with a header row carrying the group's own title and two
// nulls; that is dropped. Values arrive as numbers or "298 (78%)" strings and
// are kept as text, with a numeric copy for the bar.
const PERIODS = [['All', 'Match'], ['FirstHalf', '1st half'], ['SecondHalf', '2nd half']];
// Where fewer is better, so the bar credits the right side
const LOW_IS_GOOD = new Set(['yellow_cards', 'red_cards', 'fouls', 'Offsides', 'big_chance_missed_title',
  'ShotsOffTarget', 'dribbled_past']);

function trimPeriods(stats) {
  const out = [];
  for (const [key, label] of PERIODS) {
    const groups = [];
    for (const g of stats?.Periods?.[key]?.stats || []) {
      const rows = [];
      for (const s of g.stats || []) {
        const [h, a] = s.stats || [];
        if (h == null && a == null) continue;
        if (rows.some((r) => r.key === s.key)) continue;
        rows.push({ key: s.key, title: s.title, home: String(h ?? 0), away: String(a ?? 0),
          h: lead(h) ?? 0, a: lead(a) ?? 0, low: LOW_IS_GOOD.has(s.key) });
      }
      if (rows.length) groups.push({ key: g.key, title: g.title, rows });
    }
    if (groups.length) out.push({ key, label, groups });
  }
  return out;
}

// ── Shots ───────────────────────────────────────────────────────────────────
// Every shot is drawn attacking the same goal (x towards 105 on a 105 x 68
// pitch), whichever side took it, which is what a half-pitch shot map wants.
function trimShots(shotmap, homeId) {
  return (shotmap?.shots || []).map((s) => ({
    side: s.teamId === homeId ? 'home' : 'away',
    x: round(num(s.x), 1),
    y: round(num(s.y), 1),
    xg: round(num(s.expectedGoals), 2),
    goal: s.eventType === 'Goal' && !s.isOwnGoal,
    onTarget: Boolean(s.isOnTarget),
    blocked: Boolean(s.isBlocked),
    min: num(s.min),
    name: s.lastName || s.playerName || '',
    situation: s.situation || null,
  })).filter((s) => s.x != null && s.y != null);
}

export function trimMatchDetails(md) {
  const c = md?.content || {};
  const teams = md?.header?.teams || [];
  const homeId = teams[0]?.id ?? c.lineup?.homeTeam?.id ?? null;

  const stats = {};
  for (const [id, ps] of Object.entries(c.playerStats || {})) stats[ps?.id ?? id] = trimPlayer(ps || {});
  const events = eventsByPlayer(md);

  const potm = c.matchFacts?.playerOfTheMatch;
  const status = md?.header?.status || md?.general || {};

  return {
    found: true,
    started: Boolean(status.started),
    finished: Boolean(status.finished),
    lineupType: c.lineup?.lineupType || null,
    home: trimSide(c.lineup?.homeTeam, events, stats),
    away: trimSide(c.lineup?.awayTeam, events, stats),
    periods: trimPeriods(c.stats),
    players: stats,
    shots: trimShots(c.shotmap, homeId),
    momentum: (c.momentum?.main?.data || [])
      .map((d) => ({ m: num(d.minute), v: num(d.value) }))
      .filter((d) => d.m != null && d.v != null),
    potm: potm ? {
      id: potm.id ?? null,
      name: potm.name?.fullName || potm.name?.lastName || null,
      rating: num(potm.rating?.num),
      home: Boolean(potm.isHomeTeam),
    } : null,
  };
}
