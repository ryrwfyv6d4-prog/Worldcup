import { useMemo } from 'react';
import { getTeam, POT_LABELS } from '../data/england2027.js';
import { matchValue, phaseFor, midseasonRankFor } from '../utils/odds.js';
import { getMatchup } from '../data/rivalries.js';
import Crest from './Crest.jsx';
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

function SideStats({ team, table, fixtures }) {
  const row = table.find((r) => r.team === team);
  const pos = positionOf(team, table);
  const form = formForTeam(team, fixtures);
  return (
    <div className="en-ms-stats">
      <div className="en-ms-stat"><b>{row && row.p > 0 ? ordinal(pos) : '—'}</b><span>position</span></div>
      <div className="en-ms-stat"><b>{row ? `${row.w}-${row.d}-${row.l}` : '—'}</b><span>W-D-L</span></div>
      <div className="en-ms-stat"><b>{row ? `${row.gf}:${row.ga}` : '—'}</b><span>goals</span></div>
      <div className="en-ms-form">
        {form.length
          ? <span className="pips">{form.map((r, i) => <span key={i} className={`pip pip-${r.toLowerCase()}`}>{r}</span>)}</span>
          : <span className="pip-none">no results yet</span>}
      </div>
    </div>
  );
}

export default function MatchSheet({ fixture, fixtures, assignments, onClose, onSelectTeam }) {
  const table = useMemo(() => leagueTable(fixtures, fixture.division), [fixtures, fixture.division]);
  const home = getTeam(fixture.homeTeam.name);
  const away = getTeam(fixture.awayTeam.name);
  const matchup = getMatchup(fixture.homeTeam.name, fixture.awayTeam.name, home, away);
  const rev = reverseFixture(fixture, fixtures);
  const phase = phaseFor(fixture.utcDate);

  const sides = [
    { info: home, name: fixture.homeTeam.name, isHome: true, opp: fixture.awayTeam.name },
    { info: away, name: fixture.awayTeam.name, isHome: false, opp: fixture.homeTeam.name },
  ];

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
        <div className="card" style={{ marginTop: 8 }}>
          <div className="en-ms-meta">
            {fixture.division === 1 ? 'Premier League' : 'Championship'} · Matchweek {fixture.matchday}
            <br />{fmtLong(fixture.utcDate)}
          </div>

          <div className="en-ms-teams">
            {sides.map((s, i) => {
              const owner = ownerOf(s.name, assignments);
              const rate = s.info ? matchValue(s.name, s.opp, s.isHome, phase) : null;
              return (
                <div className={`en-ms-side ${i === 1 ? 'away' : ''}`} key={s.name}>
                  <Crest team={s.name} size={38} className="en-ms-crest" />
                  <button
                    className="team-btn en-ms-team"
                    onClick={() => {
                      // close this sheet first — otherwise two sheets stack and
                      // both try to own the Back button
                      onClose();
                      if (onSelectTeam) onSelectTeam(s.name);
                    }}
                  >
                    {s.info ? s.info.short : s.name}
                  </button>
                  <div className="en-ms-codename">{s.info?.codename}</div>
                  {owner ? (
                    <div className="en-ms-owner"><b>{owner}</b></div>
                  ) : (
                    <div className="en-ms-owner unowned">unclaimed</div>
                  )}
                  {rate && (
                    <div className="en-ms-price">
                      <b>+{rate.win}</b> to win<span> · +{rate.draw} draw</span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="en-ms-vs">
              {fixture.status === 'SCHEDULED' ? 'v' : `${fixture.score.home ?? ''}–${fixture.score.away ?? ''}`}
            </div>
          </div>

          {matchup && (
            <div className="en-ms-rivalry">
              <div className="en-ms-rivalry-title">
                {matchup.derby ? '⚔️' : '🎖'} {matchup.title}
                {matchup.derby && <span className="en-ms-derby-tag">DERBY</span>}
              </div>
              <p>{matchup.blurb}</p>
              {matchup.firms && (
                <p className="en-ms-firms"><b>The firms.</b> {matchup.firms}</p>
              )}
            </div>
          )}

          <div className="en-ms-grid">
            <SideStats team={fixture.homeTeam.name} table={table} fixtures={fixtures} />
            <SideStats team={fixture.awayTeam.name} table={table} fixtures={fixtures} />
          </div>

          {home && away && (
            <div className="muted small">
              {phase === 'mid' && midseasonRankFor(home.name) ? (
                <>
                  Priced off the January re-rating: {home.short} {ordinal(midseasonRankFor(home.name))},
                  {' '}{away.short} {ordinal(midseasonRankFor(away.name))} in the table at New Year.
                </>
              ) : (
                <>
                  Priced off the pre-season odds: {home.short} tipped {ordinal(home.rank)},
                  {' '}{away.short} tipped {ordinal(away.rank)}.
                </>
              )}
              {' '}The bigger the upset, the bigger the payout.
            </div>
          )}

          {rev && (
            <div className="en-ms-h2h">
              <span className="en-ms-h2h-label">Return leg</span>
              <span>
                {getTeam(rev.homeTeam.name)?.short} v {getTeam(rev.awayTeam.name)?.short}
                {rev.status === 'FINISHED'
                  ? ` — ${rev.score.home}–${rev.score.away}`
                  : ` — ${rev.utcDate ? new Date(rev.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBC'}`}
              </span>
            </div>
          )}

          <div className="en-ms-note">
            Line-ups and live match stats arrive on match days once the season is under way.
          </div>
        </div>
      </div>
    </div>
  );
}
