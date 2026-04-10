import { useState, useEffect, useCallback } from 'react';

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;
const CACHE_KEY = 'wc_fixtures_cache_v2';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// API-Football status short codes → our internal status
const STATUS_MAP = {
  NS: 'SCHEDULED', TBD: 'SCHEDULED',
  '1H': 'IN_PLAY', '2H': 'IN_PLAY', ET: 'IN_PLAY', P: 'IN_PLAY', BT: 'IN_PLAY',
  HT: 'PAUSED',
  FT: 'FINISHED', AET: 'FINISHED', PEN: 'FINISHED',
  PST: 'POSTPONED', CANC: 'CANCELLED', SUSP: 'CANCELLED',
};

function roundToStage(round) {
  if (!round) return 'GROUP_STAGE';
  const r = round.toLowerCase();
  if (r.includes('group')) return 'GROUP_STAGE';
  if (r.includes('round of 32') || r.includes('1/16')) return 'LAST_32';
  if (r.includes('round of 16') || r.includes('1/8')) return 'LAST_16';
  if (r.includes('quarter')) return 'QUARTER_FINALS';
  if (r.includes('semi')) return 'SEMI_FINALS';
  if (r === 'final' || r.includes('- final')) return 'FINAL';
  return 'GROUP_STAGE';
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

export function useFixtures(apiKey) {
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!apiKey) {
      setError('No API key – enter one in Settings to load live fixtures.');
      return;
    }

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

    const headers = { 'x-apisports-key': apiKey };

    try {
      const res = await fetch(
        `${BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
        { headers }
      );

      if (!res.ok) {
        const msg =
          res.status === 401 || res.status === 403
            ? 'Invalid API key. Check your key at dashboard.api-football.com.'
            : res.status === 429
            ? 'Rate limited – please wait a minute and try again.'
            : `API error: ${res.status}`;
        throw new Error(msg);
      }

      const json = await res.json();

      // API-Football wraps errors in the response body even on 200
      if (json.errors && Object.keys(json.errors).length > 0) {
        const errMsg = Object.values(json.errors)[0];
        throw new Error(`API error: ${errMsg}`);
      }

      const normalised = (json.response || []).map((m) => {
        const statusShort = m.fixture.status.short;
        const status = STATUS_MAP[statusShort] || 'SCHEDULED';
        const stage = roundToStage(m.league.round);
        const homeGoals = m.goals.home;
        const awayGoals = m.goals.away;

        let winner = null;
        if (status === 'FINISHED' && homeGoals !== null && awayGoals !== null) {
          if (homeGoals > awayGoals) winner = 'HOME_TEAM';
          else if (awayGoals > homeGoals) winner = 'AWAY_TEAM';
          else winner = 'DRAW';
        }

        // Extract group letter from round name e.g. "Group A" → "A"
        const groupMatch = m.league.round.match(/Group\s+([A-L])/i);
        const group = groupMatch ? groupMatch[1] : null;

        return {
          id: m.fixture.id,
          stage,
          group,
          utcDate: m.fixture.date,
          status,
          elapsed: m.fixture.status.elapsed,
          homeTeam: {
            name: m.teams.home.name,
            crest: m.teams.home.logo,
            tla: '',
          },
          awayTeam: {
            name: m.teams.away.name,
            crest: m.teams.away.logo,
            tla: '',
          },
          score: { home: homeGoals, away: awayGoals, winner },
          matchday: m.league.round,
        };
      });

      const uniqueTeams = [];
      const seen = new Set();
      for (const m of normalised) {
        for (const side of [m.homeTeam, m.awayTeam]) {
          if (!seen.has(side.name)) {
            seen.add(side.name);
            uniqueTeams.push({ name: side.name, crest: side.crest });
          }
        }
      }

      writeCache({ fixtures: normalised, teams: uniqueTeams });
      setFixtures(normalised);
      setTeams(uniqueTeams);
      setLastFetched(Date.now());
    } catch (err) {
      const msg =
        err.message === 'Failed to fetch'
          ? 'Network error – check your API key is correct and try again. (CORS: make sure requests from this domain are allowed in your api-football.com account.)'
          : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { fixtures, teams, loading, error, lastFetched, refresh: () => fetchData(true) };
}
