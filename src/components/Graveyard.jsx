import { useMemo, useState } from 'react';
import { getFlag } from '../data/worldcup2026.js';
import {
  computeFallen, buildGroupStandings, getEliminatedThirds, isTeamEliminated,
} from '../utils/elimination.js';
import { normaliseTeamName, getTeamsForParticipant } from '../utils/scoring.js';
import { formatDateAEST, formatTimeAEST } from '../utils/time.js';
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

const nameHash = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Booking-sheet gag lines — deterministic per person via name hash
const APPEAL_STATUS = [
  'DENIED — REVIEWED BY THE DARTS TEAM',
  'SHREDDED, THEN LAMINATED, THEN SHREDDED AGAIN',
  'USED AS A COASTER',
  'LOST IN THE MAIL (ON PURPOSE)',
  'LAUGHED OUT OF THE TRIBUNAL',
  'PENDING SINCE FOREVER. STOP CALLING.',
  'DENIED — JUDGE HAD MONEY ON IT',
  'APPROVED* (*NOT APPROVED)',
];

const LAST_WORDS = [
  '"we go again"',
  '"the ref was bent"',
  '"I demand a recount"',
  '"tell my teams I loved them" (they know he didn\'t)',
  '"it\'s a marathon, not a sprint" (it was a sprint)',
  '"I don\'t even follow soccer"',
  '"this pot is rigged"',
  '"wait — I can explain the group stage"',
];

const EFFECTS_SEIZED = [
  'ONE ESKY, THREE WARM BEERS',
  'A LAMINATED BRACKET, ANNOTATED IN CRAYON',
  'ONE (1) LUCKY JERSEY, UNWASHED, BIOHAZARD',
  'A NOVELTY OVERSIZED FLAG, CONFISCATED AT THE GATE',
  'A SIGNED PHOTO OF A THIRD-PLACED TEAM',
  'FOUR REFEREE COMPLAINT FORMS, UNSENT',
  'ONE VUVUZELA (DESTROYED FOR PUBLIC SAFETY)',
  'A BETTING SLIP, TORN, KISSED, TAPED BACK TOGETHER',
];

// ── Booking-photo share card ─────────────────────────────────────────────────

// Shrink font size until text fits the width
function fitText(ctx, text, maxWidth, basePx, fontTemplate) {
  let px = basePx;
  do {
    ctx.font = fontTemplate.replace('{px}', px);
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 3;
  } while (px > 16);
  return px;
}

async function shareDeportationCard(f) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  try { await document.fonts.load('60px Ultra'); await document.fonts.load('30px Graduate'); } catch { /* fonts best-effort */ }

  const h = nameHash(f.name);
  const appeal = f.unpaid
    ? 'NO LAWYER — ENTRY FEE UNPAID'
    : APPEAL_STATUS[h % APPEAL_STATUS.length];
  const lastWords = LAST_WORDS[(h >>> 2) % LAST_WORDS.length];
  const effects = f.unpaid
    ? '$50 CASH — APPLIED TO OUTSTANDING ENTRY FEE'
    : EFFECTS_SEIZED[(h >>> 1) % EFFECTS_SEIZED.length];

  // Mugshot backdrop — grubby grey with height-chart lines
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#4A463F'); bg.addColorStop(1, '#35322C');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(242,230,206,0.16)'; ctx.lineWidth = 3;
  ctx.font = '22px Graduate, serif'; ctx.textAlign = 'left';
  for (let y = 150; y < H - 200; y += 110) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = 'rgba(242,230,206,0.28)';
    ctx.fillText(`${Math.round(210 - (y - 150) / 110 * 10)}cm`, 18, y - 10);
  }

  // Header
  ctx.textAlign = 'center';
  ctx.font = '32px Graduate, serif'; ctx.fillStyle = '#E8B84B';
  ctx.fillText("DAN'S SHED DETENTION FACILITY", W / 2, 74);
  ctx.font = '20px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.6)';
  ctx.fillText('DEPARTMENT OF SWEEP SECURITY · CASE CLOSED', W / 2, 108);

  // Silhouette mugshot — subject declined to be photographed
  ctx.fillStyle = 'rgba(18,15,11,0.72)';
  ctx.beginPath(); ctx.arc(W / 2, 218, 62, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 118, 356);
  ctx.quadraticCurveTo(W / 2 - 112, 272, W / 2 - 48, 268);
  ctx.lineTo(W / 2 + 48, 268);
  ctx.quadraticCurveTo(W / 2 + 112, 272, W / 2 + 118, 356);
  ctx.closePath(); ctx.fill();
  ctx.font = 'italic 21px "Barlow Condensed", sans-serif';
  ctx.fillStyle = 'rgba(242,230,206,0.55)';
  ctx.fillText('subject declined to be photographed. typical.', W / 2, 340);

  // ── Booking board: height computed from content so nothing ever clips ──
  const bx = 80, bw = W - 160;
  const maxTextW = bw - 70;
  const chargeLines = f.teams.slice(0, 5).map(({ team, eliminatedAt }) =>
    `HARBOURING ${team.toUpperCase()} (REMOVED: ${(STAGE_LABELS[eliminatedAt] || '???').toUpperCase()})`
  );
  if (f.teams.length > 5) {
    chargeLines.push(`...PLUS ${f.teams.length - 5} FURTHER COUNTS, EACH WORSE THAN THE LAST`);
  }
  const factRows = [
    ['FACILITY', f.facility.toUpperCase()],
    ['REMOVED VIA', f.via.toUpperCase()],
    ['APPEAL STATUS', appeal],
    ['EFFECTS SEIZED', effects],
    ['LAST WORDS', lastWords.toUpperCase()],
  ];
  const NAME_H = 96, DETAINEE_H = 46, FACT_H = 42, CH_HEADER_H = 52, CH_H = 38;
  const PAD_TOP = 46, PAD_BOTTOM = 30;
  const bh = PAD_TOP + NAME_H + DETAINEE_H + factRows.length * FACT_H
    + CH_HEADER_H + chargeLines.length * CH_H + PAD_BOTTOM;
  const by = 376;

  ctx.fillStyle = '#1E1B16'; ctx.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
  ctx.fillStyle = '#F2E6CE'; ctx.fillRect(bx, by, bw, bh);

  let y = by + PAD_TOP;

  // Name — shrink to fit long names
  ctx.fillStyle = '#26201A';
  fitText(ctx, f.name.toUpperCase(), maxTextW, 82, '{px}px Ultra, serif');
  ctx.fillText(f.name.toUpperCase(), W / 2, y + 58);
  y += NAME_H;

  ctx.font = '27px Graduate, serif'; ctx.fillStyle = '#B22234';
  ctx.fillText(
    `DETAINEE #${String(1000 + (h % 9000))} · ${(STAGE_LABELS[f.bestStage] || f.bestStage).toUpperCase()}`,
    W / 2, y + 20
  );
  y += DETAINEE_H;

  // Booking facts — label + value on one line, shrunk to fit
  for (const [label, value] of factRows) {
    const line = `${label}: ${value}`;
    ctx.fillStyle = '#3a3428';
    fitText(ctx, line, maxTextW, 27, '{px}px Graduate, serif');
    ctx.fillText(line, W / 2, y + 28);
    y += FACT_H;
  }

  // Charges
  ctx.font = '25px Graduate, serif'; ctx.fillStyle = '#B22234';
  ctx.fillText('— CHARGES —', W / 2, y + 36);
  y += CH_HEADER_H;
  for (const c of chargeLines) {
    ctx.fillStyle = '#26201A';
    fitText(ctx, c, maxTextW, 29, '700 {px}px "Barlow Condensed", sans-serif');
    ctx.fillText(c, W / 2, y + 26);
    y += CH_H;
  }

  // Epitaph below the board
  const boardBottom = by + bh;
  ctx.font = 'italic 33px "Barlow Condensed", sans-serif';
  ctx.fillStyle = 'rgba(242,230,206,0.9)';
  const words = f.epitaph.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    if (ctx.measureText(line + ' ' + w).width > W - 200) { lines.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  lines.push(line);
  const maxEpLines = boardBottom > 1040 ? 2 : 3;
  const shown = lines.slice(0, maxEpLines);
  const epY = boardBottom + 52;
  shown.forEach((l, i) =>
    ctx.fillText(`${i === 0 ? '“' : ''}${l}${i === shown.length - 1 ? '”' : ''}`, W / 2, epY + i * 44)
  );

  // Big DEPORTED stamp — placed under the epitaph, above the footer
  const stampY = Math.min(H - 130, epY + shown.length * 44 + 78);
  ctx.save();
  ctx.translate(W / 2, stampY);
  ctx.rotate(-0.08);
  ctx.font = '104px Graduate, serif';
  ctx.fillStyle = 'rgba(178,34,52,0.92)';
  ctx.strokeStyle = 'rgba(178,34,52,0.92)'; ctx.lineWidth = 8;
  ctx.strokeRect(-405, -88, 810, 132);
  ctx.fillText('DEPORTED', 0, 20);
  ctx.restore();

  ctx.font = '18px Graduate, serif'; ctx.fillStyle = 'rgba(242,230,206,0.5)';
  ctx.fillText("★  T H E   E A G L E ' S   N E S T   ·   W C   ' 2 6  ★", W / 2, H - 32);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], `deported-${f.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  URL.revokeObjectURL(a.href);
}

const INVESTIGATION_LINES = [
  name => `${name}'s cell has been measured. The tape measure was not optimistic.`,
  name => `${name} keeps saying "there's still a chance." The case officer has stopped making eye contact.`,
  name => `The facility has already re-let ${name}'s bunk. Twice. At a profit.`,
  name => `${name}'s name is on the manifest in pencil. The pen is on the desk. The desk is by the door.`,
  name => `A sniffer dog walked past ${name}'s campaign and sat down immediately.`,
  name => `${name} has started saying "we" about eleven men who cannot hear them and will not save them.`,
  name => `The tribunal watched ${name}'s remaining team play and waived the filing fee out of pity.`,
  name => `${name}'s travel documents are ready. The photo chosen is unflattering. That was a decision.`,
  name => `The neighbours were asked what they knew about ${name}'s bracket. They knew everything. They said nothing.`,
  name => `${name} declined voluntary departure. The department admires the confidence. Not the judgment.`,
  name => `The van outside ${name}'s house has stopped pretending to be a plumber's.`,
  name => `${name}'s last team is under observation by three agents and a bookmaker. All four expect the same result.`,
  name => `Housekeeping has been told not to bother refreshing ${name}'s room.`,
  name => `${name}'s seat on the flight home is being held. Middle row. Rear. Between two stag parties.`,
];

// Participants not yet deported, ordered by how soon the van arrives:
// earliest upcoming hearing first, alive-team count as tiebreak.
function computeInvestigations(assignments, drawType, fixtures, fallenNames) {
  const groupStandings = buildGroupStandings(fixtures);
  const eliminatedThirds = getEliminatedThirds(groupStandings);
  const out = [];
  for (const name of Object.keys(assignments)) {
    if (fallenNames.has(name)) continue;
    const teams = getTeamsForParticipant(name, assignments, drawType);
    if (!teams.length) continue;
    const alive = teams.filter(
      (t) => isTeamEliminated(t, fixtures, groupStandings, eliminatedThirds) === null
    );
    if (alive.length === 0 || alive.length > 2) continue;
    const withFixtures = alive.map((team) => {
      const next = fixtures
        .filter((f) => f.status !== 'FINISHED' && f.utcDate)
        .filter((f) => {
          const h = normaliseTeamName(f.homeTeam.name);
          const a = normaliseTeamName(f.awayTeam.name);
          return h === team || a === team;
        })
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0] || null;
      const opponent = next
        ? (normaliseTeamName(next.homeTeam.name) === team
          ? normaliseTeamName(next.awayTeam.name)
          : normaliseTeamName(next.homeTeam.name))
        : null;
      return { team, opponent, utcDate: next?.utcDate || null };
    });
    const nextHearing = Math.min(
      ...withFixtures.map((t) => (t.utcDate ? new Date(t.utcDate).getTime() : Infinity))
    );
    out.push({ name, alive: withFixtures, count: alive.length, nextHearing });
  }
  return out.sort(
    (a, b) => a.nextHearing - b.nextHearing || a.count - b.count || a.name.localeCompare(b.name)
  );
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

  const investigations = useMemo(
    () => computeInvestigations(assignments, drawType, fixtures, new Set(fallen.map((f) => f.name))),
    [assignments, drawType, fixtures, fallen]
  );

  const [view, setView] = useState('deported');
  const [openCase, setOpenCase] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Deportations</h2>
      </div>

      <div className="stage-filters">
        <button
          className={`filter-btn ${view === 'deported' ? 'active' : ''}`}
          onClick={() => setView('deported')}
        >
          Deported{fallen.length > 0 ? ` (${fallen.length})` : ''}
        </button>
        <button
          className={`filter-btn ${view === 'investigations' ? 'active' : ''}`}
          onClick={() => setView('investigations')}
        >
          Investigations{investigations.length > 0 ? ` (${investigations.length})` : ''}
        </button>
      </div>

      {view === 'investigations' && (
        investigations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🕵️</div>
            <p>No active investigations.</p>
            <p className="gy-hint-sub">Everyone left is either safe for now, or already on the plane.</p>
          </div>
        ) : (
          <div className="gy-dr">
            <div className="gy-dr-header">🕵️ ACTIVE CASES — REMOVAL PROCEEDINGS</div>
            {investigations.map((d) => (
              <div key={d.name} className={`gy-dr-card${d.count === 1 ? ' critical' : ''}`}>
                <div className="gy-dr-top">
                  <span className="gy-dr-name">{d.name}</span>
                  <span className="gy-dr-count">
                    {d.count === 1 ? 'REMOVAL IMMINENT' : 'UNDER SURVEILLANCE'}
                  </span>
                </div>
                {d.alive.map(({ team, opponent, utcDate }) => (
                  <button key={team} className="gy-dr-fixture" onClick={() => onSelectTeam(team)}>
                    <span className="gy-dr-team">{getFlag(team)} {team}</span>
                    <span className="gy-dr-hearing">
                      {opponent
                        ? <>removal hearing: vs {getFlag(opponent)} {opponent} · {formatDateAEST(utcDate)}, {formatTimeAEST(utcDate)}</>
                        : 'removal hearing: next round, opponent pending'}
                    </span>
                  </button>
                ))}
                <div className="gy-dr-line">
                  CASE #{1000 + (nameHash(d.name) % 9000)}: {INVESTIGATION_LINES[nameHash(d.name) % INVESTIGATION_LINES.length](d.name)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'deported' && (
        fallen.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛂</div>
            <p>All visas still valid — no deportations yet.</p>
            <p className="gy-hint-sub">Once all of someone's teams are eliminated, they'll be removed from the country.</p>
          </div>
        ) : (
          <>
            <div className="gy-grid">
              {fallen.map((f) => {
                const isOpen = openCase === f.name;
                return (
                  <div key={f.name} className={`gy-tomb${isOpen ? '' : ' compact'}`}>
                    <button className="gy-tomb-head" onClick={() => setOpenCase(isOpen ? null : f.name)}>
                      <span className="gy-tomb-head-icon">🛂</span>
                      <span className="gy-tomb-head-main">
                        <span className="gy-tomb-name">{f.name}</span>
                        <span className="gy-tomb-head-sub">
                          #{f.detainee} · {f.teams.map(({ team }) => getFlag(team)).join(' ')}
                        </span>
                      </span>
                      <span className={`gy-tomb-chev${isOpen ? ' open' : ''}`}>▸</span>
                    </button>
                    {isOpen && (
                      <div className="gy-tomb-body">
                        <div className="gy-tomb-stamp">DEPORTATION ORDER</div>
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
                    )}
                  </div>
                );
              })}
            </div>
            <p className="gy-footer">✈️ Flight home now boarding · no peanuts will be served</p>
          </>
        )
      )}
    </div>
  );
}
