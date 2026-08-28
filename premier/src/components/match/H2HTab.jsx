import { clubLabel } from '../../utils/teamMatch.js';

const fmtShort = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  : '');

// Head to head: how the record stands between these two, then every previous
// meeting the feed knows about, then each side's last five in all competitions.
//
// Everything is written from the home side's point of view — one perspective
// held all the way down, so W always means the same thing on this screen.
export default function H2HTab({ detail, sides }) {
  const h2h = detail?.h2h;
  const games = h2h?.games || [];
  const form = detail?.form || {};
  const homeName = sides[0].info?.short || clubLabel(sides[0].name);
  const awayName = sides[1].info?.short || clubLabel(sides[1].name);

  const total = (h2h?.homeWins || 0) + (h2h?.draws || 0) + (h2h?.awayWins || 0);
  const pct = (n) => (total ? (n / total) * 100 : 33.33);

  const formSides = [
    { label: homeName, side: form[String(detail?.homeId)] },
    { label: awayName, side: form[String(detail?.awayId)] },
  ].filter((x) => x.side?.games?.length);

  if (!games.length && !formSides.length) {
    return (
      <div className="mp-pane">
        <p className="muted small mp-empty">No previous meetings on record.</p>
      </div>
    );
  }

  return (
    <div className="mp-pane">
      {total > 0 && (
        <>
          <div className="mp-h2h-head">
            <span>{homeName}</span>
            <span className="mp-h2h-mid">Draws</span>
            <span>{awayName}</span>
          </div>
          <div className="mp-h2h-nums">
            <span>{h2h.homeWins}</span>
            <span className="mp-h2h-mid">{h2h.draws}</span>
            <span>{h2h.awayWins}</span>
          </div>
          <div className="mp-h2h-bar">
            <span className="w" style={{ width: `${pct(h2h.homeWins)}%` }} />
            <span className="d" style={{ width: `${pct(h2h.draws)}%` }} />
            <span className="l" style={{ width: `${pct(h2h.awayWins)}%` }} />
          </div>
          <p className="muted small">
            {total} previous meeting{total === 1 ? '' : 's'} on record.
          </p>
        </>
      )}

      {games.length > 0 && (
        <>
          <div className="section-title">Previous meetings</div>
          <div className="mp-h2h-list">
            {games.map((g) => (
              <div className="mp-h2h-row" key={g.id}>
                <span className="mp-h2h-date">{fmtShort(g.date)}</span>
                <span className="mp-h2h-tie">
                  <b>{clubLabel(g.homeName)}</b> v <b>{clubLabel(g.awayName)}</b>
                  {g.comp && <em>{g.comp}</em>}
                </span>
                <span className="mp-h2h-score">
                  {g.homeScore == null || g.awayScore == null
                    ? (g.note || '—')
                    : `${g.homeScore}–${g.awayScore}`}
                </span>
                {g.result && <span className={`fsq fsq-${g.result.toLowerCase()}`}>{g.result}</span>}
              </div>
            ))}
          </div>
          <p className="muted small">
            W, D and L read from {homeName}'s side.
          </p>
        </>
      )}

      {formSides.length > 0 && (
        <>
          <div className="section-title">Last five</div>
          <div className="mp-h2h-form">
            {formSides.map(({ label, side }) => (
              <div className="mp-h2h-form-col" key={label}>
                <div className="mp-form-club">{label}</div>
                {side.games.map((g) => (
                  <div className="mp-h2h-form-row" key={g.id}>
                    <span className={`fsq fsq-${(g.result || 'd').toLowerCase()}`}>
                      {g.result || '·'}
                    </span>
                    <span className="mp-h2h-form-score">{g.score || '—'}</span>
                    <span className="mp-h2h-form-date">{fmtShort(g.date)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
