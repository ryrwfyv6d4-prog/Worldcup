import { useEffect, useRef, useState } from 'react';

// Pull down at the top of a page to refresh. iOS gives home-screen apps no
// pull-to-refresh of their own, so this is it. Returns how far the page has
// been pulled (0..1+) and whether a refresh is running, for the indicator.
//
// The listeners are attached once. The indicator re-renders the app on every
// frame of the drag, and re-attaching them then would reset the gesture
// halfway through, so the callback and the busy flag are read from refs.
export function usePullToRefresh(ref, onRefresh) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;
  const busyRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const THRESH = 70;
    let startY = 0, active = false, dist = 0;

    const start = (e) => {
      if (busyRef.current || el.scrollTop > 0 || e.touches.length !== 1) { active = false; return; }
      startY = e.touches[0].clientY; active = true; dist = 0;
    };
    const move = (e) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || el.scrollTop > 0) { dist = 0; setPull(0); return; }
      dist = dy * 0.5;                 // resistance, so it feels attached
      if (dist > 4) e.preventDefault();
      setPull(Math.min(dist / THRESH, 1.4));
    };
    const end = async () => {
      if (!active) return;
      active = false;
      if (dist >= THRESH) {
        busyRef.current = true; setBusy(true); setPull(1);
        try { await cb.current(); } catch { /* shown by the app's own error bar */ }
        busyRef.current = false; setBusy(false);
      }
      setPull(0);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
    };
  }, [ref]);

  return { pull, busy };
}
