import { useState, useEffect, useRef, useCallback } from 'react';
import { EMPTY_STATE, applyOp, applyOps } from '../utils/stateOps.js';

export { EMPTY_STATE };

// Shared sweep state — one object for the whole group, kept by the worker when
// VITE_WALL_API_URL is set (same worker as the World Cup app, /epl routes).
// Falls back to this-device-only localStorage otherwise (offline preview).
//
// A phone never uploads the whole state. Each change is an operation
// ("add this post", "Jake votes 2") sent to /epl/ops and applied by the worker
// to the latest copy. What you see is the last copy the worker sent back with
// any of your changes still in the post applied on top, so an edit shows at
// once and a dead signal doesn't lose it.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const LOCAL_KEY = 'epl_shared_state_v1';
const PENDING_KEY = 'epl_pending_ops_v1';
const PULL_EVERY = 45000;      // while the app is open and on screen
const RESUME_GAP = 15000;      // don't refetch on every focus flicker

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// An empty document from the worker (first run, or a wiped bucket) should not
// blank a phone that has a perfectly good copy.
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

export function useSharedState() {
  const [server, setServer] = useState(() => ({ ...EMPTY_STATE, ...readJson(LOCAL_KEY, {}) }));
  const [pending, setPending] = useState(() => (WORKER_URL ? readJson(PENDING_KEY, []) : []));
  const [cloudLoaded, setCloudLoaded] = useState(!WORKER_URL);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const inFlight = useRef(false);
  const lastPull = useRef(0);

  useEffect(() => { writeJson(LOCAL_KEY, server); }, [server]);
  useEffect(() => { writeJson(PENDING_KEY, pending); }, [pending]);

  const accept = useCallback((s) => {
    if (hasContent(s)) setServer({ ...EMPTY_STATE, ...s });
  }, []);

  const pull = useCallback(async () => {
    if (!WORKER_URL) return;
    lastPull.current = Date.now();
    try {
      const r = await fetch(`${WORKER_URL}/epl/state`, { cache: 'no-store' });
      if (r.ok) accept(await r.json());
    } catch { /* offline — the copy we have stands */ }
    setCloudLoaded(true);
  }, [accept]);

  // Send whatever is waiting. Ops leave the queue only once the worker has
  // confirmed them, so a failed send is retried on the next change, the next
  // resume, or when the signal comes back.
  const flush = useCallback(async () => {
    if (!WORKER_URL || inFlight.current || !pendingRef.current.length) return;
    inFlight.current = true;
    const batch = pendingRef.current;
    try {
      const r = await fetch(`${WORKER_URL}/epl/ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ops: batch }),
      });
      let saved = null;
      if (r.ok) {
        saved = (await r.json()).state;
      } else if (r.status === 404) {
        // A worker that predates /epl/ops: apply to a fresh copy and upload
        // that. The worker's PUT only ever merges, so this is still safe.
        const g = await fetch(`${WORKER_URL}/epl/state`, { cache: 'no-store' });
        const fresh = g.ok ? await g.json() : null;
        const next = applyOps(fresh, batch);
        const p = await fetch(`${WORKER_URL}/epl/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (p.ok) saved = next;
      }
      if (saved) {
        accept(saved);
        setPending((q) => q.slice(batch.length));
      }
    } catch { /* offline — kept for next time */ }
    inFlight.current = false;
    // anything added while that was in the air
    if (pendingRef.current.length > batch.length) setTimeout(flush, 0);
  }, [accept]);

  // First load, then again whenever the app comes back to the screen, and
  // every so often while it stays there, so the Wall and the votes keep up
  // without anyone having to close and reopen it.
  useEffect(() => {
    if (!WORKER_URL) return undefined;
    pull().then(flush);
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastPull.current < RESUME_GAP) return;
      flush().then(pull);
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') flush().then(pull);
    }, PULL_EVERY);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', flush);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', flush);
    };
  }, [pull, flush]);

  useEffect(() => { if (pending.length) flush(); }, [pending, flush]);

  // Make a change. Without a worker the change is simply the state.
  const act = useCallback((op) => {
    if (!WORKER_URL) { setServer((s) => applyOp(s, op)); return; }
    setPending((q) => [...q, op]);
  }, []);

  const state = pending.length ? applyOps(server, pending) : server;
  return {
    state, act, cloudLoaded, synced: Boolean(WORKER_URL), unsaved: pending.length,
    reload: () => flush().then(pull),
  };
}
