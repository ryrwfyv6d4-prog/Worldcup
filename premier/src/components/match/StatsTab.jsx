import { useState } from 'react';
import { clubLabel } from '../../utils/teamMatch.js';
import { coloursFor } from '../../data/colours.js';
import { shirtColours } from '../../utils/formation.js';
import StatRow, { StatKey } from './StatRow.jsx';
import PlayerSheet, { ratingClass } from './PlayerSheet.jsx';

// The full comparison. With FotMob's data: the match or either half, xG, the
// momentum of the game, every shot, and who played best. Without it, ESPN's
// team totals as before.

// FotMob row -> the shape StatRow draws
export function toRow(r) {
  const total = r.h + r.a;
  const cmp = r.h === r.a ? 0 : (r.h > r.a ? 1 : -1) * (r.low ? -1 : 1);
  return {
    key: r.key,
    label: r.title,
    home: r.home,
    away: r.away,
    better: cmp > 0 ? 'home' : cmp < 0 ? 'away' : null,
    homeShare: total > 0 ? (r.h / total) * 100 : 50,
  };
}

// Minute-by-minute pressure: bars above the line are the home side on top,
// below it the away side.
function Momentum({ data, homeColour, awayColour }) {
  if (!data?.length) return null;
  const last = Math.max(90, ...data.map((d) => d.m));
  const peak = Math.max(1, ...data.map((d) => Math.abs(d.v)));
  const w = 100 / (last + 1);
  return (
    <div className="mp-stat-group">
      <div className="mp-stat-group-head">Momentum</div>
      <svg className="mom" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Match momentum">
        <line x1="0" y1="20" x2="100" y2="20" className="mom-mid" />
        <line x1={45 * w + w / 2} y1="0" x2={45 * w + w / 2} y2="40" className="mom-ht" />
        {data.map((d) => {
          const h = (Math.abs(d.v) / peak) * 19;
          return (
            <rect
              key={d.m}
              x={d.m * w}
              width={Math.max(w * 0.85, 0.3)}
              y={d.v >= 0 ? 20 - h : 20}
              height={h}
              fill={d.v >= 0 ? homeColour : awayColour}
            />
          );
        })}
      </svg>
      <div className="mom-axis"><span>0'</span><span>HT</span><span>{last}'</span></div>
    </div>
  );
}

// Every shot on one half-pitch, both sides attacking the same goal. Dot size
// is the chance's xG, a filled dot went in.
function ShotMap({ shots, homeColour, awayColour }) {
  if (!shots?.length) return null;
  // FotMob: 105 x 68, attacking towards x = 105. Drawn with the goal at the
  // top, so x becomes height and y becomes width.
  const W = 68, H = 52.5;
  const px = (s) => ({ cx: s.y, cy: Math.max(105 - s.x, 0.5) });
  const byXg = [...shots].sort((a, b) => (b.xg || 0) - (a.xg || 0));
  return (
    <div className="mp-stat-group">
      <div className="mp-stat-group-head">Shots</div>
      <svg className="shotmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Shot map">
        <rect x="0" y="0" width={W} height={H} className="sm-pitch" />
        <rect x={(W - 40.3) / 2} y="0" width="40.3" height="16.5" className="sm-line" />
        <rect x={(W - 18.3) / 2} y="0" width="18.3" height="5.5" className="sm-line" />
        <rect x={(W - 7.32) / 2} y="-1.5" width="7.32" height="1.5" className="sm-goal" />
        <circle cx={W / 2} cy="11" r="0.5" className="sm-spot" />
        <path d={`M ${W / 2 - 9.15} ${H} A 9.15 9.15 0 0 1 ${W / 2 + 9.15} ${H}`} className="sm-line" />
        {byXg.map((s, i) => {
          const { cx, cy } = px(s);
          const r = 0.9 + Math.sqrt(s.xg || 0.01) * 3.2;
          const c = s.side === 'home' ? homeColour : awayColour;
          return (
            <circle
              key={i} cx={cx} cy={cy} r={r}
              fill={s.goal ? c : 'none'}
              stroke={c}
              strokeWidth={s.goal ? 0.5 : 0.6}
              opacity={s.blocked ? 0.45 : 0.95}
            >
              <title>{`${s.name} ${s.min}' · xG ${s.xg ?? '?'}${s.goal ? ' · goal' : ''}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="sm-key">
        <span><i className="dot fill" /> goal</span>
        <span><i className="dot" /> missed or saved</span>
        <span>bigger = better chance</span>
      </div>
    </div>
  );
}

function TopPlayers({ fm, sides, onPick }) {
  const all = [
    ...[...(fm.home?.xi || []), ...(fm.home?.subs || [])].map((p) => ({ p, i: 0 })),
    ...[...(fm.away?.xi || []), ...(fm.away?.subs || [])].map((p) => ({ p, i: 1 })),
  ].filter(({ p }) => p.rating != null).sort((a, b) => b.p.rating - a.p.rating).slice(0, 6);
  if (!all.length) return null;
  return (
    <div className="mp-stat-group">
      <div className="mp-stat-group-head">Best rated</div>
      {all.map(({ p, i }) => (
        <button className="tp-row" key={p.id} onClick={() => onPick(p, i)}>
          <span className="tp-name">{p.full || p.name}</span>
          <span className="tp-club">{sides[i].info?.short || clubLabel(sides[i].name)}</span>
          <b className={`lp-rating inline ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</b>
        </button>
      ))}
    </div>
  );
}

export default function StatsTab({ detail, fm, sides }) {
  const [period, setPeriod] = useState('All');
  const [pick, setPick] = useState(null);
  // two reds would make every chart unreadable, so the away side changes kit
  const [homeColour, awayColour] = shirtColours(coloursFor(sides[0].name), coloursFor(sides[1].name));
  const names = sides.map((s) => s.info?.short || clubLabel(s.name));

  const periods = fm?.periods || [];
  const shown = periods.find((p) => p.key === period) || periods[0];
  const groups = shown
    ? shown.groups.map((g) => ({ title: g.title, rows: g.rows.map(toRow) }))
    : (detail?.statGroups || []);

  return (
    <div className="mp-pane">
      {periods.length > 1 && (
        <div className="seg-row">
          {periods.map((p) => (
            <button key={p.key} className={`seg seg-sm ${shown?.key === p.key ? 'on' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      <StatKey homeName={names[0]} awayName={names[1]} homeColour={homeColour} awayColour={awayColour} />

      {(!shown || shown.key === 'All') && fm && (
        <>
          <Momentum data={fm.momentum} homeColour={homeColour} awayColour={awayColour} />
          <ShotMap shots={fm.shots} homeColour={homeColour} awayColour={awayColour} />
          <TopPlayers fm={fm} sides={sides} onPick={(p, i) => setPick({ p, club: names[i] })} />
        </>
      )}

      {groups.map((g) => (
        <div className="mp-stat-group" key={g.title}>
          <div className="mp-stat-group-head">{g.title}</div>
          {g.rows.map((r) => (
            <StatRow key={r.key} row={r} homeColour={homeColour} awayColour={awayColour} />
          ))}
        </div>
      ))}

      {pick && (
        <PlayerSheet player={pick.p} club={pick.club} stats={fm?.players?.[pick.p.id]} onClose={() => setPick(null)} />
      )}
    </div>
  );
}
