import { useState, useEffect } from 'react';

const CACHE_KEY = 'wc_odds_cache_v1';
const TTL = 60 * 60 * 1000; // 1 hour
const API_KEY = import.meta.env.VITE_ODDS_API_KEY || '';

// Returns { [homeTeam vs awayTeam key]: { home, draw, away } } decimals
export function useOdds() {
  const [odds, setOdds] = useState({});

  useEffect(() => {
    if (!API_KEY) return;

    // Check cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < TTL) { setOdds(data); return; }
      }
    } catch { /* ignore */ }

    fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${API_KEY}&regions=au&markets=h2h&oddsFormat=decimal`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((events) => {
        if (!events) return;
        const result = {};
        for (const ev of events) {
          const h2h = ev.bookmakers?.[0]?.markets?.find((m) => m.key === 'h2h');
          if (!h2h) continue;
          const outcomes = h2h.outcomes;
          const home = outcomes.find((o) => o.name === ev.home_team)?.price;
          const away = outcomes.find((o) => o.name === ev.away_team)?.price;
          const draw = outcomes.find((o) => o.name === 'Draw')?.price;
          if (home && away) {
            result[`${ev.home_team}|${ev.away_team}`] = { home, draw, away };
          }
        }
        setOdds(result);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
      })
      .catch(() => {});
  }, []);

  return odds;
}
