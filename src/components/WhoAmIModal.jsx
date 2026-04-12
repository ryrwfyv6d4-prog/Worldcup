export default function WhoAmIModal({ participants, onSelect }) {
  return (
    <div className="whoami-overlay">
      <div className="whoami-modal">
        <div className="whoami-icon">👋</div>
        <h2 className="whoami-title">Who are you?</h2>
        <p className="whoami-sub">Pick your name so your reactions and predictions are tracked.</p>
        <div className="whoami-list">
          {participants.map((p) => (
            <button key={p} className="whoami-btn" onClick={() => onSelect(p)}>
              {p}
            </button>
          ))}
        </div>
        <button className="whoami-skip" onClick={() => onSelect(null)}>
          I'm just watching
        </button>
      </div>
    </div>
  );
}
