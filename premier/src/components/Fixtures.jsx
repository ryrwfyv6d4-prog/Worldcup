import { useMemo, useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { fixturePoints, pointsHaul } from '../utils/scoring.js';
import { getRivalry } from '../data/rivalries.js';
import { clubLabel } from '../utils/teamMatch.js';
import Stripe from './Stripe.jsx';
import { fixturesLine } from '../utils/editorial.js';
import { useHighlight } from '../hooks/useHighlight.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pl', label: 'Premier' },
  { key: 'ch', label: 'Championship' },
  { key: 'mine', label: 'Mine' },
];

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

// Group by the day it is HERE, not the day it is in London. Slicing the ISO
// string keys off the UTC date while the heading below prints the local one,
// so a Sunday-morning kick-off in Australia (Saturday evening in England) got
// filed under Saturday — and two UTC days that fall on one local day produced
// two groups with the same heading.
const dayKey = (iso) => {
  if (!iso) return 'tbc';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'tbc';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const fmtDay = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
  : 'Date TBC');
const fmtTime = (iso) => (iso
  ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : '');

export default function Fixtures({ fixtures, assignments, onOpenMatch, whoAmI }) {
  const [filter, setFilter] = useState('all');
  const [md, setMd] = useState(null);
  const myTeams = (assignments[whoAmI] || []).filter(Boolean);

  // Which division the matchweek pager walks. null means both: "All" used to
  // resolve to 1, so the default tab quietly showed the Premier League only and
  // the matchweek haul under it left out every Championship point.
  const div = filter === 'ch' ? 2 : filter === 'pl' ? 1 : null;

  const matchdays = useMemo(() => {
    const inScope = div == null ? fixtures : fixtures.filter((f) => f.division === div);
    return [...new Set(inScope.map((f) => f.matchday))].sort((a, b) => a - b);
  }, [fixtures, div]);

  const nowMd = useMemo(() => {
    const now = Date.now();
    const up = fixtures
      .filter((f) => (div == null || f.division === div)
        && f.utcDate && Date.parse(f.utcDate) > now - 36 * 3600 * 1000)
      .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
    return up.length ? up[0].matchday : (matchdays[0] || 1);
  }, [fixtures, div, matchdays]);

  const shownMd = md ?? nowMd;
  const maxMd = matchdays[matchdays.length - 1] || 1;

  const shown = useMemo(() => {
    let list = fixtures.filter((f) => f.matchday === shownMd);
    if (filter === 'pl') list = list.filter((f) => f.division === 1);
    else if (filter === 'ch') list = list.filter((f) => f.division === 2);
    else if (filter === 'mine') {
      list = fixtures.filter(
        (f) => myTeams.includes(f.homeTeam.name) || myTeams.includes(f.awayTeam.name)
      );
      // Sort first, then trim. The feed arrives as all of division one followed
      // by all of division two, so slicing first filled the whole list with
      // Premier League games and a Championship club never appeared here.
      const now = Date.now();
      list = list
        .filter((f) => f.utcDate && Date.parse(f.utcDate) > now - 7 * 864e5)
        .sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''))
        .slice(0, 20);
    } else if (div != null) {
      list = list.filter((f) => f.division === div);
    }
    return list.sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));
  }, [fixtures, shownMd, filter, div, myTeams]);

  const byDay = useMemo(() => {
    const groups = [];
    for (const f of shown) {
      const k = dayKey(f.utcDate);
      const last = groups[groups.length - 1];
      if (last && last.key === k) last.items.push(f);
      else groups.push({ key: k, label: fmtDay(f.utcDate), items: [f] });
    }
    return groups;
  }, [shown]);

  const haul = useMemo(() => pointsHaul(shown, assignments), [shown, assignments]);

  const mineCount = shown.filter(
    (f) => myTeams.includes(f.homeTeam.name) || myTeams.includes(f.awayTeam.name)
  ).length;

  return (
    <div className="page">
      <div className="seg-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`seg ${filter === f.key ? 'on' : ''}`}
            onClick={() => { setFilter(f.key); setMd(null); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter !== 'mine' && (
        <div className="md-row">
          <button className="btn" onClick={() => setMd(Math.max(1, shownMd - 1))} disabled={shownMd <= 1}>Prev</button>
          <span className="md-label">Matchweek {shownMd} <small>of {maxMd}</small></span>
          <button className="btn" onClick={() => setMd(Math.min(maxMd, shownMd + 1))} disabled={shownMd >= maxMd}>Next</button>
        </div>
      )}

      {haul.length > 0 && (
        <div className="haul">
          <div className="haul-head">
            Banked {filter === 'mine' ? 'from these games' : `in matchweek ${shownMd}`}
          </div>
          <div className="haul-rows">
            {/* top five keeps the summary from pushing the fixtures off screen */}
            {haul.slice(0, 5).map((p, i) => (
              <div className={`haul-row ${i === 0 ? 'top' : ''}`} key={p.name}>
                <span className="haul-name">{p.name}</span>
                <span className="haul-bar" style={{ width: `${(p.pts / haul[0].pts) * 100}%` }} />
                <span className="haul-pts">+{p.pts}</span>
              </div>
            ))}
          </div>
          {haul.length > 5 && (
            <div className="haul-rest">
              {haul.slice(5).map((p) => `${p.name} +${p.pts}`).join(' · ')}
            </div>
          )}
        </div>
      )}

      {byDay.map((g) => (
        <div key={g.key}>
          <div className="day-head">
            <span className="day-name">{g.label}</span>
            <span className="day-rule" />
          </div>
          {g.items.map((f) => (
            <MatchRow
              key={f.id}
              fixture={f}
              assignments={assignments}
              onOpen={() => onOpenMatch(f)}
            />
          ))}
        </div>
      ))}

      {byDay.length === 0 && (
        <p className="editorial">
          {filter !== 'mine'
            ? 'No fixtures in this matchweek.'
            : myTeams.length
              ? 'None of your clubs are out. A rare weekend of watching in peace.'
              : 'You have no clubs yet. Pick a name from the masthead, or run the draw in the Shed.'}
        </p>
      )}

      {byDay.length > 0 && (
        <p className="fx-close">{fixturesLine(shown, mineCount, myTeams.length > 0)}</p>
      )}
    </div>
  );
}

// Before kick-off this is the price on offer; after it, what the club actually
// banked. Same number either way, so a settled row still reads as points.
function Worth({ fixture, team }) {
  const fp = fixturePoints(fixture, team);
  if (!fp) return null;
  if (!fp.settled) return <span className="fx-worth">+{fp.win}</span>;
  if (fp.outcome === 'L') return <span className="fx-paid nil">0</span>;
  return (
    <span className={`fx-paid ${fp.outcome === 'D' ? 'drew' : ''}`}>
      +{fp.pts}
    </span>
  );
}

function MatchRow({ fixture: f, assignments, onOpen }) {
  const h = getTeam(f.homeTeam.name);
  const a = getTeam(f.awayTeam.name);
  const ho = ownerOf(f.homeTeam.name, assignments);
  const ao = ownerOf(f.awayTeam.name, assignments);
  const derby = getRivalry(f.homeTeam.name, f.awayTeam.name);
  const done = f.status === 'FINISHED';
  const live = f.status === 'IN_PLAY';
  // Stan carry the Premier League only, so asking about a Championship match
  // is a request we already know the answer to — and paging back through
  // settled Championship weeks fired a dozen of them every time.
  const highlight = useHighlight(
    f.homeTeam.name, f.awayTeam.name, done && f.division === 1, f.score?.home, f.score?.away
  );

  // The row is a button, so the highlights link sits beside it rather than
  // inside it — a link nested in a button is invalid and swallows the tap.
  return (
    <div className={`fx-row-wrap ${highlight ? 'has-hl' : ''}`}>
    <button className="fx-row" onClick={onOpen}>
      <span className="fx-time">{fmtTime(f.utcDate)}</span>
      <span className="fx-clubs">
        <span className="fx-club">
          <Stripe team={f.homeTeam.name} />
          <span className={`fx-club-name ${done ? 'dim' : ''}`}>{h?.short || clubLabel(f.homeTeam.name)}</span>
          {ho && <span className="fx-owner">{ho}</span>}
          {ho && <Worth fixture={f} team={f.homeTeam.name} />}
        </span>
        <span className="fx-club">
          <Stripe team={f.awayTeam.name} />
          <span className={`fx-club-name ${done ? 'dim' : ''}`}>{a?.short || clubLabel(f.awayTeam.name)}</span>
          {ao && <span className="fx-owner">{ao}</span>}
          {ao && <Worth fixture={f} team={f.awayTeam.name} />}
        </span>
      </span>
      <span className="fx-right">
        {/* every club is owned with a full shed, so only real derbies earn the tag */}
        {derby && !done && !live ? (
          <span className="fx-derby">derby</span>
        ) : live ? (
          <>
            <span className="fx-score">{f.score.home}–{f.score.away}</span>
            <span className="fx-status live">{f.liveClock ? `${f.liveClock}'` : 'live'}</span>
          </>
        ) : done ? (
          <>
            <span className="fx-score done">{f.score.home}–{f.score.away}</span>
            <span className="fx-status">Full time</span>
          </>
        ) : null /* kick-off time is already on the left — nothing to add */}
      </span>
    </button>
    {highlight && (
      <a
        className="fx-hl"
        href={highlight}
        target="_blank"
        rel="noreferrer"
        title="Watch the highlights"
        aria-label={`Highlights: ${h?.short || clubLabel(f.homeTeam.name)} v ${a?.short || clubLabel(f.awayTeam.name)}`}
      >
        <span aria-hidden="true">▶</span>
      </a>
    )}
    </div>
  );
}
