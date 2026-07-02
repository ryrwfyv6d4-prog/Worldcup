import { useMemo } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import { computeFallen } from '../utils/elimination.js';
import { UNPAID } from '../data/pot.js';

const STAGE_LABELS = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-Finals',
  SEMI_FINALS: 'Semi-Finals',
};

const STAGE_ORDER = ['GROUP_STAGE', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS'];

const EPITAPHS = [
  name => `${name} was taken in a 3am raid. The neighbours heard nothing. The group chat heard everything.`,
  name => `${name}'s appeal was heard, laughed at, and fed into the shredder.`,
  name => `${name} has been rendered to an undisclosed location. The pot is safer now.`,
  name => `No due process was harmed in ${name}'s deportation. There wasn't any.`,
  name => `${name}'s file has been stamped, sealed, and thrown into the harbour.`,
  name => `Witnesses report ${name} went quietly. The beers didn't.`,
  name => `${name} asked to speak to a lawyer. The lawyer is also being deported.`,
  name => `${name}'s visa was revoked for crimes against football.`,
  name => `${name} has been escorted from US soil. Do not attempt to re-enter.`,
  name => `ICE confirmed ${name}'s teams had no right to remain. Neither did the dream.`,
  name => `${name} was last seen sharing a cell with their own bracket predictions.`,
  name => `${name}'s belongings have been seized: one esky, three warm beers, zero trophies.`,
  name => `${name} entered legally. ${name} is leaving in a cargo hold.`,
  name => `The tribunal reviewed ${name}'s campaign and ruled it "an act of self-harm".`,
  name => `${name}'s family have been notified. They already knew. Everyone knew.`,
];

const FACILITIES = [
  'Alligator Alcatraz, FL',
  'Offshore Processing — Nauru',
  'Terminal 4 Food Court (indefinite)',
  'Processing Bay 7, Newark',
  'The Naughty Corner, Guantánamo',
  'A Bunnings Carpark, Undisclosed',
  'Detention Block D, Dan\'s Shed',
  'The Long-Stay Carpark, LAX',
];

const DEPORTED_VIA = [
  'cargo hold, middle seat',
  'banana boat, one oar',
  'Jetstar red-eye — no refunds',
  'catapult (economy)',
  'Greyhound bus, one way',
  'shipping container marked "FRAGILE"',
  'rowboat, against the current',
  'strapped to the wing',
];

const nameHash = (name) => [...name].reduce((h, c) => h + c.charCodeAt(0), 0);

// ── Booking-photo share card ─────────────────────────────────────────────────

async function shareDeportationCard(f) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  try { await document.fonts.load('60px Ultra'); await document.fonts.load('30px Graduate'); } catch { /* fonts best-effort */ }

  // Mugshot backdrop — grubby grey with height-chart lines
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#4A463F'); bg.addColorStop(1, '#35322C');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(242,230,206,0.16)'; ctx.lineWidth = 3;
  ctx.font = '22px Graduate, serif'; ctx.textAlign = 'left';
  for (let y = 140; y < H - 220; y += 110) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = 'rgba(242,230,206,0.28)';
    ctx.fillText(`${Math.round(210 - (y - 140) / 110 * 10)}cm`, 18, y - 10);
  }

  // Header
  ctx.textAlign = 'center';
  ctx.font = '30px Graduate, serif'; ctx.fillStyle = '#E8B84B';
  ctx.fillText("DAN'S SHED DETENTION FACILITY", W / 2, 78);
  ctx.font = '20px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.6)';
  ctx.fillText('DEPARTMENT OF SWEEP SECURITY · EST. 2026', W / 2, 112);

  // Name board (the thing they hold)
  const bx = 90, by = 420, bw = W - 180, bh = 420;
  ctx.fillStyle = '#1E1B16'; ctx.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
  ctx.fillStyle = '#F2E6CE'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#26201A';
  ctx.font = '84px Ultra, serif';
  ctx.fillText(f.name.toUpperCase(), W / 2, by + 110);
  ctx.font = '26px Graduate, serif'; ctx.fillStyle = '#B22234';
  ctx.fillText(`DETAINEE #${String(1000 + (nameHash(f.name) % 9000))}`, W / 2, by + 160);

  ctx.font = '24px Graduate, serif'; ctx.fillStyle = '#3a3428';
  ctx.fillText(`FACILITY: ${f.facility.toUpperCase()}`, W / 2, by + 215);
  ctx.fillText(`REMOVED VIA: ${f.via.toUpperCase()}`, W / 2, by + 255);
  ctx.fillText(`LAST STAGE REACHED: ${(STAGE_LABELS[f.bestStage] || f.bestStage).toUpperCase()}`, W / 2, by + 295);

  // Charges
  ctx.font = '22px Graduate, serif'; ctx.fillStyle = '#B22234';
  ctx.fillText('CHARGES', W / 2, by + 345);
  ctx.font = '600 26px "Barlow Condensed", sans-serif'; ctx.fillStyle = '#26201A';
  const charges = f.teams.map(({ team, eliminatedAt }) =>
    `Harbouring ${team} (removed: ${STAGE_LABELS[eliminatedAt] || '???'})`
  );
  charges.slice(0, 4).forEach((c, i) => ctx.fillText(c, W / 2, by + 380 + i * 34));

  // Epitaph
  ctx.font = 'italic 30px "Barlow Condensed", sans-serif';
  ctx.fillStyle = 'rgba(242,230,206,0.85)';
  const words = f.epitaph.split(' ');
  let line = '', lines = [];
  for (const w of words) {
    if ((line + ' ' + w).length > 52) { lines.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(`${i === 0 ? '“' : ''}${l}${i === lines.length - 1 ? '”' : ''}`, W / 2, 950 + i * 42));

  // Big DEPORTED stamp
  ctx.save();
  ctx.translate(W / 2, 1160);
  ctx.rotate(-0.09);
  ctx.font = '110px Graduate, serif';
  ctx.fillStyle = 'rgba(178,34,52,0.9)';
  ctx.strokeStyle = 'rgba(178,34,52,0.9)'; ctx.lineWidth = 8;
  ctx.strokeRect(-420, -95, 840, 140);
  ctx.fillText('DEPORTED', 0, 22);
  ctx.restore();

  ctx.font = '18px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.5)';
  ctx.fillText("★  T H E   E A G L E ' S   N E S T   ·   W C   ' 2 6  ★", W / 2, H - 36);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], `deported-${f.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  URL.revokeObjectURL(a.href);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Graveyard({ assignments, drawType, fixtures, onSelectTeam }) {
  const fallen = useMemo(() => {
    return computeFallen(assignments, drawType, fixtures).map((f, idx) => {
      const bestStage = f.teams.reduce((best, ts) => {
        const bi = STAGE_ORDER.indexOf(best);
        const ti = STAGE_ORDER.indexOf(ts.eliminatedAt);
        return ti > bi ? ts.eliminatedAt : best;
      }, 'GROUP_STAGE');
      const h = nameHash(f.name);
      return {
        ...f,
        bestStage,
        epitaph: EPITAPHS[idx % EPITAPHS.length](f.name),
        facility: FACILITIES[h % FACILITIES.length],
        via: DEPORTED_VIA[h % DEPORTED_VIA.length],
        detainee: 1000 + (h % 9000),
        unpaid: UNPAID.includes(f.name),
      };
    });
  }, [assignments, drawType, fixtures]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Deportations</h2>
      </div>

      {fallen.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛂</div>
          <p>All visas still valid — no deportations yet.</p>
          <p className="gy-hint-sub">Once all of someone's teams are eliminated, they'll be removed from the country.</p>
        </div>
      ) : (
        <>
          <div className="gy-banner">
            <div className="gy-banner-cross">🇺🇸</div>
            <div className="gy-banner-text">
              <span className="gy-banner-count">{fallen.length}</span> deported
            </div>
            <div className="gy-banner-cross">🇺🇸</div>
          </div>

          <div className="gy-grid">
            {fallen.map((f) => (
              <div key={f.name} className="gy-tomb">
                <div className="gy-tomb-top">🛂</div>
                <div className="gy-tomb-stamp">DEPORTATION ORDER</div>
                <div className="gy-tomb-name">{f.name}</div>
                <div className="gy-tomb-detainee">DETAINEE #{f.detainee}</div>
                <div className="gy-tomb-facts">
                  <div><b>Facility:</b> {f.facility}</div>
                  <div><b>Removed via:</b> {f.via}</div>
                  <div><b>Visa revoked:</b> {STAGE_LABELS[f.bestStage] || f.bestStage}</div>
                  {f.unpaid && <div className="gy-unpaid"><b>Legal representation:</b> denied — entry fee unpaid</div>}
                </div>
                <div className="gy-tomb-epitaph">"{f.epitaph}"</div>
                <div className="gy-tomb-teams">
                  {f.teams.map(({ team, eliminatedAt }) => (
                    <button
                      key={team}
                      className="gy-team-badge"
                      onClick={() => onSelectTeam(team)}
                    >
                      {getFlag(team)} {team}
                      <span className="gy-team-stage">
                        DEPORTED: {STAGE_LABELS[eliminatedAt] || '???'}
                      </span>
                    </button>
                  ))}
                </div>
                <button className="gy-share-btn" onClick={() => shareDeportationCard(f)}>
                  📤 SHARE MUGSHOT
                </button>
                <div className="gy-tomb-base">VISA DENIED</div>
              </div>
            ))}
          </div>

          <p className="gy-footer">✈️ Flight home now boarding · no peanuts will be served</p>
        </>
      )}
    </div>
  );
}
