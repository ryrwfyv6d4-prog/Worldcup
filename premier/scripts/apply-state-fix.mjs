// One-off state correction, run from CI because the dev sandbox cannot reach
// the worker: TJ and Phil traded Arsenal and Man City in real life, and the
// app's shared state still has it the old way round.
//
// Idempotent and tightly guarded: it only acts when the state is EXACTLY the
// pre-trade shape — TJ holding Arsenal and Phil holding Man City. Once applied
// (or if someone has already done it through the app's swap tool) it is a
// no-op, so running on every deploy is safe. Remove the deploy step once the
// logs confirm it has landed.
//
// Everything else in the state — wall posts, polls, medals, bonus points, the
// lock — is carried through untouched.

const WORKER = process.env.VITE_WALL_API_URL || 'https://worldcup.phil-remington.workers.dev';

const ARSENAL = 'Arsenal FC';
const CITY = 'Manchester City FC';

const res = await fetch(`${WORKER}/epl/state`, { signal: AbortSignal.timeout(20000) });
if (!res.ok) {
  console.log(`state fix: worker returned ${res.status} — leaving it alone`);
  process.exit(0);
}
const state = await res.json();
const a = state && state.assignments;
if (!a || !a.TJ || !a.Phil) {
  console.log('state fix: no draw published yet — nothing to fix');
  process.exit(0);
}

console.log('before  TJ  :', a.TJ.join(', '));
console.log('before  Phil:', a.Phil.join(', '));

const preTrade = a.TJ.includes(ARSENAL) && a.Phil.includes(CITY);
if (!preTrade) {
  console.log('state fix: already applied (or not applicable) — no-op');
  process.exit(0);
}

const next = {
  ...state,
  assignments: {
    ...a,
    TJ: a.TJ.map((t) => (t === ARSENAL ? CITY : t)),
    Phil: a.Phil.map((t) => (t === CITY ? ARSENAL : t)),
  },
};

const put = await fetch(`${WORKER}/epl/state`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(next),
  signal: AbortSignal.timeout(20000),
});
if (!put.ok) {
  console.log(`state fix: PUT failed with ${put.status}`);
  process.exit(1);
}
console.log('after   TJ  :', next.assignments.TJ.join(', '));
console.log('after   Phil:', next.assignments.Phil.join(', '));
console.log('state fix: APPLIED — Arsenal to Phil, Man City to TJ');
