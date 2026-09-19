// Diagnostic: ESPN's scoreboard started answering 400 and the live overlay is
// getting nothing. This finds a request shape it will accept.
//
// The app asks for a date RANGE (dates=YYYYMMDD-YYYYMMDD) and has done for
// months. It returned 200 as recently as the deploy on 2 September and returns
// 400 now, for both divisions, so something moved upstream rather than in our
// code. Each variation below is tried on eng.1 and reported with the count it
// came back with, so the fix is chosen from what actually works.
//
// Read-only. Nothing depends on it at runtime.

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ALT = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer';
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const day = (n) => ymd(new Date(Date.now() + n * 864e5));

async function attempt(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      // the body of a 400 usually says which parameter it disliked
      let why = '';
      try { why = (await res.text()).slice(0, 120).replace(/\s+/g, ' '); } catch { /* ignore */ }
      console.log(`  ${label.padEnd(34)} HTTP ${res.status}  ${why}`);
      return null;
    }
    const j = await res.json();
    const n = (j.events || []).length;
    const posts = (j.events || []).filter((e) => e.status?.type?.state === 'post').length;
    const newest = (j.events || [])
      .filter((e) => e.status?.type?.state === 'post')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    console.log(`  ${label.padEnd(34)} OK  ${String(n).padStart(3)} events, ${posts} finished`
      + (newest ? `, newest ${newest.date?.slice(0, 10)}` : ''));
    return j;
  } catch (err) {
    console.log(`  ${label.padEnd(34)} ${err.name}: ${err.message.slice(0, 60)}`);
    return null;
  }
}

for (const code of ['eng.1', 'eng.2']) {
  console.log(`\n=== ${code} ===`);
  await attempt('no params', `${BASE}/${code}/scoreboard`);
  await attempt('single day (today)', `${BASE}/${code}/scoreboard?dates=${day(0)}`);
  await attempt('single day (yesterday)', `${BASE}/${code}/scoreboard?dates=${day(-1)}`);
  await attempt('range 3d', `${BASE}/${code}/scoreboard?dates=${day(-3)}-${day(0)}`);
  await attempt('range 12d (what the app sends)', `${BASE}/${code}/scoreboard?dates=${day(-10)}-${day(1)}`);
  await attempt('range 28d', `${BASE}/${code}/scoreboard?dates=${day(-7)}-${day(21)}`);
  await attempt('range + limit', `${BASE}/${code}/scoreboard?dates=${day(-10)}-${day(1)}&limit=300`);
  await attempt('month form', `${BASE}/${code}/scoreboard?dates=${day(0).slice(0, 6)}`);
  await attempt('web host, range', `${ALT}/${code}/scoreboard?dates=${day(-10)}-${day(1)}`);
  await attempt('web host, no params', `${ALT}/${code}/scoreboard`);
}

// If single days work, that is a usable fallback: a fortnight is fourteen
// requests, cheap enough on a worker and once per app open.
console.log('\n--- walking single days, last 5 ---');
for (let i = -5; i <= 0; i++) {
  await attempt(`eng.2 ${day(i)}`, `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.2/scoreboard?dates=${day(i)}`);
}
