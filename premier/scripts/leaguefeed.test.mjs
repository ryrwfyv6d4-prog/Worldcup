// Regression tests for the openfootball text parser.
//
// The bug these exist for: openfootball writes the score at the END of the
// line, after the away team. Splitting on " v " and taking the rest as the away
// name silently produced clubs called "Leeds United FC 0-1 (0-0)", which match
// nothing in the club list and read as still to be played — so the match lost
// its crest, its short name, its owner, and every point it should have banked.
// Nothing threw. It just quietly scored zero.

import { parseLeagueTxt } from '../src/utils/leagueFeed.js';
import { TEAMS } from '../src/data/england2027.js';
import { resolveClub, clubLabel } from '../src/utils/teamMatch.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL:', name, extra); }
};

// Real lines, copied from the 2026-27 Premier League file
const REAL = `= English Premier League 2026/27

▪ Matchday 1
  Fri Aug 21 2026
    20:00  Arsenal FC              v Coventry City FC         3-0 (2-0)
  Sat Aug 22
    12:30  Hull City AFC           v Manchester United FC     2-0 (2-0)
    15:00  Ipswich Town FC         v Sunderland AFC           2-1 (1-1)
           Nottingham Forest FC    v Leeds United FC          0-1 (0-0)
    17:30  Brentford FC            v Tottenham Hotspur FC     3-0 (2-0)
  Sun Aug 23
    14:00  Manchester City FC      v AFC Bournemouth
           Brighton & Hove Albion FC v Aston Villa FC
    16:30  Newcastle United FC     v Liverpool FC
`;

const fx = parseLeagueTxt(REAL, 1);
const byHome = (n) => fx.find((f) => f.homeTeam.name === n);

console.log('— the line that was breaking —');
const forest = byHome('Nottingham Forest FC');
check('found the fixture', !!forest);
check('away name has no score in it', forest && forest.awayTeam.name === 'Leeds United FC',
  forest && JSON.stringify(forest.awayTeam.name));
check('reads as played', forest && forest.status === 'FINISHED', forest && forest.status);
check('score 0-1', forest && forest.score.home === 0 && forest.score.away === 1);
check('away win', forest && forest.score.winner === 'AWAY_TEAM', forest && forest.score.winner);

console.log('— scores at the end of the line —');
check('Arsenal 3-0', byHome('Arsenal FC')?.score.home === 3 && byHome('Arsenal FC')?.score.away === 0);
check('Arsenal away name clean', byHome('Arsenal FC')?.awayTeam.name === 'Coventry City FC');
check('Ipswich 2-1', byHome('Ipswich Town FC')?.score.home === 2 && byHome('Ipswich Town FC')?.score.away === 1);
check('Brentford 3-0', byHome('Brentford FC')?.score.home === 3);

console.log('— unplayed stay unplayed —');
check('Man City not played', byHome('Manchester City FC')?.status === 'SCHEDULED');
check('Man City no score', byHome('Manchester City FC')?.score.home === null);
check('Man City away clean', byHome('Manchester City FC')?.awayTeam.name === 'AFC Bournemouth');
// a club whose own name is long enough to crowd the column
check('Brighton parsed', byHome('Brighton & Hove Albion FC')?.awayTeam.name === 'Aston Villa FC',
  byHome('Brighton & Hove Albion FC')?.awayTeam.name);

console.log('— every name resolves to a real club —');
const known = new Set(TEAMS.map((t) => t.name));
const strays = [...new Set(fx.flatMap((f) => [f.homeTeam.name, f.awayTeam.name]))].filter((n) => !known.has(n));
check('no unknown clubs', strays.length === 0, JSON.stringify(strays));

console.log('— the other layout, score in the middle —');
const MIDDLE = `= Championship 2026/27

▪ Matchday 1
  Sat Aug 15 2026
    15:00  Derby County FC 2-1 (1-0) Millwall FC
`;
const mid = parseLeagueTxt(MIDDLE, 2);
check('middle-score still works', mid.length === 1 && mid[0].score.home === 2 && mid[0].score.away === 1);
check('middle-score away clean', mid[0]?.awayTeam.name === 'Millwall FC', mid[0]?.awayTeam.name);

console.log('— things that must not become fixtures —');
check('no fixture without a matchday', parseLeagueTxt('  Sat Aug 15 2026\n    15:00  A FC v B FC\n', 1).length === 0);
check('comments skipped', parseLeagueTxt('# Matches 380\n', 1).length === 0);

console.log('— the name mapping —');
// every club must resolve from its full name and its short name, and never
// cross-match onto a different club (Man City v Man Utd, the three Cities)
let nameFails = 0;
for (const t of TEAMS) {
  if (resolveClub(t.name) !== t.name) { nameFails += 1; console.log('  FAIL full:', t.name); }
  if (resolveClub(t.short) !== t.name) { nameFails += 1; console.log('  FAIL short:', t.short); }
  if (clubLabel(t.name) !== t.short) { nameFails += 1; console.log('  FAIL label:', t.name); }
}
check(`all ${TEAMS.length} clubs map both ways`, nameFails === 0, `${nameFails} failures`);

// and a name that has picked up a score still finds its club
check('rescues a glued-on score', clubLabel('Leeds United FC 0-1 (0-0)') === 'Leeds',
  clubLabel('Leeds United FC 0-1 (0-0)'));
check('rescues without half-time', clubLabel('Coventry City FC 3-0') === 'Coventry',
  clubLabel('Coventry City FC 3-0'));
// a club that genuinely is not ours still reads tidily rather than raw
check('unknown club tidied', clubLabel('Barnsley FC') === 'Barnsley', clubLabel('Barnsley FC'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
