import { useState, useEffect } from 'react';

const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const CACHE_KEY = 'yt_hl_v9';

const FIFA_CHANNEL = 'UCpcTrCXblq78GZrTUTLWeBw';
const SBS_CHANNEL = 'UCn6UMS98Ox-B3jkSWlweJ2w';

const inFlight = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

async function searchYT(channelId, query) {
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(query)}&type=video&maxResults=5&order=relevance&key=${YT_KEY}`
  );
  const j = await r.json();
  const items = j.items || [];
  const m = items.find((i) => i.snippet?.title?.toLowerCase().includes('highlight'));
  return m?.id?.videoId || null;
}

async function resolveVideoId(cacheKey, home, away, hs, as_) {
  const cache = readCache();
  if (cache[cacheKey]) return cache[cacheKey];
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const hasScore = hs != null && as_ != null;
  const params = new URLSearchParams({ home, away });
  if (hasScore) { params.set('hs', String(hs)); params.set('as', String(as_)); }

  const promise = (async () => {
    // Worker first — shared R2 cache means one API call per match across all users
    if (WORKER_URL) {
      try {
        const r = await fetch(`${WORKER_URL}/highlight?${params}`);
        const j = await r.json();
        if (j?.videoId) {
          const c = readCache(); c[cacheKey] = j.videoId; writeCache(c);
          inFlight.delete(cacheKey);
          return j.videoId;
        }
      } catch { /* fall through */ }
    }

    // Direct YouTube API fallback (Worker returned null or is unavailable)
    if (YT_KEY) {
      try {
        const query = hasScore
          ? `Highlights ${home} ${hs}-${as_} ${away} FIFA World Cup 2026`
          : `${home} ${away} FIFA World Cup 2026 highlights`;
        let id = await searchYT(FIFA_CHANNEL, query);
        if (!id) id = await searchYT(SBS_CHANNEL, query);
        if (id) {
          const c = readCache(); c[cacheKey] = id; writeCache(c);
          inFlight.delete(cacheKey);
          return id;
        }
      } catch { /* nothing */ }
    }

    inFlight.delete(cacheKey);
    return null;
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}

export function useYouTubeHighlight(home, away, enabled, homeScore, awayScore) {
  const hasScore = homeScore != null && awayScore != null;
  const cacheKey = hasScore ? `${home}|${away}|${homeScore}-${awayScore}` : `${home}|${away}`;

  const [videoId, setVideoId] = useState(() =>
    enabled ? readCache()[cacheKey] || null : null
  );

  useEffect(() => {
    if (!enabled || (!WORKER_URL && !YT_KEY)) return;
    let alive = true;
    resolveVideoId(cacheKey, home, away, homeScore, awayScore).then((id) => {
      if (alive && id) setVideoId(id);
    });
    return () => { alive = false; };
  }, [cacheKey, enabled]);

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}
