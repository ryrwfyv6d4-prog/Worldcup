// Sweep pot config — edit here if the terms change
export const ENTRY_FEE = 50;

// Blokes who haven't paid up. No entry fee, no legal representation.
export const UNPAID = ['Connor'];

// Payout split of the pot (must sum to 1)
export const PAYOUTS = [
  { key: 'first', label: 'Champion',     pct: 0.7 },
  { key: 'second', label: 'Runner-up',   pct: 0.2 },
  { key: 'last', label: 'Wooden Spoon',  pct: 0.1 },
];

export function computePot(participantNames) {
  const paid = participantNames.filter((n) => !UNPAID.includes(n));
  const owing = participantNames.filter((n) => UNPAID.includes(n));
  const total = paid.length * ENTRY_FEE;
  return {
    total,
    paidCount: paid.length,
    owing,
    prizes: PAYOUTS.map((p) => ({ ...p, amount: Math.round(total * p.pct) })),
  };
}
