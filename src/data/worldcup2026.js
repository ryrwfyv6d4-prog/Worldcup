// FIFA World Cup 2026 – actual group draw (source: openfootball/worldcup.json)
export const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia & Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['USA', 'Australia', 'Paraguay', 'Turkey'],
  E: ['Germany', 'Ecuador', 'Ivory Coast', 'Curaçao'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'DR Congo', 'Uzbekistan'],
  L: ['England', 'Croatia', 'Panama', 'Ghana'],
};

export const ALL_TEAMS = Object.values(GROUPS).flat();

export const GROUP_NAMES = Object.keys(GROUPS).map((k) => `Group ${k}`);

const flagMap = {
  // Group A
  Mexico: '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  // Group B
  Canada: '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', Qatar: '🇶🇦', Switzerland: '🇨🇭',
  // Group C
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Haiti: '🇭🇹',
  // Group D
  USA: '🇺🇸', Australia: '🇦🇺', Paraguay: '🇵🇾', Turkey: '🇹🇷',
  // Group E
  Germany: '🇩🇪', Ecuador: '🇪🇨', 'Ivory Coast': '🇨🇮', 'Curaçao': '🇨🇼',
  // Group F
  Netherlands: '🇳🇱', Japan: '🇯🇵', Sweden: '🇸🇪', Tunisia: '🇹🇳',
  // Group G
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  // Group H
  Spain: '🇪🇸', Uruguay: '🇺🇾', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  // Group I
  France: '🇫🇷', Senegal: '🇸🇳', Norway: '🇳🇴', Iraq: '🇮🇶',
  // Group J
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  // Group K
  Portugal: '🇵🇹', Colombia: '🇨🇴', 'DR Congo': '🇨🇩', Uzbekistan: '🇺🇿',
  // Group L
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Panama: '🇵🇦', Ghana: '🇬🇭',
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

// Scoring system
export const SCORING = {
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  R32_WIN: 5,
  R16_WIN: 8,
  QF_WIN: 12,
  SF_WIN: 16,
  FINAL_WIN: 25,
  RUNNER_UP: 10,
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
