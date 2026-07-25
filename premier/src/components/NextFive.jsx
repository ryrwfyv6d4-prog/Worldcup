import { getTeam } from '../data/england2027.js';
import { nextFixtures, recentResults, priceBand } from '../utils/scoring.js';

// The run of games ahead, priced. Same idea as a fantasy fixture ticker, except
// the number on each chip is the points a win there actually pays you.
export default function NextFive({ team, fixtures, n = 5, compact = false, onOpenMatch }) {
  const next = nextFixtures(team, fixtures, n);
  if (!next.length) return null;
  const onTable = next.reduce((s, x) => s + x.win, 0);

  return (
    <div className={`nf ${compact ? 'nf-compact' : ''}`}>
      <div className="nf-head">
        <span className="nf-label">Next {next.length}</span>
        <span className="nf-total">{onTable} on the table</span>
      </div>
      <div className="nf-row">
        {next.map((x) => {
          const opp = getTeam(x.opp);
          return (
            <button
              key={x.fixture.id}
              className={`nf-chip band-${priceBand(x.win)}`}
              onClick={onOpenMatch ? () => onOpenMatch(x.fixture) : undefined}
              title={`${x.isHome ? 'Home to' : 'Away at'} ${opp ? opp.short : x.opp} — a win pays ${x.win}`}
            >
              <span className="nf-opp">{opp ? opp.tla : x.opp.slice(0, 3).toUpperCase()}</span>
              <span className="nf-venue">{x.isHome ? 'H' : 'A'}</span>
              <span className="nf-val">{x.win}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Last six results with the opponent, the score and what it earned
export function RecentForm({ team, fixtures, onOpenMatch }) {
  const recent = recentResults(team, fixtures, 6);
  if (!recent.length) return null;
  return (
    <div className="rf">
      <div className="nf-head"><span className="nf-label">Last {recent.length}</span></div>
      {recent.map((r) => {
        const opp = getTeam(r.opp);
        return (
          <button
            key={r.fixture.id}
            className="rf-row"
            onClick={onOpenMatch ? () => onOpenMatch(r.fixture) : undefined}
          >
            <span className={`pip pip-${r.result.toLowerCase()}`}>{r.result}</span>
            <span className="rf-opp">
              {r.isHome ? 'v' : 'at'} {opp ? opp.short : r.opp}
            </span>
            <span className="rf-score">{r.my}–{r.their}</span>
            <span className={`rf-pts ${r.pts > 0 ? 'gain' : ''}`}>{r.pts > 0 ? `+${r.pts}` : 'nil'}</span>
          </button>
        );
      })}
    </div>
  );
}
