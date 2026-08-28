import { clubLabel } from '../../utils/teamMatch.js';
import { coloursFor } from '../../data/colours.js';

// Match statistics, laid out the way Sofascore does it: a colour key naming
// both sides, then each group of stats as its own titled block. Every row is
// the home number, the label, the away number, and one bar underneath split by
// the share each side owns. The side ahead on a row is stamped in full ink so
// the whole pane can be scanned down the middle without reading the numbers.

// The feed decides homeShare; anything odd falls back to an even split.
function share(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, v));
}

// A number to print, whatever the feed gave us.
function cell(text, raw) {
  if (text != null && text !== '') return String(text);
  const v = Number(raw);
  return Number.isFinite(v) ? String(v) : '–';
}

// Stats only exist once a match is under way, so say which side of kick-off
// we are on rather than showing an empty pane.
function emptyLine(state, played) {
  if (state === 'loading') return 'Loading the stats…';
  if (state === 'error') return 'The stats feed is not answering. Try again in a moment.';
  return played
    ? 'No stats were published for this match.'
    : 'Stats only come in once the match has been played. Nothing to show before kick-off.';
}

export default function Stats({ groups, sides, state, played }) {
  const list = (Array.isArray(groups) ? groups : [])
    .filter((g) => g && Array.isArray(g.rows) && g.rows.length > 0);

  if (list.length === 0) {
    return (
      <div className="mp-pane">
        <p className="muted small mp-empty">{emptyLine(state, played)}</p>
      </div>
    );
  }

  const [homeSide, awaySide] = Array.isArray(sides) ? sides : [];
  const homeName = homeSide?.info?.short || clubLabel(homeSide?.name) || 'Home';
  const awayName = awaySide?.info?.short || clubLabel(awaySide?.name) || 'Away';
  const [homeColour] = coloursFor(homeSide?.name);
  const [awayColour] = coloursFor(awaySide?.name);

  return (
    <div className="mp-pane mp-stats">
      <div className="mp-stat-key">
        <span><i style={{ background: homeColour }} />{homeName}</span>
        <span><i style={{ background: awayColour }} />{awayName}</span>
      </div>

      {list.map((group, gi) => (
        <section className="mp-stat-group" key={group.title || gi}>
          <h3 className="mp-stat-group-t">{group.title || 'Statistics'}</h3>

          {group.rows.map((row, ri) => {
            const hv = Number(row?.homeRaw);
            const av = Number(row?.awayRaw);
            // Level rows, and rows the feed gave no numbers for, read equally.
            const level = !Number.isFinite(hv) || !Number.isFinite(av) || hv === av;
            const homeCls = level || hv > av ? 'mp-stat-lead' : 'mp-stat-trail';
            const awayCls = level || av > hv ? 'mp-stat-lead' : 'mp-stat-trail';
            const homeWidth = share(row?.homeShare);

            return (
              <div className="mp-stat" key={row?.key || row?.label || ri}>
                <div className="mp-stat-top">
                  <span className={`mp-stat-h ${homeCls}`}>{cell(row?.home, row?.homeRaw)}</span>
                  <span className="mp-stat-lab">{row?.label || ''}</span>
                  <span className={`mp-stat-a ${awayCls}`}>{cell(row?.away, row?.awayRaw)}</span>
                </div>
                <div className="mp-stat-bar" aria-hidden="true">
                  <span style={{ width: `${homeWidth}%`, background: homeColour }} />
                  <span style={{ width: `${100 - homeWidth}%`, background: awayColour }} />
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
