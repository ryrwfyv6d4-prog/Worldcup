import { useState } from 'react';
import { SCORING, SCORING_LABELS } from '../data/worldcup2026.js';

export default function Settings({ apiKey, setApiKey, onResetDraw, onClearCache }) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const saveKey = () => {
    setApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <h3 className="section-title">API Key</h3>
        <p className="hint">
          Get a free key at{' '}
          <a href="https://dashboard.api-football.com/register" target="_blank" rel="noreferrer">
            api-football.com
          </a>
          . Free tier: 100 requests/day, includes World Cup fixtures.
        </p>
        <div className="input-row">
          <input
            type="text"
            className="input"
            placeholder="Paste your API key here"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button className="btn-primary sm" onClick={saveKey}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {apiKey && (
          <p className="hint success">Key active: {apiKey.slice(0, 8)}…</p>
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
          Group stage: 3pts per win, 1pt per draw. Knockout rounds earn progressively higher points.
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
            {showConfirm ? 'Tap again to confirm reset' : 'Reset draw'}
          </button>
        </div>
        <p className="hint">
          Reset draw clears all participant assignments. Fixtures cache clears locally stored match data.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">About</h3>
        <p className="hint">
          World Cup Sweep 2026 · Open source · Data from api-football.com
        </p>
        <p className="hint">
          Install this app: tap the Share button in Safari then "Add to Home Screen".
        </p>
      </div>
    </div>
  );
}
