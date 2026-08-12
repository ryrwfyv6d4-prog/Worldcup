import { useMemo, useState } from 'react';
import { getTeam } from '../data/england2027.js';
import { valueForFixture } from '../utils/odds.js';
import { getRivalry } from '../data/rivalries.js';
import Stripe from './Stripe.jsx';
import { fixturesLine } from '../utils/editorial.js';

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

const dayKey = (iso) => (iso ? iso.slice(0, 10) : 'tbc');
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

  // which division the matchweek pager is walking — follows the filter
  const div = filter === 'ch' ? 2 : 1;

  const matchdays = useMemo(() => {
    const s = [...new Set(fixtures.filter((f) => f.division === div).map((f) => f.matchday))];
    return s.sort((a, b) => a - b);
  }, [fixtures, div]);

  const nowMd = useMemo(() => {
    const now = Date.now();
    const up = fixtures
      .filter((f) => f.division === div && f.utcDate && Date.parse(f.utcDate) > now - 36 * 3600 * 1000)
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
      const now = Date.now();
      list = list
        .filter((f) => f.utcDate && Date.parse(f.utcDate) > now - 7 * 864e5)
        .slice(0, 20);
    } else {
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
          {filter === 'mine'
            ? 'None of your clubs are out. A rare weekend of watching in peace.'
            : 'No fixtures in this matchweek.'}
        </p>
      )}

      {byDay.length > 0 && (
        <p className="fx-close">{fixturesLine(shown, mineCount)}</p>
      )}
    </div>
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

  return (
    <button className="fx-row" onClick={onOpen}>
      <span className="fx-time">{fmtTime(f.utcDate)}</span>
      <span className="fx-clubs">
        <span className="fx-club">
          <Stripe team={f.homeTeam.name} />
          <span className={`fx-club-name ${done ? 'dim' : ''}`}>{h?.short || f.homeTeam.name}</span>
          {ho && <span className="fx-owner">{ho}</span>}
          {ho && !done && <span className="fx-worth">+{valueForFixture(f, f.homeTeam.name).win}</span>}
        </span>
        <span className="fx-club">
          <Stripe team={f.awayTeam.name} />
          <span className={`fx-club-name ${done ? 'dim' : ''}`}>{a?.short || f.awayTeam.name}</span>
          {ao && <span className="fx-owner">{ao}</span>}
          {ao && !done && <span className="fx-worth">+{valueForFixture(f, f.awayTeam.name).win}</span>}
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
  );
}
