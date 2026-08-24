import { useState, useEffect } from 'react';
import { clubLabel } from '../utils/teamMatch.js';

// Highlights for a finished match, resolved through the worker.
//
// Stan Sport only. They hold the Premier League here and title every upload the
// same way, so a search of their channel either finds the match or there is no
// video worth linking. They do not carry the Championship, so those games have
// no button — an open search would find them, but it would also find
// re-uploads and compilations, and a button that might send you anywhere is
// worse than no button.
//
// The worker does the lookup and shares one R2-cached answer across everyone,
// so the whole shed costs about one API call per match rather than one per
// person per open. No key is shipped in this bundle — if the worker is
// unreachable there is simply no button, same failure, same reason.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
// v2 because v1 stored a bare video id with no record of where it came from,
// so a match resolved before this was Stan-only kept serving whatever the old
// open search had found and never asked again. Entries now carry their source
// and only Stan's are served.
const CACHE_KEY = 'epl_hl_v2';

// One in-flight request per match, however many rows ask for it at once
const inFlight = new Map();

function readCache() {
  try {
    localStorage.removeItem('epl_hl_v1');   // dead since the Stan-only change
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch { /* private mode */ }
}

// Only a hit we know came from Stan Sport counts. Anything else is treated as
// a miss and re-resolved.
function cachedId(cache, key) {
  const hit = cache[key];
  if (!hit || typeof hit !== 'object') return null;
  return hit.source === 'stan' && hit.videoId ? hit.videoId : null;
}

async function resolve(cacheKey, home, away, hs, as_) {
  const cache = readCache();
  const hit = cachedId(cache, cacheKey);
  if (hit) return hit;
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const params = new URLSearchParams({
    home,
    away,
    homeShort: clubLabel(home),
    awayShort: clubLabel(away),
  });
  if (hs != null && as_ != null) { params.set('hs', String(hs)); params.set('as', String(as_)); }

  const promise = (async () => {
    try {
      const r = await fetch(`${WORKER_URL}/epl/highlight?${params}`);
      const j = await r.json();
      if (j?.videoId && j.source === 'stan') {
        const c = readCache();
        c[cacheKey] = { videoId: j.videoId, source: j.source };
        writeCache(c);
        return j.videoId;
      }
    } catch { /* offline, or the worker is having a day — no button */ }
    return null;
  })().finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, promise);
  return promise;
}

export function useHighlight(home, away, enabled, homeScore, awayScore) {
  // Keyed on the score too, so a corrected scoreline re-resolves rather than
  // serving the video cached against the wrong result
  const hasScore = homeScore != null && awayScore != null;
  const cacheKey = hasScore ? `${home}|${away}|${homeScore}-${awayScore}` : `${home}|${away}`;

  const [videoId, setVideoId] = useState(() => (enabled ? cachedId(readCache(), cacheKey) : null));

  useEffect(() => {
    if (!enabled || !WORKER_URL || !home || !away) return undefined;
    let alive = true;
    setVideoId(cachedId(readCache(), cacheKey));
    resolve(cacheKey, home, away, homeScore, awayScore).then((id) => {
      if (alive && id) setVideoId(id);
    });
    return () => { alive = false; };
  }, [cacheKey, enabled, home, away, homeScore, awayScore]);

  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}
