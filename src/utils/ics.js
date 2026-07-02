// Build and download an .ics calendar file for a set of fixtures
import { normaliseTeamName } from './scoring.js';
import { getFlag } from '../data/worldcup2026.js';

function icsDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function downloadFixturesIcs(fixtures, filename = 'world-cup-games.ics') {
  const now = icsDate(new Date());
  const events = fixtures.map((f) => {
    const home = normaliseTeamName(f.homeTeam.name);
    const away = normaliseTeamName(f.awayTeam.name);
    const start = icsDate(f.utcDate);
    const end = icsDate(new Date(new Date(f.utcDate).getTime() + 2 * 60 * 60 * 1000));
    const round = f.matchday || 'World Cup 2026';
    return [
      'BEGIN:VEVENT',
      `UID:wc2026-${f.id}@eagles-nest`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(`⚽ ${home} v ${away}`)}`,
      `DESCRIPTION:${escapeText(`${getFlag(home)} ${home} v ${getFlag(away)} ${away} · ${round} · The Eagle's Nest sweep`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eagles Nest//World Cup Sweep//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
