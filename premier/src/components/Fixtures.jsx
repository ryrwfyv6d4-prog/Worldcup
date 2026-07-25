import { useMemo, useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { matchValue } from '../utils/odds.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

function dayKey(iso) {
  return iso ? iso.slice(0, 10) : 'tbc';
}

function fmtDay(iso) {
  if (!iso) return 'Date TBC';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Fixtures({ fixtures, assignments, onOpenMatch, whoAmI }) {
  const [div, setDiv] = useState(1);
  const [md, setMd] = useState(null);
  const [mineOnly, setMineOnly] = useState(false);
  const myTeams = (assignments[whoAmI] || []).filter(Boolean);

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

  const shownMd = md ?? nowMd;
  const maxMd = matchdays[matchdays.length - 1] || 1;

  const byDay = useMemo(() => {
    const shown = fixtures
      .filter((f) => f.division === div && f.matchday === shownMd)
      .filter((f) => !mineOnly || myTeams.includes(f.homeTeam.name) || myTeams.includes(f.awayTeam.name))
      .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
    const groups = [];
    for (const f of shown) {
      const k = dayKey(f.utcDate);
      const last = groups[groups.length - 1];
      if (last && last.key === k) last.items.push(f);
      else groups.push({ key: k, label: fmtDay(f.utcDate), items: [f] });
    }
    return groups;
  }, [fixtures, div, shownMd, mineOnly, myTeams]);

  return (
    <div className="page">
      <div className="page-header"><h2>Orders</h2><span className="subtitle">Every fixture, both fronts — tap for the match sheet</span></div>
      <div className="seg-row">
        <button className={`seg ${div === 1 ? 'on' : ''}`} onClick={() => { setDiv(1); setMd(null); }}>Premier League</button>
        <button className={`seg ${div === 2 ? 'on' : ''}`} onClick={() => { setDiv(2); setMd(null); }}>Championship</button>
        {myTeams.length > 0 && (
          <button className={`seg ${mineOnly ? 'on' : ''}`} onClick={() => setMineOnly((v) => !v)}>★ Mine</button>
        )}
      </div>
      <div className="md-row">
        <button className="btn" onClick={() => setMd(Math.max(1, shownMd - 1))} disabled={shownMd <= 1}>‹</button>
        <span className="md-label">Matchweek {shownMd} <small>of {maxMd}</small></span>
        <button className="btn" onClick={() => setMd(Math.min(maxMd, shownMd + 1))} disabled={shownMd >= maxMd}>›</button>
      </div>
      {md != null && md !== nowMd && (
        <button className="btn btn-jump" onClick={() => setMd(null)}>↩ Back to this week</button>
      )}
      <p className="muted small">
        The number beside an owner is what a win there pays them. Tap a match for the full sheet.
      </p>

      {byDay.map((g) => (
        <div key={g.key}>
          <div className="fx-day-head">{g.label}</div>
          {g.items.map((f) => {
            const h = getTeam(f.homeTeam.name);
            const a = getTeam(f.awayTeam.name);
            const ho = ownerOf(f.homeTeam.name, assignments);
            const ao = ownerOf(f.awayTeam.name, assignments);
            return (
              <button className={`card fx-card ${f.status === 'IN_PLAY' ? 'live' : ''}`} key={f.id} onClick={() => onOpenMatch(f)}>
                <div className="fx-line">
                  <span className="fx-team">
                    <span className="fx-team-name">{h ? h.short : f.homeTeam.name}</span>
                    {ho && (
                      <em className={`fx-owner pot-text-${h?.pot.toLowerCase()}`}>
                        {ho} <b>+{matchValue(f.homeTeam.name, f.awayTeam.name, true).win}</b>
                      </em>
                    )}
                  </span>
                  <span className="fx-mid">
                    <span className="fx-score">
                      {f.status === 'SCHEDULED' ? fmtTime(f.utcDate) : `${f.score.home ?? ''}–${f.score.away ?? ''}`}
                    </span>
                    {f.status === 'IN_PLAY' && <span className="live-dot">LIVE</span>}
                  </span>
                  <span className="fx-team fx-away">
                    <span className="fx-team-name">{a ? a.short : f.awayTeam.name}</span>
                    {ao && (
                      <em className={`fx-owner pot-text-${a?.pot.toLowerCase()}`}>
                        <b>+{matchValue(f.awayTeam.name, f.homeTeam.name, false).win}</b> {ao}
                      </em>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
      {byDay.length === 0 && (
        <p className="muted">
          {mineOnly
            ? 'None of your four clubs play in this matchweek — turn ★ Mine off to see the rest.'
            : 'No fixtures for this matchweek.'}
        </p>
      )}
    </div>
  );
}
