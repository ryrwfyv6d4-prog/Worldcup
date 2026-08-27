import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { resolveClub } from '../utils/teamMatch.js';
import { TEAMS } from '../data/england2027.js';
import { computeMidseasonRanks, setMidseasonRanks } from '../utils/odds.js';
import { parseLeagueTxt } from '../utils/leagueFeed.js';

// Base schedule + settled results — openfootball plain-text feeds
const SOURCES = [
  { div: 1, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt' },
  { div: 2, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt' },
];

// Live/in-play overlay — ESPN public scoreboard, no key needed. Best-effort:
// if it's down or empty the openfootball base data still stands.
const ESPN_LEAGUES = [
  { div: 1, code: 'eng.1' },
  { div: 2, code: 'eng.2' },
];
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

// Bumped whenever the parser changes shape. Fixtures are cached ALREADY
// PARSED, so a parser fix does nothing for anyone still holding a good-looking
// cache entry written by the old one — which is exactly what happened when the
// away team was coming through with the score stuck to it.
const CACHE_KEY = 'epl_fixtures_cache_v3';
const CACHE_TTL = 30 * 60 * 1000;

// Merge ESPN live/final data over the base schedule. ESPN only ever upgrades a
// fixture that isn't already settled; if ESPN is empty, base wins.
function mergeEspn(base, espnGames) {
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
    if (!g || g.state === 'pre') return f;
    if (g.homeScore == null || g.awayScore == null) return f;

    const finished = g.state === 'post';
    let winner = null;
    if (finished) {
      if (g.homeScore > g.awayScore) winner = 'HOME_TEAM';
      else if (g.awayScore > g.homeScore) winner = 'AWAY_TEAM';
      else winner = 'DRAW';
    }
    return {
      ...f,
      status: finished ? 'FINISHED' : 'IN_PLAY',
      liveClock: !finished ? g.clock : null,
      score: { home: g.homeScore, away: g.awayScore, winner },
    };
  });
}

// Cached fixtures are only worth keeping if every club in them is still a club
// we recognise. Bumping the key fixes today's stale data; this makes any future
// bad parse throw itself away on the next read instead of sitting on someone's
// phone looking plausible.
const KNOWN_CLUBS = new Set(TEAMS.map((t) => t.name));

function cacheLooksSane(fixtures) {
  if (!Array.isArray(fixtures) || !fixtures.length) return false;
  for (const f of fixtures) {
    const h = f?.homeTeam?.name, a = f?.awayTeam?.name;
    // Deliberately an exact check rather than resolveClub: the parser pins
    // every name to canonical before caching, so anything that is merely
    // resolvable — "Coventry City FC 3-0 (2-0)" still finds Coventry — came
    // from an older parser and the whole entry has to go.
    if (!KNOWN_CLUBS.has(h) || !KNOWN_CLUBS.has(a)) return false;
  }
  return true;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts >= CACHE_TTL) return null;
    if (!cacheLooksSane(data && data.fixtures)) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { ...data, ts };
  } catch { /* ignore */ }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore */ }
}

export function useEnglandFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [espnGames, setEspnGames] = useState([]);
  // monotonic counters so a late reply cannot clobber a newer one
  const espnStartedRef = useRef(0);
  const espnSeqRef = useRef(0);
  const [espnState, setEspnState] = useState({ ok: null, unmatched: [], count: 0, ts: null });
  const lastEspnRef = useRef(0);
  const mergedRef = useRef([]);

  const fetchEspn = useCallback(async () => {
    const seq = ++espnStartedRef.current;
    const fmt = (dt) => dt.toISOString().slice(0, 10).replace(/-/g, '');
    // Look back ten days, not one. openfootball backfills results a day or two
    // late, and without the overlap a settled match would drop out of the app
    // between ESPN's window closing and the league feed catching up.
    const from = fmt(new Date(Date.now() - 10 * 864e5));
    const to = fmt(new Date(Date.now() + 36 * 3600 * 1000));
    const unmatched = [];
    const games = [];
    let anyOk = false;

    for (const lg of ESPN_LEAGUES) {
      try {
        const res = await fetch(`${ESPN_BASE}/${lg.code}/scoreboard?dates=${from}-${to}`);
        if (!res.ok) continue;
        anyOk = true;
        const json = await res.json();
        for (const e of json.events || []) {
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
          games.push({
            div: lg.div,
            home,
            away,
            date: e.date,
            state: e.status && e.status.type ? e.status.type.state : 'pre', // pre | in | post
            homeScore: hc.score != null && hc.score !== '' ? Number(hc.score) : null,
            awayScore: ac.score != null && ac.score !== '' ? Number(ac.score) : null,
            clock: e.status?.displayClock ? String(e.status.displayClock).replace(/'+$/, '') : null,
          });
        }
      } catch { /* per-league best effort */ }
    }

    // Two scoreboard fetches can be in flight at once (the interval and a
    // tab-back). Applying whichever finishes last would let a slower earlier
    // response overwrite a newer scoreline, so a stale one is dropped.
    if (seq < espnSeqRef.current) return;
    espnSeqRef.current = seq;

    setEspnGames(games);
    setEspnState({
      ok: anyOk,
      unmatched: [...new Set(unmatched)],
      count: games.length,
      ts: Date.now(),
    });
    lastEspnRef.current = Date.now();
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setFixtures(cached.fixtures || []);
        setLastFetched(cached.ts);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        SOURCES.map(async (s) => {
          const res = await fetch(s.url);
          if (!res.ok) throw new Error(`Feed failed for division ${s.div} (${res.status})`);
          return parseLeagueTxt(await res.text(), s.div);
        })
      );
      const all = results.flat();
      // A format change upstream parses to nothing without throwing, and the
      // app then showed empty tables with no error and no Retry.
      if (!all.length) throw new Error('The fixture feed parsed to nothing. Retry, or check the feed.');
      // Only write what the reader would accept back. Caching an entry the
      // sanity check rejects means it is binned on every cold start and the
      // 30-minute TTL never actually saves a fetch.
      if (cacheLooksSane(all)) writeCache({ fixtures: all });
      setFixtures(all);
      setLastFetched(Date.now());
    } catch (err) {
      // Sandboxed/offline builds carry a baked-in fixture snapshot
      if (Array.isArray(window.__EPL_SNAPSHOT__)) {
        setFixtures(window.__EPL_SNAPSHOT__);
        setLastFetched(window.__EPL_SNAPSHOT_TS__ || null);
      } else {
        setError(err.message === 'Failed to fetch'
          ? 'Network error – check your connection and try again.'
          : err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchEspn(); }, [fetchData, fetchEspn]);

  // Poll ESPN only around kick-offs, only while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const nearGame = mergedRef.current.some((f) => {
        if (!f.utcDate || f.status === 'FINISHED') return false;
        const t = new Date(f.utcDate).getTime();
        return now > t - 15 * 60 * 1000 && now < t + 3 * 3600 * 1000;
      });
      if (!nearGame) return;
      if (now - lastEspnRef.current > 55 * 1000) fetchEspn();
    }, 30 * 1000);
    const onVisible = () => {
      // Same throttle the interval uses. Without it, tabbing in and out during
      // a match fired overlapping scoreboard fetches.
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastEspnRef.current > 55 * 1000) fetchEspn();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchEspn]);

  const merged = useMemo(() => mergeEspn(fixtures, espnGames), [fixtures, espnGames]);
  mergedRef.current = merged;

  // Register the January re-rating before any component prices a fixture.
  // useMemo runs during this hook's render, which is above every consumer.
  useMemo(() => { setMidseasonRanks(computeMidseasonRanks(merged)); }, [merged]);

  return {
    fixtures: merged,
    loading,
    error,
    lastFetched,
    espnState,
    refresh: () => Promise.all([fetchData(true), fetchEspn()]),
  };
}
