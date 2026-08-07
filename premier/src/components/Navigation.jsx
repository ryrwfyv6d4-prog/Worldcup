// Five text tabs, no icons — the programme look is type-only.
const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'wall', label: 'Wall' },
  { id: 'shed', label: 'Shed' },
];

export default function Navigation({ tab, setTab }) {
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
