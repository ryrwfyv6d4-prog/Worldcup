// Bake a draw into public/draw-night.html.
//
// The result is decided here, once, and hard-coded into the page — the same way
// the World Cup draft-night page worked. That means the show and the app can
// never disagree, and the running order is fixed before anyone is in the room.
//
//   node scripts/draw-night.mjs                 # draw fresh, random
//   node scripts/draw-night.mjs --seed 1234     # reproducible
//   node scripts/draw-night.mjs --show          # print, write nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { TEAMS, buildPots, getTeam } from '../src/data/england2027.js';
import { COLOURS } from '../src/data/colours.js';
import { FIRM_LINES } from '../src/data/firms.js';

// The eleven, in the order they were drawn on World Cup draft night
const PLAYERS = [
  'Hendrik', 'Easton', 'Sam Hearn', 'Phil', 'Macri', 'Badger',
  'Dan', 'Piga', 'Mcivor', 'TJ', 'Jake',
];

const WORKER = process.env.VITE_WALL_API_URL || 'https://worldcup.phil-remington.workers.dev';
const PAGE = new URL('../public/draw-night.html', import.meta.url);

const args = process.argv.slice(2);
const seedArg = args.indexOf('--seed');
const seed = seedArg > -1 ? Number(args[seedArg + 1]) : null;
const showOnly = args.includes('--show');

// Seeded when asked so a draw can be reproduced, crypto-random otherwise
function makeRandom(s) {
  if (s == null) return (n) => randomInt(n);
  let x = s >>> 0;
  return (n) => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x % n;
  };
}

function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rnd = makeRandom(seed);
const plan = buildPots(PLAYERS.length);
if (!plan.viable) throw new Error(`${PLAYERS.length} players does not divide into the 44 clubs`);

// One club per tier per player. plan.tiers runs strongest first, so picks[0] is
// the Tier 1 club and the page flips the array in reverse.
const picks = {};
for (const p of PLAYERS) picks[p] = [];
for (const tier of plan.tiers) {
  const order = shuffle(tier.clubs, rnd);
  PLAYERS.forEach((p, i) => { if (order[i]) picks[p].push(order[i]); });
}

const short = new Map(TEAMS.map((t) => [t.name, t.short]));

const clubs = {};
for (const t of TEAMS) {
  const [firm, blurb] = FIRM_LINES[t.name] || ['—', ''];
  clubs[t.name] = {
    short: t.short,
    tla: t.tla,
    div: t.div,
    colours: COLOURS[t.name] || ['#5B5546', '#EFEAE0'],
    firm,
    blurb,
  };
}

const data = {
  players: PLAYERS.map((name) => ({ name, picks: picks[name] })),
  clubs,
  tiers: plan.tiers.map((t) => t.clubs),
  worker: WORKER,
};

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`Draw for ${PLAYERS.length} players${seed == null ? '' : ` (seed ${seed})`}\n`);
for (const name of PLAYERS) {
  const line = picks[name].map((c, i) => `T${i + 1} ${short.get(c)}`).join('  ·  ');
  console.log(`  ${name.padEnd(10)} ${line}`);
}

const dealt = Object.values(picks).flat();
const unique = new Set(dealt);
console.log(`\n  ${dealt.length} clubs dealt, ${unique.size} distinct, ${TEAMS.length - unique.size} unclaimed`);
if (unique.size !== dealt.length) throw new Error('a club was dealt twice');
if (dealt.length !== TEAMS.length) throw new Error(`dealt ${dealt.length} of ${TEAMS.length} clubs`);
for (const [name, list] of Object.entries(picks)) {
  if (list.length !== plan.tiers.length) throw new Error(`${name} got ${list.length} clubs`);
  const divs = list.map((c) => getTeam(c).div);
  if (!divs.includes(1) || !divs.includes(2)) {
    console.log(`  note: ${name} has clubs from only one division`);
  }
}

if (showOnly) process.exit(0);

// ── Write ───────────────────────────────────────────────────────────────────
const html = readFileSync(PAGE, 'utf8');
const open = '<script id="draw-data" type="application/json">';
const start = html.indexOf(open);
if (start === -1) throw new Error('draw-data block not found in draw-night.html');
const from = start + open.length;
const to = html.indexOf('</' + 'script>', from);

// Base64 so the result isn't readable straight off the page source or the repo
const baked = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
writeFileSync(PAGE, html.slice(0, from) + baked + html.slice(to));
console.log(`\nBaked into ${PAGE.pathname.replace(/^.*\/premier\//, 'premier/')}`);
