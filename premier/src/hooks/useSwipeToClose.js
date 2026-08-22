import { useEffect } from 'react';

// Swipe a full-screen sheet away to the right.
//
// The app installs as standalone, and iOS gives standalone web apps no
// edge-swipe back gesture at all. So on anyone's home screen there was simply
// no flick-to-close: it worked in Safari, where the edge swipe drives browser
// history, and silently did nothing once installed. This puts the gesture in
// the app itself, so it behaves the same either way.
//
// The sheet follows the finger rather than snapping at the end, because a
// gesture you cannot see responding is one people stop trusting.
export function useSwipeToClose(ref, onClose, enabled = true) {
  useEffect(() => {
    const el = ref && ref.current;
    if (!el || !enabled) return undefined;

    let startX = 0, startY = 0, dx = 0, startedAt = 0;
    let axis = null;          // null until the drag commits to horizontal or vertical
    let active = false;

    const paint = (px, animate) => {
      el.style.transition = animate ? 'transform .2s ease-out' : 'none';
      el.style.transform = px ? `translateX(${px}px)` : '';
    };

    const start = (e) => {
      if (e.touches.length !== 1) return;
      // Leave anything that scrolls sideways to do its own thing
      if (e.target.closest && e.target.closest('[data-noswipe]')) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      dx = 0; axis = null; startedAt = Date.now(); active = true;
    };

    const move = (e) => {
      if (!active) return;
      const t = e.touches[0];
      const ax = t.clientX - startX;
      const ay = t.clientY - startY;

      // Decide once whether this is a sideways drag or a scroll, and stick to
      // it — otherwise a slightly wonky scroll starts dragging the sheet
      if (axis === null) {
        if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return;
        axis = Math.abs(ax) > Math.abs(ay) * 1.3 ? 'x' : 'y';
      }
      if (axis !== 'x') return;

      dx = Math.max(0, ax);                    // rightward only; this is a back gesture
      if (dx > 0) { e.preventDefault(); paint(dx, false); }
    };

    const end = () => {
      if (!active) return;
      active = false;
      if (axis !== 'x') return;
      const w = el.offsetWidth || window.innerWidth;
      const speed = dx / Math.max(1, Date.now() - startedAt);   // px per ms
      // Either a long drag or a quick flick counts
      if (dx > w * 0.3 || (speed > 0.45 && dx > 55)) {
        paint(w, true);
        setTimeout(onClose, 170);
      } else {
        paint(0, true);
      }
      dx = 0;
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);

    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      paint(0, false);
    };
  }, [enabled, onClose, ref]);
}
