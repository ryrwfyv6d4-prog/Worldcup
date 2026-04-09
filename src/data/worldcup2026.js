// FIFA World Cup 2026 – 48 teams across 12 groups
// Groups based on the December 2024 draw (fallback if API unavailable)
export const GROUPS = {
  A: ['USA', 'Panama', 'Uruguay', 'Algeria'],
  B: ['Mexico', 'Jamaica', 'Ecuador', 'Belgium'],
  C: ['Canada', 'Honduras', 'Morocco', 'Croatia'],
  D: ['Brazil', 'Japan', 'Costa Rica', 'Hungary'],
  E: ['Spain', 'Switzerland', 'Egypt', 'Serbia'],
  F: ['Germany', 'Cameroon', 'Australia', 'Turkey'],
  G: ['France', 'Argentina', 'South Africa', 'Denmark'],
  H: ['Portugal', 'Colombia', 'South Korea', 'Romania'],
  I: ['Netherlands', 'Senegal', 'Iran', 'Venezuela'],
  J: ['England', 'Nigeria', 'Saudi Arabia', 'DR Congo'],
  K: ['Poland', 'Tunisia', 'Ivory Coast', 'Uzbekistan'],
  L: ['Austria', 'Jordan', 'Paraguay', 'New Zealand'],
};

export const ALL_TEAMS = Object.values(GROUPS).flat();

export const GROUP_NAMES = Object.keys(GROUPS).map((k) => `Group ${k}`);

// Flag emoji map (unicode regional indicators)
const flagMap = {
  USA: '🇺🇸', Panama: '🇵🇦', Uruguay: '🇺🇾', Algeria: '🇩🇿',
  Mexico: '🇲🇽', Jamaica: '🇯🇲', Ecuador: '🇪🇨', Belgium: '🇧🇪',
  Canada: '🇨🇦', Honduras: '🇭🇳', Morocco: '🇲🇦', Croatia: '🇭🇷',
  Brazil: '🇧🇷', Japan: '🇯🇵', 'Costa Rica': '🇨🇷', Hungary: '🇭🇺',
  Spain: '🇪🇸', Switzerland: '🇨🇭', Egypt: '🇪🇬', Serbia: '🇷🇸',
  Germany: '🇩🇪', Cameroon: '🇨🇲', Australia: '🇦🇺', Turkey: '🇹🇷',
  France: '🇫🇷', Argentina: '🇦🇷', 'South Africa': '🇿🇦', Denmark: '🇩🇰',
  Portugal: '🇵🇹', Colombia: '🇨🇴', 'South Korea': '🇰🇷', Romania: '🇷🇴',
  Netherlands: '🇳🇱', Senegal: '🇸🇳', Iran: '🇮🇷', Venezuela: '🇻🇪',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Nigeria: '🇳🇬', 'Saudi Arabia': '🇸🇦', 'DR Congo': '🇨🇩',
  Poland: '🇵🇱', Tunisia: '🇹🇳', 'Ivory Coast': '🇨🇮', Uzbekistan: '🇺🇿',
  Austria: '🇦🇹', Jordan: '🇯🇴', Paraguay: '🇵🇾', 'New Zealand': '🇳🇿',
};

export function getFlag(teamName) {
  return flagMap[teamName] || '🏳️';
}

export function getGroupForTeam(teamName) {
  for (const [group, teams] of Object.entries(GROUPS)) {
    if (teams.includes(teamName)) return group;
  }
  return null;
}

// Scoring system (points per event)
export const SCORING = {
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  R32_WIN: 5,       // Round of 32
  R16_WIN: 8,       // Round of 16
  QF_WIN: 12,       // Quarterfinal
  SF_WIN: 16,       // Semifinal
  FINAL_WIN: 25,    // Champion
  RUNNER_UP: 10,    // Runner-up bonus
};

export const SCORING_LABELS = {
  GROUP_WIN: 'Group stage win',
  GROUP_DRAW: 'Group stage draw',
  R32_WIN: 'Round of 32 win',
  R16_WIN: 'Round of 16 win',
  QF_WIN: 'Quarterfinal win',
  SF_WIN: 'Semifinal win',
  FINAL_WIN: 'Champion',
  RUNNER_UP: 'Runner-up',
};

export const STAGE_MAP = {
  GROUP_STAGE: 'GROUP_WIN',
  LAST_32: 'R32_WIN',
  LAST_16: 'R16_WIN',
  QUARTER_FINALS: 'QF_WIN',
  SEMI_FINALS: 'SF_WIN',
  FINAL: 'FINAL_WIN',
};
