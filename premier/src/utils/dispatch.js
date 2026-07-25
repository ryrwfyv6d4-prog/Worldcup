// The weekly Dispatch — a Monday-morning communiqué written from the results.
import { getTeam } from '../data/england2027.js';
import { valueForFixture } from './odds.js';
import { getRivalry } from '../data/rivalries.js';
import { pointsBetween } from './scoring.js';

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if (teams.includes(team)) return name;
  }
  return null;
}

// Most recent Mon–Sun window that contains at least one finished match;
// falls back to the last 7 days.
function lastWeekWindow(fixtures) {
  const fin = fixtures.filter((f) => f.status === 'FINISHED' && f.utcDate)
    .sort((a, b) => (b.utcDate || '').localeCompare(a.utcDate || ''));
  const anchor = fin.length ? new Date(fin[0].utcDate) : new Date();
  const day = (anchor.getDay() + 6) % 7; // Mon=0
  const monday = new Date(anchor); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - day);
  const next = new Date(monday); next.setDate(next.getDate() + 7);
  return [monday, next];
}

export function buildDispatch(assignments, fixtures) {
  const players = Object.keys(assignments);
  if (!players.length) return null;

  const [from, to] = lastWeekWindow(fixtures);
  const week = fixtures.filter((f) => {
    if (f.status !== 'FINISHED' || !f.utcDate) return false;
    const t = new Date(f.utcDate);
    return t >= from && t < to;
  });

  if (!week.length) {
    return {
      title: 'DISPATCH — PRE-CAMPAIGN',
      lines: [
        'No shots fired yet. The regiments are in barracks and the phoney war continues.',
        'The Championship opens hostilities on 14 August; the Premier League follows on the 21st. Get your conscription done before the bugle.',
      ],
    };
  }

  const gains = players
    .map((p) => ({ name: p, pts: pointsBetween(p, assignments, fixtures, from, to) }))
    .sort((a, b) => b.pts - a.pts);

  const lines = [];
  const top = gains[0];
  const bottom = gains[gains.length - 1];
  if (top.pts > 0) lines.push(`Biggest advance: ${top.name}, +${top.pts} this week. Ground taken and held.`);
  if (bottom.pts === 0) lines.push(`Pinned down: ${bottom.name} gained nothing all week. The men are asking questions.`);

  // Upsets: a doubled pot (B/D) beating an A/C regiment
  for (const f of week) {
    const h = getTeam(f.homeTeam.name), a = getTeam(f.awayTeam.name);
    if (!h || !a || f.score.winner === 'DRAW') continue;
    const winner = f.score.winner === 'HOME_TEAM' ? h : a;
    const loser = f.score.winner === 'HOME_TEAM' ? a : h;
    const val = valueForFixture(f, winner.name);
    if (val.win >= 8) {
      const who = ownerOf(winner.name, assignments);
      lines.push(`Against the odds: ${winner.short} took ${loser.short}'s colours${who ? ` — ${who} banks +${val.win}` : ''}.`);
      if (lines.length >= 6) break;
    }
  }

  // Derby results
  for (const f of week) {
    const r = getRivalry(f.homeTeam.name, f.awayTeam.name);
    if (!r) continue;
    const h = getTeam(f.homeTeam.name), a = getTeam(f.awayTeam.name);
    lines.push(`${r.title}: ${h.short} ${f.score.home}–${f.score.away} ${a.short}. Bragging rights ${f.score.winner === 'DRAW' ? 'shared, unsatisfyingly' : 'claimed'}.`);
    if (lines.length >= 8) break;
  }

  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { title: `DISPATCH — WEEK OF ${fmt(from).toUpperCase()}`, lines };
}
