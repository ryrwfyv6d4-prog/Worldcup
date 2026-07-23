import { useState } from 'react';
import { TEAMS, POT_LABELS, POT_POINTS, MEDALS } from '../data/england2027.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

export default function Regiments({ assignments }) {
  const [filter, setFilter] = useState('ALL');
  const shown = TEAMS.filter((t) => filter === 'ALL' || t.pot === filter);

  return (
    <div className="panel">
      <h2 className="panel-title">The Regiments</h2>
      <p className="muted">Every club and where it really came from. Know your unit.</p>
      <div className="seg-row">
        {['ALL', 'A', 'B', 'C', 'D'].map((k) => (
          <button key={k} className={`seg ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {k === 'ALL' ? 'All' : `Pot ${k}`}
          </button>
        ))}
      </div>

      {shown.map((t) => {
        const owner = ownerOf(t.name, assignments);
        return (
          <div className={`card regiment pot-border-${t.pot.toLowerCase()}`} key={t.name}>
            <div className="reg-head">
              <span className="reg-name">{t.short}</span>
              <span className="reg-codename">{t.codename}</span>
            </div>
            <div className="reg-meta">
              <span className="reg-pot">{POT_LABELS[t.pot]} · win {POT_POINTS[t.pot].win} / draw {POT_POINTS[t.pot].draw}</span>
              {owner && <span className="reg-owner">CO: {owner}</span>}
            </div>
            <p className="reg-roots">{t.roots}</p>
          </div>
        );
      })}

      <div className="card">
        <h3>Medal table</h3>
        {Object.entries(MEDALS).map(([k, m]) => (
          <div className="medal-row" key={k}>
            <span className="medal-label">🎖 {m.label}</span>
            <span className="medal-detail">{m.detail}</span>
            <span className="medal-pts">+{m.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
