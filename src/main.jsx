import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './App.css';
import App from './App.jsx';

// Keep installed home-screen apps fresh without reinstalling:
// - check for a new version whenever the app returns to the foreground
// - check every 15 minutes while open
// - when a new service worker takes control, reload once to show it
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    const check = () => registration.update().catch(() => {});
    setInterval(check, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

let refreshed = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshed) return;
  refreshed = true;
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
