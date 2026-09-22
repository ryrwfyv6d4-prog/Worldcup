import { useEffect } from 'react';

// Ratings coloured the way every match centre does it, so a glance at the
// pitch says who had a game.
export function ratingClass(r) {
  if (r == null) return '';
  if (r >= 8) return 'r-great';
  if (r >= 7) return 'r-good';
  if (r >= 6.5) return 'r-ok';
  if (r >= 6) return 'r-meh';
  return 'r-poor';
}

// One player's match, from a tap on the pitch or the bench.
export default function PlayerSheet({ player, club, stats, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const rating = player.rating ?? stats?.rating;
  const facts = [
    stats?.minutes != null && `${stats.minutes}'`,
    player.goals > 0 && `${player.goals} goal${player.goals > 1 ? 's' : ''}`,
    player.assists > 0 && `${player.assists} assist${player.assists > 1 ? 's' : ''}`,
    player.og > 0 && 'own goal',
    player.yellow > 0 && 'booked',
    player.red > 0 && 'sent off',
    player.on != null && `on ${player.on}'`,
    player.off != null && `off ${player.off}'`,
  ].filter(Boolean);

  return (
    <div className="whoami-overlay" onClick={onClose}>
      <div className="whoami-modal ps" onClick={(e) => e.stopPropagation()}>
        <div className="ps-top">
          <div>
            <div className="ps-club">{club}{player.shirt != null ? ` · ${player.shirt}` : ''}</div>
            <div className="whoami-title">{player.full || player.name}</div>
          </div>
          {rating != null && <b className={`lp-rating big ${ratingClass(rating)}`}>{rating.toFixed(1)}</b>}
        </div>
        {facts.length > 0 && <div className="ps-facts">{facts.join(' · ')}</div>}

        <div className="ps-body">
          {!stats?.groups?.length && <p className="muted small">No numbers for this player yet.</p>}
          {(stats?.groups || []).map((g) => (
            <div className="ps-group" key={g.title}>
              <div className="ps-group-head">{g.title}</div>
              {g.rows.map(([label, value]) => (
                <div className="ps-row" key={label}><span>{label}</span><b>{value}</b></div>
              ))}
            </div>
          ))}
        </div>
        <button className="whoami-skip" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
