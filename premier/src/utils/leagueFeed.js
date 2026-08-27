// Parsing for the openfootball plain-text league files.
//
// Lives apart from the hook so Node can use it too — the draw-night bake script
// needs to read the same fixtures the app does, and importing a React hook to
// get at a text parser would be daft.

import { resolveClub } from './teamMatch.js';

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// BST runs from the last Sunday in March to the last Sunday in October. The
// old version used a fixed 25th, which is wrong in any year where the changeover
// falls either side of it — 2026 ends BST on the 25th itself, and 2027 starts it
// on the 28th, so every kick-off on those weekends was stored an hour out.
function lastSundayOf(year, monthIdx) {
  const d = new Date(Date.UTC(year, monthIdx + 1, 0));      // last day of month
  return d.getUTCDate() - d.getUTCDay();                    // back up to Sunday
}

function ukOffsetHours(y, monthIdx, day) {
  if (monthIdx > 2 && monthIdx < 9) return 1;                // Apr–Sep
  if (monthIdx === 2) return day >= lastSundayOf(y, 2) ? 1 : 0;
  if (monthIdx === 9) return day < lastSundayOf(y, 9) ? 1 : 0;
  return 0;
}

// Parse one openfootball league .txt into normalised fixtures
export function parseLeagueTxt(txt, div) {
  const fixtures = [];
  let matchday = null;
  let date = null; // { y, m, d }
  let startYear = null;

  const header = txt.match(/=\s*.*?(\d{4})\/\d{2}/);
  if (header) startYear = parseInt(header[1], 10);

  for (const rawLine of txt.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const md = line.match(/^[»▪]?\s*Matchday\s+(\d+)/i);
    if (md) { matchday = parseInt(md[1], 10); continue; }

    // "Fri Aug 21 2026" or "Sat Aug 22"
    const dl = line.match(/^\s{0,4}(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/);
    if (dl) {
      const m = MONTHS[dl[2]];
      let y = dl[4] ? parseInt(dl[4], 10) : null;
      if (y == null && startYear != null) y = m >= 6 ? startYear : startYear + 1;
      date = { y, m, d: parseInt(dl[3], 10) };
      continue;
    }

    // Match line: optional "HH:MM", then the teams and, once played, a score.
    //
    // openfootball puts the score at the END of the line, after the away side:
    //     20:00  Arsenal FC   v Coventry City FC   3-0 (2-0)
    // so the away name has to have it peeled off. Getting this wrong is quiet
    // and nasty: the club name silently becomes "Coventry City FC 3-0 (2-0)",
    // which matches nothing, and the match reads as still to be played.
    const ml = line.match(/^\s{4,}(?:(\d{1,2}):(\d{2})\s+)?(.+)$/);
    if (!ml || !date || !matchday) continue;
    const body = ml[3].trim();

    // "3-0", optionally followed by the half time "(2-0)", at the end
    const TRAILING_SCORE = /^(.*?)\s+(\d+)\s*-\s*(\d+)(?:\s*\(\s*\d+\s*-\s*\d+\s*\))?\s*$/;

    let home = null, away = null, hs = null, as = null;
    let m2 = body.match(/^(.+?)\s+v\.?\s+(.+)$/i);
    if (m2) {
      home = m2[1].trim();
      const rest = m2[2].trim();
      const sc = rest.match(TRAILING_SCORE);
      if (sc) {
        away = sc[1].trim();
        hs = parseInt(sc[2], 10);
        as = parseInt(sc[3], 10);
      } else {
        away = rest;
      }
    } else {
      // Other openfootball files put the score in the middle: "A 2-1 (1-0) B"
      m2 = body.match(/^(.+?)\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?\s+(.+)$/);
      if (!m2) continue;
      home = m2[1].trim(); hs = parseInt(m2[2], 10); as = parseInt(m2[3], 10); away = m2[4].trim();
    }
    if (!home || !away) continue;

    // Everything downstream keys off the club name — owner, crest, colours,
    // pricing, the lot — so pin both sides to a canonical name here rather
    // than trusting the feed's spelling. This also recovers a name that has
    // picked up something it should not have: the resolver still finds Leeds
    // in "Leeds United FC 0-1 (0-0)".
    home = resolveClub(home) || home;
    away = resolveClub(away) || away;

    let utcDate = null;
    if (date.y != null) {
      const hh = ml[1] ? parseInt(ml[1], 10) : 15;
      const mm = ml[2] ? parseInt(ml[2], 10) : 0;
      const off = ukOffsetHours(date.y, date.m, date.d);
      utcDate = new Date(Date.UTC(date.y, date.m, date.d, hh - off, mm)).toISOString();
    }

    const finished = hs != null && as != null;
    let winner = null;
    if (finished) winner = hs > as ? 'HOME_TEAM' : as > hs ? 'AWAY_TEAM' : 'DRAW';

    fixtures.push({
      id: `${div}-${matchday}-${home}-${away}`,
      division: div,
      matchday,
      utcDate,
      status: finished ? 'FINISHED' : 'SCHEDULED',
      homeTeam: { name: home },
      awayTeam: { name: away },
      score: { home: hs, away: as, winner },
      liveClock: null,
    });
  }
  return fixtures;
}
