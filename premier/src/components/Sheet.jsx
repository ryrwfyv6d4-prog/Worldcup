import { useRef } from 'react';
import { useSwipeToClose } from '../hooks/useSwipeToClose.js';

// A panel that slides up from the bottom and swipes down to close. Used for
// everything that isn't a whole page: who you are, your squad, a player's
// numbers, how points work.
export default function Sheet({ onClose, title, className = '', children, footer }) {
  const ref = useRef(null);
  useSwipeToClose(ref, onClose);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={`sheet ${className}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        {title && (
          <div className="sheet-head">
            <div className="sheet-title">{title}</div>
            <button className="sheet-x" onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className="sheet-body" data-sheet-scroll>{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
