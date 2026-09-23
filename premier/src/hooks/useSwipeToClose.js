import { useEffect, useRef } from 'react';

// Drag a sheet away: down, the way every bottom sheet on a phone works, or to
// the right, which is what people coming from the old full-screen pages try.
//
// Standalone web apps on iOS get no edge-swipe back at all, so the gesture
// lives in the app. The sheet follows the finger rather than snapping at the
// end, because a gesture you cannot see responding is one people stop
// trusting.
//
// Downward drags only take over when the content is already scrolled to the
// top; otherwise the finger is scrolling, not dismissing. The scrolling part
// of a sheet is marked with data-sheet-scroll.
export function useSwipeToClose(ref, onClose, enabled = true) {
  // read through a ref so a parent re-render mid-drag doesn't re-attach the
  // listeners and drop the gesture
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref && ref.current;
    if (!el || !enabled) return undefined;

    let startX = 0, startY = 0, dx = 0, dy = 0, startedAt = 0;
    let axis = null;          // null until the drag commits
    let active = false;
    let atTop = true;

    const paint = (x, y, animate) => {
      el.style.transition = animate ? 'transform .22s cubic-bezier(.2,.8,.2,1)' : 'none';
      el.style.transform = x || y ? `translate(${x}px, ${y}px)` : '';
    };

    const scrollerOf = (t) => (t.closest && t.closest('[data-sheet-scroll]')) || el.querySelector('[data-sheet-scroll]');

    const start = (e) => {
      if (e.touches.length !== 1) return;
      // Leave anything that scrolls sideways to do its own thing
      if (e.target.closest && e.target.closest('[data-noswipe]')) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      dx = 0; dy = 0; axis = null; startedAt = Date.now(); active = true;
      const sc = scrollerOf(e.target);
      atTop = !sc || sc.scrollTop <= 0;
    };

    const move = (e) => {
      if (!active) return;
      const t = e.touches[0];
      const ax = t.clientX - startX;
      const ay = t.clientY - startY;
      if (axis === null) {
        if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return;
        if (Math.abs(ax) > Math.abs(ay) * 1.3) axis = ax > 0 ? 'x' : 'none';
        else axis = ay > 0 && atTop ? 'y' : 'none';
      }
      if (axis === 'x') {
        dx = Math.max(0, ax);
        if (dx > 0) { e.preventDefault(); paint(dx, 0, false); }
      } else if (axis === 'y') {
        dy = Math.max(0, ay);
        if (dy > 0) { e.preventDefault(); paint(0, dy, false); }
      }
    };

    const end = () => {
      if (!active) return;
      active = false;
      if (axis !== 'x' && axis !== 'y') return;
      const dist = axis === 'x' ? dx : dy;
      const size = axis === 'x' ? (el.offsetWidth || window.innerWidth) : (el.offsetHeight || window.innerHeight);
      const speed = dist / Math.max(1, Date.now() - startedAt);   // px per ms
      if (dist > size * 0.28 || (speed > 0.45 && dist > 55)) {
        paint(axis === 'x' ? size : 0, axis === 'y' ? size : 0, true);
        setTimeout(() => close.current(), 180);
      } else {
        paint(0, 0, true);
      }
      dx = 0; dy = 0;
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
      paint(0, 0, false);
    };
  }, [enabled, ref]);
}
