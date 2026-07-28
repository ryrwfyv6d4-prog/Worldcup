import { useState } from 'react';
import { POTS, POT_LABELS, DEFAULT_PLAYERS, SQUAD_SIZE, getTeam } from '../data/england2027.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Draw({ assignments, setAssignments, drawLocked, setDrawLocked }) {
  const [players, setPlayers] = useState(() =>
    Object.keys(assignments).length ? Object.keys(assignments) : DEFAULT_PLAYERS
  );
  const [newName, setNewName] = useState('');
  const [importing, setImporting] = useState(null);
  const drawn = Object.keys(assignments).length > 0;

  // Pull the roster straight from the World Cup sweep so the same blokes are in
  // both. Runs in the browser, which can reach the worker even when a build
  // machine can't.
  const importWorldCup = async () => {
    const base = import.meta.env.VITE_WALL_API_URL;
    if (!base) { setImporting({ ok: false, msg: 'No worker configured in this build.' }); return; }
    setImporting({ ok: null, msg: 'Fetching the World Cup roster…' });
    try {
      const res = await fetch(`${base}/state`);
      if (!res.ok) throw new Error(`worker returned ${res.status}`);
      const state = await res.json();
      const names = Object.keys((state && state.assignments) || {});
      const roster = names.length ? names : (state && state.participants) || [];
      if (!roster.length) throw new Error('no players found in the World Cup sweep');
      const merged = [...players];
      let added = 0;
      for (const n of roster) if (!merged.includes(n)) { merged.push(n); added++; }
      setPlayers(merged);
      setImporting({ ok: true, msg: `Found ${roster.length}. Added ${added} new — check the list and remove anyone sitting this one out.` });
    } catch (err) {
      setImporting({ ok: false, msg: `Couldn't reach the World Cup sweep (${err.message}). Add the names by hand.` });
    }
  };

  const addPlayer = () => {
    const n = newName.trim();
    if (n && !players.includes(n)) setPlayers([...players, n]);
    setNewName('');
  };

  // Every pot must have at least one team per player, so the smallest pot
  // (the Premier League ones, 10 each) caps the squad.
  const MAX_PLAYERS = Math.min(...['A', 'B', 'C', 'D'].map((k) => POTS[k].length));
  const tooMany = players.length > MAX_PLAYERS;

  const runDraw = () => {
    if (players.length < 2 || tooMany) return;
    const result = {};
    for (const p of players) result[p] = [];
    for (const potKey of ['A', 'B', 'C', 'D']) {
      const order = shuffle(POTS[potKey]);
      // .filter(Boolean) guarantees we never store an empty slot, whatever happens
      players.forEach((p, i) => { if (order[i]) result[p].push(order[i]); });
    }
    setAssignments(result);
  };

  const reset = () => { setAssignments({}); setDrawLocked(false); };

  const exempt = drawn
    ? ['C', 'D'].flatMap((k) => POTS[k].filter((t) => !Object.values(assignments).flat().includes(t)))
    : [];

  return (
    <div>
      <p className="muted">
        Four pots, one team from each. No choices, no appeals — your call-up papers
        arrive and you serve. What each club's results are worth is set by the odds,
        not by its pot.
      </p>

      {!drawn && (
        <>
          <div className="card">
            <h3>Reporting for duty ({players.length}/{SQUAD_SIZE})</h3>
            <div className="chip-row">
              {players.map((p) => (
                <span key={p} className="chip">
                  {p}
                  {!drawLocked && (
                    <button className="chip-x" onClick={() => setPlayers(players.filter((x) => x !== p))}>×</button>
                  )}
                </span>
              ))}
            </div>
            <div className="btn-row" style={{ marginBottom: 8 }}>
              <button className="btn" onClick={importWorldCup}>⇪ Import World Cup roster</button>
            </div>
            {importing && (
              <p className={`muted small ${importing.ok === false ? 'import-bad' : ''}`}>{importing.msg}</p>
            )}
            <div className="add-row">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="Add a name…"
              />
              <button className="btn" onClick={addPlayer}>Enlist</button>
            </div>
          </div>

          {tooMany && (
            <div className="draw-warn">
              <b>Too many for this structure.</b> Pots A and B hold {MAX_PLAYERS} Premier League
              clubs each, so {MAX_PLAYERS} is the cap for one-club-per-pot. You have {players.length}.
              Either drop to {MAX_PLAYERS} officers, or tell me the real headcount and I'll
              redesign the pots (e.g. one PL club plus two Championship clubs each).
            </div>
          )}

          <button className="btn btn-primary btn-big" onClick={runDraw} disabled={players.length < 2 || tooMany}>
            SOUND THE BUGLE — RUN THE DRAW
          </button>

          <p className="muted small">The pots, for reference:</p>

          {['A', 'B', 'C', 'D'].map((k) => (
            <div className="card" key={k}>
              <h3>Pot {k} — {POT_LABELS[k]} <span className="muted">({POTS[k].length} clubs)</span></h3>
              <div className="chip-row">
                {POTS[k].map((t) => <span key={t} className="chip chip-team">{getTeam(t).short}</span>)}
              </div>
            </div>
          ))}


        </>
      )}

      {drawn && (
        <>
          {Object.entries(assignments).map(([p, teams]) => (
            <div className="card" key={p}>
              <h3>{p}</h3>
              <div className="chip-row">
                {teams.map((t) => {
                  const info = getTeam(t);
                  return (
                    <span key={t} className={`chip chip-team pot-${info.pot.toLowerCase()}`}>
                      {info.short} <em>{info.codename}</em>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {exempt.length > 0 && (
            <div className="card">
              <h3>Exempt from service</h3>
              <div className="chip-row">
                {exempt.map((t) => <span key={t} className="chip chip-dim">{getTeam(t).short}</span>)}
              </div>
            </div>
          )}
          <div className="btn-row">
            {!drawLocked && <button className="btn btn-primary" onClick={() => setDrawLocked(true)}>Lock it in</button>}
            {!drawLocked && <button className="btn btn-danger" onClick={reset}>Scrap & redraw</button>}
            {drawLocked && <p className="muted">The draw is locked. Desertion is punishable.</p>}
          </div>
        </>
      )}
    </div>
  );
}
