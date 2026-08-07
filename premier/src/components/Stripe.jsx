import { coloursFor } from '../data/colours.js';

// A club's paint stripe. Replaces the badge in row contexts — the programme
// look identifies clubs by colour, not by mark.
//
// variant: 'inline' (fixture rows, 4×15) | 'tbl' (mini tables, 4×16)
export default function Stripe({ team, variant = 'inline', style }) {
  const [primary] = coloursFor(team);
  return <span className={`stripe stripe-${variant}`} style={{ background: primary, ...style }} />;
}

// Absolutely-positioned stripes down the left edge of a standings row, one per
// club. The design shows two side by side; this spreads however many you hold.
export function RowStripes({ teams }) {
  return teams.map((t, i) => {
    const [primary] = coloursFor(t);
    return (
      <span
        key={t}
        className="stripe stripe-row"
        style={{ left: `${i * 5}px`, background: primary }}
      />
    );
  });
}
