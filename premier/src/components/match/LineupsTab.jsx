import { useState } from 'react';
import { coloursFor } from '../../data/colours.js';
import { shirtColours } from '../../utils/formation.js';
import { clubLabel } from '../../utils/teamMatch.js';
import PlayerSheet, { ratingClass } from './PlayerSheet.jsx';

// Both XIs on one pitch, placed where FotMob says they actually stood, with
// each player's rating, goals, cards and the minute they came off. Tap anyone
// for their numbers. Subs and the bench sit underneath.
//
// Positions come from FotMob's own layout: for each side, x runs across the
// pitch and y from their own goal (0) up to halfway (1). The home side is
// drawn attacking up the screen, the away side down it.

function Badges({ p }) {
  return (
    <span className="lp-badges">
      {Array.from({ length: p.goals }, (_, i) => <i key={`g${i}`} className="lp-ball" title="Goal">⚽</i>)}
      {p.og > 0 && <i className="lp-ball og" title="Own goal">⚽</i>}
      {p.red > 0 ? <i className="lp-card red" title="Red card" />
        : p.yellow > 0 && <i className="lp-card" title="Yellow card" />}
    </span>
  );
}

function Pitch({ fm, kits, onPick }) {
  const rows = [
    { side: fm.home, end: 'home', kit: kits[0] },
    { side: fm.away, end: 'away', kit: kits[1] },
  ];
  return (
    <div className="pitch lp-pitch">
      <div className="pitch-lines">
        <span className="pitch-half" />
        <span className="pitch-circle" />
        <span className="pitch-box top" />
        <span className="pitch-box bottom" />
      </div>
      {rows.map(({ side, end, kit }) => (side?.xi || []).map((p) => {
        if (p.x == null || p.y == null) return null;
        // inset from the edges so a keeper's rating badge isn't clipped
        const depth = Math.min(Math.max(p.y, 0), 1);
        const top = end === 'home' ? 96 - depth * 44 : 4 + depth * 44;
        const left = (end === 'home' ? 1 - p.x : p.x) * 100;
        return (
          <button
            key={`${end}-${p.id}`}
            className={`pp lp ${end}`}
            style={{ top: `${top}%`, left: `${Math.min(Math.max(left, 7), 93)}%` }}
            onClick={() => onPick(p, side)}
          >
            <span className="pp-shirt" style={{ background: kit }}>
              {p.shirt ?? ''}
              {p.rating != null && <b className={`lp-rating ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</b>}
              <Badges p={p} />
            </span>
            <span className="pp-name">
              {p.off != null && <i className="lp-off">{p.off}'</i>}
              {p.name}
            </span>
          </button>
        );
      }))}
    </div>
  );
}

function Bench({ side, club, onPick }) {
  const used = (side?.subs || []).filter((p) => p.on != null).sort((a, b) => a.on - b.on);
  const unused = (side?.subs || []).filter((p) => p.on == null);
  return (
    <div className="mp-xi-col">
      <div className="mp-xi-head">
        <span className="mp-xi-club">{club}</span>
        <span className="mp-xi-form">
          {[side?.formation, side?.coach].filter(Boolean).join(' · ')}
        </span>
      </div>
      {used.length > 0 && <div className="mp-xi-sub first">On</div>}
      {used.map((p) => (
        <button className="mp-player lp-row" key={p.id} onClick={() => onPick(p, side)}>
          <span className="mp-shirt">{p.on}'</span>
          <span className="mp-pname">{p.name}</span>
          <Badges p={p} />
          {p.rating != null && <b className={`lp-rating inline ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</b>}
        </button>
      ))}
      {unused.length > 0 && (
        <>
          <div className="mp-xi-sub">Unused</div>
          <div className="mp-unused">{unused.map((p) => p.name).join(' · ')}</div>
        </>
      )}
    </div>
  );
}

export default function LineupsTab({ fm, sides }) {
  const [pick, setPick] = useState(null);
  const kits = shirtColours(coloursFor(sides[0].name), coloursFor(sides[1].name));
  const clubOf = (i) => sides[i].info?.short || clubLabel(sides[i].name);
  const everyone = [...(fm.home?.xi || []), ...(fm.home?.subs || []), ...(fm.away?.xi || []), ...(fm.away?.subs || [])];
  const potm = fm.potm && everyone.find((p) => p.id === fm.potm.id);
  const open = (p, side) => setPick({ p, club: side === fm.home ? clubOf(0) : clubOf(1) });

  return (
    <div className="mp-pane">
      {fm.lineupType === 'predicted' && <p className="muted small">Predicted line-ups. The real ones land about an hour before kick-off.</p>}

      <div className="lp-heads">
        {[fm.home, fm.away].map((s, i) => (
          <div className={`lp-head ${i ? 'away' : ''}`} key={i}>
            <b>{clubOf(i)}</b>
            {s?.rating != null && <i className={`lp-rating inline ${ratingClass(s.rating)}`}>{s.rating.toFixed(1)}</i>}
          </div>
        ))}
      </div>

      <Pitch fm={fm} kits={kits} onPick={open} />

      {potm && (
        <button className="lp-potm" onClick={() => open(potm, fm.potm.home ? fm.home : fm.away)}>
          <span className="lp-potm-lab">Player of the match</span>
          <span className="lp-potm-name">{potm.full || potm.name}</span>
          <b className={`lp-rating inline ${ratingClass(potm.rating)}`}>{potm.rating?.toFixed(1)}</b>
        </button>
      )}

      <div className="mp-xi">
        <Bench side={fm.home} club={clubOf(0)} onPick={open} />
        <Bench side={fm.away} club={clubOf(1)} onPick={open} />
      </div>
      <p className="muted small lp-hint">Tap a player for their numbers.</p>

      {pick && (
        <PlayerSheet
          player={pick.p}
          club={pick.club}
          stats={fm.players?.[pick.p.id]}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  );
}
