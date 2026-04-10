import { useState, useEffect, useCallback } from 'react';

const BASE = 'https://www.thesportsdb.com/api/v1/json';
const FREE_KEY = '123';
const LEAGUE_ID = 4429; // FIFA World Cup
const CACHE_KEY = 'wc_fixtures_cache_v3';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const STATUS_MAP = {
  '': 'SCHEDULED',
  'Not Started': 'SCHEDULED',
  'Match Finished': 'FINISHED',
  'After Extra Time': 'FINISHED',
  'After Penalties': 'FINISHED',
  'AOT': 'FINISHED',
  'Penalties': 'FINISHED',
  'In Progress': 'IN_PLAY',
  'Half Time': 'PAUSED',
  'Postponed': 'POSTPONED',
  'Canceled': 'CANCELLED',
  'Cancelled': 'CANCELLED',
};

function roundToStage(strRound, intRound) {
  if (strRound) {
    const r = strRound.toLowerCase();
    if (r.includes('group')) return 'GROUP_STAGE';
    if (r.includes('round of 32') || r.includes('1/16')) return 'LAST_32';
    if (r.includes('round of 16') || r.includes('1/8')) return 'LAST_16';
    if (r.includes('quarter')) return 'QUARTER_FINALS';
    if (r.includes('semi')) return 'SEMI_FINALS';
    if (r === 'final' || r.endsWith('- final') || r === 'world cup final') return 'FINAL';
  }
  // Fallback by round number (WC 2026: group=1-3, R32=4, R16=5, QF=6, SF=7, F=8)
  const n = parseInt(intRound) || 0;
  if (n <= 3) return 'GROUP_STAGE';
  if (n === 4) return 'LAST_32';
  if (n === 5) return 'LAST_16';
  if (n === 6) return 'QUARTER_FINALS';
  if (n === 7) return 'SEMI_FINALS';
  if (n >= 8) return 'FINAL';
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

    const key = apiKey && apiKey.trim() ? apiKey.trim() : FREE_KEY;

    try {
      // Fetch all season events; fall back to next+past if season returns empty
      const seasonRes = await fetch(
        `${BASE}/${key}/eventsseason.php?id=${LEAGUE_ID}&s=2026`
      );

      if (!seasonRes.ok) {
        throw new Error(`TheSportsDB error: ${seasonRes.status}`);
      }

      const seasonJson = await seasonRes.json();
      let events = seasonJson.events || [];

      // If season endpoint returned nothing, combine next + past league events
      if (events.length === 0) {
        const [nextRes, pastRes] = await Promise.all([
          fetch(`${BASE}/${key}/eventsnextleague.php?id=${LEAGUE_ID}`),
          fetch(`${BASE}/${key}/eventspastleague.php?id=${LEAGUE_ID}`),
        ]);
        const [nextJson, pastJson] = await Promise.all([
          nextRes.json(),
          pastRes.json(),
        ]);
        events = [...(pastJson.events || []), ...(nextJson.events || [])];
      }

      const normalised = events.map((m) => {
        const statusStr = m.strStatus || '';
        const status = STATUS_MAP[statusStr] ?? 'SCHEDULED';
        const stage = roundToStage(m.strRound, m.intRound);

        const homeScore =
          m.intHomeScore !== null && m.intHomeScore !== ''
            ? parseInt(m.intHomeScore)
            : null;
        const awayScore =
          m.intAwayScore !== null && m.intAwayScore !== ''
            ? parseInt(m.intAwayScore)
            : null;

        let winner = null;
        if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winner = 'HOME_TEAM';
          else if (awayScore > homeScore) winner = 'AWAY_TEAM';
          else winner = 'DRAW';
        }

        // Extract group letter from strRound e.g. "Group A" → "A"
        const groupMatch = (m.strRound || '').match(/Group\s+([A-L])/i);
        const group = groupMatch ? groupMatch[1] : null;

        const utcDate =
          m.strTimestamp ||
          (m.dateEvent && m.strTime
            ? `${m.dateEvent}T${m.strTime}+00:00`
            : m.dateEvent || null);

        return {
          id: m.idEvent,
          stage,
          group,
          utcDate,
          status,
          homeTeam: {
            name: m.strHomeTeam,
            crest: m.strHomeTeamBadge || null,
            tla: '',
          },
          awayTeam: {
            name: m.strAwayTeam,
            crest: m.strAwayTeamBadge || null,
            tla: '',
          },
          score: { home: homeScore, away: awayScore, winner },
          matchday: m.strRound || `Round ${m.intRound}`,
        };
      });

      // Sort chronologically
      normalised.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

      const uniqueTeams = [];
      const seen = new Set();
      for (const m of normalised) {
        for (const side of [m.homeTeam, m.awayTeam]) {
          if (side.name && !seen.has(side.name)) {
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
      setError(
        err.message === 'Failed to fetch'
          ? 'Network error – check your connection and try refreshing.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { fixtures, teams, loading, error, lastFetched, refresh: () => fetchData(true) };
}
