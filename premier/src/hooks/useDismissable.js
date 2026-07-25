import { useEffect } from 'react';

// One history entry for the whole overlay session, owned by App.
//
// Per-overlay entries don't work: closing a match sheet while opening a team
// sheet makes the old one's cleanup call history.back() *after* the new one has
// pushed, which pops the new entry and instantly closes the sheet that just
// opened. So `open` is "is any overlay showing" and `onClose` closes the top
// one — swapping between sheets never touches history.
export function useDismissable(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;

    window.history.pushState({ sheet: true }, '');
    const onPop = () => onClose();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };

    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      // Only consume our entry if a back-navigation hasn't already done it
      // (after popstate the state is the page's, not ours).
      if (window.history.state && window.history.state.sheet) {
        window.history.back();
      }
    };
  }, [open, onClose]);
}
