import { useState, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CACHE_KEY = 'yt_hl_v4';
const FIFA_CHANNEL = 'UCpcTrCXblq78GZrTUTLWeBw';

// Module-level dedup — one in-flight request per match regardless of how many
// components ask for the same match simultaneously.
const inFlight = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

async function fetchVideoId(home, away) {
  const key = `${home}|${away}`;
  const cache = readCache();
  if (cache[key]) return cache[key];
  if (inFlight.has(key)) return inFlight.get(key);

  const q = encodeURIComponent(`${home} ${away} FIFA World Cup 2026 highlights`);
  const promise = fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${FIFA_CHANNEL}&q=${q}&type=video&maxResults=1&order=relevance&key=${API_KEY}`
  )
    .then((r) => r.json())
    .then((j) => {
      const id = j.items?.[0]?.id?.videoId || null;
      if (id) {
        const c = readCache();
        c[key] = id;
        writeCache(c);
      }
      inFlight.delete(key);
      return id;
    })
    .catch(() => { inFlight.delete(key); return null; });

  inFlight.set(key, promise);
  return promise;
}

// Returns a direct youtube.com/watch?v=... URL once resolved, null while loading or if unavailable.
export function useYouTubeHighlight(home, away, enabled) {
  const key = `${home}|${away}`;
  const [videoId, setVideoId] = useState(() =>
    enabled && API_KEY ? readCache()[key] || null : null
  );

  useEffect(() => {
    if (!enabled || !API_KEY) return;
    let alive = true;
    fetchVideoId(home, away).then((id) => {
      if (alive && id) setVideoId(id);
    });
    return () => { alive = false; };
  }, [key, enabled]);

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}
