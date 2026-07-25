import { POT_LABELS, POT_POINTS, MEDALS, ENTRY_FEE, PAYOUTS, SEASON, POTS } from '../data/england2027.js';

export default function Rules({ playerCount }) {
  const pot = (playerCount || 10) * ENTRY_FEE;
  return (
    <>
      <p className="muted">
        The whole format on one page. If it isn't written here, it isn't a rule —
        take it to the War Council.
      </p>

      <div className="card">
        <h3 className="section-title">The deal</h3>
        <ul className="rule-list">
          <li>${ENTRY_FEE} a head. {playerCount || 10} officers means <b>${pot}</b> in the tin.</li>
          <li>Every officer is conscripted <b>four clubs</b> — one from each pot — across the Premier League and the Championship, {SEASON}.</li>
          <li>The draw is blind and final. No trades, no appeals.</li>
          <li>No pay, no payout. Same rule as always.</li>
        </ul>
      </div>

      <div className="card">
        <h3 className="section-title">The pots</h3>
        <p className="muted small">
          Ranked on the bookies' pre-season odds. The deeper in the mud, the more each victory pays.
        </p>
        {['A', 'B', 'C', 'D'].map((k) => (
          <div className="rule-pot" key={k}>
            <span className={`pot-dot p${k.toLowerCase()}`} />
            <span className="rule-pot-name">
              Pot {k} — {POT_LABELS[k]}
              <em>{POTS[k].length} clubs</em>
            </span>
            <span className="rule-pot-rate">win +{POT_POINTS[k].win} · draw +{POT_POINTS[k].draw}</span>
          </div>
        ))}
        <p className="muted small" style={{ marginBottom: 0 }}>
          Ten officers and twelve clubs in each Championship pot, so two Championship
          clubs per pot go unclaimed — exempt from service, scoring for nobody.
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
          cups aren't in the data feed, so someone ticks those in HQ → Honours.
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
          Relegation costs no points — but that officer buys the first round at settling-up.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Tiebreak</h3>
        <ol className="rule-list rule-ol">
          <li>Sweep points</li>
          <li>Total wins across your four clubs</li>
          <li>Aggregate goal difference across your four clubs</li>
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
          <li><b>Projected</b> is the middle outcome of 300 simulated rest-of-seasons, using each club's pot and its actual form so far.</li>
          <li><b>MIA</b> means even a top-5% run leaves you short of the leader's expected finish. It is a projection, not a mathematical certainty.</li>
          <li><b>Tours</b> (monthly medals) are a side pot for pride — they don't add to your ladder total.</li>
        </ul>
      </div>
    </>
  );
}
