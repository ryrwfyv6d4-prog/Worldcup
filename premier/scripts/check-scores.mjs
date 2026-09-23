// Does the APP show last night's results?
//
// Not "is ESPN up" — the club-list endpoint answered 200 all the way through
// the September outage while the scoreboard returned 400 and the app had no
// live scores for days. A check that watches the wrong thing is worse than
// none, because it goes green and you stop looking.
//
// So this runs the real pipeline: the same openfootball parse, the same
// espnMonths(), the same mergeEspn() the app imports. Not a copy of them — a
// copy drifts, and a copy passing while the app starves is exactly what
// happened. If this says a fixture is settled, the app says so too.

import { parseLeagueTxt } from '../src/utils/leagueFeed.js';
import { resolveClub } from '../src/utils/teamMatch.js';
import { getTeam } from '../src/data/england2027.js';
import { espnMonths, mergeEspn, ESPN_BASE, ESPN_LEAGUES } from '../src/hooks/useEnglandFixtures.js';
import { leagueTable } from '../src/utils/scoring.js';
import { loadDetail } from '../src/hooks/useMatchDetail.js';

const SOURCES = [
  { div: 1, name: 'Premier League', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt' },
  { div: 2, name: 'Championship', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt' },
];

// ── The base schedule, exactly as the app parses it ─────────────────────────
let base = [];
for (const s of SOURCES) {
  try {
    const txt = await (await fetch(s.url, { signal: AbortSignal.timeout(20000) })).text();
    base.push(...parseLeagueTxt(txt, s.div));
  } catch (err) {
    console.log(`league feed for division ${s.div} failed: ${err.message}`);
  }
}
console.log(`base schedule: ${base.length} fixtures`);

// ── The live overlay, exactly as the app fetches it ─────────────────────────
const months = espnMonths();
console.log(`asking ESPN for: ${months.join(', ')}\n`);

const games = [];
let scoreboardFail = 0;
for (const lg of ESPN_LEAGUES) {
  for (const month of months) {
    try {
      const res = await fetch(`${ESPN_BASE}/${lg.code}/scoreboard?dates=${month}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        scoreboardFail += 1;
        console.log(`  ${lg.code} ${month}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      for (const e of json.events || []) {
        const c = (e.competitions || [])[0];
        if (!c) continue;
        const hc = (c.competitors || []).find((x) => x.homeAway === 'home');
        const ac = (c.competitors || []).find((x) => x.homeAway === 'away');
        const home = resolveClub(hc?.team?.displayName);
        const away = resolveClub(ac?.team?.displayName);
        if (!home || !away) continue;
        games.push({
          div: lg.div, home, away, date: e.date,
          state: e.status?.type?.state || 'pre',
          homeScore: hc.score != null && hc.score !== '' ? Number(hc.score) : null,
          awayScore: ac.score != null && ac.score !== '' ? Number(ac.score) : null,
          clock: null,
        });
      }
    } catch (err) {
      scoreboardFail += 1;
      console.log(`  ${lg.code} ${month}: ${err.message}`);
    }
  }
}
console.log(`overlay: ${games.length} events from ESPN, ${scoreboardFail} failed request(s)\n`);

// ── What the app would actually render ──────────────────────────────────────
const merged = mergeEspn(base, games);
const now = Date.now();
const WINDOW = 3 * 864e5;

let problems = 0;
for (const s of SOURCES) {
  const recent = merged
    .filter((f) => f.division === s.div && f.utcDate
      && Date.parse(f.utcDate) < now && Date.parse(f.utcDate) > now - WINDOW)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate));

  console.log(`=== ${s.name}: ${recent.length} fixture(s) kicked off in the last 3 days ===`);
  if (!recent.length) { console.log('  (none — quiet spell, nothing to check)\n'); continue; }

  for (const f of recent) {
    const h = getTeam(f.homeTeam.name)?.short || f.homeTeam.name;
    const a = getTeam(f.awayTeam.name)?.short || f.awayTeam.name;
    const age = ((now - Date.parse(f.utcDate)) / 3600e3).toFixed(0);
    if (f.status === 'FINISHED' && f.score?.home != null) {
      console.log(`  ✓ ${h} ${f.score.home}-${f.score.away} ${a}   (${age}h ago)`);
    } else if (f.status === 'IN_PLAY') {
      console.log(`  · ${h} ${f.score.home}-${f.score.away} ${a}   in play`);
    } else {
      // A match that kicked off more than four hours ago and still has no
      // score is the symptom this check exists for.
      const stale = Number(age) > 4;
      if (stale) problems += 1;
      console.log(`  ${stale ? '✗' : '·'} ${h} v ${a}   NO SCORE after ${age}h`);
    }
  }
  console.log('');
}

// ── The tables every other screen is built from ────────────────────────────
//
// The Clubs tab, the match sheet's Table tab and the whole sweep ladder are
// all derived from these. If the fixtures are right the tables are right, so
// printing the top of each is the cheapest way to see the chain end to end —
// and a table stuck a week behind is obvious at a glance in a way that a
// fixture list is not.
let tableProblems = 0;
for (const s2 of SOURCES) {
  const table = leagueTable(merged, s2.div, 'all');
  const played = table.reduce((n, r) => n + r.p, 0) / 2;
  const maxP = Math.max(...table.map((r) => r.p));
  console.log(`=== ${s2.name} table — ${played} matches played, leaders ===`);
  for (const r of table.slice(0, 4)) {
    console.log(`  ${String(table.indexOf(r) + 1).padStart(2)}  ${(getTeam(r.team)?.short || r.team).padEnd(13)}`
      + ` P${String(r.p).padStart(2)}  W${r.w} D${r.d} L${r.l}  GD ${r.gd > 0 ? '+' : ''}${r.gd}  ${String(r.pts).padStart(2)}pts`);
  }
  // Every club having played nothing means the chain is broken upstream, not
  // that the season has not started — the fixture list above would be empty too.
  if (maxP === 0 && merged.some((f) => f.division === s2.div && Date.parse(f.utcDate) < now)) {
    tableProblems += 1;
    console.log('  ✗ nobody has played a game, yet fixtures have kicked off');
  }
  console.log('');
}

// ── The match centre ───────────────────────────────────────────────────────
//
// The match sheet does its own ESPN lookup (scoreboard to find the event,
// then the summary). When ESPN dropped date ranges the fixtures recovered
// and the match centre stayed blank, because nothing here looked at it.
// Open the newest finished match in each division exactly as the app does.
let detailProblems = 0;
for (const s3 of SOURCES) {
  const f = merged
    .filter((x) => x.division === s3.div && x.status === 'FINISHED' && x.utcDate)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))[0];
  if (!f) continue;
  const label = `${getTeam(f.homeTeam.name)?.short || f.homeTeam.name} v ${getTeam(f.awayTeam.name)?.short || f.awayTeam.name}`;
  try {
    const d = await loadDetail(f, AbortSignal.timeout(30000));
    if (!d?.found) { detailProblems += 1; console.log(`  ✗ ${s3.name} match centre: ${label} not found on ESPN`); continue; }
    const stats = (d.statGroups || []).reduce((n, g) => n + (g.rows || []).length, 0);
    console.log(`  ✓ ${s3.name} match centre: ${label}, ${stats} stat rows, ${(d.events || []).length} events, line-ups ${d.lineups ? 'yes' : 'no'}`);
  } catch (err) {
    detailProblems += 1;
    console.log(`  ✗ ${s3.name} match centre: ${label} failed: ${err.message}`);
  }
}
console.log('');

// ── FotMob via the worker: line-ups with ratings, stats by half ───────────
// The worker deploys earlier in the same run, so this is the live route.
const WORKER = 'https://worldcup.phil-remington.workers.dev';
const ymdUTC = (iso) => iso.slice(0, 10).replace(/-/g, '');
let fmProblems = 0;
for (const s4 of SOURCES) {
  const f = merged
    .filter((x) => x.division === s4.div && x.status === 'FINISHED' && x.utcDate)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))[0];
  if (!f) continue;
  const q = new URLSearchParams({
    date: ymdUTC(f.utcDate),
    home: f.homeTeam.name, homeShort: getTeam(f.homeTeam.name)?.short || f.homeTeam.name,
    away: f.awayTeam.name, awayShort: getTeam(f.awayTeam.name)?.short || f.awayTeam.name,
  });
  const label = `${getTeam(f.homeTeam.name)?.short} v ${getTeam(f.awayTeam.name)?.short}`;
  try {
    const d = await (await fetch(`${WORKER}/epl/matchstats?${q}`, { signal: AbortSignal.timeout(30000) })).json();
    if (!d.found) { fmProblems += 1; console.log(`  ✗ ${s4.name} FotMob: ${label} not found`); continue; }
    const placed = (t) => (t?.xi || []).filter((p) => p.x != null && p.y != null).length;
    const rated = (t) => (t?.xi || []).filter((p) => p.rating != null).length;
    const xg = d.periods?.[0]?.groups?.[0]?.rows?.find((r) => r.key === 'expected_goals');
    const mom = (d.momentum || []).reduce((n, m) => n + m.v, 0);
    console.log(`  ✓ ${s4.name} FotMob: ${label} ${d.home?.formation} v ${d.away?.formation}, `
      + `placed ${placed(d.home)}/${placed(d.away)}, rated ${rated(d.home)}/${rated(d.away)}, `
      + `${d.periods?.length} periods, ${Object.keys(d.players || {}).length} players, ${d.shots?.length} shots`);
    // Which way the momentum graph runs: positive should be the home side
    console.log(`      xG ${xg?.home}-${xg?.away}, possession ${d.periods?.[0]?.groups?.[0]?.rows?.[0]?.home}-${d.periods?.[0]?.groups?.[0]?.rows?.[0]?.away}, `
      + `momentum sum ${mom > 0 ? '+' : ''}${mom} (${mom > 0 ? 'home' : 'away'} on top)`);
    if (placed(d.home) < 11 || placed(d.away) < 11) fmProblems += 1;
  } catch (err) {
    fmProblems += 1;
    console.log(`  ✗ ${s4.name} FotMob: ${label} failed: ${err.message}`);
  }
}
console.log('');

// ── Goal alerts: the worker's public key is what phones subscribe with ────
try {
  const k = await (await fetch(`${WORKER}/epl/push/key`, { signal: AbortSignal.timeout(20000) })).json();
  console.log(k.publicKey && k.publicKey.length > 80 ? '  ✓ goal alerts: worker key ready' : `  ✗ goal alerts: no key (${JSON.stringify(k).slice(0, 80)})`);
} catch (err) {
  console.log(`  ✗ goal alerts: key route failed: ${err.message}`);
}
console.log('');

console.log('──────────────────────────────────────────');
if (fmProblems) {
  console.log(`NEEDS ATTENTION — FotMob line-ups/stats missing for ${fmProblems} match(es); the match sheet falls back to ESPN.`);
}
if (detailProblems) {
  console.log(`NEEDS ATTENTION — the match centre could not load ${detailProblems} finished match(es).`);
}
if (scoreboardFail) {
  console.log(`NEEDS ATTENTION — ${scoreboardFail} scoreboard request(s) failed. `
    + 'The live overlay is degraded; results will lag until the league feed backfills.');
} else if (tableProblems) {
  console.log(`NEEDS ATTENTION — ${tableProblems} league table(s) empty despite played fixtures.`);
} else if (problems) {
  console.log(`NEEDS ATTENTION — ${problems} fixture(s) finished hours ago and still show no score. `
    + 'ESPN answered, so either the club names stopped matching or the merge is wrong.');
} else {
  console.log('The app is showing recent results correctly.');
}
process.exit(0);
