import { useMemo, useState } from 'react';
import { roundRecap, recapHeadline, recapLines } from '../utils/matchday.js';
import { Move } from './YouCard.jsx';

// Last round in a card: who won the week, who climbed, the result of the
// week, who's propping up the table, and how you did. "Share" makes a picture
// of it for the group chat.
export default function RecapCard({ assignments, fixtures, manualMedals, bonusPoints, whoAmI }) {
  const r = useMemo(
    () => roundRecap(assignments, fixtures, manualMedals, bonusPoints),
    [assignments, fixtures, manualMedals, bonusPoints]
  );
  const [busy, setBusy] = useState(false);
  if (!r) return null;
  const me = r.rows.find((x) => x.name === whoAmI);
  const lines = recapLines(r);

  const share = async () => {
    setBusy(true);
    let blob = null;
    try {
      blob = await drawRecap(r, lines);
      const file = new File([blob], `dans-shed-${r.label.replace(/\s+/g, '')}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Round recap', text: recapHeadline(r) });
      } else {
        save(blob, file.name);
      }
    } catch (err) {
      // Cancelling the share sheet is fine; anything else, save the picture
      if (err?.name !== 'AbortError') console.warn('recap share:', err);
      if (err?.name !== 'AbortError' && blob) save(blob, 'dans-shed-recap.png');
    }
    setBusy(false);
  };

  return (
    <div className="recap">
      <div className="recap-top">
        <div>
          <div className="recap-eyebrow">Round recap · {r.label}</div>
          <div className="recap-head">{recapHeadline(r)}</div>
        </div>
        <button className="recap-share" onClick={share} disabled={busy} aria-label="Share the recap">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
          </svg>
          Share
        </button>
      </div>
      <ul className="recap-lines">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {me && (
        <div className="recap-me">
          You: <b>+{me.gained}</b>, now {ordinal(me.rank)} <Move up={me.up} />
        </div>
      )}
    </div>
  );
}

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// A 1080 x 1350 picture (the shape Instagram and WhatsApp show whole)
function drawRecap(r, lines) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, '#C8322A'); grad.addColorStop(1, '#5E1628');
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);

  const font = (w, px) => `${w} ${px}px Inter, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.font = font(600, 40); g.fillText(`Dan's Shed · round of ${r.label}`, 80, 130);

  g.fillStyle = '#fff';
  g.font = font(800, 92);
  const head = wrap(g, `${r.winner.name} won the week`, 920);
  head.forEach((l, i) => g.fillText(l, 80, 260 + i * 100));
  let yy = 260 + head.length * 100;
  g.font = font(800, 150); g.fillText(`+${r.winner.gained}`, 80, yy + 110);
  yy += 190;

  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(80, yy, 920, 3);
  yy += 80;
  g.fillStyle = '#fff'; g.font = font(600, 44);
  for (const l of lines) {
    for (const part of wrap(g, l, 920)) { g.fillText(part, 80, yy); yy += 60; }
    yy += 22;
    if (yy > 1220) break;
  }
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = font(600, 36);
  g.fillText(`Top: ${r.leader.name} on ${r.leader.total}`, 80, 1280);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

function wrap(g, text, width) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > width && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
