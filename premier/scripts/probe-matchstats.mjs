// Diagnostic (temporary): what FotMob gives for a FINISHED match, so the
// line-ups and stats tabs are built on the real shape, not a guess.
const H = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const get = async (u) => (await fetch(u, { headers: H, signal: AbortSignal.timeout(20000) })).json();
const cut = (o, n = 1400) => JSON.stringify(o, null, 0)?.slice(0, n);
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o).join(',') : String(o));

for (const [date, leagueId] of [['20260920', 47], ['20260920', 48]]) {
  const day = await get(`https://www.fotmob.com/api/data/matches?date=${date}`);
  const lg = (day.leagues || []).find((l) => l.primaryId === leagueId || l.id === leagueId);
  const m = (lg?.matches || []).find((x) => x.status?.finished);
  if (!m) { console.log('no finished match for', leagueId, (day.leagues || []).slice(0, 5).map((l) => `${l.id}/${l.primaryId} ${l.name}`)); continue; }
  console.log(`\n######## ${m.home.name} v ${m.away.name} (${m.id})`);
  const d = await get(`https://www.fotmob.com/api/data/matchDetails?matchId=${m.id}`);
  const c = d.content || {};
  console.log('content keys:', keys(c));
  const lu = c.lineup || {};
  console.log('lineup keys:', keys(lu), '| lineupType', lu.lineupType);
  console.log('homeTeam keys:', keys(lu.homeTeam));
  console.log('starter[0]:', cut(lu.homeTeam?.starters?.[0], 1800));
  console.log('starter[5]:', cut(lu.homeTeam?.starters?.[5], 1200));
  console.log('sub[0]:', cut(lu.homeTeam?.subs?.[0], 1200));
  const subIn = (lu.homeTeam?.subs || []).find((s) => s.performance?.substitutionEvents || s.performance?.events);
  console.log('sub used:', cut(subIn, 1200));
  console.log('coach:', cut(lu.homeTeam?.coach, 300));
  console.log('stats keys:', keys(c.stats), '| Periods:', keys(c.stats?.Periods));
  const all = c.stats?.Periods?.All;
  console.log('All keys:', keys(all));
  for (const g of all?.stats || []) console.log(`  group ${g.title} [${g.key}]:`, (g.stats || []).map((s) => `${s.title}(${s.key})=${cut(s.stats, 40)}`).join(' | ').slice(0, 1500));
  const ps = c.playerStats;
  const pk = ps && Object.keys(ps);
  console.log('playerStats count', pk?.length, 'first:', cut(ps?.[pk?.[0]], 2500));
  console.log('shotmap keys', keys(c.shotmap), 'shots', c.shotmap?.shots?.length, 'shot0', cut(c.shotmap?.shots?.[0], 700));
  console.log('momentum', cut(c.momentum, 300));
  console.log('matchFacts keys', keys(c.matchFacts), 'events', cut(c.matchFacts?.events?.events?.slice(0, 3), 900));
  console.log('playerOfTheMatch', cut(c.matchFacts?.playerOfTheMatch, 400));
  console.log('header teams', cut(d.header?.teams, 500));
}
