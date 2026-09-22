// A FotMob matchDetails payload with the shape the live feed returned for
// Bournemouth v Liverpool on 20 Sep 2026 (probed in CI), cut to the fields
// trimMatchDetails reads. Names and numbers are illustrative.
const layout433 = [
  [0.5, 0.1], [0.85, 0.3], [0.62, 0.27], [0.38, 0.27], [0.15, 0.3],
  [0.7, 0.52], [0.5, 0.485], [0.3, 0.52], [0.82, 0.8], [0.5, 0.86], [0.18, 0.8],
];
const layout4231 = [
  [0.5, 0.1], [0.85, 0.3], [0.62, 0.27], [0.38, 0.27], [0.15, 0.3],
  [0.62, 0.47], [0.38, 0.47], [0.8, 0.68], [0.5, 0.68], [0.2, 0.68], [0.5, 0.87],
];
const surnames = {
  h: ['Petrović', 'Smith', 'Zabarnyi', 'Senesi', 'Kerkez', 'Adams', 'Christie', 'Scott', 'Semenyo', 'Evanilson', 'Kluivert'],
  a: ['Alisson', 'Alexander-Arnold', 'Konaté', 'van Dijk', 'Robertson', 'Gravenberch', 'Mac Allister', 'Szoboszlai', 'Salah', 'Gakpo', 'Díaz'],
};
const ratings = { h: [6.5, 6.2, 6.8, 6.6, 5.9, 6.9, 6.4, 6.1, 7.2, 6.0, 6.3], a: [8.4, 7.1, 7.0, 7.6, 6.9, 7.3, 6.8, 6.6, 7.9, 6.4, 7.0] };

function starters(side, layout, base) {
  return layout.map(([x, y], i) => ({
    id: base + i,
    name: `${side === 'h' ? 'H' : 'A'}. ${surnames[side][i]}`,
    lastName: surnames[side][i],
    shirtNumber: String(i + 1),
    verticalLayout: { x, y },
    performance: {
      rating: ratings[side][i],
      ...(i === 5 ? { substitutionEvents: [{ time: 88, type: 'subOut' }] } : {}),
      ...(i === 9 ? { substitutionEvents: [{ time: 75, type: 'subOut' }] } : {}),
    },
  }));
}
const subs = (side, base) => [
  { id: base, name: `${side} Sub One`, lastName: 'Cook', shirtNumber: '4', performance: { rating: 6.2, substitutionEvents: [{ time: 75, type: 'subIn' }] } },
  { id: base + 1, name: `${side} Sub Two`, lastName: 'Unal', shirtNumber: '26', performance: { rating: 6.0, substitutionEvents: [{ time: 88, type: 'subIn' }] } },
  { id: base + 2, name: `${side} Sub Three`, lastName: 'Neto', shirtNumber: '13', performance: {} },
];

const row = (title, key, h, a) => ({ title, key, stats: [h, a] });
const period = (scale) => ({
  stats: [
    { title: 'Top stats', key: 'top_stats', stats: [
      row('Ball possession', 'BallPossesion', 46, 54),
      row('Expected goals (xG)', 'expected_goals', (0.79 * scale).toFixed(2), (1.65 * scale).toFixed(2)),
      row('Total shots', 'total_shots', Math.round(9 * scale), Math.round(12 * scale)),
      row('Big chances', 'big_chance', 1, 1),
      row('Accurate passes', 'accurate_passes', '298 (78%)', '386 (82%)'),
      row('Yellow cards', 'yellow_cards', 1, 2),
    ] },
    { title: 'Shots', key: 'shots', stats: [
      row('Shots', 'shots', null, null),
      row('Total shots', 'total_shots', 9, 12),
      row('Shots on target', 'ShotsOnTarget', 2, 3),
      row('Blocked shots', 'blocked_shots', 2, 6),
    ] },
    { title: 'Discipline', key: 'discipline', stats: [
      row('Discipline', 'discipline', null, null),
      row('Fouls committed', 'fouls', 11, 13),
    ] },
  ],
});

const playerStats = {};
for (const [side, base] of [['h', 100], ['a', 200]]) {
  surnames[side].forEach((_, i) => {
    playerStats[base + i] = {
      id: base + i, name: surnames[side][i], isGoalkeeper: i === 0,
      stats: [
        { title: 'Top stats', key: 'top_stats', stats: {
          'FotMob rating': { key: 'rating_title', stat: { value: ratings[side][i], type: 'double' } },
          'Minutes played': { key: 'minutes_played', stat: { value: 90, type: 'integer' } },
          Goals: { key: 'goals', stat: { value: side === 'a' && i === 8 ? 1 : 0, type: 'integer' } },
          Assists: { key: 'assists', stat: { value: side === 'a' && i === 9 ? 1 : 0, type: 'integer' } },
          'Expected assists (xA)': { key: 'expected_assists', stat: { value: 0.13, type: 'double' } },
          'Accurate passes': { key: 'accurate_passes', stat: { value: 37, total: 47, type: 'fractionWithPercentage' } },
          'Distance covered': { key: 'physical_metrics_distance_covered', stat: { value: 10623, type: 'distance' } },
          'Top speed': { key: 'physical_metrics_topspeed', stat: { value: 31.3, type: 'speed' } },
          Shotmap: { key: null, stat: { value: 0, type: 'boolean' } },
        } },
        { title: 'Defense', key: 'defense', stats: {
          Tackles: { key: 'matchstats.headers.tackles', stat: { value: 2, type: 'integer' } },
          Recoveries: { key: 'recoveries', stat: { value: 5, type: 'integer' } },
        } },
      ],
    };
  });
}

export const SAMPLE = {
  header: {
    teams: [{ name: 'AFC Bournemouth', id: 8678, score: 0 }, { name: 'Liverpool', id: 8650, score: 1 }],
    status: { started: true, finished: true },
  },
  content: {
    lineup: {
      lineupType: 'standard',
      homeTeam: { id: 8678, name: 'AFC Bournemouth', formation: '4-3-3', rating: 6.4, coach: { name: 'Marco Rose' },
        starters: starters('h', layout433, 100), subs: subs('Bou', 150) },
      awayTeam: { id: 8650, name: 'Liverpool', formation: '4-2-3-1', rating: 7.2, coach: { name: 'Arne Slot' },
        starters: starters('a', layout4231, 200), subs: subs('Liv', 250) },
    },
    stats: { Periods: { All: period(1), FirstHalf: period(0.45), SecondHalf: period(0.55) } },
    playerStats,
    shotmap: { shots: [
      { teamId: 8650, playerId: 208, lastName: 'Salah', x: 94.2, y: 30.1, min: 57, expectedGoals: 0.41, eventType: 'Goal', isOnTarget: true, isBlocked: false },
      { teamId: 8650, playerId: 207, lastName: 'Szoboszlai', x: 81.0, y: 35.7, min: 10, expectedGoals: 0.09, eventType: 'Miss', isOnTarget: false, isBlocked: false },
      { teamId: 8678, playerId: 108, lastName: 'Semenyo', x: 90.5, y: 40.2, min: 33, expectedGoals: 0.22, eventType: 'AttemptSaved', isOnTarget: true, isBlocked: false },
      { teamId: 8678, playerId: 109, lastName: 'Evanilson', x: 99.1, y: 34.0, min: 61, expectedGoals: 0.52, eventType: 'Miss', isOnTarget: false, isBlocked: false },
      { teamId: 8678, playerId: 110, lastName: 'Kluivert', x: 78.0, y: 20.0, min: 70, expectedGoals: 0.04, eventType: 'AttemptSaved', isOnTarget: false, isBlocked: true },
    ] },
    momentum: { main: { data: Array.from({ length: 94 }, (_, m) => ({ minute: m, value: Math.round(Math.sin(m / 7) * 40 + (m > 50 ? -15 : 10)) })) } },
    matchFacts: {
      playerOfTheMatch: { id: 200, name: { fullName: 'Alisson Becker' }, rating: { num: '8.4' }, isHomeTeam: false },
      events: { events: [
        { type: 'Card', playerId: 207, card: 'Yellow' },
        { type: 'Goal', playerId: 208 },
        { type: 'Card', playerId: 104, card: 'Yellow' },
      ] },
    },
  },
};
