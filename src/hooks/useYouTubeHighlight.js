import { useState, useEffect } from 'react';

// Highlight resolution is handled server-side by the Cloudflare Worker, which
// shares one lookup across all users and caches results in R2 (so we don't burn
// the YouTube API daily quota). The Worker tries the FIFA channel first, then
// SBS Sport (@SBSSportau), and returns a real video ID or null.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const CACHE_KEY = 'yt_hl_v8';

const inFlight = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

async function fetchVideoId(cacheKey, params) {
  const cache = readCache();
  if (cache[cacheKey]) return cache[cacheKey];
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = fetch(`${WORKER_URL}/highlight?${params}`)
    .then((r) => r.json())
    .then((j) => {
      const id = j?.videoId || null;
      if (id) {
        const c = readCache();
        c[cacheKey] = id;
        writeCache(c);
      }
      inFlight.delete(cacheKey);
      return id;
    })
    .catch(() => { inFlight.delete(cacheKey); return null; });

  inFlight.set(cacheKey, promise);
  return promise;
}

// homeScore/awayScore: pass for finished games so the query uses the exact score
export function useYouTubeHighlight(home, away, enabled, homeScore, awayScore) {
  const hasScore = homeScore != null && awayScore != null;
  const cacheKey = hasScore ? `${home}|${away}|${homeScore}-${awayScore}` : `${home}|${away}`;
  const params = new URLSearchParams({ home, away });
  if (hasScore) { params.set('hs', String(homeScore)); params.set('as', String(awayScore)); }

  const [videoId, setVideoId] = useState(() =>
    enabled ? readCache()[cacheKey] || null : null
  );

  useEffect(() => {
    if (!enabled || !WORKER_URL) return;
    let alive = true;
    fetchVideoId(cacheKey, params.toString()).then((id) => {
      if (alive && id) setVideoId(id);
    });
    return () => { alive = false; };
  }, [cacheKey, enabled]);

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}
