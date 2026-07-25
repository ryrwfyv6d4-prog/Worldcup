import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { resolveClub } from '../utils/teamMatch.js';

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

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// UK offset: BST (+1) roughly late Mar → late Oct, else GMT. Good enough for
// kick-off display; last-Sunday edge days may drift an hour.
function ukOffsetHours(y, monthIdx, day) {
  if (monthIdx > 2 && monthIdx < 9) return 1; // Apr–Sep
  if (monthIdx === 2) return day >= 25 ? 1 : 0; // late March
  if (monthIdx === 9) return day <= 25 ? 1 : 0; // most of October
  return 0;
}

// Parse one openfootball league .txt into normalised fixtures
export function parseLeagueTxt(txt, div) {
  const fixtures = [];
  let matchday = null;
  let date = null; // { y, m, d }
  let startYear = null;

  const header = txt.match(/=\s*.*?(\d{4})\/\d{2}/);
  if (header) startYear = parseInt(header[1], 10);

  for (const rawLine of txt.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const md = line.match(/^[»▪]?\s*Matchday\s+(\d+)/i);
    if (md) { matchday = parseInt(md[1], 10); continue; }

    // "Fri Aug 21 2026" or "Sat Aug 22"
    const dl = line.match(/^\s{0,4}(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/);
    if (dl) {
      const m = MONTHS[dl[2]];
      let y = dl[4] ? parseInt(dl[4], 10) : null;
      if (y == null && startYear != null) y = m >= 6 ? startYear : startYear + 1;
      date = { y, m, d: parseInt(dl[3], 10) };
      continue;
    }

    // Match line: optional "HH:MM", then "A v B" or "A 2-1 (1-0) B"
    const ml = line.match(/^\s{4,}(?:(\d{1,2}):(\d{2})\s+)?(.+)$/);
    if (!ml || !date || !matchday) continue;
    const body = ml[3].trim();

    let home = null, away = null, hs = null, as = null;
    let m2 = body.match(/^(.+?)\s+v\s+(.+)$/);
    if (m2) {
      home = m2[1].trim(); away = m2[2].trim();
    } else {
      m2 = body.match(/^(.+?)\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?\s+(.+)$/);
      if (!m2) continue;
      home = m2[1].trim(); hs = parseInt(m2[2], 10); as = parseInt(m2[3], 10); away = m2[4].trim();
    }

    let utcDate = null;
    if (date.y != null) {
      const hh = ml[1] ? parseInt(ml[1], 10) : 15;
      const mm = ml[2] ? parseInt(ml[2], 10) : 0;
      const off = ukOffsetHours(date.y, date.m, date.d);
      utcDate = new Date(Date.UTC(date.y, date.m, date.d, hh - off, mm)).toISOString();
    }

    const finished = hs != null && as != null;
    let winner = null;
    if (finished) winner = hs > as ? 'HOME_TEAM' : as > hs ? 'AWAY_TEAM' : 'DRAW';

    fixtures.push({
      id: `${div}-${matchday}-${home}-${away}`,
      division: div,
      matchday,
      utcDate,
      status: finished ? 'FINISHED' : 'SCHEDULED',
      homeTeam: { name: home },
      awayTeam: { name: away },
      score: { home: hs, away: as, winner },
      liveClock: null,
    });
  }
  return fixtures;
}

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
    const from = fmt(new Date(Date.now() - 36 * 3600 * 1000));
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

  return {
    fixtures: merged,
    loading,
    error,
    lastFetched,
    espnState,
    refresh: () => Promise.all([fetchData(true), fetchEspn()]),
  };
}
