// Hardcoded highlight video IDs for matches the automatic YouTube search misses.
// Three FIFA naming mismatches cause failures:
//   - "DR Congo"           → FIFA titles say "Congo DR"
//   - "Cape Verde"         → FIFA titles say "Cabo Verde"
//   - "Bosnia & Herzegovina" → FIFA titles say "Bosnia and Herzegovina"
//
// Key format: "Home|Away" (no score) — checked before any API call.
// Both orderings are listed so it works regardless of which team is home.
// These are official FIFA channel videos confirmed from youtube.com searches.

export const HIGHLIGHT_OVERRIDES = {
  // ── DR Congo (FIFA: "Congo DR") ───────────────────────────────────────────
  'Portugal|DR Congo':   'fJrctBM0poE', // Highlights | Portugal 1-1 Congo DR | FIFA World Cup 2026™
  'DR Congo|Portugal':   'fJrctBM0poE',
  'Colombia|DR Congo':   'JTGXHmxlXHc', // Highlights | Colombia 1-0 Congo DR | FIFA World Cup 2026™
  'DR Congo|Colombia':   'JTGXHmxlXHc',

  // ── Cape Verde (FIFA: "Cabo Verde") ───────────────────────────────────────
  'Spain|Cape Verde':    'W9Z4ER9oX0k', // Highlights | Spain 0-0 Cabo Verde | FIFA World Cup 2026™
  'Cape Verde|Spain':    'W9Z4ER9oX0k',
  'Uruguay|Cape Verde':  'eh20EVuWFFI', // Highlights | Uruguay 2-2 Cabo Verde | FIFA World Cup 2026™
  'Cape Verde|Uruguay':  'eh20EVuWFFI',

  // ── Bosnia & Herzegovina (FIFA: "Bosnia and Herzegovina") ─────────────────
  'Canada|Bosnia & Herzegovina':      'w-_rY5morQY', // Highlights | Canada 1-1 Bosnia and Herzegovina | FIFA World Cup 2026™
  'Bosnia & Herzegovina|Canada':      'w-_rY5morQY',
  'Switzerland|Bosnia & Herzegovina': 'c9wbxaKBu2E', // Highlights | Switzerland 4-1 Bosnia and Herzegovina | FIFA World Cup 2026™
  'Bosnia & Herzegovina|Switzerland': 'c9wbxaKBu2E',
  'Bosnia & Herzegovina|Qatar':       'mrS33J3Qa8M', // Bosnia and Herzegovina vs Qatar | Match Highlights | Group Stage | FIFA World Cup 2026™
  'Qatar|Bosnia & Herzegovina':       'mrS33J3Qa8M',
};
