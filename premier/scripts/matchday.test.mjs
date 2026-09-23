// The live table, the season race and the recap all replay the real scoring
// over a different set of results. These check they add up to what the real
// ladder says, and never change a point on their own.
import { buildLadder } from '../src/utils/scoring.js';
import { asItStands, liveLadder, raceSeries, roundRecap, lastRoundWeek, weekStartOf, recapLines } from '../src/utils/matchday.js';
import { recapPayload } from '../../worker/src/alerts.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };

const assignments = { Phil: ['Manchester City FC', 'Swansea City AFC'], TJ: ['Arsenal FC', 'Leeds United FC'], Dan: ['Brighton & Hove Albion FC', 'Norwich City FC'] };
let id = 0;
const fx = (div, h, a, iso, status = 'SCHEDULED', hs = null, as = null) => ({
  id: ++id, division: div, matchday: 1, utcDate: iso, status,
  homeTeam: { name: h }, awayTeam: { name: a },
  score: { home: hs, away: as, winner: status === 'FINISHED' ? (hs > as ? 'HOME_TEAM' : as > hs ? 'AWAY_TEAM' : 'DRAW') : null },
});
// two weeks of results, then a game in play
const fixtures = [
  fx(1, 'Manchester City FC', 'Arsenal FC', '2026-09-12T14:00:00Z', 'FINISHED', 2, 0),
  fx(1, 'Leeds United FC', 'Brighton & Hove Albion FC', '2026-09-13T14:00:00Z', 'FINISHED', 1, 1),
  fx(2, 'Swansea City AFC', 'Norwich City FC', '2026-09-19T14:00:00Z', 'FINISHED', 3, 0),
  fx(1, 'Arsenal FC', 'Brighton & Hove Albion FC', '2026-09-20T14:00:00Z', 'FINISHED', 0, 1),
  { ...fx(1, 'Leeds United FC', 'Manchester City FC', '2026-09-26T14:00:00Z', 'IN_PLAY', 1, 0), liveClock: '63' },
  fx(2, 'Norwich City FC', 'Swansea City AFC', '2026-10-03T14:00:00Z'),
];

console.log('— as it stands —');
const live = asItStands(fixtures);
check('in-play game counted at its score', live[4].status === 'FINISHED' && live[4].score.winner === 'HOME_TEAM' && live[4].provisional);
check('finished and future games untouched', live[0] === fixtures[0] && live[5] === fixtures[5]);
const lv = liveLadder(assignments, fixtures, {}, {});
const real = buildLadder(assignments, fixtures, {}, {});
check('live flag', lv.live === true);
check('TJ gains live from Leeds leading', lv.delta.TJ.pts > 0);
check('Phil gains nothing live from City losing', lv.delta.Phil.pts === 0);
check('live total = real + delta', lv.ladder.every((r) => r.total === real.find((x) => x.name === r.name).total + lv.delta[r.name].pts));
check('no game on: same as the real ladder', !liveLadder(assignments, fixtures.slice(0, 4), {}, {}).live);

console.log('— season race —');
const race = raceSeries(assignments, fixtures, {}, {});
check('a start point plus one per week', race.weeks.length === 3, race.weeks.map((w) => w.label).join());
check('everyone starts at their bonus (zero here)', Object.values(race.series).every((v) => v[0] === 0));
check('last point equals the real ladder', real.every((r) => race.series[r.name].at(-1) === r.total));
check('totals never go down', Object.values(race.series).every((v) => v.every((x, i) => !i || x >= v[i - 1])));
check('ranks alongside', race.ranks.Phil.length === 3 && race.ranks.Phil.every((r) => r >= 1 && r <= 3));

console.log('— recap —');
const now = Date.parse('2026-09-22T03:00:00Z');   // Tuesday after the second week
const wk = lastRoundWeek(fixtures, now);
check('last round is the week of 15–21 Sep', wk === weekStartOf(Date.parse('2026-09-19T00:00:00Z')));
const r = roundRecap(assignments, fixtures, {}, {}, now);
const gains = Object.fromEntries(r.rows.map((x) => [x.name, x.gained]));
check('round gains add up to the change in totals', r.rows.every((x) => x.total - x.gained === buildLadder(assignments, fixtures.filter((f) => Date.parse(f.utcDate) < wk), {}, {}).find((y) => y.name === x.name).total));
check('winner has the biggest gain', r.winner.gained === Math.max(...Object.values(gains)));
check('result of the week is a real win', r.best && r.best.pts > 0 && /beat|won at/.test(r.best.text), JSON.stringify(r.best));
check('in-play games are not in a finished round', r.games === 2);
check('lines read as sentences', recapLines(r).length >= 2 && recapLines(r).every((l) => typeof l === 'string' && l.length > 5));
const p = recapPayload(r);
check('notification title and body', /^Round recap: .+ won the week \(\+\d+\)$/.test(p.title) && p.body.length > 10 && p.tag === `recap-${r.start}`, p.title);
check('no round yet, no recap', roundRecap(assignments, fixtures, {}, {}, Date.parse('2026-09-10T00:00:00Z')) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
