import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './App.css';

// Keep the installed app current. A home-screen app on an iPhone is rarely
// closed, so it almost never navigates, and the browser only looks for a new
// version on navigation: phones sat on an old build for days. So look
// whenever the app comes back to the screen (at most once a minute), and every
// half hour while it stays open. autoUpdate then swaps it in and reloads.
let lastCheck = 0;
registerSW({
  immediate: true,
  onRegisteredSW(url, reg) {
    if (!reg) return;
    const check = () => {
      if (Date.now() - lastCheck < 60000 || !navigator.onLine) return;
      lastCheck = Date.now();
      reg.update().catch(() => { /* offline, try next time */ });
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('focus', check);
    setInterval(check, 30 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
