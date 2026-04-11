import { useState } from 'react';
import { GROUPS, ALL_TEAMS, TEAMS_BY_RANK, getFlag } from '../data/worldcup2026.js';

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Flat random draw — same as before
function runFlatDraw(names, drawType) {
    const pool =
          drawType === 'groups'
        ? shuffle(Object.keys(GROUPS).map((g) => `Group ${g}`))
            : shuffle(ALL_TEAMS);

  const n = names.length;
    const perPerson = Math.floor(pool.length / n);
    const extras = pool.length % n;
    const assignments = {};
    let idx = 0;
    names.forEach((name, i) => {
          const count = perPerson + (i < extras ? 1 : 0);
          assignments[name] = pool.slice(idx, idx + count);
          idx += count;
    });
    return assignments;
}

// Tiered draw — each player gets one team per tier
// Scales to any player count: tiers of n players, bottom teams dropped if 48 % n != 0
function runTieredDraw(names) {
    const n = names.length;
    const numTiers = Math.floor(TEAMS_BY_RANK.length / n);
    const teamsUsed = numTiers * n;

  // Build tiers and shuffle within each
  const tiers = [];
    for (let t = 0; t < numTiers; t++) {
          const tier = TEAMS_BY_RANK.slice(t * n, (t + 1) * n);
          tiers.push(shuffle(tier));
    }

  // Each player gets one team from each tier
  const shuffledNames = shuffle([...names]);
    const assignments = {};
    shuffledNames.forEach((name, i) => {
          assignments[name] = tiers.map((tier) => tier[i]);
    });
    return { assignments, numTiers, teamsUsed, teamsDropped: TEAMS_BY_RANK.length - teamsUsed, n };
}

const TIER_COLOURS = ['#f59e0b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c'];

export default function Draw({
    participants,
    setParticipants,
    assignments,
    setAssignments,
    drawType,
    setDrawType,
    drawLocked,
    setDrawLocked,
    onSelectTeam,
}) {
    const [nameInput, setNameInput] = useState(participants.join('\n'));
    const [animating, setAnimating] = useState(false);
    const [expandedCard, setExpandedCard] = useState(null);
    const [tierInfo, setTierInfo] = useState(null);

  const hasResults = Object.keys(assignments).length > 0;
    const isLocked = drawLocked && hasResults;
    const isTiered = drawType === 'tiered';

  const handleDraw = () => {
        const names = nameInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

        if (names.length < 1) {
                alert('Add at least one participant name.');
                return;
        }

        if (isTiered) {
                const numTiers = Math.floor(TEAMS_BY_RANK.length / names.length);
                if (numTiers < 1) {
                          alert(`Too many participants for a tiered draw! Max ${TEAMS_BY_RANK.length} players.`);
                          return;
                }
        } else {
                const pool = drawType === 'teams' ? ALL_TEAMS : Object.keys(GROUPS);
                if (names.length > pool.length) {
                          alert(`Too many participants! Max ${pool.length} for ${drawType === 'teams' ? 'team' : 'group'} draw.`);
                          return;
                }
        }

        setAnimating(true);
        setTimeout(() => {
                if (isTiered) {
                          const result = runTieredDraw(names);
                          setParticipants(names);
                          setAssignments(result.assignments);
                          setTierInfo({ numTiers: result.numTiers, teamsUsed: result.teamsUsed, teamsDropped: result.teamsDropped, n: result.n });
                } else {
                          setTierInfo(null);
                          setParticipants(names);
                          setAssignments(runFlatDraw(names, drawType));
                }
                setAnimating(false);
        }, 600);
  };

  const handleLock = () => { if (hasResults) setDrawLocked(true); };
    const handleUnlock = () => {
          if (confirm('Unlock draw? You can redraw or edit participants.')) setDrawLocked(false);
    };

  const poolLabel = drawType === 'teams' ? `${ALL_TEAMS.length} teams` : `${Object.keys(GROUPS).length} groups`;

  return (
        <div className="page">
              <div className="page-header">
                      <h2>Sweep Draw</h2>h2>
                      <p className="subtitle">
                        {isLocked ? 'Draw locked — tap Manage to edit.' : 'Enter participants, choose draw type, then spin.'}
                      </p>p>
              </div>div>
        
          {isLocked && (
                  <div className="lock-banner">
                            <span className="lock-icon">🔒</span>span>
                            <div className="lock-text">
                                        <strong>Draw is locked</strong>strong>
                              {participants.length} participant{participants.length !== 1 ? 's' : ''} · {drawType === 'tiered' ? 'tiered' : drawType === 'teams' ? 'teams' : 'groups'}
                            </div>div>
                            <button className="btn-outline-gold" onClick={handleUnlock}>Manage</button>button>
                  </div>div>
              )}
        
          {!isLocked && (
                  <div className="card">
                            <label className="field-label">Participants (one per line)</label>label>
                            <textarea
                                          className="textarea"
                                          value={nameInput}
                                          onChange={(e) => setNameInput(e.target.value)}
                                          rows={8}
                                          placeholder={"Alice\nBob\nCharlie\nDiana"}
                                          disabled={animating}
                                        />
                  
                            <label className="field-label mt">Draw type</label>label>
                            <div className="toggle-row">
                                        <button className={`toggle-btn ${drawType === 'teams' ? 'active' : ''}`} onClick={() => setDrawType('teams')} disabled={animating}>
                                                      ⚽ By Team
                                        </button>button>
                                        <button className={`toggle-btn ${drawType === 'groups' ? 'active' : ''}`} onClick={() => setDrawType('groups')} disabled={animating}>
                                                      🗂️ By Group
                                        </button>button>
                                        <button className={`toggle-btn ${drawType === 'tiered' ? 'active' : ''}`} onClick={() => setDrawType('tiered')} disabled={animating}>
                                                      ⚖️ Tiered
                                        </button>button>
                            </div>div>
                  
                            <p className="hint">
                              {drawType === 'tiered'
                                              ? 'Teams ranked by FIFA ranking are split into tiers equal to your player count. Everyone draws one team per tier — guaranteed fair split.'
                                              : drawType === 'teams'
                                              ? `Each person is randomly assigned teams from the pool of ${poolLabel}.`
                                              : `Each person is randomly assigned one or more of the ${poolLabel}.`}
                            </p>p>
                  
                    {drawType === 'tiered' && (() => {
                                const n = nameInput.split('\n').map(s => s.trim()).filter(Boolean).length;
                                if (n < 2) return null;
                                const numTiers = Math.floor(48 / n);
                                const used = numTiers * n;
                                const dropped = 48 - used;
                                return (
                                                <p className="hint" style={{ color: 'var(--gold)', marginTop: 4 }}>
                                                  {n} players → {numTiers} tiers of {n} = {used} teams used{dropped > 0 ? `, ${dropped} weakest dropped` : ', all 48 included'}.
                                                </p>p>
                                              );
                  })()}
                  
                            <button className={`btn-primary ${animating ? 'spinning' : ''}`} onClick={handleDraw} disabled={animating}>
                              {animating ? '🎲 Drawing…' : hasResults ? '🔄 Redraw' : '🎲 Run Draw'}
                            </button>button>
                  
                    {hasResults && !drawLocked && (
                                <button className="btn-primary sm mt" onClick={handleLock} style={{ width: '100%', background: 'var(--navy)', color: 'var(--gold)' }}>
                                              🔒 Lock draw
                                </button>button>
                            )}
                  </div>div>
              )}
        
          {hasResults && (
                  <>
                    {tierInfo && (
                                <div className="card" style={{ marginBottom: 12, padding: '10px 14px' }}>
                                              <p className="hint" style={{ margin: 0 }}>
                                                              ⚖️ <strong>Tiered draw</strong>strong> — {tierInfo.numTiers} tiers × {tierInfo.n} teams. Each player has one team from each tier.
                                                {tierInfo.teamsDropped > 0 && ` (${tierInfo.teamsDropped} lowest-ranked teams not included)`}
                                              </p>p>
                                              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                                {Array.from({ length: tierInfo.numTiers }, (_, i) => (
                                                    <span key={i} style={{
                                                                          background: TIER_COLOURS[i] + '33',
                                                                          border: `1px solid ${TIER_COLOURS[i]}`,
                                                                          borderRadius: 4, padding: '2px 8px',
                                                                          fontSize: 12, color: TIER_COLOURS[i], fontWeight: 600,
                                                    }}>
                                                                        T{i + 1}: #{i * tierInfo.n + 1}–{(i + 1) * tierInfo.n}
                                                    </span>span>
                                                  ))}
                                              </div>div>
                                </div>div>
                            )}
                  
                            <div className="results-grid">
                              {Object.entries(assignments).map(([name, items], idx) => (
                                  <div
                                                    key={name}
                                                    className={`result-card ${expandedCard === name ? 'expanded' : ''}`}
                                                    onClick={() => setExpandedCard(expandedCard === name ? null : name)}
                                                  >
                                                  <div className="result-header">
                                                                    <span className="result-rank">#{idx + 1}</span>span>
                                                                    <span className="result-name">{name}</span>span>
                                                                    <span className="result-count">
                                                                      {items.length} {drawType === 'groups' ? 'group' : 'team'}{items.length !== 1 ? 's' : ''}
                                                                    </span>span>
                                                  </div>div>
                                                  <div className="result-items">
                                                    {items.map((item) =>
                                                                        drawType === 'groups' ? (
                                                                                                <span key={item} className="badge">🗂️ {item}</span>span>
                                                                                              ) : (
                                                                                                <button
                                                                                                                          key={item}
                                                                                                                          className="badge team-btn"
                                                                                                                          onClick={(e) => { e.stopPropagation(); onSelectTeam(item); }}
                                                                                                                          style={tierInfo ? (() => {
                                                                                                                                                      const ti = Math.floor(TEAMS_BY_RANK.indexOf(item) / tierInfo.n);
                                                                                                                                                      return { borderColor: TIER_COLOURS[ti] || '#888' };
                                                                                                                            })() : {}}
                                                                                                                        >
                                                                                                  {getFlag(item)} {item}
                                                                                                  {tierInfo && (() => {
                                                                                                                                                    const ti = Math.floor(TEAMS_BY_RANK.indexOf(item) / tierInfo.n);
                                                                                                                                                    return <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLOURS[ti] || '#888', marginLeft: 4 }}>T{ti + 1}</span>span>;
                                                                                                                          })()}
                                                                                                  </button>button>
                                                                                              )
                                                                      )}
                                                  </div>div>
                                    {drawType === 'groups' && expandedCard === name && (
                                                                      <div className="group-detail">
                                                                        {items.map((g) => {
                                                                                              const letter = g.replace('Group ', '');
                                                                                              return (
                                                                                                                        <div key={g} className="group-teams">
                                                                                                                                                  <strong>{g}</strong>strong>
                                                                                                                                                  <div className="team-list">
                                                                                                                                                    {(GROUPS[letter] || []).map((t) => (
                                                                                                                                                        <button key={t} className="badge sm team-btn" onClick={(e) => { e.stopPropagation(); onSelectTeam(t); }}>
                                                                                                                                                          {getFlag(t)} {t}
                                                                                                                                                          </button>button>
                                                                                                                                                      ))}
                                                                                                                                                    </div>div>
                                                                                                                          </div>div>
                                                                                                                      );
                                                                      })}
                                                                      </div>div>
                                                  )}
                                  </div>div>
                                ))}
                            </div>div>
                  </>>
                )}
        </div>div>
      );
}</></div>
