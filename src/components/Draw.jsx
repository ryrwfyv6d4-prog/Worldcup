import { useState } from 'react';
import { GROUPS, ALL_TEAMS, getFlag } from '../data/worldcup2026.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function runDraw(names, drawType) {
  const pool =
    drawType === 'teams'
      ? shuffle(ALL_TEAMS)
      : shuffle(Object.keys(GROUPS).map((g) => `Group ${g}`));

  const n = names.length;
  const poolSize = pool.length;
  const perPerson = Math.floor(poolSize / n);
  const extras = poolSize % n;

  const assignments = {};
  let idx = 0;
  names.forEach((name, i) => {
    const count = perPerson + (i < extras ? 1 : 0);
    assignments[name] = pool.slice(idx, idx + count);
    idx += count;
  });
  return assignments;
}

export default function Draw({
  participants,
  setParticipants,
  assignments,
  setAssignments,
  drawType,
  setDrawType,
  drawLocked,
  setDrawLocked,
}) {
  const [nameInput, setNameInput] = useState(participants.join('\n'));
  const [animating, setAnimating] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const hasResults = Object.keys(assignments).length > 0;
  const isLocked = drawLocked && hasResults;

  const handleDraw = () => {
    const names = nameInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length < 1) {
      alert('Add at least one participant name.');
      return;
    }

    const pool = drawType === 'teams' ? ALL_TEAMS : Object.keys(GROUPS);
    if (names.length > pool.length) {
      alert(`Too many participants! Max ${pool.length} for ${drawType === 'teams' ? 'team' : 'group'} draw.`);
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      const result = runDraw(names, drawType);
      setParticipants(names);
      setAssignments(result);
      setAnimating(false);
    }, 600);
  };

  const handleLock = () => {
    if (hasResults) setDrawLocked(true);
  };

  const handleUnlock = () => {
    if (confirm('Unlock draw? You can redraw or edit participants, but your current points breakdown will still reflect the current teams.')) {
      setDrawLocked(false);
    }
  };

  const poolLabel = drawType === 'teams' ? `${ALL_TEAMS.length} teams` : `${Object.keys(GROUPS).length} groups`;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sweep Draw</h2>
        <p className="subtitle">
          {isLocked ? 'Draw locked — tap Manage Draw to edit.' : 'Enter participants, choose draw type, then spin.'}
        </p>
      </div>

      {isLocked && (
        <div className="lock-banner">
          <span className="lock-icon">🔒</span>
          <div className="lock-text">
            <strong>Draw is locked</strong>
            {participants.length} participant{participants.length !== 1 ? 's' : ''} · {drawType === 'teams' ? 'teams' : 'groups'}
          </div>
          <button className="btn-outline-gold" onClick={handleUnlock}>
            Manage
          </button>
        </div>
      )}

      {!isLocked && (
        <div className="card">
          <label className="field-label">Participants (one per line)</label>
          <textarea
            className="textarea"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            rows={8}
            placeholder={"Alice\nBob\nCharlie\nDiana"}
            disabled={animating}
          />

          <label className="field-label mt">Draw type</label>
          <div className="toggle-row">
            <button
              className={`toggle-btn ${drawType === 'teams' ? 'active' : ''}`}
              onClick={() => setDrawType('teams')}
              disabled={animating}
            >
              ⚽ By Team
            </button>
            <button
              className={`toggle-btn ${drawType === 'groups' ? 'active' : ''}`}
              onClick={() => setDrawType('groups')}
              disabled={animating}
            >
              🗂️ By Group
            </button>
          </div>
          <p className="hint">
            {drawType === 'teams'
              ? `Each person is randomly assigned teams from the pool of ${poolLabel}.`
              : `Each person is randomly assigned one or more of the ${poolLabel}.`}
          </p>

          <button
            className={`btn-primary ${animating ? 'spinning' : ''}`}
            onClick={handleDraw}
            disabled={animating}
          >
            {animating ? '🎲 Drawing…' : hasResults ? '🔄 Redraw' : '🎲 Run Draw'}
          </button>

          {hasResults && !drawLocked && (
            <button className="btn-primary sm mt" onClick={handleLock} style={{ width: '100%', background: 'var(--navy)', color: 'var(--gold)' }}>
              🔒 Lock draw
            </button>
          )}
        </div>
      )}

      {hasResults && (
        <div className="results-grid">
          {Object.entries(assignments).map(([name, items], idx) => (
            <div
              key={name}
              className={`result-card ${expandedCard === name ? 'expanded' : ''}`}
              onClick={() => setExpandedCard(expandedCard === name ? null : name)}
            >
              <div className="result-header">
                <span className="result-rank">#{idx + 1}</span>
                <span className="result-name">{name}</span>
                <span className="result-count">
                  {items.length} {drawType === 'teams' ? 'team' : 'group'}{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="result-items">
                {items.map((item) => (
                  <span key={item} className="badge">
                    {drawType === 'teams' ? getFlag(item) : '🗂️'} {item}
                  </span>
                ))}
              </div>
              {drawType === 'groups' && expandedCard === name && (
                <div className="group-detail">
                  {items.map((g) => {
                    const letter = g.replace('Group ', '');
                    return (
                      <div key={g} className="group-teams">
                        <strong>{g}</strong>
                        <div className="team-list">
                          {(GROUPS[letter] || []).map((t) => (
                            <span key={t} className="badge sm">
                              {getFlag(t)} {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
