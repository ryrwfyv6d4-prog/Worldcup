import { useState, useEffect, useRef, useCallback } from 'react';

// Shared sweep state — one object for the whole group, mirrored to the worker
// when VITE_WALL_API_URL is set (same worker as the World Cup app, /epl routes).
// Falls back to this-device-only localStorage otherwise (offline preview).
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const LOCAL_KEY = 'epl_shared_state_v1';

export const EMPTY_STATE = {
  assignments: {},   // { player: [team, team, team, team] }
  drawLocked: false,
  wallPosts: [],     // { id, person, text, ts }
  polls: [],         // { id, person, q, options: [..], votes: { person: optionIndex }, ts }
  manualMedals: {},  // { teamName: ['CUP','BIG_PUSH'] } — awarded by hand in HQ
  bonusPoints: {},   // { player: { key: { pts, label } } } — shed bonuses, e.g. draw-night forfeits
};

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_STATE };
}

// Is there anything up there worth taking?
//
// The old test was "does it have a draw", which meant Wall posts made before
// draw night were ignored and then overwritten. Testing for a draw specifically
// was too narrow — but accepting any response at all is too broad, because an
// empty document then wipes good local state. So: any content, of any kind.
function hasContent(x) {
  if (!x) return false;
  return Boolean(
    Object.keys(x.assignments || {}).length
    || (x.wallPosts || []).length
    || (x.polls || []).length
    || Object.keys(x.manualMedals || {}).length
    || Object.keys(x.bonusPoints || {}).length
    || x.drawLocked
  );
}

// Collections are unioned by id rather than replaced, so two people posting
// between syncs keep both posts instead of the later write erasing the earlier.
function unionById(a = [], b = []) {
  const seen = new Map();
  for (const item of [...(a || []), ...(b || [])]) {
    if (!item) continue;
    seen.set(item.id != null ? item.id : JSON.stringify(item), item);
  }
  const out = [...seen.values()];
  return out.every((x) => x && x.ts != null) ? out.sort((x, y) => y.ts - x.ts) : out;
}

export function useSharedState() {
  const [state, setState] = useState(readLocal);
  const [cloudLoaded, setCloudLoaded] = useState(!WORKER_URL);
  const dirty = useRef(false);

  // Pull cloud state once.
  //
  // This used to be ignored unless the cloud already had a draw, which meant
  // anything posted to the Wall before draw night was invisible to the next
  // person to open the app — and their first edit then pushed their empty list
  // back over the top of it. It also replaced local state outright, so an edit
  // made in the few hundred milliseconds the GET was in flight vanished.
  useEffect(() => {
    if (!WORKER_URL) return;
    fetch(`${WORKER_URL}/epl/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!hasContent(s)) return;   // nothing there; the local copy stands
        setState((local) => {
          const cloud = { ...EMPTY_STATE, ...s };
          // Nothing touched yet: the cloud is the truth.
          if (!dirty.current) return cloud;
          // Something was edited while the fetch was in flight. Keep that edit,
          // but do not let it delete anything the cloud already had.
          return {
            ...cloud,
            ...local,
            wallPosts: unionById(cloud.wallPosts, local.wallPosts),
            polls: unionById(cloud.polls, local.polls),
          };
        });
      })
      .catch(() => { /* offline — local copy stands */ })
      .finally(() => setCloudLoaded(true));
  }, []);

  // Persist locally always; push to cloud after initial load
  useEffect(() => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    if (!WORKER_URL || !cloudLoaded || !dirty.current) return;
    fetch(`${WORKER_URL}/epl/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => { /* retried on next change */ });
  }, [state, cloudLoaded]);

  const update = useCallback((patch) => {
    dirty.current = true;
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  return { state, update, cloudLoaded, synced: Boolean(WORKER_URL) };
}
