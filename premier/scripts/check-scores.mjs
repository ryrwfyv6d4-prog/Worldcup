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

console.log('──────────────────────────────────────────');
if (scoreboardFail) {
  console.log(`NEEDS ATTENTION — ${scoreboardFail} scoreboard request(s) failed. `
    + 'The live overlay is degraded; results will lag until the league feed backfills.');
} else if (problems) {
  console.log(`NEEDS ATTENTION — ${problems} fixture(s) finished hours ago and still show no score. `
    + 'ESPN answered, so either the club names stopped matching or the merge is wrong.');
} else {
  console.log('The app is showing recent results correctly.');
}
process.exit(0);
