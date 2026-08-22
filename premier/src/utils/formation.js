// Where each player actually stands.
//
// Two independent sources, tried in order, each with its own sanity check:
//
//   1. ESPN's formation string ("4-2-3-1") together with each player's
//      formationPlace (1 is the keeper, then out through the lines). When both
//      are present and agree, this is exact and needs no per-club knowledge —
//      it handles a back three, a diamond, or whatever anyone turns up in.
//
//   2. The position abbreviations on the players themselves, counted into
//      lines. Covers the match where the formation string is missing, or is
//      there but does not add up.
//
// If neither survives its checks the caller keeps the plain list. That is the
// important bit for something that has to keep working all season against a
// feed nobody here controls: a pitch with players in the wrong place looks
// authoritative and is worse than no pitch at all.

const GK = 'G', DEF = 'D', MID = 'M', FWD = 'F';

// ESPN mostly sends G/D/M/F, but fuller codes turn up on some fixtures
export function lineOf(pos) {
  const p = String(pos || '').toUpperCase();
  if (!p) return MID;
  if (p.startsWith('G')) return GK;
  if (/^(SW|CB|LB|RB|LWB|RWB|WB|D)/.test(p)) return DEF;
  if (/^(CDM|CAM|DM|AM|CM|LM|RM|M)/.test(p)) return MID;
  if (/^(ST|CF|LW|RW|SS|F|S|W)/.test(p)) return FWD;
  return MID;
}

// "4-2-3-1" -> [4,2,3,1]. Outfield only, so it has to come to ten; anything
// else is not a formation we can trust, whatever the feed calls it.
export function parseFormation(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[^0-9]+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return null;
  const rows = parts.map(Number);
  if (rows.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) return null;
  if (rows.reduce((a, b) => a + b, 0) !== 10) return null;
  return rows;
}

// Count the outfielders into lines when there is no usable formation string
function rowsFromPositions(xi) {
  const groups = { [DEF]: 0, [MID]: 0, [FWD]: 0 };
  let keepers = 0;
  for (const p of xi) {
    const l = lineOf(p.pos);
    if (l === GK) keepers += 1;
    else groups[l] += 1;
  }
  if (keepers !== 1) return null;
  const rows = [groups[DEF], groups[MID], groups[FWD]].filter((n) => n > 0);
  if (rows.reduce((a, b) => a + b, 0) !== 10) return null;
  // A feed that sends no positions at all reads as ten midfielders, which
  // passes the sum check and would draw a single line of ten across the pitch.
  // Nothing real has fewer than two lines or more than six across one.
  if (rows.length < 2 || rows.some((n) => n > 6)) return null;
  return rows;
}

// formationPlace is only worth trusting when it is a clean 1..11
function hasCleanPlaces(xi) {
  const places = xi.map((p) => p.place);
  if (places.some((n) => !Number.isInteger(n) || n < 1 || n > 11)) return false;
  return new Set(places).size === 11;
}

// Across the pitch. The line tightens as it gets shorter, so a front two sits
// together rather than out on both touchlines.
function spreadX(count) {
  const gap = Math.min(22, 86 / count);
  return Array.from({ length: count }, (_, j) => 50 + (j - (count - 1) / 2) * gap);
}

// 0 is a team's own goal line, 1 is the halfway line. The front line stops
// short of 1 so two sets of forwards do not end up on top of each other across
// the halfway line.
function depthsFor(lineCount) {
  if (lineCount === 1) return [0.55];
  const first = 0.24, last = 0.86;
  return Array.from(
    { length: lineCount },
    (_, i) => first + (i * (last - first)) / (lineCount - 1)
  );
}

// Two clubs in similar colours (Everton and Palace, say) would put twenty-two
// near-identical dots on the pitch. When the primaries are too close, the away
// side wears its second colour instead — the same thing a kit clash does.
function rgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function shirtColours(homePair, awayPair) {
  const home = (homePair && homePair[0]) || '#444444';
  const first = (awayPair && awayPair[0]) || '#999999';
  const second = (awayPair && awayPair[1]) || first;
  const a = rgb(home), b = rgb(first);
  if (!a || !b) return [home, first];
  const dist = Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  // ~120 of 441 possible: far enough apart to read at shirt size
  return dist < 120 ? [home, second] : [home, first];
}

/**
 * Turn one side's XI into placed players.
 * Returns { formation, rows, slots: [{ player, x, depth }] } or null when the
 * data will not support a pitch.
 */
export function buildShape(side) {
  const xi = (side && side.xi) || [];
  if (xi.length !== 11) return null;

  const clean = hasCleanPlaces(xi);
  const declared = parseFormation(side.formation);

  // Only trust the declared formation when the places can actually fill it
  let rows = declared && clean ? declared : null;
  let ordered;

  if (rows) {
    ordered = [...xi].sort((a, b) => a.place - b.place);
  } else {
    rows = rowsFromPositions(xi);
    if (!rows) return null;
    // Derived rows, so order to match: keeper, then out through the lines
    const rank = { [GK]: 0, [DEF]: 1, [MID]: 2, [FWD]: 3 };
    ordered = [...xi].sort((a, b) => {
      const d = rank[lineOf(a.pos)] - rank[lineOf(b.pos)];
      return d !== 0 ? d : a.place - b.place;
    });
  }

  const keeper = ordered[0];
  const outfield = ordered.slice(1);
  if (outfield.length !== 10) return null;

  const depths = depthsFor(rows.length);
  const slots = [{ player: keeper, x: 50, depth: 0.06 }];

  let at = 0;
  rows.forEach((count, i) => {
    const xs = spreadX(count);
    for (let j = 0; j < count; j += 1) {
      const player = outfield[at + j];
      if (player) slots.push({ player, x: xs[j], depth: depths[i] });
    }
    at += count;
  });

  if (slots.length !== 11) return null;
  return { formation: rows.join('-'), rows, slots };
}
