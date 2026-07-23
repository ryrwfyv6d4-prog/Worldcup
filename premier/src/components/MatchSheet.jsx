import { useMemo } from 'react';
import { getTeam, POT_POINTS, POT_LABELS } from '../data/england2027.js';
import { getRivalry } from '../data/rivalries.js';
import { leagueTable, formForTeam, positionOf, reverseFixture } from '../utils/scoring.js';

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

function fmtLong(iso) {
  if (!iso) return 'Date TBC';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function FormPips({ form }) {
  if (!form.length) return <span className="pip-none">no results yet</span>;
  return (
    <span className="pips">
      {form.map((r, i) => <span key={i} className={`pip pip-${r.toLowerCase()}`}>{r}</span>)}
    </span>
  );
}

function SideStats({ team, table, fixtures }) {
  const row = table.find((r) => r.team === team);
  const pos = positionOf(team, table);
  const form = formForTeam(team, fixtures);
  return (
    <div className="ms-stats">
      <div className="ms-stat"><b>{ordinal(pos)}</b><span>position</span></div>
      <div className="ms-stat"><b>{row ? `${row.w}-${row.d}-${row.l}` : '—'}</b><span>W-D-L</span></div>
      <div className="ms-stat"><b>{row ? `${row.gf}:${row.ga}` : '—'}</b><span>goals</span></div>
      <div className="ms-form"><FormPips form={form} /></div>
    </div>
  );
}

export default function MatchSheet({ fixture, fixtures, assignments, onClose }) {
  const table = useMemo(() => leagueTable(fixtures, fixture.division), [fixtures, fixture.division]);
  const home = getTeam(fixture.homeTeam.name);
  const away = getTeam(fixture.awayTeam.name);
  const rivalry = getRivalry(fixture.homeTeam.name, fixture.awayTeam.name);
  const rev = reverseFixture(fixture, fixtures);

  const sides = [
    { info: home, name: fixture.homeTeam.name, score: fixture.score.home },
    { info: away, name: fixture.awayTeam.name, score: fixture.score.away },
  ];

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose}>×</button>
        <div className="ms-meta">
          {fixture.division === 1 ? 'Premier League' : 'Championship'} · Matchweek {fixture.matchday}
          <br />{fmtLong(fixture.utcDate)}
        </div>

        <div className="ms-teams">
          {sides.map((s, i) => {
            const owner = ownerOf(s.name, assignments);
            const rate = s.info ? POT_POINTS[s.info.pot] : null;
            return (
              <div className={`ms-side ${i === 1 ? 'away' : ''}`} key={s.name}>
                <div className="ms-team-name">{s.info ? s.info.short : s.name}</div>
                <div className="ms-codename">{s.info?.codename}</div>
                {owner ? (
                  <div className="ms-owner">
                    <b>{owner}</b>
                    {rate && <span> · win +{rate.win} / draw +{rate.draw}</span>}
                  </div>
                ) : (
                  <div className="ms-owner unowned">unclaimed</div>
                )}
              </div>
            );
          })}
          <div className="ms-score">
            {fixture.status === 'SCHEDULED' ? 'v' : `${fixture.score.home ?? ''}–${fixture.score.away ?? ''}`}
          </div>
        </div>

        {rivalry && (
          <div className="ms-rivalry">
            <div className="ms-rivalry-title">⚔️ {rivalry.title}</div>
            <p>{rivalry.blurb}</p>
          </div>
        )}

        <div className="ms-grid">
          <SideStats team={fixture.homeTeam.name} table={table} fixtures={fixtures} />
          <SideStats team={fixture.awayTeam.name} table={table} fixtures={fixtures} />
        </div>

        {home && away && (
          <div className="ms-pots muted small">
            {home.short}: {POT_LABELS[home.pot]} · {away.short}: {POT_LABELS[away.pot]}
          </div>
        )}

        {rev && (
          <div className="ms-h2h">
            <span className="ms-h2h-label">Return leg</span>
            <span>
              {getTeam(rev.homeTeam.name)?.short} v {getTeam(rev.awayTeam.name)?.short}
              {rev.status === 'FINISHED'
                ? ` — ${rev.score.home}–${rev.score.away}`
                : ` — ${rev.utcDate ? new Date(rev.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBC'}`}
            </span>
          </div>
        )}

        <div className="ms-lineups muted small">
          Line-ups and live match stats arrive with the live-feed deployment on match days —
          not part of this offline preview.
        </div>
      </div>
    </div>
  );
}
