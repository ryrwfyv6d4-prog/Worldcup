import { useGoalAlerts } from '../hooks/useGoalAlerts.js';

// The switch for goal alerts. Lives in your squad sheet and under More.
export default function GoalAlerts({ who }) {
  const a = useGoalAlerts(who);
  return (
    <div className="alerts card">
      <div className="alerts-top">
        <div>
          <b>Goal alerts</b>
          <small>{a.on ? (a.scope === 'all' ? 'Every goal, every match' : 'When your clubs score or concede') : 'A buzz when your clubs score'}</small>
        </div>
        {a.supported && (
          <button
            className={`switch ${a.on ? 'on' : ''}`}
            role="switch"
            aria-checked={a.on}
            disabled={a.busy}
            onClick={() => (a.on ? a.turnOff() : a.turnOn(a.scope))}
          >
            <span />
          </button>
        )}
      </div>
      {a.supported && a.on && (
        <div className="seg-row alerts-scope">
          <button className={`seg seg-sm ${a.scope === 'mine' ? 'on' : ''}`} onClick={() => a.turnOn('mine')} disabled={a.busy}>My clubs</button>
          <button className={`seg seg-sm ${a.scope === 'all' ? 'on' : ''}`} onClick={() => a.turnOn('all')} disabled={a.busy}>Every goal</button>
        </div>
      )}
      {!a.supported && <p className="muted small alerts-why">{a.why}</p>}
      {a.msg && <p className="muted small alerts-why bad">{a.msg}</p>}
      {!who && a.supported && <p className="muted small alerts-why">Pick your name first so it knows which clubs are yours.</p>}
    </div>
  );
}
