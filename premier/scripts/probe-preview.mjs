// Diagnostic: what is actually available BEFORE a match kicks off?
//
// The match sheet is good once a game is settled and thin before it. The
// question is whether team news — injuries, suspensions, probable line-ups —
// is reachable at all from a feed this app can use without a key.
//
// Probed rather than assumed. The dev container cannot reach ESPN, so this
// runs in CI. Nothing depends on it at runtime.

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues';
const WEB = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer';

const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const shape = (v) => (v == null ? 'absent'
  : Array.isArray(v) ? `array(${v.length})`
  : typeof v === 'object' ? `object{${Object.keys(v).join(',')}}`
  : `${typeof v} ${JSON.stringify(v).slice(0, 60)}`);

// ── Find the next unplayed fixture ──────────────────────────────────────────
const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const from = fmt(new Date());
const to = fmt(new Date(Date.now() + 10 * 864e5));

let event = null, league = null;
for (const code of ['eng.1', 'eng.2']) {
  try {
    const sb = await get(`${SITE}/${code}/scoreboard?dates=${from}-${to}`);
    const pre = (sb.events || []).filter((e) => e.status?.type?.state === 'pre');
    console.log(`${code}: ${pre.length} upcoming in the next 10 days`);
    if (pre.length && !event) { event = pre[0]; league = code; }
  } catch (err) { console.log(`${code}: ${err.message}`); }
}
if (!event) { console.log('\nNothing upcoming. Nothing to probe.'); process.exit(0); }

console.log(`\n=== ${league} ${event.id}: ${event.name} — ${event.date} ===`);

// ── What the summary carries pre-match ──────────────────────────────────────
const s = await get(`${SITE}/${league}/summary?event=${event.id}`);
console.log('\ntop-level keys:', Object.keys(s).join(', '));
for (const k of ['rosters', 'injuries', 'news', 'odds', 'pickcenter', 'predictor',
                 'leaders', 'standings', 'seasonseries', 'lastFiveGames', 'againstTheSpread',
                 'broadcasts', 'gameInfo', 'header', 'boxscore', 'commentary', 'keyEvents']) {
  console.log(`  ${k.padEnd(16)} ${shape(s[k])}`);
}

// Probable line-ups before kick-off?
console.log('\n--- rosters pre-match ---');
for (const r of s.rosters || []) {
  const players = r.roster || [];
  console.log(`  ${r.homeAway} ${r.team?.displayName} formation=${r.formation} players=${players.length}`);
  if (players[0]) console.log('    keys:', Object.keys(players[0]).join(','),
    '| sample:', players[0].athlete?.displayName, 'starter=', players[0].starter);
}

// The interesting one: does ESPN ship an injury list with the match?
console.log('\n--- injuries on the summary ---');
const inj = s.injuries;
if (Array.isArray(inj)) {
  for (const team of inj) {
    console.log(`  ${team.team?.displayName}: ${(team.injuries || []).length} listed`);
    for (const i of (team.injuries || []).slice(0, 4)) {
      console.log('    ', JSON.stringify({
        athlete: i.athlete?.displayName, pos: i.athlete?.position?.abbreviation,
        status: i.status, type: i.type?.description || i.type?.name,
        detail: i.details?.type, date: i.date,
      }));
    }
    if ((team.injuries || [])[0]) console.log('    keys:', Object.keys(team.injuries[0]).join(','));
  }
} else {
  console.log('  ', shape(inj));
}

// News and the odds/prediction blocks, which would carry a preview line
console.log('\n--- news ---');
for (const a of (s.news?.articles || []).slice(0, 4)) {
  console.log(`  [${a.type}] ${a.headline}`);
  if (a.description) console.log(`      ${a.description.slice(0, 140)}`);
}
console.log('\n--- odds[0] ---', shape((s.odds || [])[0]));
if ((s.odds || [])[0]) console.log('  ', JSON.stringify(s.odds[0]).slice(0, 400));
console.log('\n--- pickcenter[0] ---', shape((s.pickcenter || [])[0]));
console.log('\n--- leaders ---', shape(s.leaders));
if (Array.isArray(s.leaders) && s.leaders[0]) {
  console.log('  ', JSON.stringify(s.leaders[0]).slice(0, 400));
}

// ── Dedicated endpoints worth trying ────────────────────────────────────────
const comp = (event.competitions || [])[0];
const teamIds = (comp?.competitors || []).map((c) => c.team?.id).filter(Boolean);
console.log(`\n--- dedicated endpoints (team ids ${teamIds.join(', ')}) ---`);

const tries = [
  ['league injuries', `${CORE}/${league}/injuries`],
  ['team injuries', teamIds[0] && `${CORE}/${league}/teams/${teamIds[0]}/injuries`],
  ['team detail', teamIds[0] && `${SITE}/${league}/teams/${teamIds[0]}`],
  ['web summary', `${WEB}/${league}/summary?event=${event.id}`],
];
for (const [label, url] of tries) {
  if (!url) continue;
  try {
    const j = await get(url);
    console.log(`  ${label.padEnd(16)} OK  keys: ${Object.keys(j).join(', ').slice(0, 160)}`);
    if (j.items) console.log(`      items: ${j.items.length}  count: ${j.count}`);
    if (j.team?.injuries) console.log(`      team.injuries: ${shape(j.team.injuries)}`);
  } catch (err) {
    console.log(`  ${label.padEnd(16)} ${err.message}`);
  }
}
