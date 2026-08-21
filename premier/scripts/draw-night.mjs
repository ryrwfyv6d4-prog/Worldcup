// Bake a draw into public/draw-night.html.
//
// The result is decided here, once, and hard-coded into the page — the same way
// the World Cup draft-night page worked. That means the show and the app can
// never disagree, and the running order is fixed before anyone is in the room.
//
// Re-running KEEPS the draw already in the page. Only --redraw or --seed pull
// a new one, so adding a hype reel or fixing a blurb can never scramble it by
// accident.
//
//   node scripts/draw-night.mjs                 # refresh the page, keep the draw
//   node scripts/draw-night.mjs --redraw        # draw fresh, random
//   node scripts/draw-night.mjs --seed 1234     # draw fresh, reproducible
//   node scripts/draw-night.mjs --show          # print a fresh draw, write nothing
//   node scripts/draw-night.mjs --reel <url>          # hype reel, on the ticket screen
//   node scripts/draw-night.mjs --highlights <url>    # package that opens the draw
//   node scripts/draw-night.mjs --audio-alt MCI,NEW   # use a club's alternate tune
//
// Both videos are picked up automatically from public/hype.mp4 and
// public/highlights.mp4 (or .webm/.mov/.m4v) if they are sitting there. A local
// file is the safe choice for the night, since it plays with no network at all.
// --no-reel and --no-highlights leave them out.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { TEAMS, buildPots, getTeam, SCORING, MEDALS, ENTRY_FEE, PAYOUTS } from '../src/data/england2027.js';
import { COLOURS } from '../src/data/colours.js';
import { FIRM_LINES } from '../src/data/firms.js';
import { parseLeagueTxt } from '../src/utils/leagueFeed.js';
import { projectSeason } from '../src/utils/projection.js';

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
// mp4 first: the only container that plays everywhere, including whatever
// browser the telly turns out to have
const VIDEO_EXT = ['mp4', 'webm', 'm4v', 'mov'];

// A file next to the page beats a URL: nothing to buffer and nothing to fail.
// The scan is case-insensitive because Highlights.MP4 straight off a phone
// should just work rather than silently produce no video.
function findVideo(flag, base) {
  if (args.includes(`--no-${flag}`)) return null;
  const i = args.indexOf(`--${flag}`);
  if (i > -1 && args[i + 1]) {
    const src = args[i + 1];
    if (/youtu\.?be/.test(src)) return { type: 'youtube', src };
    return { type: /^https?:/.test(src) ? 'url' : 'file', src };
  }
  const re = new RegExp(`^${base}\\.(${VIDEO_EXT.join('|')})$`, 'i');
  const hit = readdirSync(new URL('../public/', import.meta.url))
    .filter((f) => re.test(f))
    .sort((a, b) => VIDEO_EXT.indexOf(a.split('.').pop().toLowerCase())
                  - VIDEO_EXT.indexOf(b.split('.').pop().toLowerCase()))[0];
  return hit ? { type: 'file', src: `./${hit}` } : null;
}

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

// What the page already holds, if anything
function existingData() {
  try {
    const html = readFileSync(PAGE, 'utf8');
    const m = html.match(/<script id="draw-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const raw = m[1].trim();
    if (!raw || raw.startsWith('{')) return null;   // placeholder, never drawn
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch { return null; }
}

const prev = existingData();

function existingPicks() {
  if (!prev) return null;
  const out = {};
  for (const p of prev.players || []) out[p.name] = p.picks;
  const names = Object.keys(out);
  if (names.length !== PLAYERS.length || PLAYERS.some((n) => !out[n])) return null;
  return out;
}

const redraw = args.includes('--redraw') || seed != null || showOnly;
const kept = redraw ? null : existingPicks();

// A video chosen by flag has no file on disk to rediscover, so without this a
// later plain re-run would quietly drop it
const reel = findVideo('reel', 'hype') || (args.includes('--no-reel') ? null : prev && prev.reel) || null;
const highlights = findVideo('highlights', 'highlights')
  || (args.includes('--no-highlights') ? null : prev && prev.highlights) || null;

const rnd = makeRandom(seed);
const plan = buildPots(PLAYERS.length);
if (!plan.viable) throw new Error(`${PLAYERS.length} players does not divide into the 44 clubs`);

// One club per tier per player. plan.tiers runs strongest first, so picks[0] is
// the Tier 1 club and the page flips the array in reverse.
let picks;
if (kept) {
  picks = kept;
} else {
  picks = {};
  for (const p of PLAYERS) picks[p] = [];
  for (const tier of plan.tiers) {
    const order = shuffle(tier.clubs, rnd);
    PLAYERS.forEach((p, i) => { if (order[i]) picks[p].push(order[i]); });
  }
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

// ── Club audio ──────────────────────────────────────────────────────────────
// Only the URLs are baked, never the audio. The page streams Apple's public
// preview unless a local file has been dropped next to it, which keeps other
// people's music out of a public repository.
function buildAudio() {
  if (args.includes('--no-audio')) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(new URL('./club-audio.json', import.meta.url), 'utf8'));
  } catch { return null; }
  const altArg = args.indexOf('--audio-alt');
  const alts = new Set(
    altArg > -1 && args[altArg + 1] ? args[altArg + 1].split(',').map((x) => x.trim().toUpperCase()) : []
  );
  const out = {};
  for (const t of manifest.tracks || []) {
    const useAlt = alts.has(t.code) && t.alt_previewUrl;
    out[t.code] = {
      url: useAlt ? t.alt_previewUrl : t.previewUrl,
      track: useAlt ? (t.alt_track || t.track) : t.track,
      artist: t.artist,
    };
  }
  return Object.keys(out).length ? out : null;
}

const audio = buildAudio();

// ── The forfeits ────────────────────────────────────────────────────────────
// One per player, played straight after their Hat A reveal. They are written
// against the clubs people actually drew, so anything naming a club its owner
// no longer holds is dropped rather than left to read as nonsense on the night.
function buildChallenges() {
  if (args.includes('--no-challenges')) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(new URL('./challenges.json', import.meta.url), 'utf8'));
  } catch { return null; }
  const out = [];
  const stale = [];
  for (const c of manifest.challenges || []) {
    if (!picks[c.player]) continue;                       // not in this draw
    if (c.crest && !picks[c.player].includes(c.crest)) { stale.push(c.player); continue; }
    out.push(c);
  }
  if (stale.length) console.log(`  forfeits: dropped ${stale.join(', ')} — the club they name is no longer theirs`);
  return out.length ? out : null;
}

const challenges = buildChallenges();

// ── The verdict ─────────────────────────────────────────────────────────────
// Run the same season simulation the app uses and bake the answer in, so the
// last screen can tell everyone who got the best draw without needing a
// network on the night. If the feed can't be reached, the show just skips it.
const FEEDS = [
  { div: 1, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt' },
  { div: 2, url: 'https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt' },
];

async function buildForecast() {
  if (args.includes('--no-forecast')) return null;
  try {
    const fixtures = (await Promise.all(FEEDS.map(async (f) => {
      const res = await fetch(f.url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`feed ${f.div} returned ${res.status}`);
      return parseLeagueTxt(await res.text(), f.div);
    }))).flat();
    if (!fixtures.length) throw new Error('no fixtures parsed');

    const assignments = {};
    for (const p of PLAYERS) assignments[p] = picks[p];
    const proj = projectSeason(assignments, fixtures, {});

    const clubs = {};
    for (const [name, c] of Object.entries(proj.clubs)) {
      clubs[name] = { median: c.median, best: c.best, worst: c.worst, tipped: c.tipped };
    }
    return {
      runs: proj.runs,
      fixtures: fixtures.length,
      players: PLAYERS
        .map((name) => ({ name, ...proj.players[name] }))
        .sort((a, b) => b.projected - a.projected),
      clubs,
    };
  } catch (err) {
    console.log(`  forecast: skipped — ${err.message}`);
    return null;
  }
}

const forecast = await buildForecast();

// ── The rules card ──────────────────────────────────────────────────────────
// Generated from the same constants the app scores with, so what goes up on the
// wall on the night is what the ladder actually does all season.
const plClubs = TEAMS.filter((t) => t.div === 1).length;
const chClubs = TEAMS.filter((t) => t.div === 2).length;
const threes = PLAYERS.length * 2 - plClubs;   // players forced onto a third Championship club

const rules = {
  pot: `$${ENTRY_FEE} a head. ${PLAYERS.length} in, so $${ENTRY_FEE * PLAYERS.length} in the tin.`,
  squad: `${plan.perPlayer} clubs each, one out of every hat, across the Premier League and the Championship.`,
  split: `${plClubs} top-flight clubs will not divide ${PLAYERS.length} ways, so ${threes} of you carry three Championship sides. The prices make up for it.`,
  results: `Every win is priced on how likely it was. Beat a club rated above you, or win away from home, and it pays more. Any draw is +${SCORING.DRAW}.`,
  overachieve: `Finish above where the bookies tipped you and take +${SCORING.OVERACHIEVE} a place, from ${SCORING.OVERACHIEVE_MIN_GAMES} games in.`,
  honours: [
    `Win the Premier League +${MEDALS.VC.pts}`,
    `Top four +${MEDALS.DSO.pts}`,
    `Promoted +${MEDALS.PROMOTION.pts}`,
    `Survive as a bottom-half side +${MEDALS.SURVIVAL.pts}`,
    `Play-off final +${MEDALS.BIG_PUSH.pts}`,
    `Championship title +${MEDALS.CHAMP_TITLE.pts}`,
    `A cup +${MEDALS.CUP.pts}`,
  ],
  payouts: PAYOUTS.map((x) => `${x.label} ${Math.round(x.pct * 100)}%`).join(' · '),
  closer: 'Blind, final, no trades, no appeals.',
};

const data = {
  players: PLAYERS.map((name) => ({ name, picks: picks[name] })),
  clubs,
  tiers: plan.tiers.map((t) => t.clubs),
  worker: WORKER,
  reel,
  highlights,
  audio,
  forecast,
  rules,
  challenges,
};

// ── Report ──────────────────────────────────────────────────────────────────
console.log(kept
  ? `Keeping the draw already in the page (--redraw to pull a new one)\n`
  : `Draw for ${PLAYERS.length} players${seed == null ? '' : ` (seed ${seed})`}\n`);
for (const name of PLAYERS) {
  const line = picks[name].map((c, i) => `T${i + 1} ${short.get(c)}`).join('  ·  ');
  console.log(`  ${name.padEnd(10)} ${line}`);
}

const dealt = Object.values(picks).flat();
const unique = new Set(dealt);
console.log(`\n  ${dealt.length} clubs dealt, ${unique.size} distinct, ${TEAMS.length - unique.size} unclaimed`);
if (forecast) {
  const top = forecast.players[0];
  console.log(`  forecast: ${forecast.runs} seasons over ${forecast.fixtures} fixtures — `
    + `${top.name} favourite on ${top.projected} (${Math.round(top.pFirst * 100)}%)`);
}
const sayVideo = (label, v, hint) => console.log(
  v ? `  ${label}: ${v.type} — ${v.src}` : `  ${label}: none (${hint})`);
console.log(audio
  ? `  club audio: ${Object.keys(audio).length} clubs — streams the preview unless public/audio/<CODE>.mp3 exists`
  : '  club audio: none');
console.log(challenges
  ? `  forfeits: ${challenges.length} of ${PLAYERS.length}, one after each Hat A reveal`
  : '  forfeits: none');
sayVideo('hype reel ', reel, 'drop one at premier/public/hype.mp4, or pass --reel <url>');
sayVideo('highlights', highlights, 'drop one at premier/public/highlights.mp4, or pass --highlights <url>');
if (highlights) {
  console.log('              plays once, straight after Begin the Draw');
  if (highlights.type === 'youtube') {
    console.log('              needs wifi. It ends itself once YouTube\'s player API loads;');
    console.log('              if that is blocked, Skip or Escape moves the show on.');
  }
}
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
