import { useState, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CACHE_KEY = 'yt_hl_v7';
// Official broadcaster channels, tried in priority order.
const FIFA_CHANNEL = 'UCpcTrCXblq78GZrTUTLWeBw';   // FIFA
const SBS_CHANNEL = 'UCn6UMS98Ox-B3jkSWlweJ2w';    // SBS Sport (@SBSSportau)

const inFlight = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

// Query one channel for a highlights video. Returns a videoId or null.
async function searchChannel(channelId, query) {
  const q = encodeURIComponent(query);
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${q}&type=video&maxResults=5&order=relevance&key=${API_KEY}`
    );
    const j = await r.json();
    const items = j.items || [];
    // Only use a result whose title contains "highlight" — never fall back to goal clips
    const match = items.find((i) => i.snippet?.title?.toLowerCase().includes('highlight'));
    return match?.id?.videoId || null;
  } catch {
    return null;
  }
}

async function fetchVideoId(cacheKey, query) {
  const cache = readCache();
  if (cache[cacheKey]) return cache[cacheKey];
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  // Try FIFA first, then SBS Sport. Only a real video ID is cached/returned.
  const promise = (async () => {
    let id = await searchChannel(FIFA_CHANNEL, query);
    if (!id) id = await searchChannel(SBS_CHANNEL, query);
    if (id) {
      const c = readCache();
      c[cacheKey] = id;
      writeCache(c);
    }
    inFlight.delete(cacheKey);
    return id;
  })();

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
