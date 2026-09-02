// Diagnostic: can we get injuries and team news from anywhere free?
//
// ESPN has been ruled out — no injuries key, no probable XIs, the dedicated
// endpoints 404 or return zero rows. This asks whether any other source is
// reachable and usable, so the answer is measured rather than assumed.
//
// Read-only, a handful of requests, runs in CI because the dev container has
// no egress. Nothing depends on it at runtime.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function probe(label, url, { headers = {}, json = true } = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html', ...headers },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - t0;
    if (!res.ok) { console.log(`  ${label.padEnd(26)} HTTP ${res.status}  ${ms}ms`); return null; }
    const body = json ? await res.json() : await res.text();
    const desc = json
      ? `keys: ${Object.keys(body).join(', ').slice(0, 120)}`
      : `${body.length} bytes of html`;
    console.log(`  ${label.padEnd(26)} OK ${String(ms).padStart(5)}ms  ${desc}`);
    return body;
  } catch (err) {
    console.log(`  ${label.padEnd(26)} ${err.name}: ${err.message.slice(0, 70)}`);
    return null;
  }
}

const day = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
console.log(`Looking for team news around ${day}\n`);

// ── Sofascore ───────────────────────────────────────────────────────────────
// The reference the app is modelled on. Their site runs off a public JSON API.
console.log('--- sofascore ---');
const sched = await probe('scheduled events', `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${day}`);
let sofaEvent = null;
if (sched?.events) {
  const pl = sched.events.filter((e) => e.tournament?.uniqueTournament?.id === 17);
  console.log(`      ${sched.events.length} events that day, ${pl.length} Premier League`);
  sofaEvent = pl[0] || sched.events[0];
  if (sofaEvent) {
    console.log(`      using ${sofaEvent.id}: ${sofaEvent.homeTeam?.name} v ${sofaEvent.awayTeam?.name}`);
    const lu = await probe('event lineups', `https://api.sofascore.com/api/v1/event/${sofaEvent.id}/lineups`);
    if (lu) console.log('      lineup keys:', Object.keys(lu).join(', '));
    const pre = await probe('event pregame-form', `https://api.sofascore.com/api/v1/event/${sofaEvent.id}/pregame-form`);
    if (pre) console.log('      form keys:', Object.keys(pre).join(', '));
    // the one that matters: who is out
    const miss = await probe('event missing players', `https://api.sofascore.com/api/v1/event/${sofaEvent.id}/missing-players`);
    if (miss?.missingPlayers) {
      console.log(`      missingPlayers: ${miss.missingPlayers.length}`);
      for (const m of miss.missingPlayers.slice(0, 5)) {
        console.log('       ', JSON.stringify({
          player: m.player?.name, pos: m.player?.position,
          type: m.type, reason: m.reason,
        }));
      }
      if (miss.missingPlayers[0]) console.log('        keys:', Object.keys(miss.missingPlayers[0]).join(','));
    }
  }
}

// ── FotMob ──────────────────────────────────────────────────────────────────
console.log('\n--- fotmob ---');
const fm = await probe('matches by date', `https://www.fotmob.com/api/matches?date=${day.replace(/-/g, '')}`);
if (fm?.leagues) {
  const pl = fm.leagues.find((l) => /premier league/i.test(l.name || ''));
  const m = pl?.matches?.[0];
  console.log(`      ${fm.leagues.length} leagues; PL match: ${m?.home?.name} v ${m?.away?.name} (${m?.id})`);
  if (m?.id) {
    const md = await probe('match details', `https://www.fotmob.com/api/matchDetails?matchId=${m.id}`);
    if (md?.content) console.log('      content keys:', Object.keys(md.content).join(', '));
  }
}

// ── Premier League's own site ───────────────────────────────────────────────
console.log('\n--- premierleague.com (pulselive) ---');
await probe('pulselive teams', 'https://footballapi.pulselive.com/football/teams?pageSize=100&comps=1', {
  headers: { Origin: 'https://www.premierleague.com', Referer: 'https://www.premierleague.com/' },
});

// ── Dedicated injury tables ─────────────────────────────────────────────────
console.log('\n--- injury tables (html) ---');
const pr = await probe('physioroom PL table', 'https://www.physioroom.com/injury-table/premier-league/', { json: false });
if (pr) {
  const rows = (pr.match(/<tr[\s>]/g) || []).length;
  const hasNames = /injur|doubt|return/i.test(pr);
  console.log(`      ~${rows} table rows, injury wording present: ${hasNames}`);
}
await probe('bbc football scores', 'https://www.bbc.co.uk/sport/football/premier-league/scores-fixtures', { json: false });
