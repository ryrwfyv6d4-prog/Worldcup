import { clubLabel } from '../../utils/teamMatch.js';
import { coloursFor } from '../../data/colours.js';
import StatRow, { StatKey } from './StatRow.jsx';

// The full comparison list, grouped the way a match centre reads it: the
// headline handful first, then the detail by phase of play.
//
// There is no period filter here. Every match centre puts All / 1st / 2nd
// across the top, but that needs the same stats computed three times and the
// feed publishes one set for the whole match — a filter with nothing behind it
// would be a control that lies.
export default function StatsTab({ detail, sides }) {
  const groups = detail?.statGroups || [];
  const [homeColour] = coloursFor(sides[0].name);
  const [awayColour] = coloursFor(sides[1].name);

  return (
    <div className="mp-pane">
      <StatKey
        homeName={sides[0].info?.short || clubLabel(sides[0].name)}
        awayName={sides[1].info?.short || clubLabel(sides[1].name)}
        homeColour={homeColour}
        awayColour={awayColour}
      />
      {groups.map((g) => (
        <div className="mp-stat-group" key={g.title}>
          <div className="mp-stat-group-head">{g.title}</div>
          {g.rows.map((r) => (
            <StatRow key={r.key} row={r} homeColour={homeColour} awayColour={awayColour} />
          ))}
        </div>
      ))}
      <p className="muted small mp-stat-foot">
        Team totals as published for the full match. No expected goals, shot maps
        or player ratings — the feed behind this app does not carry them.
      </p>
    </div>
  );
}
