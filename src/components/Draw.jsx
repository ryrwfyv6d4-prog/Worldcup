import { useState } from 'react';
import { GROUPS, TEAMS_BY_RANK, getFlag } from '../data/worldcup2026.js';

const TIER_COLOURS = ['#f59e0b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c'];

export default function Draw({ participants, assignments, drawType, onSelectTeam }) {
  const [expandedCard, setExpandedCard] = useState(null);

  const hasResults = Object.keys(assignments).length > 0;
  const isTiered = drawType === 'tiered';

  // Reconstruct tier info from persisted data for display labels
  const n = participants.length;
  const numTiers = isTiered && n > 0 ? Math.floor(TEAMS_BY_RANK.length / n) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sweep Draw</h2>
        <p className="subtitle">
          🔒 {participants.length} participants · {isTiered ? 'tiered' : 'teams'} draw
        </p>
      </div>

      {!hasResults && (
        <div className="card">
          <p className="hint">Draw hasn't been run yet.</p>
        </div>
      )}

      {hasResults && (
        <>
          {isTiered && numTiers > 0 && (
            <div className="card" style={{ marginBottom: 12, padding: '10px 14px' }}>
              <p className="hint" style={{ margin: 0 }}>
                ⚖️ <strong>Tiered draw</strong> — {numTiers} tiers × {n} teams.
                {' '}Each player has one team from each tier.
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {Array.from({ length: numTiers }, (_, i) => (
                  <span key={i} style={{
                    background: TIER_COLOURS[i] + '33',
                    border: `1px solid ${TIER_COLOURS[i]}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 12,
                    color: TIER_COLOURS[i],
                    fontWeight: 600,
                  }}>
                    T{i + 1}: #{i * n + 1}–{(i + 1) * n}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                    {items.length} {drawType === 'groups' ? 'group' : 'team'}{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="result-items">
                  {items.map((item) =>
                    drawType === 'groups' ? (
                      <span key={item} className="badge">🗂️ {item}</span>
                    ) : (
                      <button
                        key={item}
                        className="badge team-btn"
                        onClick={(e) => { e.stopPropagation(); onSelectTeam(item); }}
                        style={isTiered ? (() => {
                          const tierIdx = Math.floor(TEAMS_BY_RANK.indexOf(item) / n);
                          const col = TIER_COLOURS[tierIdx] || '#888';
                          return { borderColor: col };
                        })() : {}}
                      >
                        {getFlag(item)} {item}
                        {isTiered && (() => {
                          const tierIdx = Math.floor(TEAMS_BY_RANK.indexOf(item) / n);
                          const col = TIER_COLOURS[tierIdx] || '#888';
                          return (
                            <span style={{ fontSize: 9, fontWeight: 700, color: col, marginLeft: 4, opacity: 0.9 }}>
                              T{tierIdx + 1}
                            </span>
                          );
                        })()}
                      </button>
                    )
                  )}
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
                              <button
                                key={t}
                                className="badge sm team-btn"
                                onClick={(e) => { e.stopPropagation(); onSelectTeam(t); }}
                              >
                                {getFlag(t)} {t}
                              </button>
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
        </>
      )}
    </div>
  );
}
