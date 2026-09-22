// The shared-state operations. These run on every phone and in the worker,
// and they are the only thing standing between a stale phone and everyone
// else's Wall posts, votes and swaps.
import { applyOp, applyOps, mergeLegacy, EMPTY_STATE } from '../src/utils/stateOps.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };

const base = {
  ...EMPTY_STATE,
  assignments: { Phil: ['Manchester City FC', 'Sunderland AFC'], TJ: ['Arsenal FC', 'Leeds United FC'] },
  drawLocked: true,
  bonusPoints: { Phil: { forfeit: { pts: 2, label: 'forfeit' } } },
  wallPosts: [{ id: 1, person: 'Macri', text: 'one', ts: 1 }],
  polls: [{ id: 10, person: 'Dan', q: 'Venue?', options: ['A', 'B'], votes: { Dan: 1 }, ts: 10 }],
};

console.log('— wall —');
let s = applyOp(base, { type: 'wall.add', post: { id: 2, person: 'Phil', text: 'two', ts: 2 } });
check('adds a post', s.wallPosts.length === 2 && s.wallPosts[0].id === 2);
check('adding twice is a no-op', applyOp(s, { type: 'wall.add', post: { id: 2, person: 'Phil', text: 'two', ts: 2 } }).wallPosts.length === 2);
s = applyOp(s, { type: 'wall.remove', id: 2 });
check('removes a post', s.wallPosts.length === 1 && s.deleted.includes(2));
check('a removed post cannot be re-added', applyOp(s, { type: 'wall.add', post: { id: 2, person: 'Phil', text: 'two', ts: 2 } }).wallPosts.length === 1);
check('does not mutate input', base.wallPosts.length === 1);

console.log('— polls —');
s = applyOps(base, [
  { type: 'poll.vote', id: 10, person: 'Phil', option: 0 },
  { type: 'poll.vote', id: 10, person: 'Jake', option: 1 },
]);
check('two voters both counted', s.polls[0].votes.Phil === 0 && s.polls[0].votes.Jake === 1 && s.polls[0].votes.Dan === 1);
s = applyOp(s, { type: 'poll.vote', id: 10, person: 'Phil', option: null });
check('unvote removes only that vote', !('Phil' in s.polls[0].votes) && s.polls[0].votes.Jake === 1);

console.log('— draw —');
check('a locked draw cannot be replaced', applyOp(base, { type: 'draw.set', assignments: { X: [] } }).assignments.Phil.length === 2);
check('an unlocked draw can', applyOp({ ...base, drawLocked: false }, { type: 'draw.set', assignments: { X: [] } }).assignments.X);
const swap = {
  type: 'draw.swap',
  a: { person: 'Phil', team: 'Sunderland AFC' }, b: { person: 'TJ', team: 'Leeds United FC' },
  note: { id: 99, person: 'Phil', text: 'swapped', ts: 99 },
};
s = applyOp(base, swap);
check('swap moves both clubs', s.assignments.Phil.includes('Leeds United FC') && s.assignments.TJ.includes('Sunderland AFC'));
check('swap leaves a note on the wall', s.wallPosts[0].id === 99 && s.wallPosts[0].note === true);
check('a stale swap is dropped', applyOp(s, swap).assignments.Phil.includes('Leeds United FC'));

console.log('— medals —');
s = applyOp(base, { type: 'medal.set', team: 'Sunderland AFC', key: 'CUP', on: true, note: { id: 50, person: 'Dan', text: 'x', ts: 50 } });
check('medal awarded', s.manualMedals['Sunderland AFC'][0] === 'CUP' && s.wallPosts[0].id === 50);
check('medal removed', !applyOp(s, { type: 'medal.set', team: 'Sunderland AFC', key: 'CUP', on: false }).manualMedals['Sunderland AFC']);

console.log('— whole-state uploads (draw night, old builds) —');
const stale = { ...base, wallPosts: [], polls: [{ ...base.polls[0], votes: { Dan: 0, Old: 1 } }],
  assignments: { Phil: ['Arsenal FC', 'Sunderland AFC'], TJ: ['Manchester City FC', 'Leeds United FC'] } };
const current = applyOps(base, [{ type: 'wall.add', post: { id: 3, person: 'Jake', text: 'new', ts: 3 } }, { type: 'wall.remove', id: 1 }]);
const m = mergeLegacy(current, { ...stale, wallPosts: [{ id: 1, person: 'Macri', text: 'one', ts: 1 }, { id: 4, person: 'Old', text: 'old build post', ts: 4 }] });
check('stale upload keeps newer posts', m.wallPosts.some((p) => p.id === 3));
check('stale upload adds its own new post', m.wallPosts.some((p) => p.id === 4));
check('stale upload cannot resurrect a deleted post', !m.wallPosts.some((p) => p.id === 1));
check('stale upload cannot revert a locked draw', m.assignments.Phil.includes('Manchester City FC'));
check('stored votes win, new voters added', m.polls[0].votes.Dan === 1 && m.polls[0].votes.Old === 1);
check('empty upload wipes nothing', mergeLegacy(current, {}).wallPosts.length === current.wallPosts.length
  && Object.keys(mergeLegacy(current, {}).assignments).length === 2);
check('bonus points survive a locked upload', mergeLegacy(current, { bonusPoints: {} }).bonusPoints.Phil.forfeit.pts === 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
