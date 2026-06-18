import { useState, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CACHE_KEY = 'yt_hl_v5';
const FIFA_CHANNEL = 'UCpcTrCXblq78GZrTUTLWeBw';

const inFlight = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

async function fetchVideoId(cacheKey, query) {
  const cache = readCache();
  if (cache[cacheKey]) return cache[cacheKey];
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const q = encodeURIComponent(query);
  const promise = fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${FIFA_CHANNEL}&q=${q}&type=video&maxResults=1&order=relevance&key=${API_KEY}`
  )
    .then((r) => r.json())
    .then((j) => {
      const id = j.items?.[0]?.id?.videoId || null;
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

// homeScore/awayScore: pass for finished games to use exact score in query
// (matches FIFA title format "Highlights Team1 N-N Team2 FIFA World Cup 2026")
export function useYouTubeHighlight(home, away, enabled, homeScore, awayScore) {
  const hasScore = homeScore != null && awayScore != null;
  const cacheKey = hasScore ? `${home}|${away}|${homeScore}-${awayScore}` : `${home}|${away}`;
  const query = hasScore
    ? `Highlights ${home} ${homeScore}-${awayScore} ${away} FIFA World Cup 2026`
    : `${home} ${away} FIFA World Cup 2026 highlights`;

  const [videoId, setVideoId] = useState(() =>
    enabled && API_KEY ? readCache()[cacheKey] || null : null
  );

  useEffect(() => {
    if (!enabled || !API_KEY) return;
    let alive = true;
    fetchVideoId(cacheKey, query).then((id) => {
      if (alive && id) setVideoId(id);
    });
    return () => { alive = false; };
  }, [cacheKey, enabled, query]);

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}
