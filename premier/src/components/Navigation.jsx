// Four tabs, icon over label, like every other app on the phone.
const I = {
  table: (
    <path d="M7 4h10v3a5 5 0 0 1-10 0V4Zm10 1h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3m5 2v4m-4 4h8m-6 0 .5-4h3l.5 4" />
  ),
  fixtures: (
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm0 3h16M8 3v4m8-4v4m-8 7h2m4 0h2m-8 4h2" />
  ),
  clubs: (
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm0 5v8m-3-5h6" />
  ),
  banter: (
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 5h8m-8 3h5" />
  ),
};

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'fixtures', label: 'Matches' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'banter', label: 'Banter' },
];

export default function Navigation({ tab, setTab, dots = {} }) {
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <span className="nav-ico">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {I[t.id]}
            </svg>
            {dots[t.id] && <span className="nav-dot" aria-label="something waiting" />}
          </span>
          <span className="nav-lab">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
