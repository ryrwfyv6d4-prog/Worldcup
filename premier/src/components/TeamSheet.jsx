import { useEffect, useMemo, useRef, useState } from 'react';
import { getTeam, SCORING } from '../data/england2027.js';
import { coloursFor, inkOn } from '../data/colours.js';
import { priceRangeFor } from '../utils/odds.js';
import {
  leagueTable, teamPoints, recentResults, nextFixtures,
  buildTables, buildComplete, overachieveForTeam,
} from '../utils/scoring.js';
import Stripe from './Stripe.jsx';
import { useSwipeToClose } from '../hooks/useSwipeToClose.js';
import { getProjection } from '../utils/projection.js';

const pctOf = (v) => (v >= 0.995 ? '100%' : v < 0.005 ? '<1%' : `${Math.round(v * 100)}%`);

const ordinal = (n) => {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

// 2d 4h 18m, dropping to 4h 18m inside a day
function countdownTo(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  // two units is enough — three wraps the box on a long wait
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export default function TeamSheet({ team, fixtures, assignments, onClose, onOpenMatch }) {
  const info = getTeam(team);
  const [tick, setTick] = useState(0);
  const sheetRef = useRef(null);
  useSwipeToClose(sheetRef, onClose);

  // countdown recomputes every 30s, cleared on unmount
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const table = useMemo(
    () => (info ? leagueTable(fixtures, info.div, 'all') : []),
    [fixtures, info]
  );
  const proj = useMemo(
    () => getProjection(assignments, fixtures).clubs[team],
    [assignments, fixtures, team]
  );
  if (!info) return null;

  const [primary] = coloursFor(info.name);
  const heroInk = inkOn(primary);
  const owner = ownerOf(team, assignments);
  const pos = table.findIndex((r) => r.team === team) + 1;
  const row = table.find((r) => r.team === team);
  const pts = teamPoints(team, fixtures);
  const oa = overachieveForTeam(team, buildTables(fixtures), buildComplete(fixtures));
  const range = priceRangeFor(team);
  const results = recentResults(team, fixtures, 6);
  const next = nextFixtures(team, fixtures, 1)[0];
  const countdown = next ? countdownTo(next.fixture.utcDate) : null;

  // top four plus this club's neighbours
  const shownRows = useMemo(() => {
    const idx = table.findIndex((r) => r.team === team);
    const keep = new Set([0, 1, 2, 3]);
    for (const d of [-1, 0, 1]) {
      const j = idx + d;
      if (j >= 0 && j < table.length) keep.add(j);
    }
    return [...keep].sort((a, b) => a - b).map((j) => ({ ...table[j], pos: j + 1 }));
  }, [table, team]);

  return (
    <div className="club-backdrop" ref={sheetRef}>
      <div className="club-hero" style={{ background: primary, color: heroInk }}>
        <button className="club-back" onClick={onClose} aria-label="Back to the table">
          <span className="mp-back-chev" aria-hidden="true">‹</span> Table
        </button>
        <div className="club-name">{info.short}</div>
        <div className="club-meta">
          <span className="club-meta-left">
            {info.div === 1 ? 'Premier League' : 'Championship'}
            {row && row.p > 0 ? ` · ${ordinal(pos)}` : ` · tipped ${ordinal(info.rank)}`}
          </span>
          {owner && <span className="club-meta-right">{owner}'s</span>}
        </div>
      </div>

      <div className="club-body">
        <p className="club-desc">{info.roots}</p>

        <div className="stat-strip">
          <div className="stat-cell">
            <div className="stat-val">{pts.total}</div>
            <div className="stat-lab">Sweep pts</div>
          </div>
          <div className="stat-cell">
            <div className="stat-val">{pts.w}–{pts.d}–{pts.l}</div>
            <div className="stat-lab">W–D–L</div>
          </div>
          <div className="stat-cell">
            <div className="stat-val">
              {row ? (row.gd > 0 ? `+${row.gd}` : row.gd) : 0}
            </div>
            <div className="stat-lab">Goal diff</div>
          </div>
        </div>

        {proj && (
          <div className="proj-box">
            <div className="proj-head">Where it finishes</div>
            <div className="proj-main">
              <span className="proj-pos">{ordinal(proj.median)}</span>
              <span className="proj-range-lab">
                {proj.best === proj.worst
                  ? 'in almost every season'
                  : `${ordinal(proj.best)} to ${ordinal(proj.worst)} in 9 seasons out of 10`}
              </span>
            </div>
            <div className="proj-chances">
              {info.div === 1 ? (
                <>
                  <span><b>{pctOf(proj.pTitle)}</b> title</span>
                  <span><b>{pctOf(proj.pTop)}</b> top four</span>
                  <span><b>{pctOf(proj.pDown)}</b> down</span>
                </>
              ) : (
                <>
                  <span><b>{pctOf(proj.pTop)}</b> promoted</span>
                  <span><b>{pctOf(proj.pPlayoff)}</b> play-offs</span>
                  <span><b>{pctOf(proj.pDown)}</b> down</span>
                </>
              )}
            </div>
            <p className="proj-foot">
              Tipped {ordinal(proj.tipped)}.{' '}
              {proj.median < proj.tipped
                ? `Beating that by ${proj.tipped - proj.median} place${proj.tipped - proj.median === 1 ? '' : 's'} is worth +${(proj.tipped - proj.median) * SCORING.OVERACHIEVE} to ${owner || 'nobody'}.`
                : proj.median > proj.tipped
                  ? 'The projection has it finishing below its tip, so no overachievement bonus.'
                  : 'The projection has it finishing exactly where it was tipped.'}
            </p>
          </div>
        )}

        {oa.live && oa.places > 0 && (
          <p className="editorial" style={{ marginTop: 14 }}>
            {oa.places} place{oa.places === 1 ? '' : 's'} above its tip — worth{' '}
            {oa.pts} to {owner || 'nobody'} at {SCORING.OVERACHIEVE} a place.
          </p>
        )}

        {next && (
          <div className="next-box">
            <div>
              <div className="next-eyebrow">Next</div>
              <div className="next-opp">
                {next.isHome ? 'v' : 'at'} {getTeam(next.opp)?.short}
              </div>
            </div>
            <div>
              <div className="next-count">{countdown || 'Kicking off'}</div>
              <div className="next-lab">{countdown ? 'To kick-off' : 'Under way'}</div>
              <div className="next-lab">Win pays {next.win}</div>
            </div>
          </div>
        )}

        <div className="section-title">League Table</div>
        {shownRows.map((r, i) => (
          <button
            key={r.team}
            className={`mini-row ${i === 0 ? 'first' : ''} ${i === shownRows.length - 1 ? 'lastrow' : ''} ${r.team === team ? 'here' : ''}`}
            style={r.team === team ? { background: `${primary}12` } : undefined}
            onClick={() => { /* already here */ }}
          >
            <span className="mini-pos">{r.pos}</span>
            <Stripe team={r.team} variant="tbl" />
            <span className="mini-name">{getTeam(r.team)?.short || r.team}</span>
            <span className="mini-num mini-p">{r.p}</span>
            <span className="mini-num mini-gd">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            <span className="mini-pts">{r.pts}</span>
          </button>
        ))}

        {results.length > 0 && (
          <>
            <div className="section-title">Results</div>
            {results.map((r) => (
              <button
                key={r.fixture.id}
                className="res-row"
                onClick={() => { onClose(); onOpenMatch && onOpenMatch(r.fixture); }}
              >
                <span className="res-mw">MW{r.fixture.matchday}</span>
                <span className="res-opp">
                  {getTeam(r.opp)?.short} ({r.isHome ? 'h' : 'a'})
                </span>
                <span className="res-score">{r.my}–{r.their}</span>
                <span className={`res-sq fsq fsq-${r.result.toLowerCase()}`}>{r.result}</span>
              </button>
            ))}
          </>
        )}

        <p className="muted small" style={{ marginTop: 18 }}>
          Tipped {ordinal(info.rank)} of {info.div === 1 ? 20 : 24}. Wins pay {range?.lo}–{range?.hi}
          {' '}depending on the opponent and the venue.
        </p>
      </div>
    </div>
  );
}
