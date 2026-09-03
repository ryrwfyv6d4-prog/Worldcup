import { clubLabel } from '../../utils/teamMatch.js';

// Who is missing, and why.
//
// The expected return reads as a phrase rather than a date — "Early September
// 2026", "Doubtful", "Mid January 2027" — so it is printed as given rather
// than parsed into something that would only pretend to be more precise.
//
// A club with nobody out says so. That is information too, and an empty column
// beside a long one is the fastest way to read a team-news card.
function Side({ label, side }) {
  const out = side?.out || [];
  return (
    <div className="tn-col">
      <div className="tn-club">{label}</div>
      {out.length === 0 ? (
        <div className="tn-none">Nobody out</div>
      ) : out.map((p) => (
        <div className="tn-row" key={p.name}>
          <span className={`tn-mark ${p.type === 'suspension' ? 'susp' : ''}`} aria-hidden="true">
            {p.type === 'suspension' ? '▮' : '✚'}
          </span>
          <span className="tn-who">
            {p.name}
            {p.back && <em>{p.back}</em>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TeamNews({ news, sides }) {
  if (!news) return null;
  const total = (news.home?.out || []).length + (news.away?.out || []).length;
  if (!total) return null;

  return (
    <>
      <div className="section-title">Team news</div>
      <div className="tn">
        <Side label={sides[0].info?.short || clubLabel(sides[0].name)} side={news.home} />
        <Side label={sides[1].info?.short || clubLabel(sides[1].name)} side={news.away} />
      </div>
    </>
  );
}

// How the eleven was arrived at. Upstream distinguishes a real prediction from
// "this is who they started last time", and the two are not the same claim —
// calling a last-time-out side a prediction would be putting confidence on it
// that nobody has. Anything unrecognised is described as unconfirmed rather
// than guessed at.
const XI_LABEL = {
  predicted: 'predicted',
  lastStarting11: 'last time out',
  confirmed: null,
};

// Shown only while the eleven is still provisional. Once the real sheet lands
// the Line-ups tab has the confirmed one off ESPN, and two versions of the same
// eleven on one screen is worse than either alone.
export function ProbableXI({ news, sides }) {
  if (!news || news.kind === 'confirmed') return null;
  const tag = XI_LABEL[news.kind] ?? 'unconfirmed';
  if (!tag) return null;
  const hasXI = (news.home?.xi || []).length && (news.away?.xi || []).length;
  if (!hasXI) return null;

  return (
    <>
      <div className="section-title">
        {news.kind === 'lastStarting11' ? 'Last line-ups' : 'Probable line-ups'}
        <span className="tn-tag">{tag}</span>
      </div>
      <div className="tn">
        {[[news.home, sides[0]], [news.away, sides[1]]].map(([side, s]) => (
          <div className="tn-col" key={s.key}>
            <div className="tn-club">
              {s.info?.short || clubLabel(s.name)}
              {side?.formation && <span className="tn-form">{side.formation}</span>}
            </div>
            {(side?.xi || []).map((p) => (
              <div className="tn-xi" key={`${p.shirt}-${p.name}`}>
                <span className="tn-shirt">{p.shirt ?? ''}</span>
                <span className="tn-name">{p.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
