import { useMemo, useRef, useState } from 'react';
import { raceSeries } from '../utils/matchday.js';

// The season race: everyone's points at the end of each week.
//
// Eleven lines in eleven colours is a tangle nobody can read, so this is an
// emphasis chart: you, plus up to two people you pick, in colour and labelled
// at the line's end; everyone else is grey context. Tap a name to swap who's
// highlighted, drag across the chart to read any week, or switch to the table.
const SLOTS = 3;
const W = 340, H = 200, PAD = { l: 30, r: 62, t: 10, b: 22 };

export default function RaceChart({ assignments, fixtures, manualMedals, bonusPoints, whoAmI }) {
  const data = useMemo(
    () => raceSeries(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const names = Object.keys(data.series);
  const lastIdx = data.weeks.length - 1;
  const leader = names.slice().sort((a, b) => data.series[b][lastIdx] - data.series[a][lastIdx])[0];

  // name -> colour slot. Colour follows the person: dropping one pick never
  // repaints the others.
  const [picked, setPicked] = useState(null);
  const slots = picked || (() => {
    const s = {};
    if (whoAmI && data.series[whoAmI]) s[whoAmI] = 0;
    if (leader && leader !== whoAmI) s[leader] = Object.keys(s).length;
    return s;
  })();
  const toggle = (n) => {
    const s = { ...slots };
    if (n in s) delete s[n];
    else {
      const used = new Set(Object.values(s));
      let free = [0, 1, 2].find((k) => !used.has(k));
      if (free == null) {                       // full: drop the oldest pick that isn't you
        const drop = Object.keys(s).find((k) => k !== whoAmI) || Object.keys(s)[0];
        free = s[drop]; delete s[drop];
      }
      s[n] = free;
    }
    setPicked(s);
  };

  const [scrub, setScrub] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const svgRef = useRef(null);

  if (data.weeks.length < 2) return null;

  const max = Math.max(10, ...names.map((n) => Math.max(...data.series[n])));
  const niceMax = Math.ceil(max / 50) * 50;
  const x = (i) => PAD.l + (i / lastIdx) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / niceMax) * (H - PAD.t - PAD.b);
  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const lit = names.filter((n) => n in slots).sort((a, b) => slots[a] - slots[b]);
  // End labels, nudged apart so they never sit on top of each other
  const ends = lit.map((n) => ({ n, y: y(data.series[n][lastIdx]) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 11) ends[k].y = ends[k - 1].y + 11;

  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * lastIdx);
    setScrub(Math.max(0, Math.min(lastIdx, i)));
  };
  const si = scrub ?? lastIdx;
  const tipRows = (lit.length ? lit : [leader]).map((n) => ({ n, v: data.series[n][si], r: data.ranks[n][si] }))
    .sort((a, b) => b.v - a.v);

  return (
    <div className="race">
      <div className="list-head">
        <span>Season race</span>
        <button className="link-btn" onClick={() => setAsTable(!asTable)}>{asTable ? 'Show chart' : 'Show table'}</button>
      </div>

      <div className="race-card">
        {!asTable ? (
          <>
            <div className="race-tip" aria-live="polite">
              <b>{data.weeks[si].label === 'Start' ? 'Before a ball was kicked' : `Week to ${data.weeks[si].label}`}</b>
              {tipRows.map(({ n, v, r }) => (
                <span key={n}>
                  <i className="race-key" style={{ background: n in slots ? `var(--series-${slots[n] + 1})` : 'var(--ink-faint)' }} />
                  {n} {v} <small>({ordinal(r)})</small>
                </span>
              ))}
            </div>
            <svg
              ref={svgRef}
              className="race-svg"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Points by week. ${lit.map((n) => `${n}: ${data.series[n][lastIdx]}`).join(', ')}`}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setScrub(null)}
            >
              {[0, niceMax / 2, niceMax].map((v) => (
                <g key={v}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="race-grid" />
                  <text x={PAD.l - 6} y={y(v) + 3} className="race-axis" textAnchor="end">{v}</text>
                </g>
              ))}
              {[0, Math.round(lastIdx / 2), lastIdx].filter((v, k, a) => a.indexOf(v) === k).map((i) => (
                <text key={i} x={x(i)} y={H - 6} className="race-axis" textAnchor={i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'}>
                  {data.weeks[i].label}
                </text>
              ))}
              {names.filter((n) => !(n in slots)).map((n) => (
                <path key={n} d={path(data.series[n])} className="race-line dim" />
              ))}
              {lit.map((n) => (
                <path key={n} d={path(data.series[n])} className="race-line" style={{ stroke: `var(--series-${slots[n] + 1})` }} />
              ))}
              {scrub != null && <line x1={x(si)} x2={x(si)} y1={PAD.t} y2={H - PAD.b} className="race-cross" />}
              {lit.map((n) => (
                <circle key={n} cx={x(si)} cy={y(data.series[n][si])} r="4" className="race-dot" style={{ fill: `var(--series-${slots[n] + 1})` }} />
              ))}
              {ends.map(({ n, y: ly }) => (
                <text key={n} x={W - PAD.r + 6} y={ly + 3} className="race-label">{n}</text>
              ))}
            </svg>
          </>
        ) : (
          <div className="race-table-wrap" data-noswipe>
            <table className="race-table">
              <thead>
                <tr><th>Player</th>{data.weeks.map((w) => <th key={w.end}>{w.label}</th>)}</tr>
              </thead>
              <tbody>
                {names.slice().sort((a, b) => data.series[b][lastIdx] - data.series[a][lastIdx]).map((n) => (
                  <tr key={n} className={n === whoAmI ? 'me' : ''}>
                    <td>{n}</td>
                    {data.series[n].map((v, i) => <td key={i}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="race-chips" data-noswipe>
          {names.slice().sort((a, b) => data.series[b][lastIdx] - data.series[a][lastIdx]).map((n) => (
            <button
              key={n}
              className={`race-chip ${n in slots ? 'on' : ''}`}
              style={n in slots ? { '--c': `var(--series-${slots[n] + 1})` } : undefined}
              onClick={() => toggle(n)}
              aria-pressed={n in slots}
            >
              {n in slots && <i />}{n}
            </button>
          ))}
        </div>
        <p className="muted small race-hint">Tap names to compare, up to {SLOTS} at once.</p>
      </div>
    </div>
  );
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
