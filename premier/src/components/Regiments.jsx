import { useState } from 'react';
import { TEAMS } from '../data/england2027.js';
import { priceRangeFor } from '../utils/odds.js';
import Crest from './Crest.jsx';
import { ownerOf } from '../utils/format.js';

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
      <p className="muted">All 44 clubs, who has them, and a bit of history.</p>
      <div className="seg-row">
        {['ALL', 'A', 'B', 'C', 'D'].map((k) => (
          <button key={k} className={`seg ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {k === 'ALL' ? 'All' : `Tier ${'ABCD'.indexOf(k) + 1}`}
          </button>
        ))}
      </div>

      <input
        className="poll-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search clubs…"
      />
      {needle && <p className="muted small">{shown.length} of {TEAMS.length} clubs</p>}

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
              {owner && <span className="reg-owner">{owner}</span>}
              <span className="chev" aria-hidden="true">›</span>
            </button>
            <div className="reg-meta">
              <span className="reg-pot">
                {t.div === 1 ? 'Premier League' : 'Championship'} · tipped {t.rank} of {t.div === 1 ? 20 : 24} · wins pay {priceRangeFor(t.name).lo}–{priceRangeFor(t.name).hi}
              </span>
            </div>
            <p className="reg-roots">{t.roots}</p>
          </div>
        );
      })}

    </div>
  );
}
