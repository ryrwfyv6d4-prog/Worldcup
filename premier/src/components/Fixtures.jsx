import { useMemo, useState } from 'react';
import { getTeam } from '../data/england2027.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Fixtures({ fixtures, assignments }) {
  const [div, setDiv] = useState(1);

  const matchdays = useMemo(() => {
    const mds = [...new Set(fixtures.filter((f) => f.division === div).map((f) => f.matchday))];
    return mds.sort((a, b) => a - b);
  }, [fixtures, div]);

  const nowMd = useMemo(() => {
    const now = Date.now();
    const upcoming = fixtures
      .filter((f) => f.division === div && f.utcDate && new Date(f.utcDate).getTime() > now - 36 * 3600 * 1000)
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    return upcoming.length ? upcoming[0].matchday : (matchdays[0] || 1);
  }, [fixtures, div, matchdays]);

  const [md, setMd] = useState(null);
  const shownMd = md ?? nowMd;
  const shown = fixtures
    .filter((f) => f.division === div && f.matchday === shownMd)
    .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));

  return (
    <div className="panel">
      <h2 className="panel-title">Orders</h2>
      <div className="seg-row">
        <button className={`seg ${div === 1 ? 'on' : ''}`} onClick={() => { setDiv(1); setMd(null); }}>Premier League</button>
        <button className={`seg ${div === 2 ? 'on' : ''}`} onClick={() => { setDiv(2); setMd(null); }}>Championship</button>
      </div>
      <div className="md-row">
        <button className="btn" onClick={() => setMd(Math.max(1, shownMd - 1))}>‹</button>
        <span className="md-label">Matchweek {shownMd}</span>
        <button className="btn" onClick={() => setMd(shownMd + 1)}>›</button>
      </div>

      {shown.map((f) => {
        const h = getTeam(f.homeTeam.name);
        const a = getTeam(f.awayTeam.name);
        const ho = ownerOf(f.homeTeam.name, assignments);
        const ao = ownerOf(f.awayTeam.name, assignments);
        return (
          <div className={`card fx-card ${f.status === 'IN_PLAY' ? 'live' : ''}`} key={f.id}>
            <div className="fx-date">{fmtDate(f.utcDate)}{f.status === 'IN_PLAY' && <span className="live-dot"> LIVE</span>}</div>
            <div className="fx-line">
              <span className="fx-team">
                {h ? h.short : f.homeTeam.name}
                {ho && <em className="fx-owner">{ho}</em>}
              </span>
              <span className="fx-score">
                {f.status === 'SCHEDULED' ? 'v' : `${f.score.home ?? ''}–${f.score.away ?? ''}`}
              </span>
              <span className="fx-team fx-away">
                {a ? a.short : f.awayTeam.name}
                {ao && <em className="fx-owner">{ao}</em>}
              </span>
            </div>
          </div>
        );
      })}
      {shown.length === 0 && <p className="muted">No fixtures for this matchweek.</p>}
    </div>
  );
}
