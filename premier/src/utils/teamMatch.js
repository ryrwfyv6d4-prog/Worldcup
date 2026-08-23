// Matching openfootball club names against ESPN's naming.
//
// openfootball uses full legal-ish names ("Wolverhampton Wanderers FC",
// "AFC Bournemouth"); ESPN uses display names that are usually the same string
// minus the FC/AFC, but occasionally a short form ("Wolves", "QPR").
//
// Strategy: normalise both sides hard (lowercase, drop FC/AFC affixes, drop
// "and"/"&", strip non-alphanumerics) and compare. Short forms that survive
// normalisation get an explicit alias. Anything still unmatched is surfaced in
// HQ → Signals rather than silently dropped.

import { TEAMS } from '../data/england2027.js';

export function normaliseClub(name) {
  if (!name) return '';
  let s = String(name).toLowerCase().trim();
  s = s.replace(/&/g, ' and ');
  // strip FC / AFC / A.F.C. as a leading or trailing word
  s = s.replace(/^(a\.?f\.?c\.?|f\.?c\.?)\s+/, '');
  s = s.replace(/\s+(a\.?f\.?c\.?|f\.?c\.?)$/, '');
  s = s.replace(/\band\b/g, '');
  s = s.replace(/[^a-z0-9]/g, '');
  return s;
}

// ESPN short form (normalised) → our canonical openfootball name
const ALIASES = {
  wolves: 'Wolverhampton Wanderers FC',
  westbrom: 'West Bromwich Albion FC',
  westbromwich: 'West Bromwich Albion FC',
  qpr: 'Queens Park Rangers FC',
  spurs: 'Tottenham Hotspur FC',
  tottenham: 'Tottenham Hotspur FC',
  brighton: 'Brighton & Hove Albion FC',
  nottsforest: 'Nottingham Forest FC',
  forest: 'Nottingham Forest FC',
  manutd: 'Manchester United FC',
  manunited: 'Manchester United FC',
  mancity: 'Manchester City FC',
  newcastle: 'Newcastle United FC',
  leeds: 'Leeds United FC',
  westham: 'West Ham United FC',
  sheffutd: 'Sheffield United FC',
  sheffieldutd: 'Sheffield United FC',
  boro: 'Middlesbrough FC',
  pompey: 'Portsmouth FC',
  preston: 'Preston North End FC',
  blackburn: 'Blackburn Rovers FC',
  bolton: 'Bolton Wanderers FC',
  charlton: 'Charlton Athletic FC',
  swansea: 'Swansea City AFC',
  cardiff: 'Cardiff City FC',
  derby: 'Derby County FC',
  norwich: 'Norwich City FC',
  ipswich: 'Ipswich Town FC',
  coventry: 'Coventry City FC',
  hull: 'Hull City AFC',
  stoke: 'Stoke City FC',
  birmingham: 'Birmingham City FC',
  lincoln: 'Lincoln City FC',
  bristolcity: 'Bristol City FC',
  palace: 'Crystal Palace FC',
};

// canonical normalised → openfootball name, built from our own team list
const CANON = new Map();
for (const t of TEAMS) {
  CANON.set(normaliseClub(t.name), t.name);
  CANON.set(normaliseClub(t.short), t.name);
}

// Resolve an external (ESPN) club name to our canonical openfootball name.
// Returns null when nothing matches — callers should report, not guess.
export function resolveClub(externalName) {
  const n = normaliseClub(externalName);
  if (!n) return null;
  if (CANON.has(n)) return CANON.get(n);
  if (ALIASES[n]) return ALIASES[n];
  // Last resort: containment either way, e.g. "bournemouth" → "afcbournemouth",
  // or "leedsunitedfc0100" (a name that swallowed a score) → "leedsunited".
  //
  // Judged on how many distinct CLUBS match, not how many keys: both the full
  // name and the short name of one club are in here, so "leeds" and
  // "leedsunited" are two keys for the same side and must not read as an
  // ambiguous match. Short fragments are ignored, since a three-letter needle
  // finds half the league.
  if (n.length < 4) return null;
  const clubs = new Set(
    [...CANON.keys()]
      .filter((k) => k.length >= 4 && (k.includes(n) || n.includes(k)))
      .map((k) => CANON.get(k))
  );
  return clubs.size === 1 ? [...clubs][0] : null;
}

// What to actually print for a club.
//
// Everything on screen should read "Coventry", not "Coventry City FC", and
// certainly never a raw feed string. Every caller used to fall back to
// whatever the feed said, so one bad line put "Coventry City FC 0-1 (0-0)"
// straight into the UI. This resolves first, and if a club really is unknown
// it still tidies the name rather than printing it raw.
export function clubLabel(name, teams) {
  if (!name) return '';
  const canon = resolveClub(name);
  const list = teams || TEAMS;
  if (canon) {
    const t = list.find((x) => x.name === canon);
    if (t) return t.short;
  }
  return String(name)
    .replace(/\s+\d+\s*-\s*\d+(\s*\(\s*\d+\s*-\s*\d+\s*\))?\s*$/, '')  // a score that got glued on
    .replace(/^(a\.?f\.?c\.?)\s+/i, '')
    .replace(/\s+(a\.?f\.?c\.?|f\.?c\.?)$/i, '')
    .trim() || String(name);
}
