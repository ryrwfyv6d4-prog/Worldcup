// The unit every match centre is built out of: one metric, both sides, and a
// bar that shows the split at a glance.
//
// Three things carry the reading, in order of how fast the eye picks them up:
// the bar length, the club colour on the side that won the stat, and the two
// numbers. Only the winning side is coloured, so a row can be read without
// comparing digits — which is the whole point of the format. A tie colours
// neither: two saturated halves would say both sides won it.
export default function StatRow({ row, homeColour, awayColour }) {
  const homeWon = row.better === 'home';
  const awayWon = row.better === 'away';
  return (
    <div className="mp-stat">
      <div className="mp-stat-top">
        <span className={`mp-stat-h ${homeWon ? 'won' : ''}`}>{row.home}</span>
        <span className="mp-stat-lab">{row.label}</span>
        <span className={`mp-stat-a ${awayWon ? 'won' : ''}`}>{row.away}</span>
      </div>
      <div className="mp-stat-bar">
        <span
          style={{
            width: `${row.homeShare}%`,
            background: homeWon ? homeColour : 'var(--rule-dotted)',
          }}
        />
        <span
          style={{
            width: `${100 - row.homeShare}%`,
            background: awayWon ? awayColour : 'var(--rule-dotted)',
          }}
        />
      </div>
    </div>
  );
}

// The two-club legend that tells you which end of every row is which.
export function StatKey({ homeName, awayName, homeColour, awayColour }) {
  return (
    <div className="mp-stat-key">
      <span><i style={{ background: homeColour }} />{homeName}</span>
      <span><i style={{ background: awayColour }} />{awayName}</span>
    </div>
  );
}
