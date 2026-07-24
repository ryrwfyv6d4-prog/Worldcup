import { useEffect } from 'react';

// Makes an overlay (sheet/modal) dismissable by the phone/browser Back button
// and the Escape key. While `open`, pushes one history entry; a back-navigation
// pops it and calls onClose instead of leaving the app.
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
      // If we're unmounting for a reason other than a back-nav (e.g. the Back
      // button in-sheet), consume the history entry we pushed.
      if (window.history.state && window.history.state.sheet) {
        window.history.back();
      }
    };
  }, [open, onClose]);
}
