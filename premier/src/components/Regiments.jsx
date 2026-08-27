import { useState } from 'react';
import { TEAMS, POT_LABELS } from '../data/england2027.js';
import { priceRangeFor } from '../utils/odds.js';
import Crest from './Crest.jsx';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

export default function Regiments({ assignments, onSelectTeam }) {
  const [filter, setFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = TEAMS
    .filter((t) => filter === 'ALL' || t.pot === filter)
    .filter((t) => !needle ||
      t.short.toLowerCase().includes(needle) ||
      t.name.toLowerCase().includes(needle) ||
      t.codename.toLowerCase().includes(needle) ||
      t.roots.toLowerCase().includes(needle));

  return (
    <div>
      <p className="muted">Every club and where it really came from. Know your unit.</p>
      <div className="seg-row">
        {['ALL', 'A', 'B', 'C', 'D'].map((k) => (
          <button key={k} className={`seg ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {k === 'ALL' ? 'All' : `Pot ${k}`}
          </button>
        ))}
      </div>

      <input
        className="poll-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search club, codename or history…"
      />
      {needle && <p className="muted small">{shown.length} of {TEAMS.length} regiments</p>}

      {shown.map((t) => {
        const owner = ownerOf(t.name, assignments);
        return (
          <div className={`card regiment pot-border-${t.pot.toLowerCase()}`} key={t.name}>
            {/* These were the only club references in the app that did not open
                a club page, because the handler was never forwarded this far. */}
            <button
              type="button"
              className="reg-head reg-head-btn"
              onClick={() => onSelectTeam && onSelectTeam(t.name)}
              disabled={!onSelectTeam}
            >
              <Crest team={t.name} size={34} className="reg-crest" />
              <span className="reg-name">{t.short}</span>
              <span className="reg-codename">{t.codename}</span>
            </button>
            <div className="reg-meta">
              <span className="reg-pot">
                {POT_LABELS[t.pot]} · tipped {t.rank} of {t.div === 1 ? 20 : 24} · wins pay {priceRangeFor(t.name).lo}–{priceRangeFor(t.name).hi}
              </span>
              {owner && <span className="reg-owner">CO: {owner}</span>}
            </div>
            <p className="reg-roots">{t.roots}</p>
          </div>
        );
      })}

    </div>
  );
}
