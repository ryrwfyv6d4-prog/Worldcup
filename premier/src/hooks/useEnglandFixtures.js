import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TEAMS } from '../data/england2027.js';
import { computeMidseasonRanks, setMidseasonRanks } from '../utils/odds.js';
import { parseLeagueTxt } from '../utils/leagueFeed.js';

import {
  SOURCES, ESPN_LEAGUES, ESPN_BASE, espnMonths, mergeEspn, espnGamesFrom,
} from '../utils/fixturesCore.js';

// The feed plumbing lives in utils/fixturesCore.js so the worker (Monday
// recap) and the CI checks run exactly the same code as the app.
export { ESPN_BASE, ESPN_LEAGUES, espnMonths, mergeEspn };

// Bumped whenever the parser changes shape. Fixtures are cached ALREADY
// PARSED, so a parser fix does nothing for anyone still holding a good-looking
// cache entry written by the old one — which is exactly what happened when the
// away team was coming through with the score stuck to it.
// v4: the parser now carries a slot's kick-off time down to the matches under
// it. A cache written by v3 holds the old wrong times, and it would be served
// happily because the club names in it are still valid — which is how stale
// fixture data survived a parser fix once already.
const CACHE_KEY = 'epl_fixtures_cache_v4';
const CACHE_TTL = 30 * 60 * 1000;

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
  const lastFetchRef = useRef(0);
  const mergedRef = useRef([]);

  const fetchEspn = useCallback(async () => {
    const seq = ++espnStartedRef.current;
    const months = espnMonths();
    const unmatched = [];
    const games = [];
    const answered = new Set();

    for (const lg of ESPN_LEAGUES) {
      let monthsOk = 0;
      for (const month of months) {
      // One retry, because a single blip used to cost a division its scores
      // until somebody happened to reopen the app.
      for (let attempt = 0; attempt < 2; attempt++) {
        // Collected per attempt and only committed once the whole response has
        // parsed. Pushing straight into `games` meant a parse that threw part
        // way through left half a division behind, and the retry then added it
        // all over again.
        const mine = [];
        try {
          const res = await fetch(`${ESPN_BASE}/${lg.code}/scoreboard?dates=${month}`);
          if (!res.ok) continue;
          const json = await res.json();
          mine.push(...espnGamesFrom(json, lg.div, unmatched));
          games.push(...mine);
          monthsOk += 1;
          break;
        } catch { /* try once more, then leave this month alone */ }
      }
      }
      // Only counts as answered if every month it needed came back. A division
      // that got half its window keeps its old rows as a backstop below.
      if (monthsOk === months.length) answered.add(lg.div);
    }

    // Two scoreboard fetches can be in flight at once (the interval and a
    // tab-back). Applying whichever finishes last would let a slower earlier
    // response overwrite a newer scoreline, so a stale one is dropped.
    if (seq < espnSeqRef.current) return;
    espnSeqRef.current = seq;

    // A division that did not answer keeps whatever it last had. Replacing the
    // whole overlay meant one failed request on eng.2 silently deleted every
    // Championship score in the app — and since openfootball backfills a day or
    // two late, there was nothing else holding them. The Premier League looked
    // fine throughout, which is exactly how it went unnoticed.
    // Fresh rows go first: the merge takes the first match it finds, so a new
    // scoreline always beats the kept-back copy of the same fixture.
    setEspnGames((prev) => (
      answered.size === ESPN_LEAGUES.length
        ? games
        : [...games, ...prev.filter((g) => !answered.has(g.div))]
    ));
    setEspnState({
      ok: answered.size > 0,
      divisions: [...answered],
      missing: ESPN_LEAGUES.filter((l) => !answered.has(l.div)).map((l) => l.code),
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
        lastFetchRef.current = cached.ts;
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
      lastFetchRef.current = Date.now();
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
        // The window used to close three hours after kick-off, which is about
        // twenty minutes after a normal match ends — and a fixture still not
        // marked finished by then is precisely the one worth asking about. It
        // now runs until the result has had a full day to land.
        return now > t - 15 * 60 * 1000 && now < t + 24 * 3600 * 1000;
      });
      if (!nearGame) return;
      if (now - lastEspnRef.current > 55 * 1000) fetchEspn();
    }, 30 * 1000);
    // Coming back to the app is the moment to catch up, and there is no single
    // event that always means it. An installed PWA resumed from the background
    // on iOS can fire pageshow without visibilitychange; a desktop tab fires
    // focus; a phone unlock fires visibilitychange. All three are listened for
    // and the throttle stops them tripling up.
    //
    // The base feed is refreshed too, not just the live overlay: after a night
    // of football the league file has usually caught up, and without this you
    // sat on a cache entry until it aged out.
    const resume = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastEspnRef.current <= 55 * 1000) return;
      fetchEspn();
      if (Date.now() - (lastFetchRef.current || 0) > CACHE_TTL) fetchData(true);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
    };
  }, [fetchEspn, fetchData]);

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
