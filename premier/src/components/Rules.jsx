import { RUNS as PROJECTION_RUNS } from '../utils/projection.js';
import { MEDALS, ENTRY_FEE, PAYOUTS, SEASON, SCORING, TEAMS, buildPots } from '../data/england2027.js';
import { matchValue } from '../utils/odds.js';

export default function Rules({ playerCount }) {
  const count = playerCount || 11;
  const pot = count * ENTRY_FEE;
  const plan = buildPots(count);
  return (
    <>
      <p className="muted">
        The whole format on one page. If it isn't written here, it isn't a rule —
        take it to the group.
      </p>

      <div className="card">
        <h3 className="section-title">The deal</h3>
        <ul className="rule-list">
          <li>${ENTRY_FEE} a head. {count} players means <b>${pot}</b> in the tin.</li>
          <li>Every player gets <b>{plan.perPlayer} club{plan.perPlayer === 1 ? '' : 's'}</b> — one from each tier — across the Premier League and the Championship, {SEASON}.</li>
          <li>The draw is blind and final. No appeals. A trade only counts if the
            shed agrees it and someone records it in Shed → Draw → Swap two clubs.</li>
          <li>No pay, no payout. Same rule as always.</li>
        </ul>
      </div>

      <div className="card">
        <h3 className="section-title">What a result is worth</h3>
        <p className="muted small">
          The bookies rate every club before a ball is kicked. A win is priced on how
          likely it was: beat a club rated above you, or win away from home, and it pays
          more. Beat a worse club at home and it pays less. Any draw is +{SCORING.DRAW}.
        </p>
        <div className="rule-examples">
          {[
            ['Arsenal FC', 'Hull City AFC', true, 'Arsenal beat Hull at home'],
            ['Arsenal FC', 'Manchester City FC', false, 'Arsenal win at Man City'],
            ['Hull City AFC', 'Arsenal FC', false, 'Hull win at Arsenal'],
            ['Lincoln City FC', 'West Ham United FC', false, 'Lincoln win at West Ham'],
          ].map(([a, b, home, label]) => (
            <div className="rule-eg" key={label}>
              <span className="rule-eg-label">{label}</span>
              <span className="rule-eg-val">+{matchValue(a, b, home).win}</span>
            </div>
          ))}
        </div>
        <p className="muted small">
          A Championship season is 46 games to the Premier League's 38, so Championship
          results are scaled slightly down. Without that, a Championship club would be
          worth about a fifth more over a season purely for playing more often.
        </p>
        <p className="muted small">
          Prices are reset <b>once, on 1 January</b>, using where each club actually sits
          in the table rather than where it was tipped. A fixture is always priced by its
          own kick-off date, so nothing you have already banked can be re-scored. It does
          not touch the prediction bonus below, which is measured against the pre-season
          tip all season.
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          You never have to work this out. The app prints the price on every fixture
          before kick-off.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Beating your prediction</h3>
        <p className="muted small">
          Every club is tipped to finish somewhere. Finish above it and you earn
          <b> +{SCORING.OVERACHIEVE} per place</b> — so a club tipped 20th sitting 12th is
          worth +{8 * SCORING.OVERACHIEVE}. A club tipped 1st can't gain any, which is
          the point: the further down the list your club started, the more it can win you.
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          It runs live all season and settles on the final day, so it can move both ways
          right up to May. It only starts counting once a club has played
          {' '}{SCORING.OVERACHIEVE_MIN_GAMES} games, because before that the table is noise.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">The draw</h3>
        <p className="muted small">
          All {TEAMS.length} clubs in the two divisions are put in one pecking order off the
          bookies' odds, then cut into equal tiers — one per club you'll be given. Everyone
          draws exactly one club from each tier, so nobody can land four good ones or four
          duds. Tiers affect the draw only; they have no bearing on scoring.
        </p>
        {plan.tiers.map((t) => (
          <div className="rule-pot" key={t.index}>
            <span className="rule-pot-name">
              {t.label}
              <em>{t.clubs.length} clubs</em>
            </span>
          </div>
        ))}
        <p className="muted small" style={{ marginBottom: 0 }}>
          With {count} officers that's <b>{plan.perPlayer} club{plan.perPlayer === 1 ? '' : 's'} each</b>
          {plan.exempt.length > 0
            ? `, leaving ${plan.exempt.length} clubs unclaimed — they play on, scoring for nobody.`
            : ', with every club claimed.'}
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Season honours</h3>
        {Object.entries(MEDALS).map(([k, m]) => (
          <div className="medal-row" key={k}>
            <span className="medal-label">🎖 {m.label}</span>
            <span className="medal-detail">{m.detail}</span>
            <span className="medal-pts">+{m.pts}</span>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          League honours land automatically on the final day. The play-off final and the
          cups aren't in the data feed, so someone ticks those in Shed → Honours.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">The payout</h3>
        {PAYOUTS.map((p) => (
          <div className="medal-row" key={p.key}>
            <span className="medal-label">{p.label}</span>
            <span className="medal-detail">{Math.round(p.pct * 100)}% of the tin</span>
            <span className="medal-pts">${Math.round(pot * p.pct)}</span>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          Relegation costs no points, but that player buys the first round at settling-up.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Tiebreak</h3>
        <ol className="rule-list rule-ol">
          <li>Sweep points</li>
          <li>Total wins across your clubs</li>
          <li>Aggregate goal difference across your clubs</li>
          <li>Goals scored</li>
        </ol>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Settled in advance on purpose. Nobody argues a tiebreak invented in May.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">How the numbers work</h3>
        <ul className="rule-list">
          <li><b>Live scores</b> come from ESPN during matches; settled results come from the openfootball league feed.</li>
          <li><b>Projected</b> is the middle outcome of {PROJECTION_RUNS} simulated rest-of-seasons, using each club's odds rating and its actual form so far.</li>
          <li><b>Tours</b> (the monthly prize) are a side pot for pride — they don't add to your ladder total.</li>
        </ul>
      </div>
    </>
  );
}
