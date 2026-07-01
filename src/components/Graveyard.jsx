import { useMemo } from 'react';
import { GROUPS, getFlag } from '../data/worldcup2026.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';

const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-Finals',
  SEMI_FINALS: 'Semi-Finals',
};

const STAGE_ORDER = ['GROUP_STAGE', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS'];

const EPITAPHS = [
  name => `${name} has been escorted from US soil. Do not attempt to re-enter.`,
  name => `${name}'s visa has been revoked. Reason: being absolutely shithouse at football.`,
  name => `ICE agents confirmed ${name}'s teams had no right to remain in the tournament.`,
  name => `${name} tried to claim asylum in the knockout rounds. Application denied.`,
  name => `${name} has been removed from the premises. Their luggage will not be forwarded.`,
  name => `TSA flagged ${name}'s campaign at the border. Nothing of value was found.`,
  name => `${name} has been placed on a one-way flight home. Middle seat. No recline.`,
  name => `${name}'s green card has been shredded. The American Dream is over.`,
  name => `By executive order, ${name} is hereby banned from all future tournaments.`,
  name => `${name} didn't send their best teams. They sent teams with problems. They're gone now.`,
  name => `${name}'s campaign built no wall. The goals just walked right in.`,
  name => `Homeland Security has classified ${name}'s campaign as a national embarrassment.`,
  name => `${name} entered the tournament legally but is leaving in handcuffs.`,
  name => `The deportation flight for ${name} departs immediately. Peanuts will not be served.`,
  name => `${name} thought they were here for the American Dream. It was the American Nightmare.`,
];

function buildGroupStandings(fixtures) {
  const groups = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    const gFixtures = fixtures.filter(
      f => f.stage === 'GROUP_STAGE' && f.group === letter && f.status === 'FINISHED'
    );
    if (gFixtures.length < 6) continue;
    const standings = {};
    for (const t of teams) standings[t] = { pts: 0, gd: 0, gf: 0 };
    for (const m of gFixtures) {
      const h = normaliseTeamName(m.homeTeam.name);
      const a = normaliseTeamName(m.awayTeam.name);
      if (!standings[h] || !standings[a]) continue;
      standings[h].gf += m.score.home; standings[h].gd += m.score.home - m.score.away;
      standings[a].gf += m.score.away; standings[a].gd += m.score.away - m.score.home;
      if (m.score.winner === 'HOME_TEAM') { standings[h].pts += 3; }
      else if (m.score.winner === 'AWAY_TEAM') { standings[a].pts += 3; }
      else { standings[h].pts += 1; standings[a].pts += 1; }
    }
    const sorted = Object.entries(standings)
      .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    groups[letter] = sorted.map(([team, stats], pos) => ({ team, ...stats, pos }));
  }
  return groups;
}

function getEliminatedThirds(groupStandings) {
  const completedGroups = Object.keys(groupStandings);
  if (completedGroups.length < 12) return new Set();
  const thirds = completedGroups.map(g => groupStandings[g][2]);
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return new Set(thirds.slice(8).map(t => t.team));
}

function isTeamEliminated(team, fixtures, groupStandings, eliminatedThirds) {
  for (const rows of Object.values(groupStandings)) {
    const entry = rows.find(r => r.team === team);
    if (!entry) continue;
    if (entry.pos === 3) return 'GROUP_STAGE';
    if (entry.pos === 2 && eliminatedThirds.has(team)) return 'GROUP_STAGE';
    break;
  }
  for (const f of fixtures) {
    if (f.stage === 'GROUP_STAGE' || f.status !== 'FINISHED') continue;
    const h = normaliseTeamName(f.homeTeam.name);
    const a = normaliseTeamName(f.awayTeam.name);
    if (h !== team && a !== team) continue;
    const isHome = h === team;
    const lost = (isHome && f.score.winner === 'AWAY_TEAM') || (!isHome && f.score.winner === 'HOME_TEAM');
    if (lost) return f.stage;
  }
  return null;
}

export default function Graveyard({ assignments, drawType, fixtures, onSelectTeam }) {
  const fallen = useMemo(() => {
    const groupStandings = buildGroupStandings(fixtures);
    const eliminatedThirds = getEliminatedThirds(groupStandings);
    const result = [];
    let idx = 0;
    for (const name of Object.keys(assignments)) {
      const teams = getTeamsForParticipant(name, assignments, drawType);
      if (!teams.length) continue;
      const teamStatuses = teams.map(t => ({
        team: t,
        eliminatedAt: isTeamEliminated(t, fixtures, groupStandings, eliminatedThirds),
      }));
      const allDead = teamStatuses.every(ts => ts.eliminatedAt !== null);
      if (!allDead) continue;
      const bestStage = teamStatuses.reduce((best, ts) => {
        const bi = STAGE_ORDER.indexOf(best);
        const ti = STAGE_ORDER.indexOf(ts.eliminatedAt);
        return ti > bi ? ts.eliminatedAt : best;
      }, 'GROUP_STAGE');
      result.push({
        name,
        teams: teamStatuses,
        bestStage,
        epitaph: EPITAPHS[idx % EPITAPHS.length](name),
      });
      idx++;
    }
    return result;
  }, [assignments, drawType, fixtures]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Deportations</h2>
      </div>

      {fallen.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛂</div>
          <p>All visas still valid — no deportations yet.</p>
          <p className="gy-hint-sub">Once all of someone's teams are eliminated, they'll be removed from the country.</p>
        </div>
      ) : (
        <>
          <div className="gy-banner">
            <div className="gy-banner-cross">🇺🇸</div>
            <div className="gy-banner-text">
              <span className="gy-banner-count">{fallen.length}</span> deported
            </div>
            <div className="gy-banner-cross">🇺🇸</div>
          </div>

          <div className="gy-grid">
            {fallen.map((f) => (
              <div key={f.name} className="gy-tomb">
                <div className="gy-tomb-top">🛂</div>
                <div className="gy-tomb-stamp">DEPORTATION ORDER</div>
                <div className="gy-tomb-name">{f.name}</div>
                <div className="gy-tomb-date">
                  Visa revoked: {STAGE_LABELS[f.bestStage] || f.bestStage}
                </div>
                <div className="gy-tomb-epitaph">"{f.epitaph}"</div>
                <div className="gy-tomb-teams">
                  {f.teams.map(({ team, eliminatedAt }) => (
                    <button
                      key={team}
                      className="gy-team-badge"
                      onClick={() => onSelectTeam(team)}
                    >
                      {getFlag(team)} {team}
                      <span className="gy-team-stage">
                        DEPORTED: {STAGE_LABELS[eliminatedAt] || '???'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="gy-tomb-base">VISA DENIED</div>
              </div>
            ))}
          </div>

          <p className="gy-footer">✈️ Flight home now boarding</p>
        </>
      )}
    </div>
  );
}
