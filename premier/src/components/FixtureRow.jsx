import { getTeam } from '../data/england2027.js';
import { clubLabel } from '../utils/teamMatch.js';
import { fixturePoints } from '../utils/scoring.js';
import { getRivalry } from '../data/rivalries.js';
import { useHighlight } from '../hooks/useHighlight.js';
import { ownerOf } from '../utils/format.js';
import Crest from './Crest.jsx';

// One match, the same everywhere it appears (Matches, Up next).
//
//   status │ crest  Club name        owner +3 │ 2
//          │ crest  Club name        owner +5 │ 1
//
// The left column says when or how far along; the right column is the score
// once there is one. Each club's line carries who owns it and what the game is
// worth to them: the price before kick-off, what it banked afterwards.
const time = (f) => (f.timeTBC ? 'TBC' : new Date(f.utcDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

function Worth({ fp }) {
  if (!fp) return null;
  if (!fp.settled) return <span className="fxr-price">+{fp.win}</span>;
  if (fp.outcome === 'L') return null;
  return <span className="fxr-banked">+{fp.pts}</span>;
}

export default function FixtureRow({ fixture: f, assignments, whoAmI, onOpen, dayLabel, showTier }) {
  const done = f.status === 'FINISHED';
  const live = f.status === 'IN_PLAY';
  const derby = getRivalry(f.homeTeam.name, f.awayTeam.name);
  // Stan carry the Premier League only, so a Championship match is a request
  // we already know the answer to.
  const highlight = useHighlight(
    f.homeTeam.name, f.awayTeam.name, done && f.division === 1, f.score?.home, f.score?.away
  );
  const sides = [
    { name: f.homeTeam.name, goals: f.score?.home, won: f.score?.winner === 'HOME_TEAM' },
    { name: f.awayTeam.name, goals: f.score?.away, won: f.score?.winner === 'AWAY_TEAM' },
  ];

  return (
    <div className={`fxr ${live ? 'live' : ''}`}>
      <button className="fxr-main" onClick={onOpen}>
        <span className="fxr-when">
          {live ? (
            <b className="fxr-live">{f.liveClock ? `${f.liveClock}'` : 'Live'}</b>
          ) : done ? (
            <b>FT</b>
          ) : (
            <>
              {dayLabel && <small>{dayLabel}</small>}
              <b>{time(f)}</b>
            </>
          )}
          {showTier && <small className="fxr-tier">{f.division === 1 ? 'Prem' : 'Champ'}</small>}
        </span>

        <span className="fxr-sides">
          {sides.map((s) => {
            const owner = ownerOf(s.name, assignments);
            const yours = owner && owner === whoAmI;
            return (
              <span className={`fxr-side ${done && !s.won && f.score?.winner !== 'DRAW' ? 'lost' : ''}`} key={s.name}>
                <Crest team={s.name} size={22} />
                <span className="fxr-name">{getTeam(s.name)?.short || clubLabel(s.name)}</span>
                {owner && (
                  <span className={`fxr-owner ${yours ? 'you' : ''}`}>
                    {owner}
                    <Worth fp={fixturePoints(f, s.name)} />
                  </span>
                )}
                {(done || live) && <b className="fxr-goals">{s.goals ?? 0}</b>}
              </span>
            );
          })}
        </span>
      </button>
      {derby && !done && <span className="fxr-derby">Derby</span>}
      {highlight && (
        <a
          className="fxr-hl"
          href={highlight}
          target="_blank"
          rel="noreferrer"
          aria-label="Watch the highlights"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          Highlights
        </a>
      )}
    </div>
  );
}
