// When a goal alert goes out, and to whom.
import { diffScores, messagesFor, readScoreboard } from '../../worker/src/alerts.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };

const game = (hs, as, state = 'in', clock = "63'") => ({ id: '1', home: 'Manchester City FC', away: 'Arsenal FC', hs, as, state, clock });
const assignments = { Phil: ['Manchester City FC'], TJ: ['Arsenal FC'] };
const subs = [
  { endpoint: 'a', who: 'Phil', scope: 'mine' },
  { endpoint: 'b', who: 'TJ', scope: 'mine' },
  { endpoint: 'c', who: 'Dan', scope: 'mine' },
  { endpoint: 'd', who: 'Dan', scope: 'all' },
];

console.log('— detecting goals —');
let r = diffScores({}, [game(0, 0, 'pre')]);
check('first sight records, no alert', r.events.length === 0 && r.next['1'].hs === 0);
r = diffScores(r.next, [game(1, 0)]);
check('first-minute goal after kick-off is caught', r.events.length === 1 && r.events[0].side === 'home');
r = diffScores(r.next, [game(1, 0)]);
check('no change, no alert', r.events.length === 0);
r = diffScores(r.next, [game(3, 1)]);
check('several goals in one minute each alert', r.events.length === 3);
r = diffScores(r.next, [game(2, 1)]);
check('VAR taking one back is silent', r.events.length === 0 && r.next['1'].hs === 2);
r = diffScores(r.next, [game(2, 1, 'post', 'FT')]);
check('full time alerts once', r.events.length === 1 && r.events[0].kind === 'ft');
r = diffScores(r.next, [game(2, 1, 'post', 'FT')]);
check('and not again', r.events.length === 0);
const gap = diffScores(r.next, []);
check('an ESPN blip keeps the record', gap.next['1'] && gap.next['1'].miss === 1);
check('mid-match first sight (after a deploy) does not alert', diffScores({}, [game(2, 0)]).events.length === 0);

console.log('— who hears about it —');
const goal = { kind: 'goal', side: 'home', g: game(1, 0) };
const m = messagesFor(goal, subs, assignments);
const to = (e) => m.find((x) => x.sub.endpoint === e);
check("owner of the scorer hears it's theirs", /yours!/.test(to('a')?.payload.body));
check('owner of the conceding club hears it', /against you/.test(to('b')?.payload.body));
check('someone uninvolved on "my clubs" hears nothing', !to('c'));
check('someone on "every goal" hears it', Boolean(to('d')) && /Phil's/.test(to('d').payload.body));
check('title names the scorer', to('a').payload.title.includes('Man City'));
check('same match shares a tag so alerts stack', to('a').payload.tag === 'm1');
const ft = messagesFor({ kind: 'ft', g: game(2, 1, 'post', 'FT') }, subs, assignments);
check('full time to both owners', ft.filter((x) => x.sub.who !== 'Dan').length === 2);

console.log('— reading ESPN —');
const sb = { events: [{ id: '9', status: { type: { state: 'in' }, displayClock: "12'" }, competitions: [{ competitors: [
  { homeAway: 'home', score: '1', team: { displayName: 'Wolverhampton Wanderers' } },
  { homeAway: 'away', score: '0', team: { displayName: 'West Bromwich Albion' } },
] }] }] };
const g = readScoreboard(sb);
check('club names resolved to ours', g[0]?.home === 'Wolverhampton Wanderers FC' && g[0]?.away === 'West Bromwich Albion FC', JSON.stringify(g[0]));
check('score and state', g[0]?.hs === 1 && g[0]?.as === 0 && g[0]?.state === 'in');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
