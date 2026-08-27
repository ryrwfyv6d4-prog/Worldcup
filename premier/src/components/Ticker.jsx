import { useMemo } from 'react';
import { getTeam } from '../data/england2027.js';
import { valueForFixture } from '../utils/odds.js';

// Never "3th": the suffix depends on the number, not on the common case
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}


// Results strip under the masthead. Score lines in paper, point gains in gold,
// the odd jibe in grey. The item list is rendered TWICE so the -50% marquee
// loops seamlessly.
function buildItems(fixtures, assignments, ladder) {
  const since = Date.now() - 24 * 3600 * 1000;
  const recent = fixtures
    .filter((f) => {
      if (!f.utcDate) return false;
      if (f.status !== 'FINISHED' && f.status !== 'IN_PLAY') return false;
      return Date.parse(f.utcDate) > since;
    })
    .sort((a, b) => (b.utcDate || '').localeCompare(a.utcDate || ''))
    .slice(0, 8);

  const ownerOf = (team) => {
    for (const [name, teams] of Object.entries(assignments || {})) {
      if ((teams || []).includes(team)) return name;
    }
    return null;
  };

  const items = [];
  for (const f of recent) {
    const h = getTeam(f.homeTeam.name);
    const a = getTeam(f.awayTeam.name);
    if (!h || !a) continue;
    const when = f.status === 'IN_PLAY' ? (f.liveClock ? `${f.liveClock}'` : 'LIVE') : 'FT';
    items.push({
      kind: 'score',
      text: `${h.tla} ${f.score.home ?? 0}–${f.score.away ?? 0} ${a.tla} · ${when}`,
    });
    // who banked what from this match
    for (const side of [f.homeTeam.name, f.awayTeam.name]) {
      const who = ownerOf(side);
      if (!who) continue;
      const isHome = f.homeTeam.name === side;
      const won = (f.score.winner === 'HOME_TEAM' && isHome) || (f.score.winner === 'AWAY_TEAM' && !isHome);
      const drew = f.score.winner === 'DRAW';
      if (!won && !drew) continue;
      const val = valueForFixture(f, side);
      items.push({ kind: 'gain', text: `${who} +${won ? val.win : val.draw}` });
    }
  }

  // a closing jibe about whoever is propping the table up
  if (ladder && ladder.length > 2) {
    const last = ladder[ladder.length - 1];
    items.push({ kind: 'jibe', text: `${last.name} still ${ordinal(ladder.length)}` });
  }

  // Between matchweeks there is nothing in the last day, and the strip was
  // left running one jibe on a loop under a heading that says LATEST — which
  // reads as broken rather than quiet. Say where things actually stand and
  // what is on next.
  if (!items.some((i) => i.kind === 'score')) {
    const quiet = [];
    if (ladder && ladder.length) {
      const [top, second] = ladder;
      quiet.push({ kind: 'score', text: `${top.name} leads on ${top.total}` });
      if (second) {
        const gap = top.total - second.total;
        quiet.push({
          kind: 'gain',
          text: gap === 0 ? `${second.name} level` : `${second.name} ${gap} behind`,
        });
      }
    }
    const next = (fixtures || [])
      .filter((f) => f.status === 'SCHEDULED' && f.utcDate && Date.parse(f.utcDate) > Date.now())
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0];
    if (next) {
      const h = getTeam(next.homeTeam.name), a = getTeam(next.awayTeam.name);
      if (h && a) quiet.push({ kind: 'score', text: `Next: ${h.tla} v ${a.tla}` });
    }
    return quiet.length ? [...quiet, ...items] : items;
  }

  return items;
}

export default function Ticker({ fixtures, assignments, ladder }) {
  const items = useMemo(
    () => buildItems(fixtures, assignments, ladder),
    [fixtures, assignments, ladder]
  );
  if (!items.length) return null;

  const cls = (k) => (k === 'gain' ? 'ticker-gain' : k === 'jibe' ? 'ticker-jibe' : undefined);
  const anyLive = fixtures.some((f) => f.status === 'IN_PLAY');
  // A quiet strip is standings and what is on next, so calling it LATEST
  // promises news it has not got
  const quiet = !items.some((i) => i.kind === 'score' && / · (FT|LIVE|\d+')$/.test(i.text));

  return (
    <div className="ticker">
      <div className="ticker-flag">
        <span className="ticker-dot" />
        <span>{anyLive ? 'LIVE' : quiet ? 'STANDING' : 'LATEST'}</span>
      </div>
      <div className="ticker-track">
        <div className="ticker-run">
          {/* rendered twice — one copy = the -50% translate */}
          {[0, 1].map((copy) =>
            items.map((it, i) => (
              <span key={`${copy}-${i}`} className={cls(it.kind)}>{it.text}</span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
