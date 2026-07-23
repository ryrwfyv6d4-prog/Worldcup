import { useState } from 'react';
import { POTS, POT_LABELS, POT_POINTS, DEFAULT_PLAYERS, SQUAD_SIZE, getTeam } from '../data/england2027.js';

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
  const drawn = Object.keys(assignments).length > 0;

  const addPlayer = () => {
    const n = newName.trim();
    if (n && !players.includes(n)) setPlayers([...players, n]);
    setNewName('');
  };

  const runDraw = () => {
    if (players.length < 2) return;
    const result = {};
    for (const p of players) result[p] = [];
    for (const potKey of ['A', 'B', 'C', 'D']) {
      const order = shuffle(POTS[potKey]);
      players.forEach((p, i) => { result[p].push(order[i]); });
    }
    setAssignments(result);
  };

  const reset = () => { setAssignments({}); setDrawLocked(false); };

  const exempt = drawn
    ? ['C', 'D'].flatMap((k) => POTS[k].filter((t) => !Object.values(assignments).flat().includes(t)))
    : [];

  return (
    <div className="panel">
      <h2 className="panel-title">Conscription</h2>
      <p className="muted">
        Four pots, one team from each. No choices, no appeals — your call-up papers
        arrive and you serve. Infantry and Territorial results pay double.
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

          {['A', 'B', 'C', 'D'].map((k) => (
            <div className="card" key={k}>
              <h3>Pot {k} — {POT_LABELS[k]} <span className="muted">(win {POT_POINTS[k].win} · draw {POT_POINTS[k].draw})</span></h3>
              <div className="chip-row">
                {POTS[k].map((t) => <span key={t} className="chip chip-team">{getTeam(t).short}</span>)}
              </div>
            </div>
          ))}

          <button className="btn btn-primary btn-big" onClick={runDraw} disabled={players.length < 2}>
            SOUND THE BUGLE — RUN THE DRAW
          </button>
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
