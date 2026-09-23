import { getTeam, MEDALS } from '../data/england2027.js';
import { nextFixtures } from '../utils/scoring.js';
import { ordinal } from '../utils/format.js';
import Crest from './Crest.jsx';
import Sheet from './Sheet.jsx';
import GoalAlerts from './GoalAlerts.jsx';

// Tap your own name: where you stand, what each club has banked, and who
// they play next. Each club opens its page.
const when = (iso) => (iso
  ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  : 'TBC');

export default function MySquad({ who, ladder, fixtures, onSelectTeam, onChangeUser, onClose }) {
  const rank = ladder.findIndex((r) => r.name === who);
  const row = ladder[rank];
  if (!row) return null;
  const gap = ladder[0].total - row.total;

  return (
    <Sheet onClose={onClose} className="squad">
        <div className="sheet-title big">{who}</div>
        <div className="squad-sub">
          {ordinal(rank + 1)} of {ladder.length} on {row.total}
          {rank > 0 ? `, ${gap} behind ${ladder[0].name}` : ''}
          {row.bonusTotal ? ` (incl. ${row.bonusTotal} bonus)` : ''}
        </div>
        <div className="squad-list">
          {row.breakdown.map((b) => {
            const next = nextFixtures(b.team, fixtures, 1)[0];
            const banked = b.total + b.oa.pts + b.medalPts;
            return (
              <button key={b.team} className="squad-row" onClick={() => { onClose(); onSelectTeam(b.team); }}>
                <Crest team={b.team} size={22} />
                <span className="squad-club">
                  <b>{getTeam(b.team)?.short || b.team}</b>
                  <small>
                    {b.w}W {b.d}D {b.l}L
                    {b.oa.pts > 0 && ` · +${b.oa.pts} tip`}
                    {b.medals.map((k) => ` · ${MEDALS[k].label}`).join('')}
                  </small>
                  {next && (
                    <small>
                      Next {next.isHome ? 'v' : 'at'} {getTeam(next.opp)?.short}, {when(next.fixture.utcDate)}, win pays {next.win}
                    </small>
                  )}
                </span>
                <span className="squad-pts">{banked}</span>
                <span className="chev" aria-hidden="true">›</span>
              </button>
            );
          })}
        </div>
        <GoalAlerts who={who} />
        <button className="link-btn" onClick={onChangeUser}>Not {who}?</button>
    </Sheet>
  );
}
