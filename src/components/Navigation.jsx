const ICONS = {
  leaderboard: (
    <svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" /></svg>
  ),
  fixtures: (
    <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  fallen: (
    <svg viewBox="0 0 24 24"><path d="M12 2v20M7 7h10M9 2c0 2.5-3 5-3 5M15 2c0 2.5 3 5 3 5" /><path d="M8 17l-2 5M16 17l2 5" /></svg>
  ),
  wall: (
    <svg viewBox="0 0 24 24"><path d="M3 9h18M3 15h18M3 5h18v14H3zM9 9v6M15 5v4M15 15v4" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" /></svg>
  ),
};

export default function Navigation({ tab, setTab }) {
  const tabs = [
    { id: 'leaderboard', label: 'Polls' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'fallen', label: 'Fallen' },
    { id: 'wall', label: 'The Wall' },
    { id: 'settings', label: 'Shed Rules' },
  ];

  const activeId = tab === 'draw' ? 'settings' : tab;

  return (
    <nav className="nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${activeId === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="nav-icon">{ICONS[t.id]}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
