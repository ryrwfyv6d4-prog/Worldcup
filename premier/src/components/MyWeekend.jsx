import { getTeam } from '../data/england2027.js';
import { valueForFixture } from '../utils/odds.js';
import { myWeekend } from '../utils/scoring.js';
import { getRivalry } from '../data/rivalries.js';
import Crest from './Crest.jsx';

const FIRST_KICKOFF = { d2: '2026-08-14T19:00:00Z', d1: '2026-08-21T19:00:00Z' };

function countdown(toIso) {
  const ms = new Date(toIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function fmtKo(iso) {
  if (!iso) return 'TBC';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Pre-season: nothing has kicked off yet anywhere
export function PreSeason() {
  const ch = countdown(FIRST_KICKOFF.d2);
  const pl = countdown(FIRST_KICKOFF.d1);
  if (!ch && !pl) return null;
  return (
    <div className="card preseason">
      <div className="ps-eyebrow">Phoney War</div>
      <div className="ps-rows">
        {ch && (
          <div className="ps-row">
            <span className="ps-label">Championship opens</span>
            <span className="ps-time">{ch}</span>
          </div>
        )}
        {pl && (
          <div className="ps-row">
            <span className="ps-label">Premier League opens</span>
            <span className="ps-time">{pl}</span>
          </div>
        )}
      </div>
      <p className="ps-note">
        Wolves v Blackburn gets the second front moving on 14 August. Until then the
        regiments are in barracks — get Conscription done in HQ.
      </p>
    </div>
  );
}

export default function MyWeekend({ player, assignments, fixtures, onOpenMatch }) {
  const { window: win, matches } = myWeekend(player, assignments, fixtures);
  if (!win || !matches.length) return null;

  const label = win.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const earned = matches.reduce((sum, f) => {
    if (f.status !== 'FINISHED') return sum;
    const teams = (assignments[player] || []).filter(Boolean);
    const mine = teams.includes(f.homeTeam.name) ? f.homeTeam.name : f.awayTeam.name;
    const info = getTeam(mine);
    if (!info) return sum;
    const rate = valueForFixture(f, mine);
    const isHome = f.homeTeam.name === mine;
    if (f.score.winner === 'DRAW') return sum + rate.draw;
    const won = (f.score.winner === 'HOME_TEAM' && isHome) || (f.score.winner === 'AWAY_TEAM' && !isHome);
    return won ? sum + rate.win : sum;
  }, 0);

  return (
    <div className="card my-weekend">
      <div className="mw-head">
        <span className="mw-title">Your Weekend</span>
        <span className="mw-sub">from {label}</span>
        {earned > 0 && <span className="mw-earned">+{earned}</span>}
      </div>
      {matches.map((f) => {
        const teams = (assignments[player] || []).filter(Boolean);
        const mineName = teams.includes(f.homeTeam.name) ? f.homeTeam.name : f.awayTeam.name;
        const isHome = f.homeTeam.name === mineName;
        const mine = getTeam(mineName);
        const opp = getTeam(isHome ? f.awayTeam.name : f.homeTeam.name);
        const derby = getRivalry(f.homeTeam.name, f.awayTeam.name);
        const rate = mine ? valueForFixture(f, mineName) : null;
        const done = f.status === 'FINISHED';
        const live = f.status === 'IN_PLAY';
        let pts = null;
        if (done && rate) {
          if (f.score.winner === 'DRAW') pts = rate.draw;
          else pts = ((f.score.winner === 'HOME_TEAM') === isHome) ? rate.win : 0;
        }
        return (
          <button className={`mw-match ${live ? 'live' : ''}`} key={f.id} onClick={() => onOpenMatch(f)}>
            <Crest team={mineName} size={20} />
            <span className="mw-teams">
              <b>{mine?.short}</b>
              <span className="mw-vs">{isHome ? 'v' : 'away at'}</span>
              {opp?.short}
              {derby && <span className="mw-derby">DERBY</span>}
            </span>
            <span className="mw-right">
              {live && <span className="mw-live">{f.score.home}–{f.score.away} LIVE</span>}
              {done && !live && (
                <>
                  <span className="mw-score">{isHome ? f.score.home : f.score.away}–{isHome ? f.score.away : f.score.home}</span>
                  <span className={`mw-pts ${pts > 0 ? 'gain' : ''}`}>{pts > 0 ? `+${pts}` : 'nil'}</span>
                </>
              )}
              {!done && !live && (
                <>
                  <span className="mw-ko">{fmtKo(f.utcDate)}</span>
                  {rate && <span className="mw-worth">+{rate.win}</span>}
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
