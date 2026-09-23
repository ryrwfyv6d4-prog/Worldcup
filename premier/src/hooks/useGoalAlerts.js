import { useCallback, useEffect, useState } from 'react';

// Goal alerts on this phone: whether they can work here, whether they're on,
// and the switch. The worker holds the subscription and does the sending.
//
// On an iPhone they only work from the home-screen app (iOS 16.4 and later),
// never in a Safari tab, so "can't" comes with the reason.
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const PREF = 'epl_alerts_v1';

const urlKey = (b64) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

function support() {
  if (!WORKER_URL) return { ok: false, why: 'Alerts need the shared server, which this build has not got.' };
  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  if (ios && !standalone) return { ok: false, why: 'On iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then turn alerts on from there.' };
  if (!hasPush) return { ok: false, why: "This browser can't do notifications." };
  return { ok: true };
}

export function useGoalAlerts(who) {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF) || 'null') || { on: false, scope: 'mine' }; } catch { return { on: false, scope: 'mine' }; }
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const sup = support();

  const save = (s) => { setState(s); try { localStorage.setItem(PREF, JSON.stringify(s)); } catch { /* ignore */ } };

  const turnOn = useCallback(async (scope = 'mine') => {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications are blocked for this app. Allow them in your phone settings.');
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch(`${WORKER_URL}/epl/push/key`)).json();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(publicKey) });
      const r = await fetch(`${WORKER_URL}/epl/push/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), who, scope, test: !state.on }),
      });
      if (!r.ok) throw new Error('The server did not take it. Try again in a minute.');
      save({ on: true, scope });
    } catch (err) {
      setMsg(err.message || String(err));
    }
    setBusy(false);
  }, [who, state.on]);

  const turnOff = useCallback(async () => {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${WORKER_URL}/epl/push/unsubscribe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
    } catch { /* nothing to undo */ }
    save({ on: false, scope: state.scope });
    setBusy(false);
  }, [state.scope]);

  // If the name changes while alerts are on, the server needs to know whose
  // clubs to watch
  useEffect(() => {
    if (state.on && who && sup.ok) turnOn(state.scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [who]);

  return { supported: sup.ok, why: sup.why, on: state.on, scope: state.scope, busy, msg, turnOn, turnOff };
}
