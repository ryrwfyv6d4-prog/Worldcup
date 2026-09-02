// Diagnostic, round two: the exact shape of FotMob's team news, and whether
// the Championship comes back.
//
// Established so far, on an unplayed Premier League fixture:
//   lineup.homeTeam = {id,name,formation,starters,coach,unavailable,
//                      averageStarterAge,totalStarterMarketValue}
//   formation "4-2-3-1" on a match two days out, so these are probable XIs
//   "injur" 17x, "unavailab" 10x, "doubtful" 1x in the payload
//
// Two things still unknown, and both decide whether this is worth building on:
//   1. what a row of `unavailable` actually contains — a name is no use
//      without a reason
//   2. whether the Championship is covered. Only the Premier League came back
//      on the day probed, which was probably an international break rather
//      than a gap in coverage, but half our clubs are second tier so this
//      has to be checked, not assumed.
//
// Read-only. Nothing depends on it at runtime.

const H = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.fotmob.com/',
  'Accept-Language': 'en-GB,en;q=0.9',
};
const get = async (url) => {
  const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// FotMob league ids: 47 Premier League, 48 Championship
const WANT = { 47: 'Premier League', 48: 'Championship' };
const found = {};

console.log('Scanning the next 12 days for both English tiers\n');
for (let i = 0; i <= 12 && Object.keys(found).length < 2; i++) {
  const compact = new Date(Date.now() + i * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
  let day;
  try { day = await get(`https://www.fotmob.com/api/data/matches?date=${compact}`); }
  catch (err) { console.log(`  ${compact}  ${err.message}`); continue; }

  const hits = (day.leagues || []).filter((l) => WANT[l.id]);
  console.log(`  ${compact}  ${(day.leagues || []).length} leagues; `
    + (hits.map((l) => `${WANT[l.id]}:${l.matches?.length}`).join(' ') || 'neither tier'));
  for (const lg of hits) {
    if (found[lg.id]) continue;
    const m = (lg.matches || []).find((x) => x.status?.started === false);
    if (m) found[lg.id] = { league: lg, match: m };
  }
}

for (const [id, { match }] of Object.entries(found)) {
  console.log(`\n=== ${WANT[id]} — ${match.home?.name} v ${match.away?.name} (${match.id}) ===`);
  let md;
  try { md = await get(`https://www.fotmob.com/api/data/matchDetails?matchId=${match.id}`); }
  catch (err) { console.log('  matchDetails', err.message); continue; }

  const lu = md.content?.lineup;
  if (!lu) { console.log('  no lineup block'); continue; }
  console.log(`  lineupType=${lu.lineupType}  source=${lu.source}`);

  for (const side of ['homeTeam', 'awayTeam']) {
    const t = lu[side];
    if (!t) continue;
    const starters = t.starters || [];
    console.log(`  ${side}: ${t.name}  formation=${t.formation}  starters=${starters.length}`
      + `  unavailable=${(t.unavailable || []).length}`
      + `  avgAge=${t.averageStarterAge}  value=${t.totalStarterMarketValue}`);
    if (starters[0]) {
      console.log('    starter keys:', Object.keys(starters[0]).join(',').slice(0, 220));
      console.log('    sample:', JSON.stringify({
        name: starters[0].name, shirt: starters[0].shirtNumber,
        pos: starters[0].positionStringShort ?? starters[0].role,
usualPlayingPosition: starters[0].usualPlayingPositionId,
      }));
    }
    // the one that matters
    for (const u of (t.unavailable || []).slice(0, 6)) {
      console.log('    OUT:', JSON.stringify(u).slice(0, 320));
    }
    if ((t.unavailable || [])[0]) {
      console.log('    unavailable keys:', Object.keys(t.unavailable[0]).join(','));
    }
  }
}

if (!found[48]) {
  console.log('\nNo unplayed Championship fixture found in the window — coverage unconfirmed.');
}
