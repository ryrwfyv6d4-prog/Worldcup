export default function Navigation({ tab, setTab }) {
  const tabs = [
    { id: 'leaderboard', label: 'Standings', icon: '🏆' },
    { id: 'fixtures', label: 'Fixtures', icon: '📅' },
    { id: 'wall', label: 'Wall', icon: '📸' },
    { id: 'draw', label: 'Draw', icon: '🎲' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
