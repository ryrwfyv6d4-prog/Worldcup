// Diagnostic: exactly what FotMob gives us, for an UNPLAYED match, in both
// divisions.
//
// The team-news probe established that FotMob answers without a key or token:
//   www.fotmob.com/api/data/matches?date=YYYYMMDD
//   www.fotmob.com/api/data/matchDetails?matchId=N
// and that matchDetails.content carries matchFacts, lineup, stats, playerStats,
// shotmap, momentum, table and h2h.
//
// This one goes a level deeper: are the pre-match line-ups real, is there a
// team-news or injury block, and does the Championship come back too. Half our
// clubs are in the second tier, so a Premier-League-only source is no use.
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
const shape = (v) => (v == null ? 'absent'
  : Array.isArray(v) ? `array(${v.length})`
  : typeof v === 'object' ? `object{${Object.keys(v).join(',').slice(0, 150)}}`
  : `${typeof v} ${JSON.stringify(v).slice(0, 70)}`);

// Look a few days out so the matches are genuinely unplayed
for (const offset of [2, 3, 4]) {
  const d = new Date(Date.now() + offset * 864e5);
  const compact = d.toISOString().slice(0, 10).replace(/-/g, '');
  let day;
  try { day = await get(`https://www.fotmob.com/api/data/matches?date=${compact}`); }
  catch (err) { console.log(`${compact}: ${err.message}`); continue; }

  const names = (day.leagues || []).map((l) => `${l.name}${l.ccode ? ` (${l.ccode})` : ''}`);
  const eng = (day.leagues || []).filter((l) => /premier league|championship/i.test(l.name || '')
    && /eng/i.test(l.ccode || l.name || ''));
  console.log(`\n=== ${compact}: ${names.length} leagues ===`);
  console.log('  English tiers found:', eng.map((l) => `${l.name} [id ${l.id}] ${l.matches?.length} matches`).join(' | ') || 'none');

  for (const lg of eng) {
    const m = (lg.matches || []).find((x) => x.status?.started === false) || lg.matches?.[0];
    if (!m) continue;
    console.log(`\n  --- ${lg.name}: ${m.home?.name} v ${m.away?.name} (id ${m.id}) started=${m.status?.started} ---`);
    let md;
    try { md = await get(`https://www.fotmob.com/api/data/matchDetails?matchId=${m.id}`); }
    catch (err) { console.log('    matchDetails', err.message); continue; }

    const c = md.content || {};
    console.log('    content:', Object.keys(c).join(', '));

    // Line-ups before kick-off — the thing ESPN does not have
    const lu = c.lineup;
    console.log('    lineup:', shape(lu));
    if (lu) {
      for (const k of ['lineup', 'homeTeam', 'awayTeam', 'teamRatings', 'usingOptaLineup', 'usingEnetpulseLineup', 'bench', 'coachesOnly']) {
        if (lu[k] !== undefined) console.log(`      lineup.${k}:`, shape(lu[k]));
      }
      const side = (lu.lineup || [])[0] || lu.homeTeam;
      if (side) {
        console.log('      side keys:', Object.keys(side).join(',').slice(0, 160));
        console.log('      formation:', side.formation);
        const first = (side.players || [])?.flat?.()?.[0] || (side.players || [])[0];
        if (first) console.log('      player keys:', Object.keys(first).join(',').slice(0, 200));
      }
    }

    // Team news / injuries, wherever they hide
    const mf = c.matchFacts || {};
    console.log('    matchFacts:', Object.keys(mf).join(', ').slice(0, 200));
    for (const k of ['infoBox', 'teamForm', 'topPlayers', 'poll', 'injuries', 'momentum', 'highlights']) {
      if (mf[k] !== undefined) console.log(`      matchFacts.${k}:`, shape(mf[k]));
    }
    // the injury/suspension list is the whole point — hunt it anywhere in content
    const hunt = JSON.stringify(md);
    for (const word of ['injur', 'suspend', 'unavailab', 'doubtful', 'missingPlayers', 'sidelined']) {
      const n = (hunt.match(new RegExp(word, 'gi')) || []).length;
      if (n) console.log(`      "${word}" appears ${n}x in the payload`);
    }
    if (c.lineup?.unavailable) console.log('      unavailable:', JSON.stringify(c.lineup.unavailable).slice(0, 500));
  }
  break; // one day's worth is enough
}
