import { useState, useEffect } from 'react';
import { getTeam } from '../data/england2027.js';

// Who is out, and the probable XI, before a match kicks off.
//
// Comes through the worker rather than straight from the phone: the upstream
// sends no CORS headers, and one cached caller is a great deal politer than
// twelve phones asking the same question every time somebody opens a fixture.
// The worker holds the answer in R2 for half an hour.
//
// Everything here degrades to nothing. No worker, no network, no line-up
// published yet, upstream changed its shape — all of them end at `null`, and
// the match sheet simply does not draw the card.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const CACHE_KEY = 'epl_teamnews_v1';
const TTL = 20 * 60 * 1000;

const ymd = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

function readCache(key) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const hit = all[key];
    if (hit && Date.now() - hit.ts < TTL) return hit.data;
  } catch { /* ignore */ }
  return undefined;
}

function writeCache(key, data) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    all[key] = { ts: Date.now(), data };
    // keep it small — this is a convenience cache, not a store
    const keys = Object.keys(all);
    if (keys.length > 40) for (const k of keys.slice(0, keys.length - 40)) delete all[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function useTeamNews(fixture, enabled = true) {
  const [news, setNews] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | none

  const id = fixture?.id;
  const date = fixture?.utcDate;
  const home = fixture?.homeTeam?.name;
  const away = fixture?.awayTeam?.name;

  useEffect(() => {
    if (!enabled || !WORKER_URL || !date || !home || !away) {
      setNews(null); setState('idle');
      return undefined;
    }
    const key = `${id}`;
    const hit = readCache(key);
    if (hit !== undefined) {
      setNews(hit); setState(hit ? 'ready' : 'none');
      return undefined;
    }

    let alive = true;
    const ctrl = new AbortController();
    setState('loading');

    const q = new URLSearchParams({
      date: ymd(date),
      home,
      homeShort: getTeam(home)?.short || home,
      away,
      awayShort: getTeam(away)?.short || away,
    });

    fetch(`${WORKER_URL}/epl/teamnews?${q}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const ok = d && d.found ? d : null;
        writeCache(key, ok);
        setNews(ok);
        setState(ok ? 'ready' : 'none');
      })
      .catch(() => { if (alive) { setNews(null); setState('none'); } });

    return () => { alive = false; ctrl.abort(); };
  }, [enabled, id, date, home, away]);

  return { news, state };
}
