// The FotMob trimmer: the only thing between a megabyte of someone else's
// JSON and the line-ups and stats tabs.
import { trimMatchDetails } from '../src/utils/fotmobMatch.js';
import { SAMPLE } from './fixtures/fotmob-sample.mjs';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };

const t = trimMatchDetails(SAMPLE);
console.log('— line-ups —');
check('both XIs of eleven', t.home.xi.length === 11 && t.away.xi.length === 11);
check('formations', t.home.formation === '4-3-3' && t.away.formation === '4-2-3-1');
check('every starter placed', [...t.home.xi, ...t.away.xi].every((p) => p.x != null && p.y != null));
check('subs have no position', t.home.subs.every((p) => p.x == null));
check('surname shown', t.away.xi[8].name === 'Salah');
check('rating carried', t.away.xi[0].rating === 8.4);
check('sub-off minute', t.home.xi[5].off === 88 && t.home.xi[9].off === 75);
check('sub-on minute', t.home.subs[0].on === 75 && t.home.subs[2].on == null);
check('goal from events', t.away.xi[8].goals === 1);
check('assist from player stats', t.away.xi[9].assists === 1);
check('cards from events', t.away.xi[7].yellow === 1 && t.home.xi[4].yellow === 1);
check('coach', t.away.coach === 'Arne Slot');

console.log('— team stats —');
check('three periods', t.periods.map((p) => p.key).join() === 'All,FirstHalf,SecondHalf');
const all = t.periods[0];
check('header rows dropped', !all.groups.some((g) => g.rows.some((r) => r.title === g.title && r.h === 0 && r.a === 0 && r.home === '0')));
const pass_ = all.groups[0].rows.find((r) => r.key === 'accurate_passes');
check('"298 (78%)" reads as 298', pass_.h === 298 && pass_.a === 386 && pass_.home === '298 (78%)');
const xg = all.groups[0].rows.find((r) => r.key === 'expected_goals');
check('xG numeric', xg.h === 0.79 && xg.a === 1.65);
check('fouls marked low-is-good', all.groups.find((g) => g.key === 'discipline').rows[0].low === true);

console.log('— players, shots, momentum —');
check('player stats keyed by id', t.players[208]?.goals === 1 && t.players[200]?.rating === 8.4);
check('fractions formatted', t.players[100].groups[0].rows.some(([l, v]) => l === 'Accurate passes' && v === '37/47 (79%)'));
check('distance in km', t.players[100].groups[0].rows.some(([l, v]) => l === 'Distance covered' && v === '10.6 km'));
check('rating and shotmap flag not repeated as rows', !t.players[100].groups[0].rows.some(([l]) => l === 'FotMob rating' || l === 'Shotmap'));
check('shots sided', t.shots.filter((s) => s.side === 'away').length === 2 && t.shots.filter((s) => s.side === 'home').length === 3);
check('goal flagged', t.shots.find((s) => s.name === 'Salah').goal === true);
check('momentum series', t.momentum.length === 94 && typeof t.momentum[3].v === 'number');
check('player of the match', t.potm.id === 200 && t.potm.rating === 8.4 && t.potm.home === false);
check('finished', t.finished === true);

console.log('— survives an empty or odd payload —');
const empty = trimMatchDetails({});
check('empty payload', empty.found && empty.home === null && empty.periods.length === 0 && empty.shots.length === 0);
check('null payload', trimMatchDetails(null).found === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
