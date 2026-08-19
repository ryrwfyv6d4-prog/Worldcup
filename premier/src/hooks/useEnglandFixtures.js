import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { resolveClub } from '../utils/teamMatch.js';
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

const CACHE_KEY = 'epl_fixtures_cache_v2';
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

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return { ...data, ts };
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
  const [espnState, setEspnState] = useState({ ok: null, unmatched: [], count: 0, ts: null });
  const lastEspnRef = useRef(0);
  const mergedRef = useRef([]);

  const fetchEspn = useCallback(async () => {
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
      writeCache({ fixtures: all });
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
    const onVisible = () => { if (document.visibilityState === 'visible') fetchEspn(); };
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
