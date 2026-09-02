import { useMemo } from 'react';
import { getTeam } from '../data/england2027.js';
import { clubLabel } from '../utils/teamMatch.js';
import { fixturePoints } from '../utils/scoring.js';
import { getRivalry } from '../data/rivalries.js';
import Stripe from './Stripe.jsx';

// What is about to move the table.
//
// This sits where the standings blurb used to. The blurb said who was top and
// who was bottom, which is the one thing the table directly underneath it
// already says. This says what happens next instead, and every row opens the
// match.
//
// Your own clubs come first when the app knows who you are, because "when am I
// next on" is the question people actually open this screen with. With nobody
// picked, or once your clubs have all played, it falls back to the next games
// in the league.

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

// Read in the phone's own zone, so an English evening kick-off correctly lands
// on tomorrow morning here rather than being labelled tonight.
function dayLabel(iso) {
  const d = new Date(iso);
  const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const timeLabel = (f) => (f.timeTBC
  ? 'TBC'
  : new Date(f.utcDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

function ownerOf(team, assignments) {
  for (const [name, teams] of Object.entries(assignments)) {
    if ((teams || []).includes(team)) return name;
  }
  return null;
}

export default function UpNext({ fixtures, assignments, whoAmI, onOpenMatch, limit = 3 }) {
  const { rows, mineOnly } = useMemo(() => {
    const now = Date.now();
    // A match that kicked off in the last few hours is still the thing you want
    // to see, so the window opens slightly into the past rather than at now.
    const upcoming = fixtures
      .filter((f) => f.status !== 'FINISHED' && f.utcDate
        && Date.parse(f.utcDate) > now - 3 * 3600 * 1000)
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

    const mine = (assignments[whoAmI] || []).filter(Boolean);
    const ofMine = mine.length
      ? upcoming.filter((f) => mine.includes(f.homeTeam.name) || mine.includes(f.awayTeam.name))
      : [];
    return ofMine.length
      ? { rows: ofMine.slice(0, limit), mineOnly: true }
      : { rows: upcoming.slice(0, limit), mineOnly: false };
  }, [fixtures, assignments, whoAmI, limit]);

  if (!rows.length) return null;

  return (
    <div className="upnext">
      <div className="upnext-head">
        <span className="upnext-title">Up next</span>
        {mineOnly && <span className="upnext-tag">your clubs</span>}
      </div>

      {rows.map((f) => {
        const live = f.status === 'IN_PLAY';
        const derby = getRivalry(f.homeTeam.name, f.awayTeam.name);
        const sides = [f.homeTeam.name, f.awayTeam.name];
        return (
          <button className={`upnext-row ${live ? 'live' : ''}`} key={f.id} onClick={() => onOpenMatch(f)}>
            <span className="upnext-ko">
              <b>{live ? 'Live' : dayLabel(f.utcDate)}</b>
              <span>{live ? `${f.liveClock || ''}'` : timeLabel(f)}</span>
            </span>

            <span className="upnext-clubs">
              {sides.map((name) => {
                const owner = ownerOf(name, assignments);
                const fp = fixturePoints(f, name);
                const yours = owner && owner === whoAmI;
                return (
                  <span className="upnext-club" key={name}>
                    <Stripe team={name} />
                    <span className="upnext-name">{getTeam(name)?.short || clubLabel(name)}</span>
                    {owner && (
                      <span className={`upnext-owner ${yours ? 'you' : ''}`}>{owner}</span>
                    )}
                    {/* the price on offer, the same number the fixture list quotes */}
                    {fp && !fp.settled && <span className="upnext-worth">+{fp.win}</span>}
                  </span>
                );
              })}
            </span>

            <span className="upnext-right">
              {live
                ? <span className="upnext-score">{f.score.home}–{f.score.away}</span>
                : derby && <span className="upnext-derby">derby</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
