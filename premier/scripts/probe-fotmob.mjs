// Diagnostic: does the deployed /epl/teamnews route actually answer, for real
// fixtures, in BOTH divisions?
//
// This is the end-to-end check rather than another look at the upstream. It
// asks the worker exactly what the app asks it, using club names straight out
// of our own fixture feed, so a name that fails to match upstream shows up here
// rather than as an empty card on somebody's phone.
//
// The Championship is the point. A first pass keyed on FotMob league ids found
// the Premier League and missed the second tier entirely, which is why the
// worker matches on club names across every league instead.

import { parseLeagueTxt } from '../src/utils/leagueFeed.js';
import { getTeam } from '../src/data/england2027.js';

const WORKER = 'https://worldcup.phil-remington.workers.dev';
const FEEDS = [
  { div: 1, name: 'Premier League', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt' },
  { div: 2, name: 'Championship', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt' },
];

const ymd = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

let anyFound = false;
for (const feed of FEEDS) {
  console.log(`\n=== ${feed.name} ===`);
  let fixtures;
  try {
    const txt = await (await fetch(feed.url)).text();
    fixtures = parseLeagueTxt(txt, feed.div);
  } catch (err) { console.log('  feed failed:', err.message); continue; }

  const now = Date.now();
  const upcoming = fixtures
    .filter((f) => f.status !== 'FINISHED' && f.utcDate && Date.parse(f.utcDate) > now)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .slice(0, 3);
  if (!upcoming.length) { console.log('  nothing upcoming'); continue; }

  for (const f of upcoming) {
    const q = new URLSearchParams({
      date: ymd(f.utcDate),
      home: f.homeTeam.name,
      homeShort: getTeam(f.homeTeam.name)?.short || f.homeTeam.name,
      away: f.awayTeam.name,
      awayShort: getTeam(f.awayTeam.name)?.short || f.awayTeam.name,
    });
    const label = `${getTeam(f.homeTeam.name)?.short} v ${getTeam(f.awayTeam.name)?.short}`;
    try {
      const res = await fetch(`${WORKER}/epl/teamnews?${q}`, { signal: AbortSignal.timeout(25000) });
      const d = await res.json();
      if (!d.found) { console.log(`  ${label.padEnd(28)} no line-up published yet`); continue; }
      anyFound = true;
      const out = (s) => (s?.out || []).length;
      console.log(`  ${label.padEnd(28)} ${d.kind}  `
        + `${d.home?.formation || '?'} v ${d.away?.formation || '?'}  `
        + `XI ${(d.home?.xi || []).length}/${(d.away?.xi || []).length}  `
        + `out ${out(d.home)}/${out(d.away)}`);
      for (const p of (d.home?.out || []).slice(0, 3)) {
        console.log(`      ${d.home.name}: ${p.name} (${p.type}${p.back ? `, back ${p.back}` : ''})`);
      }
      for (const p of (d.away?.out || []).slice(0, 3)) {
        console.log(`      ${d.away.name}: ${p.name} (${p.type}${p.back ? `, back ${p.back}` : ''})`);
      }
    } catch (err) {
      console.log(`  ${label.padEnd(28)} ${err.name}: ${err.message.slice(0, 50)}`);
    }
  }
}
console.log(anyFound ? '\nteam news is wired up' : '\nnothing came back — check the worker route');
