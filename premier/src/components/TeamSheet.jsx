import { useMemo } from 'react';
import { getTeam, POT_LABELS, POT_POINTS } from '../data/england2027.js';
import { leagueTable, formForTeam, positionOf, teamPoints } from '../utils/scoring.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function TeamSheet({ team, fixtures, assignments, onClose }) {
  const info = getTeam(team);
  const table = useMemo(() => (info ? leagueTable(fixtures, info.div) : []), [fixtures, info]);
  if (!info) return null;

  const owner = ownerOf(team, assignments);
  const pos = positionOf(team, table);
  const row = table.find((r) => r.team === team);
  const form = formForTeam(team, fixtures);
  const pts = teamPoints(team, fixtures);
  const next = fixtures
    .filter((f) => f.status === 'SCHEDULED' && (f.homeTeam.name === team || f.awayTeam.name === team))
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''))[0];

  return (
    <div className="ms-backdrop" onClick={onClose}>
      <div className="ms-topbar">
        <button className="ms-back" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <span className="ms-back-chevron">‹</span>Back
        </button>
        <div className="ms-drag-handle" />
        <div className="ms-topbar-end" />
      </div>
      <div className="ms-sheet" onClick={(e) => e.stopPropagation()}>
        <div className={`card regiment pot-border-${info.pot.toLowerCase()}`} style={{ marginTop: 8 }}>
          <div className="reg-head">
            <span className="reg-name">{info.short}</span>
            <span className="reg-codename">{info.codename}</span>
          </div>
          <div className="reg-meta">
            <span className="reg-pot">{POT_LABELS[info.pot]} · win {POT_POINTS[info.pot].win} / draw {POT_POINTS[info.pot].draw}</span>
            {owner && <span className="reg-owner">CO: {owner}</span>}
          </div>
          <p className="reg-roots">{info.roots}</p>
        </div>

        <div className="card">
          <div className="en-ms-stats">
            <div className="en-ms-stat"><b>{row && row.p > 0 ? ordinal(pos) : '—'}</b><span>{info.div === 1 ? 'Premier League' : 'Championship'}</span></div>
            <div className="en-ms-stat"><b>{row ? `${row.w}-${row.d}-${row.l}` : '—'}</b><span>W-D-L</span></div>
            <div className="en-ms-stat"><b>{row ? `${row.gf}:${row.ga}` : '—'}</b><span>goals</span></div>
            <div className="en-ms-stat"><b>{pts.total}</b><span>sweep pts</span></div>
            <div className="en-ms-form">
              {form.length
                ? <span className="pips">{form.map((r, i) => <span key={i} className={`pip pip-${r.toLowerCase()}`}>{r}</span>)}</span>
                : <span className="pip-none">no results yet</span>}
            </div>
          </div>
        </div>

        {next && (
          <div className="card">
            <div className="en-ms-h2h">
              <span className="en-ms-h2h-label">Next orders</span>
              <span>
                {getTeam(next.homeTeam.name)?.short} v {getTeam(next.awayTeam.name)?.short}
                {next.utcDate && ` — ${new Date(next.utcDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
