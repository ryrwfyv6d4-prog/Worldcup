import { useState, useEffect, useCallback } from 'react';

const DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const CACHE_KEY = 'wc_fixtures_cache_v4';
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
          // Skip placeholder knockout matches (team1/team2 are codes like "2A")
          const isPlaceholder = /^\d+[A-L]/.test(m.team1) || m.team1.includes('/');
          return !isPlaceholder;
        })
        .map((m, i) => {
          const stage = roundToStage(m.round);
          const utcDate = toUtcDate(m.date, m.time);

          const homeScore = m.score1 !== undefined && m.score1 !== null ? Number(m.score1) : null;
          const awayScore = m.score2 !== undefined && m.score2 !== null ? Number(m.score2) : null;
          const finished = homeScore !== null && awayScore !== null;

          let winner = null;
          if (finished) {
            if (homeScore > awayScore) winner = 'HOME_TEAM';
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
            score: { home: homeScore, away: awayScore, winner },
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
  }, [fetchData]);

  return { fixtures, teams, loading, error, lastFetched, refresh: () => fetchData(true) };
}
