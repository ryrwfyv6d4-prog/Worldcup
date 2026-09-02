// Which division a fixture belongs to, for the lists that mix them.
//
// Filled for the Premier League, hollow for the Championship — the top tier
// reads heavier, so the two separate at a glance without anyone having to read
// two letters. Deliberately tiny: it is there to answer a question you might
// have, not to announce itself.
//
// Only worth rendering where both divisions are actually on screen together —
// under the Premier filter a column of identical PL chips is just noise. The
// callers decide that; this only draws the chip.
export default function Tier({ div }) {
  if (div !== 1 && div !== 2) return null;
  return (
    <span className={`tier ${div === 1 ? 'tier-pl' : 'tier-ch'}`}>
      {div === 1 ? 'PL' : 'CH'}
    </span>
  );
}
