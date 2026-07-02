// Official 2026 FIFA knockout bracket structure (match numbers + slot codes)
// Slot codes: '1A' = Group A winner, '2B' = Group B runner-up,
// '3A/B/C' = best third from those groups, 'W74' = winner of match 74.

export const R32 = [
  { num: 73,  s1: '2A',         s2: '2B',         date: '28 Jun' },
  { num: 74,  s1: '1E',         s2: '3A/B/C/D/F', date: '29 Jun' },
  { num: 75,  s1: '1F',         s2: '2C',         date: '29 Jun' },
  { num: 76,  s1: '1C',         s2: '2F',         date: '29 Jun' },
  { num: 77,  s1: '1I',         s2: '3C/D/F/G/H', date: '30 Jun' },
  { num: 78,  s1: '2E',         s2: '2I',         date: '30 Jun' },
  { num: 79,  s1: '1A',         s2: '3C/E/F/H/I', date: '30 Jun' },
  { num: 80,  s1: '1L',         s2: '3E/H/I/J/K', date: '1 Jul'  },
  { num: 81,  s1: '1D',         s2: '3B/E/F/I/J', date: '1 Jul'  },
  { num: 82,  s1: '1G',         s2: '3A/E/H/I/J', date: '1 Jul'  },
  { num: 83,  s1: '2K',         s2: '2L',         date: '2 Jul'  },
  { num: 84,  s1: '1H',         s2: '2J',         date: '2 Jul'  },
  { num: 85,  s1: '1B',         s2: '3E/F/G/I/J', date: '2 Jul'  },
  { num: 86,  s1: '1J',         s2: '2H',         date: '3 Jul'  },
  { num: 87,  s1: '1K',         s2: '3D/E/I/J/L', date: '3 Jul'  },
  { num: 88,  s1: '2D',         s2: '2G',         date: '3 Jul'  },
];

export const R16 = [
  { num: 89,  s1: 'W74', s2: 'W77', date: '4 Jul' },
  { num: 90,  s1: 'W73', s2: 'W75', date: '4 Jul' },
  { num: 91,  s1: 'W76', s2: 'W78', date: '5 Jul' },
  { num: 92,  s1: 'W79', s2: 'W80', date: '5 Jul' },
  { num: 93,  s1: 'W83', s2: 'W84', date: '6 Jul' },
  { num: 94,  s1: 'W81', s2: 'W82', date: '6 Jul' },
  { num: 95,  s1: 'W86', s2: 'W88', date: '7 Jul' },
  { num: 96,  s1: 'W85', s2: 'W87', date: '7 Jul' },
];

export const QF = [
  { num: 97,  s1: 'W89', s2: 'W90', date: '9 Jul'  },
  { num: 98,  s1: 'W93', s2: 'W94', date: '10 Jul' },
  { num: 99,  s1: 'W91', s2: 'W92', date: '11 Jul' },
  { num: 100, s1: 'W95', s2: 'W96', date: '11 Jul' },
];

export const SF = [
  { num: 101, s1: 'W97',  s2: 'W98',  date: '14 Jul' },
  { num: 102, s1: 'W99',  s2: 'W100', date: '15 Jul' },
];

export const FINAL_MATCH = [
  { num: 104, s1: 'W101', s2: 'W102', date: '19 Jul' },
];

export const DEF_BY_NUM = {};
for (const arr of [R32, R16, QF, SF, FINAL_MATCH]) {
  for (const d of arr) DEF_BY_NUM[d.num] = d;
}

// Points key (from SCORING) for winning each match
export function scoringKeyForMatch(num) {
  if (num >= 73 && num <= 88) return 'R32_WIN';
  if (num >= 89 && num <= 96) return 'R16_WIN';
  if (num >= 97 && num <= 100) return 'QF_WIN';
  if (num === 101 || num === 102) return 'SF_WIN';
  if (num === 104) return 'FINAL_WIN';
  return null;
}

// Matches grouped in pairs that feed the next round (bracket display order)
export const BRACKET_PAIRS = [
  { round: 'R32', label: 'Round of 32', feedLabel: 'R16', pairs: [
    { matches: [74, 77], feedsInto: 89 },
    { matches: [73, 75], feedsInto: 90 },
    { matches: [83, 84], feedsInto: 93 },
    { matches: [81, 82], feedsInto: 94 },
    { matches: [76, 78], feedsInto: 91 },
    { matches: [79, 80], feedsInto: 92 },
    { matches: [86, 88], feedsInto: 95 },
    { matches: [85, 87], feedsInto: 96 },
  ]},
  { round: 'R16', label: 'Round of 16', feedLabel: 'QF', pairs: [
    { matches: [89, 90], feedsInto: 97 },
    { matches: [93, 94], feedsInto: 98 },
    { matches: [91, 92], feedsInto: 99 },
    { matches: [95, 96], feedsInto: 100 },
  ]},
  { round: 'QF', label: 'Quarter-finals', feedLabel: 'SF', pairs: [
    { matches: [97, 98], feedsInto: 101 },
    { matches: [99, 100], feedsInto: 102 },
  ]},
  { round: 'SF', label: 'Semi-finals', feedLabel: 'Final', pairs: [
    { matches: [101, 102], feedsInto: 104 },
  ]},
];
