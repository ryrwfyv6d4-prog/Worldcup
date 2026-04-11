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
  const total = TEAMS_BY_RANK.length; // 48
  const numTiers = Math.floor(total / n);
  const leftover = total % n;

  // Build full tiers and shuffle within each
  const tiers = [];
  for (let t = 0; t < numTiers; t++) {
    const tier = TEAMS_BY_RANK.slice(t * n, (t + 1) * n);
    tiers.push(shuffle(tier));
  }

  // Leftover minnow teams distributed randomly to some players
  const leftovers = leftover > 0 ? shuffle(TEAMS_BY_RANK.slice(numTiers * n)) : [];

  // Assign: each player gets one from each full tier, plus a bonus minnow if leftover
  const shuffledNames = shuffle([...names]);
  const assignments = {};
  shuffledNames.forEach((name, i) => {
    const teams = tiers.map((tier) => tier[i]);
    if (i < leftovers.length) teams.push(leftovers[i]);
    assignments[name] = teams;
  });
  return { assignments, numTiers, teamsUsed: total, teamsDropped: 0, n };
}

// Get tier number (1-based) for a team in a tiered draw
function getTierLabel(team, numTiers, n) {
  const idx = TEAMS_BY_RANK.indexOf(team);
  if (idx === -1) return null;
  const tier = Math.floor(idx / n) + 1;
  return tier <= numTiers ? `T${tier}` : null;
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
  const [tierInfo, setTierInfo] = useState(null); // { numTiers, teamsUsed, teamsDropped }

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
        const { assignments: result, numTiers, teamsUsed, teamsDropped } = runTieredDraw(names);
        setParticipants(names);
        setAssignments(result);
        setTierInfo({ numTiers, teamsUsed, teamsDropped, n: names.length });
      } else {
        setTierInfo(null);
        const result = runFlatDraw(names, drawType);
        setParticipants(names);
        setAssignments(result);
      }
      setAnimating(false);
    }, 600);
  };

  const handleLock = () => {
    if (hasResults) setDrawLocked(true);
  };

  const handleUnlock = () => {
    if (confirm('Unlock draw? You can redraw or edit participants.')) {
      setDrawLocked(false);
    }
  };

  const poolLabel = drawType === 'teams' ? `${ALL_TEAMS.length} teams` : `${Object.keys(GROUPS).length} groups`;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sweep Draw</h2>
        <p className="subtitle">
          {isLocked ? 'Draw locked — tap Manage to edit.' : 'Enter participants, choose draw type, then spin.'}
        </p>
      </div>

      {isLocked && (
        <div className="lock-banner">
          <span className="lock-icon">🔒</span>
          <div className="lock-text">
            <strong>Draw is locked</strong>
            {participants.length} participant{participants.length !== 1 ? 's' : ''} · {drawType === 'tiered' ? 'tiered' : drawType === 'teams' ? 'teams' : 'groups'}
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
            <button
              className={`toggle-btn ${drawType === 'tiered' ? 'active' : ''}`}
              onClick={() => setDrawType('tiered')}
              disabled={animating}
            >
              ⚖️ Tiered
            </button>
          </div>

          <p className="hint">
            {drawType === 'tiered'
              ? `Teams ranked by FIFA ranking are split into tiers equal to your player count. Everyone draws one team per tier — guaranteed fair split.`
              : drawType === 'teams'
              ? `Each person is randomly assigned teams from the pool of ${poolLabel}.`
              : `Each person is randomly assigned one or more of the ${poolLabel}.`}
          </p>

          {drawType === 'tiered' && (() => {
            const n = nameInput.split('\n').map(s => s.trim()).filter(Boolean).length;
            if (n < 2) return null;
            const numTiers = Math.floor(48 / n);
            const used = numTiers * n;
            const dropped = 48 - used;
            return (
              <div className="hint" style={{ marginTop: 4, color: 'var(--gold)' }}>
                {n} players → {numTiers} tiers of {n} teams = {used} teams used
                {dropped > 0 ? `, ${dropped} weakest teams dropped` : ', all 48 teams included'}.
              </div>
            );
          })()}

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
        <>
          {tierInfo && (
            <div className="card" style={{ marginBottom: 12, padding: '10px 14px' }}>
              <p className="hint" style={{ margin: 0 }}>
                ⚖️ <strong>Tiered draw</strong> — {tierInfo.numTiers} tiers × {tierInfo.n} teams.
                {' '}Each player has one team from each tier.
                {tierInfo.teamsDropped > 0 && ` (${tierInfo.teamsDropped} lowest-ranked teams not included)`}
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {Array.from({ length: tierInfo.numTiers }, (_, i) => (
                  <span key={i} style={{
                    background: TIER_COLOURS[i] + '33',
                    border: `1px solid ${TIER_COLOURS[i]}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 12,
                    color: TIER_COLOURS[i],
                    fontWeight: 600,
                  }}>
                    T{i + 1}: #{i * tierInfo.n + 1}–{(i + 1) * tierInfo.n}
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
                    {items.length} {drawType === 'teams' || drawType === 'tiered' ? 'team' : 'group'}{items.length !== 1 ? 's' : ''}
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
                        style={tierInfo ? (() => {
                          const tierIdx = Math.floor(TEAMS_BY_RANK.indexOf(item) / tierInfo.n);
                          const col = TIER_COLOURS[tierIdx] || '#888';
                          return { borderColor: col, position: 'relative' };
                        })() : {}}
                      >
                        {getFlag(item)} {item}
                        {tierInfo && (() => {
                          const tierIdx = Math.floor(TEAMS_BY_RANK.indexOf(item) / tierInfo.n);
                          const col = TIER_COLOURS[tierIdx] || '#888';
                          return (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: col,
                              marginLeft: 4,
                              opacity: 0.9,
                            }}>T{tierIdx + 1}</span>
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
