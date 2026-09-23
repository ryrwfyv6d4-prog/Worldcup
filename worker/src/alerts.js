// Goal alerts: once a minute, compare ESPN's scores with the last look and
// tell the people whose clubs are involved.
//
// Pure functions up top (tested in premier/scripts/alerts.test.mjs), the
// Worker plumbing at the bottom.
import { resolveClub } from '../../premier/src/utils/teamMatch.js';
import { getTeam } from '../../premier/src/data/england2027.js';
import { makeVapidKeys, sendPush } from './webpush.js';
import { loadFixtures } from '../../premier/src/utils/fixturesCore.js';
import { roundRecap, recapHeadline, recapLines, weekStartOf, lastRoundWeek } from '../../premier/src/utils/matchday.js';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const LEAGUES = ['eng.1', 'eng.2'];
const SUBJECT = 'https://ryrwfyv6d4-prog.github.io/Worldcup/england/';
const short = (name) => getTeam(name)?.short || name;

// ESPN scoreboard -> [{ id, home, away, hs, as, state, clock }]
export function readScoreboard(json) {
  const out = [];
  for (const e of json?.events || []) {
    const c = (e.competitions || [])[0];
    if (!c) continue;
    const hc = (c.competitors || []).find((x) => x.homeAway === 'home');
    const ac = (c.competitors || []).find((x) => x.homeAway === 'away');
    const home = resolveClub(hc?.team?.displayName);
    const away = resolveClub(ac?.team?.displayName);
    if (!home || !away) continue;
    out.push({
      id: String(e.id), home, away,
      hs: Number(hc.score) || 0, as: Number(ac.score) || 0,
      state: e.status?.type?.state || 'pre',       // pre | in | post
      clock: e.status?.displayClock || null,
    });
  }
  return out;
}

const ownerOf = (team, assignments) => {
  for (const [name, teams] of Object.entries(assignments || {})) if ((teams || []).includes(team)) return name;
  return null;
};

// What changed since last time. Matches are tracked from before kick-off, so
// even a first-minute goal is a change. A match seen for the first time is
// only recorded: after a deploy nobody wants a burst of goals from an hour
// ago. A goal taken back by VAR just lowers the record.
export function diffScores(prev, games) {
  const next = {};
  const events = [];
  for (const g of games) {
    const was = prev[g.id];
    next[g.id] = { hs: g.hs, as: g.as, state: g.state };
    if (!was) continue;
    for (let n = was.hs + 1; n <= g.hs; n++) events.push({ kind: 'goal', side: 'home', g, n });
    for (let n = was.as + 1; n <= g.as; n++) events.push({ kind: 'goal', side: 'away', g, n });
    if (was.state !== 'post' && g.state === 'post') events.push({ kind: 'ft', g });
  }
  // A match missing from this read (ESPN hiccup, month rolled over) keeps its
  // last score for a day, so it can't come back as "first seen" and lose a
  // goal, or re-alert an old one.
  for (const [id, v] of Object.entries(prev)) {
    if (next[id]) continue;
    const miss = (v.miss || 0) + 1;
    if (miss <= 1440) next[id] = { ...v, miss };
  }
  return { next, events };
}

// Who hears about it, and what they read. Subscribers pick 'mine' (games
// involving their clubs) or 'all'.
export function messagesFor(event, subs, assignments) {
  const { g } = event;
  const ho = ownerOf(g.home, assignments);
  const ao = ownerOf(g.away, assignments);
  const line = `${short(g.home)} ${g.hs}–${g.as} ${short(g.away)}`;
  const out = [];
  for (const s of subs) {
    const involved = s.who && (s.who === ho || s.who === ao);
    if (s.scope !== 'all' && !involved) continue;
    let title, body;
    if (event.kind === 'goal') {
      const scorer = event.side === 'home' ? g.home : g.away;
      const scorerOwner = event.side === 'home' ? ho : ao;
      title = `⚽ Goal, ${short(scorer)}`;
      body = `${line}${g.clock ? ` · ${g.clock}` : ''}`;
      if (s.who && scorerOwner === s.who) body += ' · yours!';
      else if (involved) body += ' · against you';
      else if (scorerOwner) body += ` · ${scorerOwner}'s`;
    } else {
      title = 'Full time';
      body = line + (involved ? ` · ${s.who === ho ? short(g.home) : short(g.away)} is yours` : '');
    }
    out.push({ sub: s, payload: { title, body, tag: `m${g.id}`, url: './' } });
  }
  return out;
}

// ── Worker side ─────────────────────────────────────────────────────────────
const KEYS = 'epl-push/vapid.json';
const LIVE = 'epl-push/live.json';
const SUBS = 'epl-push/subs/';

export async function vapidKeys(env) {
  const got = await env.WALL.get(KEYS);
  if (got) return JSON.parse(await got.text());
  const keys = await makeVapidKeys();
  await env.WALL.put(KEYS, JSON.stringify(keys));
  return keys;
}

async function subKey(endpoint) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return SUBS + [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('') + '.json';
}

export async function saveSub(env, { subscription, who, scope }) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new Error('bad subscription');
  const rec = { endpoint: subscription.endpoint, keys: subscription.keys, who: who || null, scope: scope === 'all' ? 'all' : 'mine', ts: Date.now() };
  await env.WALL.put(await subKey(rec.endpoint), JSON.stringify(rec));
  return rec;
}
export async function dropSub(env, endpoint) {
  await env.WALL.delete(await subKey(endpoint));
}
async function loadSubs(env) {
  const list = await env.WALL.list({ prefix: SUBS });
  const recs = await Promise.all(list.objects.map(async (o) => {
    const it = await env.WALL.get(o.key);
    return it ? JSON.parse(await it.text()) : null;
  }));
  return recs.filter(Boolean);
}

export async function sendTo(env, rec, payload) {
  const status = await sendPush(rec, payload, await vapidKeys(env), SUBJECT);
  if (status === 404 || status === 410) await dropSub(env, rec.endpoint);
  return status;
}

// The cron: one minute's look at both divisions
export async function runAlerts(env) {
  const month = new Date().toISOString().slice(0, 7).replace('-', '');
  const games = [];
  for (const lg of LEAGUES) {
    try {
      const r = await fetch(`${ESPN}/${lg}/scoreboard?dates=${month}`);
      if (r.ok) games.push(...readScoreboard(await r.json()));
    } catch { /* one league down is no reason to skip the other */ }
  }
  const prevObj = await env.WALL.get(LIVE);
  const prev = prevObj ? JSON.parse(await prevObj.text()) : {};
  const { next, events } = diffScores(prev, games);
  if (JSON.stringify(next) !== JSON.stringify(prev)) await env.WALL.put(LIVE, JSON.stringify(next));
  if (!events.length) return { games: games.length, events: 0 };

  const stateObj = await env.WALL.get('epl-state.json');
  const assignments = stateObj ? JSON.parse(await stateObj.text()).assignments || {} : {};
  const subs = await loadSubs(env);
  let sent = 0;
  for (const ev of events) {
    for (const m of messagesFor(ev, subs, assignments)) {
      try { if ((await sendTo(env, m.sub, m.payload)) < 300) sent += 1; } catch { /* next */ }
    }
  }
  return { games: games.length, events: events.length, sent };
}

// ── The Monday recap ────────────────────────────────────────────────────────
// Once a round (Tuesday to Monday in England) is over, everyone with alerts
// on gets one notification: who won the week, who climbed, who's bottom. It
// goes out on the first cron run of Tuesday UTC, which is after Monday night's
// games and mid-morning in Melbourne. A flag in R2 makes it once per round.
export function recapPayload(r) {
  if (!r) return null;
  const body = recapLines(r).slice(0, 3).join(' · ');
  return { title: `Round recap: ${recapHeadline(r)}`, body, tag: `recap-${r.start}`, url: './' };
}

export async function runRecap(env, now = Date.now()) {
  if (new Date(now).getUTCDay() !== 2) return { skipped: 'not Tuesday' };
  const round = weekStartOf(now) - 7 * 864e5;
  const flag = `epl-push/recap/${round}.done`;
  if (await env.WALL.get(flag)) return { skipped: 'sent' };
  await env.WALL.put(flag, String(now));           // claim it first: once, even if the send fails half way

  const stateObj = await env.WALL.get('epl-state.json');
  const st = stateObj ? JSON.parse(await stateObj.text()) : {};
  const fixtures = await loadFixtures(fetch);
  if (lastRoundWeek(fixtures, now) !== round) return { skipped: 'no games last round' };
  const r = roundRecap(st.assignments || {}, fixtures, st.manualMedals || {}, st.bonusPoints || {}, now, round);
  const payload = recapPayload(r);
  if (!payload) return { skipped: 'no recap' };
  const subs = await loadSubs(env);
  let sent = 0;
  for (const sub of subs) {
    try { if ((await sendTo(env, sub, payload)) < 300) sent += 1; } catch { /* next */ }
  }
  return { sent };
}
