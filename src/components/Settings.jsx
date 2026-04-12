import { useState } from 'react';
import { SCORING, SCORING_LABELS } from '../data/worldcup2026.js';

export default function Settings({ onResetDraw, onClearCache, currentUser, onChangeUser }) {
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
        <h3 className="section-title">You</h3>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1.05rem' }}>{currentUser}</strong>
              <p className="hint" style={{ marginTop: 2 }}>Your reactions and predictions are tracked under this name.</p>
            </div>
            <button className="btn-secondary" onClick={onChangeUser}>Change</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Watching anonymously</span>
            </div>
            <button className="btn-secondary" onClick={onChangeUser}>Set name</button>
          </div>
        )}
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
        <h3 className="section-title">Install App</h3>
        <div className="install-steps">
          <div className="install-step">
            <span className="install-num">1</span>
            <span>Open this page in <strong>Safari</strong> on your iPhone</span>
          </div>
          <div className="install-step">
            <span className="install-num">2</span>
            <span>Tap the <strong>Share</strong> button <span className="install-icon">⬆</span> at the bottom of the screen</span>
          </div>
          <div className="install-step">
            <span className="install-num">3</span>
            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </div>
          <div className="install-step">
            <span className="install-num">4</span>
            <span>Tap <strong>Add</strong> — the app icon appears on your home screen</span>
          </div>
        </div>
        <p className="hint mt">Works on Android too: tap the browser menu → "Add to Home Screen".</p>
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
      </div>
    </div>
  );
}
