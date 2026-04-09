import { useState, useEffect, useCallback } from 'react';

const BASE = 'https://api.football-data.org/v4';
const CACHE_KEY = 'wc_fixtures_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
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

    const headers = { 'X-Auth-Token': apiKey };

    try {
      const [matchRes, teamRes] = await Promise.all([
        fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers }),
        fetch(`${BASE}/competitions/WC/teams?season=2026`, { headers }),
      ]);

      if (!matchRes.ok) {
        const msg = matchRes.status === 403
          ? 'API key invalid or plan does not include World Cup data.'
          : matchRes.status === 429
          ? 'Rate limited – please wait a minute and try again.'
          : `API error: ${matchRes.status}`;
        throw new Error(msg);
      }

      const matchData = await matchRes.json();
      const teamData = teamRes.ok ? await teamRes.json() : { teams: [] };

      const normalised = (matchData.matches || []).map((m) => ({
        id: m.id,
        stage: m.stage,
        group: m.group,
        utcDate: m.utcDate,
        status: m.status,
        homeTeam: { name: m.homeTeam.name, crest: m.homeTeam.crest, tla: m.homeTeam.tla },
        awayTeam: { name: m.awayTeam.name, crest: m.awayTeam.crest, tla: m.awayTeam.tla },
        score: {
          home: m.score?.fullTime?.home ?? null,
          away: m.score?.fullTime?.away ?? null,
          winner: m.score?.winner ?? null,
        },
        matchday: m.matchday,
      }));

      const normalTeams = (teamData.teams || []).map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        tla: t.tla,
        crest: t.crest,
        group: t.group,
      }));

      writeCache({ fixtures: normalised, teams: normalTeams, ts: Date.now() });
      setFixtures(normalised);
      setTeams(normalTeams);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { fixtures, teams, loading, error, lastFetched, refresh: () => fetchData(true) };
}
