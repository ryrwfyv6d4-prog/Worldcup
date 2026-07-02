import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ESPN public scoreboard — live in-play scores, no key needed. Best-effort overlay.
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN display names → our team names
const ESPN_NAME_MAP = {
  'Czechia': 'Czech Republic',
  'United States': 'USA',
  'USA': 'USA',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia': 'Bosnia & Herzegovina',
  'IR Iran': 'Iran',
  'Türkiye': 'Turkey',
  'Curacao': 'Curaçao',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Democratic Republic of the Congo': 'DR Congo',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
};
export const espnName = (n) => ESPN_NAME_MAP[n] || n;

// Merge ESPN live/final data over the base schedule. ESPN only ever upgrades
// a match that isn't already settled; if ESPN is down or empty, base wins.
function mergeEspn(base, espnGames) {
  if (!espnGames.length) return base;
  return base.map((f) => {
    if (f.status === 'FINISHED') return f;
    const fTime = f.utcDate ? new Date(f.utcDate).getTime() : 0;
    const g = espnGames.find((g) =>
      ((g.home === f.homeTeam.name && g.away === f.awayTeam.name) ||
       (g.home === f.awayTeam.name && g.away === f.homeTeam.name)) &&
      Math.abs(new Date(g.date).getTime() - fTime) < 24 * 3600 * 1000
    );
    if (!g || g.state === 'pre') return f;
    const flipped = g.home === f.awayTeam.name;
    const hs = flipped ? g.awayScore : g.homeScore;
    const as = flipped ? g.homeScore : g.awayScore;
    const hp = flipped ? g.awayPens : g.homePens;
    const ap = flipped ? g.homePens : g.awayPens;
    if (hs == null || as == null) return f;
    const finished = g.state === 'post';
    let winner = null;
    if (finished) {
      if (hp != null && ap != null && hp !== ap) winner = hp > ap ? 'HOME_TEAM' : 'AWAY_TEAM';
      else if (hs > as) winner = 'HOME_TEAM';
      else if (as > hs) winner = 'AWAY_TEAM';
      else winner = 'DRAW';
    }
    return {
      ...f,
      status: finished ? 'FINISHED' : 'IN_PLAY',
      liveClock: !finished ? g.clock : null,
      score: {
        home: hs, away: as, winner,
        penalties: hp != null && ap != null ? { home: hp, away: ap } : null,
      },
    };
  });
}

const DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const CACHE_KEY = 'wc_fixtures_cache_v5';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Map openfootball round names → internal stage codes
function roundToStage(round) {
  if (!round) return 'GROUP_STAGE';
  const r = round.toLowerCase();
  if (r.startsWith('matchday')) return 'GROUP_STAGE';
  if (r.includes('round of 32')) return 'LAST_32';
  if (r.includes('round of 16')) return 'LAST_16';
  if (r.includes('quarter')) return 'QUARTER_FINALS';
  if (r.includes('semi')) return 'SEMI_FINALS';
  if (r === 'final') return 'FINAL';
  return 'GROUP_STAGE';
}

// Parse "HH:MM UTC±N" → ISO UTC datetime string
function toUtcDate(dateStr, timeStr) {
  if (!dateStr) return null;
  if (!timeStr) return `${dateStr}T00:00:00Z`;

  // e.g. "20:00 UTC-6"
  const m = timeStr.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d+)/);
  if (!m) return `${dateStr}T00:00:00Z`;

  const [, hh, mm, offset] = m;
  const offsetMins = parseInt(offset) * 60;
  const d = new Date(`${dateStr}T${hh}:${mm}:00Z`);
  d.setMinutes(d.getMinutes() - offsetMins); // subtract offset to get UTC
  return d.toISOString();
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

export function useFixtures(apiKey) { // apiKey kept for API compat but unused
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [espnGames, setEspnGames] = useState([]);
  const lastEspnRef = useRef(0);
  const mergedRef = useRef([]);

  const fetchEspn = useCallback(async () => {
    try {
      const fmt = (dt) => dt.toISOString().slice(0, 10).replace(/-/g, '');
      const from = new Date(Date.now() - 36 * 3600 * 1000);
      const to = new Date(Date.now() + 36 * 3600 * 1000);
      const res = await fetch(`${ESPN_URL}?dates=${fmt(from)}-${fmt(to)}`);
      if (!res.ok) return;
      const json = await res.json();
      const games = (json.events || []).map((e) => {
        const comp = e.competitions && e.competitions[0];
        if (!comp) return null;
        const homeC = (comp.competitors || []).find((c) => c.homeAway === 'home');
        const awayC = (comp.competitors || []).find((c) => c.homeAway === 'away');
        if (!homeC || !awayC) return null;
        return {
          home: espnName(homeC.team && homeC.team.displayName),
          away: espnName(awayC.team && awayC.team.displayName),
          date: e.date,
          state: e.status && e.status.type ? e.status.type.state : 'pre', // pre | in | post
          homeScore: homeC.score != null && homeC.score !== '' ? Number(homeC.score) : null,
          awayScore: awayC.score != null && awayC.score !== '' ? Number(awayC.score) : null,
          homePens: homeC.shootoutScore != null ? Number(homeC.shootoutScore) : null,
          awayPens: awayC.shootoutScore != null ? Number(awayC.shootoutScore) : null,
          // displayClock arrives as "67'" — strip the quote; consumers add their own
          clock: e.status?.displayClock ? String(e.status.displayClock).replace(/'+$/, '') : null,
        };
      }).filter(Boolean);
      setEspnGames(games);
      lastEspnRef.current = Date.now();
    } catch { /* ESPN is best-effort; base data still works */ }
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setFixtures(cached.fixtures || []);
        setTeams(cached.teams || []);
        setLastFetched(cached.ts);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`Failed to load fixture data (${res.status})`);

      const json = await res.json();
      const matches = json.matches || [];

      const normalised = matches
        .filter((m) => {
          // Skip placeholder knockout matches: "2A" group codes, "W73"/"L101" match refs, "A/B/C" lists
          const isPlaceholder = (t) => /^\d+[A-L]/.test(t) || /^[WL]\d+$/.test(t) || t.includes('/');
          return !isPlaceholder(m.team1) && !isPlaceholder(m.team2);
        })
        .map((m, i) => {
          const stage = roundToStage(m.round);
          const utcDate = toUtcDate(m.date, m.time);

          // openfootball score format: { ht:[h,a], ft:[h,a], et:[h,a], p:[h,a] }
          const sc = m.score || {};
          const ftArr = Array.isArray(sc.ft) ? sc.ft : null;
          const etArr = Array.isArray(sc.et) ? sc.et : null;
          const pArr = Array.isArray(sc.p) ? sc.p : null;
          // Legacy flat fields as fallback
          const legacyHome = m.score1 !== undefined && m.score1 !== null ? Number(m.score1) : null;
          const legacyAway = m.score2 !== undefined && m.score2 !== null ? Number(m.score2) : null;

          const finalArr = etArr || ftArr;
          const homeScore = finalArr ? Number(finalArr[0]) : legacyHome;
          const awayScore = finalArr ? Number(finalArr[1]) : legacyAway;
          const finished = homeScore !== null && awayScore !== null;

          let winner = null;
          if (finished) {
            if (pArr) {
              winner = Number(pArr[0]) > Number(pArr[1]) ? 'HOME_TEAM' : 'AWAY_TEAM';
            } else if (homeScore > awayScore) winner = 'HOME_TEAM';
            else if (awayScore > homeScore) winner = 'AWAY_TEAM';
            else winner = 'DRAW';
          }

          // Status: openfootball only marks finished by presence of score
          const now = Date.now();
          const matchTime = utcDate ? new Date(utcDate).getTime() : 0;
          let status = 'SCHEDULED';
          if (finished) status = 'FINISHED';
          else if (matchTime > 0 && now > matchTime && now < matchTime + 2 * 60 * 60 * 1000) {
            status = 'IN_PLAY'; // rough heuristic: within 2h of kick-off
          }

          // Group letter from "Group A" → "A"
          const groupMatch = (m.group || '').match(/Group\s+([A-L])/i);
          const group = groupMatch ? groupMatch[1] : null;

          return {
            id: m.num || i,
            stage,
            group,
            utcDate,
            status,
            homeTeam: { name: m.team1, crest: null, tla: '' },
            awayTeam: { name: m.team2, crest: null, tla: '' },
            score: { home: homeScore, away: awayScore, winner, penalties: pArr ? { home: Number(pArr[0]), away: Number(pArr[1]) } : null },
            matchday: m.round,
            venue: m.ground || null,
          };
        });

      const uniqueTeams = [];
      const seen = new Set();
      for (const m of normalised) {
        for (const side of [m.homeTeam, m.awayTeam]) {
          if (side.name && !seen.has(side.name)) {
            seen.add(side.name);
            uniqueTeams.push({ name: side.name, crest: null });
          }
        }
      }

      writeCache({ fixtures: normalised, teams: uniqueTeams });
      setFixtures(normalised);
      setTeams(uniqueTeams);
      setLastFetched(Date.now());
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Network error – check your connection and try again.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchEspn();
  }, [fetchData, fetchEspn]);

  // Poll ESPN: every 60s around live matches, every 10 min otherwise, only while visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const nearGame = mergedRef.current.some((f) => {
        if (!f.utcDate || f.status === 'FINISHED') return false;
        const t = new Date(f.utcDate).getTime();
        return now > t - 15 * 60 * 1000 && now < t + 3 * 3600 * 1000;
      });
      if (!nearGame) return; // nothing on or near — no polling at all
      if (now - lastEspnRef.current > 55 * 1000) fetchEspn();
    }, 30 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchEspn(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchEspn]);

  const merged = useMemo(() => mergeEspn(fixtures, espnGames), [fixtures, espnGames]);
  mergedRef.current = merged;

  return { fixtures: merged, teams, loading, error, lastFetched, refresh: () => Promise.all([fetchData(true), fetchEspn()]) };
}

