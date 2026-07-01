// Three-letter codes for compact bracket slots
const TLA = {
  Argentina: 'ARG', France: 'FRA', Brazil: 'BRA', England: 'ENG',
  Spain: 'ESP', Germany: 'GER', Portugal: 'POR', Netherlands: 'NED',
  Belgium: 'BEL', USA: 'USA', Canada: 'CAN', Mexico: 'MEX',
  Morocco: 'MAR', Japan: 'JPN', 'South Korea': 'KOR', Uruguay: 'URU',
  Colombia: 'COL', Senegal: 'SEN', Croatia: 'CRO', Australia: 'AUS',
  Switzerland: 'SUI', Norway: 'NOR', Turkey: 'TUR', Egypt: 'EGY',
  Ecuador: 'ECU', 'Ivory Coast': 'CIV', Scotland: 'SCO', 'South Africa': 'RSA',
  Paraguay: 'PAR', Sweden: 'SWE', Algeria: 'ALG', Austria: 'AUT',
  Iran: 'IRN', 'Bosnia & Herzegovina': 'BIH', Qatar: 'QAT', 'Saudi Arabia': 'KSA',
  Uzbekistan: 'UZB', 'DR Congo': 'COD', Iraq: 'IRQ', Panama: 'PAN',
  'Cape Verde': 'CPV', Haiti: 'HAI', 'Curaçao': 'CUW', 'New Zealand': 'NZL',
  'Czech Republic': 'CZE', Ghana: 'GHA', Jordan: 'JOR', Tunisia: 'TUN',
};

export const tla = (name) => TLA[name] || (name || '').slice(0, 3).toUpperCase();
