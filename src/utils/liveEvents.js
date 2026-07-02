// Detect score/status changes between two fixture snapshots.
// Returns events: { type: 'goal'|'ft', fixture, team?, score }
import { normaliseTeamName } from './scoring.js';

export function snapshotScores(fixtures) {
  const map = {};
  for (const f of fixtures) {
    map[f.id] = {
      h: f.score?.home ?? null,
      a: f.score?.away ?? null,
      status: f.status,
    };
  }
  return map;
}

export function detectScoreEvents(prevMap, fixtures) {
  if (!prevMap) return [];
  const events = [];
  for (const f of fixtures) {
    const prev = prevMap[f.id];
    if (!prev) continue;
    const h = f.score?.home ?? null;
    const a = f.score?.away ?? null;
    const live = f.status === 'IN_PLAY' || f.status === 'PAUSED';
    const home = normaliseTeamName(f.homeTeam.name);
    const away = normaliseTeamName(f.awayTeam.name);
    const score = `${home} ${h ?? 0}–${a ?? 0} ${away}`;

    // Goals: score went up while live (or just went live with a score)
    if (live && prev.h != null && h != null && h > prev.h) {
      events.push({ type: 'goal', fixture: f, team: home, score });
    }
    if (live && prev.a != null && a != null && a > prev.a) {
      events.push({ type: 'goal', fixture: f, team: away, score });
    }

    // Full time: was live, now finished
    if (f.status === 'FINISHED' && (prev.status === 'IN_PLAY' || prev.status === 'PAUSED')) {
      events.push({ type: 'ft', fixture: f, score });
    }
  }
  return events;
}
