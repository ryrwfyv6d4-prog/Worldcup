import { useState } from 'react';
import { SCORING, SCORING_LABELS } from '../data/worldcup2026.js';

export default function Settings({ onResetDraw, onClearCache }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    if (showConfirm) {
      onResetDraw();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 5000);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card">
        <h3 className="section-title">Scoring System</h3>
        <div className="score-grid">
          {Object.entries(SCORING_LABELS).map(([key, label]) => (
            <div key={key} className="score-row">
              <span>{label}</span>
              <span className="score-pts">+{SCORING[key]} pts</span>
            </div>
          ))}
        </div>
        <p className="hint mt">
          Group stage: 3pts per win, 1pt per draw. Knockout rounds earn progressively more.
          Runner-up gets +10pts bonus.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Data</h3>
        <div className="btn-group">
          <button className="btn-secondary" onClick={onClearCache}>
            Clear fixtures cache
          </button>
          <button
            className={`btn-danger ${showConfirm ? 'confirm' : ''}`}
            onClick={handleReset}
          >
            {showConfirm ? 'Tap again to confirm' : 'Reset draw'}
          </button>
        </div>
        <p className="hint">
          Reset clears all participant assignments and unlocks the draw.
          Clear cache refreshes stored match data.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">About</h3>
        <p className="hint">
          <strong>Dan's Shed · World Cup Sweep '26</strong>
        </p>
        <p className="hint">
          Fixtures from{' '}
          <a href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noreferrer">
            openfootball
          </a>
          {' '}— free &amp; open, no API key needed.
        </p>
        <p className="hint">
          Install on iPhone: tap Share in Safari → "Add to Home Screen".
        </p>
      </div>
    </div>
  );
}
