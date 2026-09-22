// Small helpers every screen was carrying its own copy of.

// Who owns a club, or null if nobody drew it.
export function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments || {})) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

// 1st, 2nd, 3rd, 11th, 22nd. A missing number reads as a dash.
export function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
