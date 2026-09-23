// The fixture pipeline with no React in it: the openfootball schedule, the
// ESPN months to ask for, turning a scoreboard into games, and laying those
// over the schedule. The app's hook, the CI checks and the worker's Monday
// recap all run this same code.
import { resolveClub } from './teamMatch.js';
import { parseLeagueTxt } from './leagueFeed.js';
import { computeMidseasonRanks, setMidseasonRanks } from './odds.js';

// Base schedule + settled results — openfootball plain-text feeds
export const SOURCES = [
  { div: 1, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt' },
  { div: 2, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt' },
];

// Live/in-play overlay — ESPN public scoreboard, no key needed. Best-effort:
// if it's down or empty the openfootball base data still stands.
export const ESPN_LEAGUES = [
  { div: 1, code: 'eng.1' },
  { div: 2, code: 'eng.2' },
];
export const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

// Which months to ask ESPN for.
//
// ESPN stopped accepting date ranges. dates=YYYYMMDD-YYYYMMDD now answers
//   400 {"code":400,"message":"Failed to get events endpoint."}
// for every span from three days to a month, on both the site and site.web
// hosts. It went from 200 to 400 between 2 and 19 September with no change at
// our end, and it took the live overlay down silently with it: results only
// appeared once openfootball backfilled, a day or two late.
//
// dates=YYYYMM still works and returns more than the range did — a whole month
// rather than a sliding window.
//
// Still reaching back about ten days, because openfootball backfills late and
// a settled match must not drop out of the app in the gap. Near the start of a
// month that means asking for the previous one too, hence a set.
//
// Exported so scripts/check-scores.mjs runs this exact function rather than a
// copy of it. A copy would drift, and the copy passing while the app starves
// is the failure this whole episode was.
export function espnMonths(now = Date.now()) {
  return [...new Set([-10, 0, 2].map((offset) => {
    const d = new Date(now + offset * 864e5);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }))];
}

// Merge ESPN live/final data over the base schedule. ESPN only ever upgrades a
// fixture that isn't already settled; if ESPN is empty, base wins.
export function mergeEspn(base, espnGames) {
  if (!espnGames.length) return base;
  return base.map((f) => {
    if (f.status === 'FINISHED') return f;
    const fTime = f.utcDate ? new Date(f.utcDate).getTime() : 0;
    const g = espnGames.find((g) =>
      g.div === f.division &&
      g.home === f.homeTeam.name &&
      g.away === f.awayTeam.name &&
      Math.abs(new Date(g.date).getTime() - fTime) < 3 * 24 * 3600 * 1000
    );
    if (!g) return f;

    // ESPN knows the confirmed kick-off; the league feed only knows the slot it
    // was pencilled into, and for a match still to be played that is the number
    // people are planning their evening around. Taken even for a fixture that
    // has not started, which is exactly when it matters — the scores below are
    // still only taken once there are scores to take.
    const withTime = g.date && g.date !== f.utcDate
      ? { ...f, utcDate: g.date, timeTBC: false }
      : f;

    if (g.state === 'pre') return withTime;
    if (g.homeScore == null || g.awayScore == null) return withTime;

    const finished = g.state === 'post';
    let winner = null;
    if (finished) {
      if (g.homeScore > g.awayScore) winner = 'HOME_TEAM';
      else if (g.awayScore > g.homeScore) winner = 'AWAY_TEAM';
      else winner = 'DRAW';
    }
    return {
      ...withTime,
      status: finished ? 'FINISHED' : 'IN_PLAY',
      liveClock: !finished ? g.clock : null,
      score: { home: g.homeScore, away: g.awayScore, winner },
    };
  });
}


// One ESPN scoreboard -> the games mergeEspn wants. Names ESPN uses that we
// can't place go into `unmatched`, so the app can say so.
export function espnGamesFrom(json, div, unmatched = []) {
  const out = [];
  for (const e of json?.events || []) {
    const comp = e.competitions && e.competitions[0];
    if (!comp) continue;
    const hc = (comp.competitors || []).find((c) => c.homeAway === 'home');
    const ac = (comp.competitors || []).find((c) => c.homeAway === 'away');
    if (!hc || !ac) continue;
    const rawHome = hc.team && hc.team.displayName;
    const rawAway = ac.team && ac.team.displayName;
    const home = resolveClub(rawHome);
    const away = resolveClub(rawAway);
    if (!home || !away) {
      if (!home && rawHome) unmatched.push(rawHome);
      if (!away && rawAway) unmatched.push(rawAway);
      continue;
    }
    out.push({
      div,
      home,
      away,
      date: e.date,
      state: e.status && e.status.type ? e.status.type.state : 'pre', // pre | in | post
      homeScore: hc.score != null && hc.score !== '' ? Number(hc.score) : null,
      awayScore: ac.score != null && ac.score !== '' ? Number(ac.score) : null,
      clock: e.status?.displayClock ? String(e.status.displayClock).replace(/'+$/, '') : null,
    });
  }
  return out;
}

// The whole thing in one go, for callers without the app's caching and
// retries (the worker). Prices are registered for the January re-rating the
// same way the app does it.
export async function loadFixtures(fetchImpl = fetch) {
  const base = [];
  for (const src of SOURCES) {
    try {
      const r = await fetchImpl(src.url);
      if (r.ok) base.push(...parseLeagueTxt(await r.text(), src.div));
    } catch { /* the other division still counts */ }
  }
  const games = [];
  for (const lg of ESPN_LEAGUES) {
    for (const month of espnMonths()) {
      try {
        const r = await fetchImpl(`${ESPN_BASE}/${lg.code}/scoreboard?dates=${month}`);
        if (r.ok) games.push(...espnGamesFrom(await r.json(), lg.div));
      } catch { /* base feed stands */ }
    }
  }
  const merged = mergeEspn(base, games);
  setMidseasonRanks(computeMidseasonRanks(merged));
  return merged;
}
