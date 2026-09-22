import { useState, useEffect } from 'react';
import { getTeam } from '../data/england2027.js';

// FotMob's match data via the worker: line-ups with positions and ratings,
// stats by half with xG, player numbers, the shot map and momentum. See
// utils/fotmobMatch.js for the shape. Anything that goes wrong ends at null
// and the match sheet falls back to what ESPN has.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const memo = new Map(); // fixture id -> { ts, data }; per session, it's ~50 KB a match

const ymd = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

export function useMatchStats(fixture) {
  const id = fixture?.id;
  const live = fixture?.status === 'IN_PLAY';
  const [data, setData] = useState(() => memo.get(id)?.data ?? null);

  useEffect(() => {
    if (!WORKER_URL || !fixture?.utcDate) { setData(null); return undefined; }
    // Nothing to show until about an hour before kick-off
    if (Date.parse(fixture.utcDate) - Date.now() > 90 * 60 * 1000) { setData(null); return undefined; }

    let alive = true;
    let timer = null;
    const ctrl = new AbortController();
    const q = new URLSearchParams({
      date: ymd(fixture.utcDate),
      home: fixture.homeTeam.name,
      homeShort: getTeam(fixture.homeTeam.name)?.short || fixture.homeTeam.name,
      away: fixture.awayTeam.name,
      awayShort: getTeam(fixture.awayTeam.name)?.short || fixture.awayTeam.name,
    });

    const run = async () => {
      const hit = memo.get(id);
      const fresh = hit && Date.now() - hit.ts < (live ? 55000 : 10 * 60 * 1000);
      if (fresh) { setData(hit.data); }
      else {
        try {
          const r = await fetch(`${WORKER_URL}/epl/matchstats?${q}`, { signal: ctrl.signal });
          const d = r.ok ? await r.json() : null;
          const ok = d && d.found ? d : null;
          memo.set(id, { ts: Date.now(), data: ok });
          if (alive) setData(ok);
        } catch { /* offline or aborted: keep whatever we had */ }
      }
      if (alive && live) timer = setTimeout(run, 60000);
    };
    setData(memo.get(id)?.data ?? null);
    run();
    return () => { alive = false; ctrl.abort(); if (timer) clearTimeout(timer); };
  }, [id, live, fixture?.utcDate]);

  return data;
}
