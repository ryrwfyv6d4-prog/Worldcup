const ICONS = {
  front: (
    <svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" /></svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  map: (
    <svg viewBox="0 0 24 24"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
  ),
  tours: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="5" /><path d="M9 11L6 3h4l2 4 2-4h4l-3 8" /></svg>
  ),
  hq: (
    <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" /></svg>
  ),
};

export default function Navigation({ tab, setTab, liveCount = 0 }) {
  const tabs = [
    { id: 'front', label: 'The Front' },
    { id: 'orders', label: 'Orders' },
    { id: 'map', label: 'Map Room' },
    { id: 'tours', label: 'Tours' },
    { id: 'hq', label: 'HQ' },
  ];

  return (
    <nav className="nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="nav-icon">
            {ICONS[t.id]}
            {t.id === 'orders' && liveCount > 0 && <span className="nav-badge live" />}
          </span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
