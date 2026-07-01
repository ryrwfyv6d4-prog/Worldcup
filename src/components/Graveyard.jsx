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
  name => `${name}'s campaign lasted longer than Italy's involvement in either World War. Just.`,
  name => `${name} has been evacuated from the tournament. Dunkirk had better logistics.`,
  name => `${name}'s dreams lie at the bottom of the ocean, torpedoed without warning.`,
  name => `Like the Maginot Line, ${name}'s defence looked good on paper.`,
  name => `${name} has unconditionally surrendered. No terms were offered.`,
  name => `${name}'s campaign has ended. The retreat was less orderly than Stalingrad.`,
  name => `Mission failed. ${name} is Missing In Action, presumed drinking.`,
  name => `${name} went down faster than the Bismarck.`,
  name => `${name}'s war is over. Send care packages (beer).`,
  name => `${name} fought on the beaches, fought on the landing grounds, then got absolutely pumped.`,
  name => `${name}'s strategy made the charge at Gallipoli look well-planned.`,
  name => `${name} tried to fight a war on multiple fronts. It went about as well as last time.`,
  name => `Attention all personnel: ${name} has been dishonourably discharged from the tournament.`,
  name => `${name}'s campaign has been carpet-bombed into oblivion.`,
  name => `${name} has fallen. We shall remember them at the pub.`,
];

function isTeamEliminated(team, fixtures) {
  const group = Object.entries(GROUPS).find(([, teams]) => teams.includes(team));
  if (group) {
    const groupLetter = group[0];
    const groupFixtures = fixtures.filter(
      f => f.stage === 'GROUP_STAGE' && f.group === groupLetter && f.status === 'FINISHED'
    );
    if (groupFixtures.length === 6) {
      const standings = {};
      for (const t of group[1]) standings[t] = { pts: 0, gd: 0, gf: 0 };
      for (const m of groupFixtures) {
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
      if (sorted[3][0] === team) return 'GROUP_STAGE';
    }
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
    const result = [];
    let idx = 0;
    for (const name of Object.keys(assignments)) {
      const teams = getTeamsForParticipant(name, assignments, drawType);
      if (!teams.length) continue;
      const teamStatuses = teams.map(t => ({
        team: t,
        eliminatedAt: isTeamEliminated(t, fixtures),
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
        <h2>The Fallen</h2>
      </div>

      {fallen.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚰️</div>
          <p>No casualties yet — all campaigns still active.</p>
          <p className="gy-hint-sub">Once all of someone's teams are knocked out, they'll be honoured here.</p>
        </div>
      ) : (
        <>
          <div className="gy-banner">
            <div className="gy-banner-cross">✠</div>
            <div className="gy-banner-text">
              <span className="gy-banner-count">{fallen.length}</span> campaign{fallen.length !== 1 ? 's' : ''} lost
            </div>
            <div className="gy-banner-cross">✠</div>
          </div>

          <div className="gy-grid">
            {fallen.map((f) => (
              <div key={f.name} className="gy-tomb">
                <div className="gy-tomb-top">✠</div>
                <div className="gy-tomb-name">{f.name}</div>
                <div className="gy-tomb-date">
                  Fell in the {STAGE_LABELS[f.bestStage] || f.bestStage}
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
                        KIA: {STAGE_LABELS[eliminatedAt] || '???'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="gy-tomb-base">R.I.P.</div>
              </div>
            ))}
          </div>

          <p className="gy-footer">🍺 Pour one out for the lads</p>
        </>
      )}
    </div>
  );
}
