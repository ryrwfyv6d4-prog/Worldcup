// Club colours, used to generate regiment insignia.
//
// We draw our own badges rather than hotlinking real club crests: those are
// trademarked logos, every free host has hotlinking or licensing caveats, and a
// remote image is one more thing to fail offline. A colour-accurate shield with
// the club's three-letter code loads instantly, works in the installed app with
// no network, and looks like unit insignia — which suits the theme better than
// a corporate badge would.
//
// [primary, secondary] — secondary is the accent stripe / text colour.
export const COLOURS = {
  // Premier League
  'Arsenal FC': ['#EF0107', '#FFFFFF'],
  'Manchester City FC': ['#6CABDD', '#1C2C5B'],
  'Liverpool FC': ['#C8102E', '#F6EB61'],
  'Manchester United FC': ['#DA291C', '#FBE122'],
  'Chelsea FC': ['#034694', '#FFFFFF'],
  'Aston Villa FC': ['#670E36', '#95BFE5'],
  'Newcastle United FC': ['#241F20', '#FFFFFF'],
  'Tottenham Hotspur FC': ['#132257', '#FFFFFF'],
  'Brighton & Hove Albion FC': ['#0057B8', '#FFCD00'],
  'Crystal Palace FC': ['#1B458F', '#C4122E'],
  'Nottingham Forest FC': ['#DD0000', '#FFFFFF'],
  'Everton FC': ['#003399', '#FFFFFF'],
  'Fulham FC': ['#FFFFFF', '#000000'],
  'Brentford FC': ['#E30613', '#FFFFFF'],
  'AFC Bournemouth': ['#DA291C', '#000000'],
  'Leeds United FC': ['#FFFFFF', '#1D428A'],
  'Sunderland AFC': ['#EB172B', '#FFFFFF'],
  'Ipswich Town FC': ['#3A64A3', '#FFFFFF'],
  'Coventry City FC': ['#78D0F3', '#1D1D1B'],
  'Hull City AFC': ['#F5A12D', '#000000'],

  // Championship
  'West Ham United FC': ['#7A263A', '#1BB1E7'],
  'Wolverhampton Wanderers FC': ['#FDB913', '#231F20'],
  'Burnley FC': ['#6C1D45', '#99D6EA'],
  'Birmingham City FC': ['#0000FF', '#FFFFFF'],
  'Middlesbrough FC': ['#E21C38', '#FFFFFF'],
  'Sheffield United FC': ['#EE2737', '#FFFFFF'],
  'Wrexham AFC': ['#DA291C', '#FFFFFF'],
  'Southampton FC': ['#D71920', '#FFFFFF'],
  'Norwich City FC': ['#FFF200', '#00A650'],
  'West Bromwich Albion FC': ['#122F67', '#FFFFFF'],
  'Watford FC': ['#FBEE23', '#ED2127'],
  'Bristol City FC': ['#E21C38', '#FFFFFF'],
  'Stoke City FC': ['#E03A3E', '#FFFFFF'],
  'Swansea City AFC': ['#FFFFFF', '#121212'],
  'Queens Park Rangers FC': ['#1D5BA4', '#FFFFFF'],
  'Blackburn Rovers FC': ['#009EE0', '#FFFFFF'],
  'Preston North End FC': ['#FFFFFF', '#1B1F4B'],
  'Cardiff City FC': ['#0070B5', '#D11524'],
  'Derby County FC': ['#FFFFFF', '#000000'],
  'Portsmouth FC': ['#001489', '#FFFFFF'],
  'Millwall FC': ['#001D5E', '#FFFFFF'],
  'Charlton Athletic FC': ['#D4021D', '#FFFFFF'],
  'Bolton Wanderers FC': ['#FFFFFF', '#263C7E'],
  'Lincoln City FC': ['#DA291C', '#FFFFFF'],
};

export function coloursFor(name) {
  return COLOURS[name] || ['#75643F', '#F4EBD8'];
}

// Readable text colour on a given background
export function inkOn(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // relative luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1a1a1a' : '#FFFFFF';
}
