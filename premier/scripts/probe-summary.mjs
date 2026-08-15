// Diagnostic: dump the shape of ESPN's per-match summary endpoint so the match
// page can be built against real field names rather than guesses. The dev
// container can't reach ESPN, so this runs in CI.
//
// Nothing depends on this at runtime.

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const LEAGUES = [{ div: 2, code: 'eng.2' }, { div: 1, code: 'eng.1' }];

const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Find the most recent finished match across both divisions
let event = null, league = null;
for (const lg of LEAGUES) {
  const to = new Date();
  const from = new Date(Date.now() - 21 * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  try {
    const sb = await get(`${BASE}/${lg.code}/scoreboard?dates=${fmt(from)}-${fmt(to)}`);
    const done = (sb.events || []).filter((e) => e.status?.type?.state === 'post');
    console.log(`${lg.code}: ${(sb.events || []).length} events in window, ${done.length} finished`);
    if (done.length && !event) { event = done[done.length - 1]; league = lg.code; }
  } catch (err) {
    console.log(`${lg.code}: scoreboard failed — ${err.message}`);
  }
}

if (!event) {
  console.log('\nNo finished match in the window. Nothing to probe.');
  process.exit(0);
}

console.log(`\n=== ${league} event ${event.id}: ${event.name} ===`);
const s = await get(`${BASE}/${league}/summary?event=${event.id}`);
console.log('top-level keys:', Object.keys(s).join(', '));

// Line-ups
const rosters = s.rosters || [];
console.log(`\nrosters: ${rosters.length} sides`);
for (const r of rosters) {
  const players = r.roster || [];
  console.log(`  ${r.homeAway} ${r.team?.displayName} formation=${r.formation} players=${players.length}`);
  const p = players[0];
  if (p) {
    console.log('    player keys:', Object.keys(p).join(', '));
    console.log('    sample:', JSON.stringify({
      starter: p.starter, jersey: p.jersey, formationPlace: p.formationPlace,
      pos: p.position?.abbreviation, name: p.athlete?.displayName,
      short: p.athlete?.shortName, subbed: p.subbedIn ?? p.subbedOut,
      stats: (p.stats || []).slice(0, 4).map((x) => `${x.abbreviation || x.name}=${x.value ?? x.displayValue}`),
      plays: (p.plays || []).length,
    }));
    const sub = players.find((x) => !x.starter);
    if (sub) console.log('    a sub:', sub.athlete?.displayName, 'subbedIn=', sub.subbedIn);
  }
}

// Team stats
const box = s.boxscore || {};
console.log(`\nboxscore keys: ${Object.keys(box).join(', ')}`);
for (const t of box.teams || []) {
  const stats = t.statistics || [];
  console.log(`  ${t.team?.displayName}: ${stats.length} stats`);
  console.log('    ' + stats.map((x) => `${x.name}=${x.displayValue}`).join(' | '));
}
if ((box.players || []).length) {
  const grp = box.players[0];
  console.log(`  boxscore.players[0] keys: ${Object.keys(grp).join(', ')}`);
  console.log(`    statistics groups: ${(grp.statistics || []).map((g) => `${g.name}(${(g.keys || g.labels || []).length} cols, ${(g.athletes || []).length} players)`).join(', ')}`);
  const g0 = (grp.statistics || [])[0];
  if (g0) {
    console.log('    labels:', JSON.stringify(g0.labels || g0.keys));
    const a0 = (g0.athletes || [])[0];
    if (a0) console.log('    athlete row:', a0.athlete?.displayName, JSON.stringify(a0.stats));
  }
}

// Key events
const ke = s.keyEvents || s.plays || [];
console.log(`\nkeyEvents: ${ke.length}`);
for (const e of ke.slice(0, 8)) {
  console.log('   ', JSON.stringify({
    clock: e.clock?.displayValue, type: e.type?.text, txt: e.text,
    scoring: e.scoringPlay, team: e.team?.id,
    athletes: (e.participants || e.athletesInvolved || []).map((a) => a.athlete?.displayName || a.displayName),
  }));
}
if (ke[0]) console.log('  keyEvent keys:', Object.keys(ke[0]).join(', '));

// Everything else we might use
for (const k of ['headToHeadGames', 'standings', 'gameInfo', 'article', 'videos', 'commentary', 'format', 'odds', 'predictor']) {
  const v = s[k];
  if (v == null) continue;
  console.log(`\n${k}: ${Array.isArray(v) ? `array(${v.length})` : `object{${Object.keys(v).join(',')}}`}`);
}
const gi = s.gameInfo || {};
if (gi.venue) console.log('  venue:', gi.venue.fullName, gi.venue.address?.city, 'capacity', gi.venue.capacity);
if (gi.attendance) console.log('  attendance:', gi.attendance);
