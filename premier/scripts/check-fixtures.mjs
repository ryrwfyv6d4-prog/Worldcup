// Run the REAL parser against the LIVE openfootball feeds and assert the
// things that have to be true. Exits non-zero when they are not.
//
// This exists because of a bug that ran for days in front of everyone. The
// parser had been written against an assumed line format and never checked
// against the actual file. openfootball puts the score at the end of the line,
// after the away team, so the away club came through as
// "Leeds United FC 0-1 (0-0)" and the match read as still to be played.
//
// Nothing threw. That is the whole problem: the output was well-formed and
// plausible — a string that looks like a club, a fixture that looks scheduled —
// so every automatic check passed and only a human reading the screen noticed.
// The old feed check curled the files and counted lines, which proved they
// downloaded and nothing else.
//
// So: parse the real thing, and assert what a human would have spotted.

import { parseLeagueTxt } from '../src/utils/leagueFeed.js';
import { TEAMS } from '../src/data/england2027.js';

const FEEDS = [
  { div: 1, label: 'Premier League', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt', expect: 380 },
  { div: 2, label: 'Championship', url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt', expect: 552 },
];

const KNOWN = new Set(TEAMS.map((t) => t.name));
let failures = 0;
const fail = (msg) => { failures += 1; console.log(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

for (const feed of FEEDS) {
  console.log(`\n=== ${feed.label} ===`);
  let txt;
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) { fail(`HTTP ${res.status}`); continue; }
    txt = await res.text();
  } catch (err) {
    fail(`fetch failed: ${err.message}`);
    continue;
  }

  const fixtures = parseLeagueTxt(txt, feed.div);
  console.log(`  ${fixtures.length} fixtures parsed`);

  // 1. The whole season is there. A format change usually drops the count.
  if (fixtures.length !== feed.expect) fail(`expected ${feed.expect} fixtures, parsed ${fixtures.length}`);
  else ok(`all ${feed.expect} fixtures`);

  // 2. Every club is one of ours, EXACTLY. This is the assertion that would
  //    have caught the original bug on the day the season started.
  const strays = [...new Set(fixtures.flatMap((f) => [f.homeTeam.name, f.awayTeam.name]))]
    .filter((n) => !KNOWN.has(n));
  if (strays.length) fail(`club names we do not know: ${strays.slice(0, 6).map((s) => JSON.stringify(s)).join(', ')}`);
  else ok('every club name resolves exactly');

  // 3. No name has picked up something that is not a name.
  const dirty = fixtures.filter((f) => /\d/.test(f.homeTeam.name) || /\d/.test(f.awayTeam.name));
  if (dirty.length) fail(`${dirty.length} club names contain digits, e.g. ${JSON.stringify(dirty[0].awayTeam.name)}`);
  else ok('no digits in any club name');

  // 4. Played matches are actually being detected. Once the season is under
  //    way a feed with results but zero FINISHED means the score is being
  //    missed — which is exactly how the bug scored everyone nil.
  const played = fixtures.filter((f) => f.status === 'FINISHED');
  const hasResults = /\d+-\d+/.test(txt);
  console.log(`  ${played.length} played`);
  if (hasResults && played.length === 0) fail('the feed contains scores but nothing parsed as played');
  else ok(hasResults ? `${played.length} results read` : 'no results in the feed yet');

  // 5. A played match must have both a score and a winner.
  const broken = played.filter((f) => f.score.home == null || f.score.away == null || !f.score.winner);
  if (broken.length) fail(`${broken.length} played matches missing a score or winner`);
  else if (played.length) ok('every played match has a score and a result');

  // 6. Both sides of every fixture are different clubs.
  const selfPlay = fixtures.filter((f) => f.homeTeam.name === f.awayTeam.name);
  if (selfPlay.length) fail(`${selfPlay.length} fixtures where a club plays itself`);
  else ok('no club plays itself');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
