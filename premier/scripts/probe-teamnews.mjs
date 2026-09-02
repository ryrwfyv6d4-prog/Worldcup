// Diagnostic: can we get injuries and team news from anywhere free?
//
// Round two. The first pass had two wrong URLs, so FotMob and physioroom came
// back 404 and were wrongly read as dead. This corrects them, tries Sofascore
// again with fuller browser headers, and digs into the Premier League's own
// API rather than just pinging it.
//
// Worth knowing when reading the results: this runs on GitHub's Azure ranges,
// which sites block far more aggressively than most. A 403 here is evidence
// but not proof — a Cloudflare Worker calls from different addresses.
//
// Read-only. Nothing depends on it at runtime.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// A fuller set, closer to what a real browser sends
const BROWSER = {
  'User-Agent': UA,
  'Accept-Language': 'en-GB,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

async function probe(label, url, { headers = {}, json = true } = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER, Accept: json ? 'application/json' : 'text/html,*/*', ...headers },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - t0;
    const body = res.ok ? (json ? await res.json() : await res.text()) : null;
    const desc = !res.ok ? '' : json
      ? `keys: ${Object.keys(body).join(', ').slice(0, 130)}`
      : `${body.length} bytes`;
    console.log(`  ${label.padEnd(28)} ${res.ok ? 'OK ' : `HTTP ${res.status}`} ${String(ms).padStart(5)}ms  ${desc}`);
    return body;
  } catch (err) {
    console.log(`  ${label.padEnd(28)} ${err.name}: ${err.message.slice(0, 60)}`);
    return null;
  }
}

const d = new Date(Date.now() + 2 * 864e5);
const iso = d.toISOString().slice(0, 10);
const compact = iso.replace(/-/g, '');
console.log(`Team news around ${iso}\n`);

// ── Sofascore, with browser headers and a referer ───────────────────────────
console.log('--- sofascore (retry with full headers) ---');
const sofaHdr = { Referer: 'https://www.sofascore.com/', Origin: 'https://www.sofascore.com' };
const sched = await probe('api scheduled-events', `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${iso}`, { headers: sofaHdr });
// the www host proxies the same API and is sometimes treated differently
const schedWww = sched || await probe('www proxy scheduled-events', `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${iso}`, { headers: sofaHdr });
const events = (sched || schedWww)?.events;
if (events) {
  const pl = events.filter((e) => e.tournament?.uniqueTournament?.id === 17);
  const ev = pl[0] || events[0];
  console.log(`      ${events.length} events, ${pl.length} Premier League — using ${ev?.id}`);
  if (ev?.id) {
    const miss = await probe('missing players', `https://api.sofascore.com/api/v1/event/${ev.id}/lineups`, { headers: sofaHdr });
    if (miss) console.log('      keys:', Object.keys(miss).join(', '));
  }
}

// ── FotMob, corrected paths ─────────────────────────────────────────────────
console.log('\n--- fotmob (corrected paths) ---');
const fmHdr = { Referer: 'https://www.fotmob.com/' };
let fm = await probe('api/data/matches', `https://www.fotmob.com/api/data/matches?date=${compact}`, { headers: fmHdr });
if (!fm) fm = await probe('api/matches (legacy)', `https://www.fotmob.com/api/matches?date=${compact}&timezone=Europe%2FLondon`, { headers: fmHdr });
const league = fm?.leagues?.find((l) => /premier league/i.test(l.name || ''));
const match = league?.matches?.[0];
if (match) {
  console.log(`      PL: ${match.home?.name} v ${match.away?.name} (${match.id})`);
  for (const path of ['api/data/matchDetails', 'api/matchDetails']) {
    const md = await probe(path, `https://www.fotmob.com/${path}?matchId=${match.id}`, { headers: fmHdr });
    if (md?.content) { console.log('      content keys:', Object.keys(md.content).join(', ')); break; }
  }
}

// ── The Premier League's own API — does it carry team news? ─────────────────
console.log('\n--- premierleague.com (pulselive) ---');
const plHdr = { Origin: 'https://www.premierleague.com', Referer: 'https://www.premierleague.com/' };
const teams = await probe('teams', 'https://footballapi.pulselive.com/football/teams?pageSize=100&comps=1', { headers: plHdr });
if (teams?.content?.[0]) {
  console.log('      team keys:', Object.keys(teams.content[0]).join(', ').slice(0, 140));
}
await probe('fixtures', 'https://footballapi.pulselive.com/football/fixtures?comps=1&pageSize=10&sort=asc&statuses=U', { headers: plHdr });

// ── Injury tables ───────────────────────────────────────────────────────────
console.log('\n--- injury tables ---');
for (const [label, url] of [
  ['physioroom home', 'https://www.physioroom.com/'],
  ['physioroom epl', 'https://www.physioroom.com/injuries/premier-league/'],
  ['sportsgambler', 'https://www.sportsgambler.com/injuries/football/england-premier-league/'],
]) {
  const html = await probe(label, url, { json: false });
  if (html) {
    const hit = /injur/i.test(html);
    const rows = (html.match(/<tr[\s>]/g) || []).length;
    console.log(`      injury wording: ${hit}, ${rows} table rows`);
  }
}
