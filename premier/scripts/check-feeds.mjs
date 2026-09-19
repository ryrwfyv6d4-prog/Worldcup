// Diagnostic: prove the live-score integration works and that every club name
// ESPN uses resolves to one of ours. Runs in CI, where the network is open.
//
// Nothing depends on this at runtime — it exists so the ESPN wiring is verified
// before a match day rather than discovered broken on one.

import { resolveClub } from '../src/utils/teamMatch.js';
import { TEAMS } from '../src/data/england2027.js';

const LEAGUES = [
  { div: 1, code: 'eng.1', label: 'Premier League' },
  { div: 2, code: 'eng.2', label: 'Championship' },
];
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

let unresolved = 0;
let leaguesOk = 0;

for (const lg of LEAGUES) {
  console.log(`\n=== ${lg.label} (${lg.code}) ===`);

  // 1. Team list — the definitive test of name matching
  try {
    const res = await fetch(`${BASE}/${lg.code}/teams`, { signal: AbortSignal.timeout(20000) });
    console.log(`  teams endpoint: HTTP ${res.status}`);
    if (res.ok) {
      leaguesOk++;
      const json = await res.json();
      const teams = json?.sports?.[0]?.leagues?.[0]?.teams || [];
      console.log(`  ESPN lists ${teams.length} clubs`);
      const bad = [];
      for (const t of teams) {
        const name = t?.team?.displayName;
        const resolved = resolveClub(name);
        if (!resolved) bad.push(name);
      }
      if (bad.length) {
        unresolved += bad.length;
        console.log(`  ✗ UNRESOLVED (${bad.length}): ${bad.join(' | ')}`);
      } else {
        console.log('  ✓ every ESPN club name resolves to one of ours');
      }
      // Which of ours ESPN never mentions (relegated/promoted mismatches)
      const espnResolved = new Set(teams.map((t) => resolveClub(t?.team?.displayName)).filter(Boolean));
      const ourDiv = TEAMS.filter((t) => t.div === lg.div).map((t) => t.name);
      const missing = ourDiv.filter((n) => !espnResolved.has(n));
      if (missing.length) console.log(`  note: not in ESPN's list: ${missing.join(' | ')}`);
    }
  } catch (err) {
    console.log(`  ✗ teams endpoint failed: ${err.message}`);
  }

  // 2. Scoreboard — the endpoint the app actually polls
  try {
    const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const from = fmt(new Date(Date.now() - 7 * 864e5));
    const to = fmt(new Date(Date.now() + 21 * 864e5));
    const res = await fetch(`${BASE}/${lg.code}/scoreboard?dates=${from}-${to}`, { signal: AbortSignal.timeout(20000) });
    console.log(`  scoreboard endpoint: HTTP ${res.status}`);
    if (res.ok) {
      const json = await res.json();
      const events = json.events || [];
      console.log(`  ${events.length} fixtures in the ${from}-${to} window`);
      // The MOST RECENT results, not the oldest. "Last night's scores have not
      // come in" is only answerable by looking at last night, and printing the
      // front of the list showed a fortnight-old fixture every time.
      const recent = events
        .filter((e) => e.status?.type?.state === 'post')
        .sort((x, y) => (y.date || '').localeCompare(x.date || ''))
        .slice(0, 4);
      console.log(`  ${recent.length ? 'most recent results ESPN is serving:' : 'no finished fixtures in the window'}`);
      for (const e of recent) {
        const c = e.competitions?.[0];
        const hc = c?.competitors?.find((x) => x.homeAway === 'home');
        const ac = c?.competitors?.find((x) => x.homeAway === 'away');
        const h = hc?.team?.displayName, a = ac?.team?.displayName;
        const score = hc?.score != null && ac?.score != null ? `${hc.score}-${ac.score}` : 'NO SCORE';
        const age = ((Date.now() - Date.parse(e.date)) / 3600e3).toFixed(0);
        console.log(`    ${e.date?.slice(0, 10)}  ${h} ${score} ${a}`
          + `  [${resolveClub(h) ? 'ok' : 'UNRESOLVED'}/${resolveClub(a) ? 'ok' : 'UNRESOLVED'}]  ${age}h ago`);
      }
    }
  } catch (err) {
    console.log(`  ✗ scoreboard failed: ${err.message}`);
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`RESULT: ${leaguesOk}/2 leagues reachable, ${unresolved} unresolved club names`);
console.log(leaguesOk === 2 && unresolved === 0
  ? 'Live scores are wired up correctly.'
  : 'Needs attention — see above.');
process.exit(0);
