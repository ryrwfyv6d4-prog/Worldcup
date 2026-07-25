import { useState } from 'react';
import { TEAMS, MEDALS, getTeam } from '../data/england2027.js';

// Medals the league feed can't decide for us. Someone in the shed ticks them.
const MANUAL = ['BIG_PUSH', 'CUP'];

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

export default function Honours({ state, update }) {
  const { assignments, manualMedals = {} } = state;
  const [medal, setMedal] = useState('BIG_PUSH');

  // Only clubs someone owns can earn anyone points
  const owned = TEAMS.filter((t) => ownerOf(t.name, assignments));
  const eligible = medal === 'BIG_PUSH' ? owned.filter((t) => t.div === 2) : owned;

  const has = (team) => (manualMedals[team] || []).includes(medal);
  const toggle = (team) => {
    update((s) => {
      const mm = { ...(s.manualMedals || {}) };
      const cur = mm[team] || [];
      mm[team] = cur.includes(medal) ? cur.filter((k) => k !== medal) : [...cur, medal];
      if (!mm[team].length) delete mm[team];
      return { manualMedals: mm };
    });
  };

  const awarded = Object.entries(manualMedals).flatMap(([team, keys]) =>
    keys.map((k) => ({ team, key: k }))
  );

  return (
    <>
      <p className="muted">
        Two honours aren't in the league data — the play-off final at Wembley and the
        domestic cups. Award them here once they're settled and the points land on the
        ladder immediately.
      </p>

      {owned.length === 0 && <p className="muted">Nothing to award until Conscription is run.</p>}

      {owned.length > 0 && (
        <>
          <div className="seg-row">
            {MANUAL.map((k) => (
              <button key={k} className={`seg ${medal === k ? 'on' : ''}`} onClick={() => setMedal(k)}>
                {MEDALS[k].label} +{MEDALS[k].pts}
              </button>
            ))}
          </div>

          <div className="card">
            <h3 className="section-title">{MEDALS[medal].label}</h3>
            <p className="muted small">{MEDALS[medal].detail}</p>
            {eligible.length === 0 && (
              <p className="muted small">No eligible clubs — the Big Push is Championship only.</p>
            )}
            <div className="chip-row">
              {eligible.map((t) => (
                <button
                  key={t.name}
                  className={`chip chip-toggle pot-${t.pot.toLowerCase()} ${has(t.name) ? 'on' : ''}`}
                  onClick={() => toggle(t.name)}
                >
                  {has(t.name) ? '🎖 ' : ''}{t.short}
                  <em>{ownerOf(t.name, assignments)}</em>
                </button>
              ))}
            </div>
          </div>

          {awarded.length > 0 && (
            <div className="card">
              <h3 className="section-title">Awarded</h3>
              {awarded.map(({ team, key }) => (
                <div className="medal-row" key={`${team}-${key}`}>
                  <span className="medal-label">🎖 {MEDALS[key].label}</span>
                  <span className="medal-detail">
                    {getTeam(team)?.short} · {ownerOf(team, assignments) || 'unclaimed'}
                  </span>
                  <span className="medal-pts">+{MEDALS[key].pts}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
