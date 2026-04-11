// Australia/Brisbane = AEST year-round (UTC+10, no daylight saving)
// World Cup June–July 2026 is Australian winter so always UTC+10

const TZ = 'Australia/Brisbane';

export function formatTimeAEST(utcDate) {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleTimeString('en-AU', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateAEST(utcDate) {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleDateString('en-AU', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTimeAEST(utcDate) {
  if (!utcDate) return '';
  return `${formatDateAEST(utcDate)}, ${formatTimeAEST(utcDate)} AEST`;
}
