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
};

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_STATE };
}

export function useSharedState() {
  const [state, setState] = useState(readLocal);
  const [cloudLoaded, setCloudLoaded] = useState(!WORKER_URL);
  const dirty = useRef(false);

  // Pull cloud state once; cloud wins if it has a draw
  useEffect(() => {
    if (!WORKER_URL) return;
    fetch(`${WORKER_URL}/epl/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s && Object.keys(s.assignments || {}).length > 0) {
          setState({ ...EMPTY_STATE, ...s });
        }
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
