// THE EAGLE'S NEST — England Campaign 2026/27
// Premier League + Championship sweep config.
//
// POTS are PROVISIONAL — ordered from bookies' pre-season odds (July 2026:
// Arsenal favourites to retain the PL title; West Ham / Wolves / Burnley
// favourites to come straight back up). The group ratifies the final order
// before Conscription Day. Edit here; nothing else needs to change.

export const SEASON = '2026/27';

// The shed, minus Connor (no pay, no call-up). Add the rest before the draw.
export const DEFAULT_PLAYERS = ['Macri', 'TJ', 'Jake', 'Phil', 'Mcivor', 'Easton', 'Hendrik'];
export const SQUAD_SIZE = 10; // players expected at the draw

export const ENTRY_FEE = 50;
export const PAYOUTS = [
  { key: 'first', label: 'Victoria Cross', pct: 0.7 },
  { key: 'second', label: 'Mentioned in Dispatches', pct: 0.2 },
  { key: 'last', label: 'Latrine Duty', pct: 0.1 },
];

// Ladder ranks, 1st → 10th
export const RANKS = [
  'Field Marshal', 'General', 'Brigadier', 'Colonel', 'Major',
  'Captain', 'Lieutenant', 'Sergeant', 'Corporal', 'Private',
];

// Pots exist for the DRAW only (one club from each). They no longer set point
// values — every win is priced individually from the odds.

export const POT_LABELS = {
  A: 'Armoured Divisions',
  B: 'Infantry',
  C: 'The Reserves',
  D: 'The Territorials',
};

// ── Medals (season honours, stacked on weekly points) ────────────────────────
// Honours are deliberately half what a flat-pot system would use: at full
// weight the owner of the eventual champion won the sweep ~half the time, which
// made the draw the whole contest.
export const MEDALS = {
  VC: { label: 'Victoria Cross', detail: 'Your team wins the Premier League', pts: 15 },
  DSO: { label: 'Distinguished Service Order', detail: 'Premier League top-four finish', pts: 8 },
  SURVIVAL: { label: 'Survival Medal', detail: 'A bottom-half PL team avoids relegation', pts: 5 },
  PROMOTION: { label: 'Battlefield Promotion', detail: 'Championship team promoted', pts: 10 },
  BIG_PUSH: { label: 'The Big Push', detail: 'Wins the play-off final at Wembley', pts: 5 },
  CHAMP_TITLE: { label: 'Second Front Standard', detail: 'Wins the Championship outright', pts: 3 },
  CUP: { label: 'Cup Honours', detail: 'FA Cup or League Cup winner (marked manually)', pts: 5 },
};

// ── Scoring constants ───────────────────────────────────────────────────────
// Wins are priced per match from the two clubs' pre-season odds ranks and the
// venue (see utils/odds.js): value = K / P(win), so the less likely the win,
// the more it pays. Draws are flat.
export const SCORING = {
  K: 2,                     // win-price numerator
  DRAW: 2,                  // any draw
  OVERACHIEVE: 2,           // points per league place finished above your rank
  OVERACHIEVE_MIN_GAMES: 6, // table must mean something before this counts
};

// ── The regiments ────────────────────────────────────────────────────────────
// name = exact openfootball name (must match the feed). pot: A/B provisional
// bookies order for the PL, C/D for the Championship.
export const TEAMS = [
  // ── Premier League — Pot A: Armoured Divisions ──
  { name: 'Arsenal FC', short: 'Arsenal', tla: 'ARS', div: 1, pot: 'A',
    codename: 'The Munitions',
    roots: 'Founded 1886 by munitions workers at the Royal Arsenal, Woolwich. The cannon on the badge is not a metaphor — they made them.' },
  { name: 'Manchester City FC', short: 'Man City', tla: 'MCI', div: 1, pot: 'A',
    codename: 'The Landlords',
    roots: 'When the Luftwaffe bombed Old Trafford in 1941, City took their neighbours in at Maine Road. Nobody on the blue side has stopped mentioning it since.' },
  { name: 'Liverpool FC', short: 'Liverpool', tla: 'LIV', div: 1, pot: 'A',
    codename: 'The Convoys',
    roots: 'The Battle of the Atlantic was run from a bunker under Liverpool — Western Approaches Command. The city kept the convoys, and the country, fed.' },
  { name: 'Manchester United FC', short: 'Man Utd', tla: 'MUN', div: 1, pot: 'A',
    codename: 'The Railwaymen',
    roots: 'Born as Newton Heath, a works team of railway carriage men. Old Trafford was blitzed flat in 1941 and they spent eight years lodging with the neighbours.' },
  { name: 'Chelsea FC', short: 'Chelsea', tla: 'CHE', div: 1, pot: 'A',
    codename: 'The Pensioners',
    roots: 'The original nickname and badge: a scarlet-coated army veteran of the Royal Hospital Chelsea. A club literally named after old soldiers.' },
  { name: 'Aston Villa FC', short: 'Aston Villa', tla: 'AVL', div: 1, pot: 'A',
    codename: 'The Old Guard',
    roots: 'Founded 1874 by a church cricket team; founder members of the Football League itself. The oldest of the old regiments.' },
  { name: 'Newcastle United FC', short: 'Newcastle', tla: 'NEW', div: 1, pot: 'A',
    codename: 'The Artillery',
    roots: "Armstrong's Elswick works on the Tyne armed the Empire — battleships and big guns. The fans call themselves the Toon Army for a reason." },
  { name: 'Tottenham Hotspur FC', short: 'Spurs', tla: 'TOT', div: 1, pot: 'A',
    codename: 'The Knights',
    roots: 'Named after Harry Hotspur, an actual medieval warrior. In WWII, White Hart Lane was converted into a gas mask factory.' },
  { name: 'Brighton & Hove Albion FC', short: 'Brighton', tla: 'BHA', div: 1, pot: 'A',
    codename: 'The Channel Fleet',
    roots: 'A south-coast town that spent 1940 staring across the water waiting for invasion, its pier sliced in half to stop enemy landings.' },
  { name: 'Crystal Palace FC', short: 'Palace', tla: 'CRY', div: 1, pot: 'A',
    codename: 'The Dry Docks',
    roots: 'In WWI the actual Crystal Palace was commissioned as a Royal Navy shore station — HMS Victory VI. A glass building, in the navy.' },

  // ── Premier League — Pot B: Infantry (results pay double) ──
  { name: 'Nottingham Forest FC', short: 'Forest', tla: 'NFO', div: 1, pot: 'B',
    codename: 'The Foresters',
    roots: 'The Sherwood Foresters were the county regiment of Nottinghamshire — the name marched from Robin Hood country to both World Wars.' },
  { name: 'Everton FC', short: 'Everton', tla: 'EVE', div: 1, pot: 'B',
    codename: 'The Watchtower',
    roots: "The badge carries Prince Rupert's Tower — named for the Royalist cavalry commander of the English Civil War who drilled his men on Everton hill." },
  { name: 'Fulham FC', short: 'Fulham', tla: 'FUL', div: 1, pot: 'B',
    codename: 'The Cottage Garrison',
    roots: "London's oldest professional club, 1879, church founded. Craven Cottage still has a cottage in the corner like a sentry post." },
  { name: 'Brentford FC', short: 'Brentford', tla: 'BRE', div: 1, pot: 'B',
    codename: 'The Swarm',
    roots: 'The Bees — small, organised, and disproportionately painful when they hit you.' },
  { name: 'AFC Bournemouth', short: 'Bournemouth', tla: 'BOU', div: 1, pot: 'B',
    codename: 'The Coastal Battery',
    roots: 'A seaside garrison town in both wars, its beaches wired and mined against invasion. Now they dig in on the south coast every season.' },
  { name: 'Leeds United FC', short: 'Leeds', tla: 'LEE', div: 1, pot: 'B',
    codename: 'The Court-Martialed',
    roots: 'Leeds City were expelled from the league in 1919 for illegal wartime payments. Leeds United rose from the ashes of the scandal.' },
  { name: 'Sunderland AFC', short: 'Sunderland', tla: 'SUN', div: 1, pot: 'B',
    codename: 'The Yards',
    roots: 'Wearside built more ships than anywhere on earth — the Liberty of the seas came down those slipways while the bombs fell on them.' },
  { name: 'Ipswich Town FC', short: 'Ipswich', tla: 'IPS', div: 1, pot: 'B',
    codename: 'The Land Army',
    roots: 'The Tractor Boys — Suffolk fed the country through two wars while the airfields of the USAAF Eighth Air Force filled its fields.' },
  { name: 'Coventry City FC', short: 'Coventry', tla: 'COV', div: 1, pot: 'B',
    codename: 'The Phoenix',
    roots: 'The city was flattened in the Blitz of November 1940 and rebuilt from the rubble. There is a phoenix on the club badge because of it.' },
  { name: 'Hull City AFC', short: 'Hull', tla: 'HUL', div: 1, pot: 'B',
    codename: 'The Minesweepers',
    roots: "Hull's trawlermen swept mines in both wars, and the city was the most-bombed in Britain outside London. Nobody ever gave them the credit." },

  // ── Championship — Pot C: The Reserves ──
  { name: 'West Ham United FC', short: 'West Ham', tla: 'WHU', div: 2, pot: 'C',
    codename: 'The Shipwrights',
    roots: 'Born as Thames Ironworks FC — shipyard men who built Royal Navy warships including HMS Thunderer. The Irons, the Hammers: it was never about football tools.' },
  { name: 'Wolverhampton Wanderers FC', short: 'Wolves', tla: 'WOL', div: 2, pot: 'C',
    codename: 'The Wolfpack',
    roots: 'Black Country iron and steel; the town forged war material for two centuries. Now hunting in the second division.' },
  { name: 'Burnley FC', short: 'Burnley', tla: 'BUR', div: 2, pot: 'C',
    codename: 'The Pals',
    roots: 'Accrington Pals country — the East Lancashire battalions who joined up together, street by street, mill by mill.' },
  { name: 'Birmingham City FC', short: 'Birmingham', tla: 'BIR', div: 2, pot: 'C',
    codename: 'The Small Arms',
    roots: 'BSA — the Birmingham Small Arms Company — put rifles in a million hands from Small Heath, a short walk from St Andrew’s.' },
  { name: 'Middlesbrough FC', short: 'Boro', tla: 'MID', div: 2, pot: 'C',
    codename: 'The Ironmasters',
    roots: 'Teesside steel built the bridges of the world and the guns of two wars. First British town bombed by a Zeppelin’s successors in WWII.' },
  { name: 'Sheffield United FC', short: 'Sheff Utd', tla: 'SHU', div: 2, pot: 'C',
    codename: 'The Bayonets',
    roots: 'Sheffield steel: every British bayonet, most of the shells, and the crucible steel of the fleet. The Blades was always a war name.' },
  { name: 'Wrexham AFC', short: 'Wrexham', tla: 'WRX', div: 2, pot: 'C',
    codename: 'The Fusiliers',
    roots: 'Home of the Royal Welch Fusiliers — the regiment of the trenches, of Sassoon and Graves. Oldest club in Wales, now with Hollywood money.' },
  { name: 'Southampton FC', short: 'Southampton', tla: 'SOU', div: 2, pot: 'C',
    codename: 'The Spitfires',
    roots: 'The Spitfire first flew from Southampton — built by Supermarine on the Itchen until the Luftwaffe bombed the factory, and the town built them anyway.' },
  { name: 'Norwich City FC', short: 'Norwich', tla: 'NOR', div: 2, pot: 'C',
    codename: 'The Canary Squadron',
    roots: 'Target of the Baedeker raids — bombed for being beautiful. The canaries kept singing.' },
  { name: 'West Bromwich Albion FC', short: 'West Brom', tla: 'WBA', div: 2, pot: 'C',
    codename: 'The Foundrymen',
    roots: 'The Black Country: foundries, forges and furnaces that never went cold from 1914 to 1945.' },
  { name: 'Watford FC', short: 'Watford', tla: 'WAT', div: 2, pot: 'C',
    codename: 'The Hornet Squadron',
    roots: 'The Hornets — and de Havilland built warplanes just up the road. Small, loud, occasionally lethal.' },
  { name: 'Bristol City FC', short: 'Bristol City', tla: 'BRC', div: 2, pot: 'C',
    codename: 'The Aeroplane Works',
    roots: 'The Bristol Aeroplane Company built the Blenheim and the Beaufighter. The city paid for it in the Blitz.' },

  // ── Championship — Pot D: The Territorials (results pay double) ──
  { name: 'Stoke City FC', short: 'Stoke', tla: 'STK', div: 2, pot: 'D',
    codename: 'The Potteries Brigade',
    roots: 'The kilns of the Potteries fired on through everything. Second-oldest professional club in the world, 1863.' },
  { name: 'Swansea City AFC', short: 'Swansea', tla: 'SWA', div: 2, pot: 'D',
    codename: 'The Three Nights',
    roots: 'The Three Nights’ Blitz of February 1941 burned the centre of Swansea out. The docks kept working the next morning.' },
  { name: 'Queens Park Rangers FC', short: 'QPR', tla: 'QPR', div: 2, pot: 'D',
    codename: "The Queen's Own",
    roots: 'A name that already sounds like a regiment. West London’s wandering battalion — twenty home grounds and counting.' },
  { name: 'Blackburn Rovers FC', short: 'Blackburn', tla: 'BLB', div: 2, pot: 'D',
    codename: 'The Ordnance',
    roots: 'Cotton town turned munitions town — the Royal Ordnance Factory at Blackburn armed the front while the mills wove on.' },
  { name: 'Preston North End FC', short: 'Preston', tla: 'PNE', div: 2, pot: 'D',
    codename: 'The Invincibles',
    roots: 'The original Invincibles of 1889 — and home of the Dick, Kerr Ladies, munitions factory women who outdrew the men’s game in 1920.' },
  { name: 'Cardiff City FC', short: 'Cardiff', tla: 'CAR', div: 2, pot: 'D',
    codename: 'The Coaling Station',
    roots: 'Cardiff coal fired the Royal Navy for a century. The docks that fuelled Jutland now fuel a promotion push, allegedly.' },
  { name: 'Derby County FC', short: 'Derby', tla: 'DER', div: 2, pot: 'D',
    codename: 'The Merlin Works',
    roots: 'Rolls-Royce Derby built the Merlin engine — the heart of the Spitfire, the Hurricane and the Lancaster. The city that powered the Battle of Britain.' },
  { name: 'Portsmouth FC', short: 'Pompey', tla: 'POR', div: 2, pot: 'D',
    codename: 'The Home Fleet',
    roots: 'Home of the Royal Navy since forever; D-Day sailed from here. Pompey till I die is a naval oath, not a football chant.' },
  { name: 'Millwall FC', short: 'Millwall', tla: 'MIL', div: 2, pot: 'D',
    codename: 'The Docklands',
    roots: 'Founded by cannery workers on the Isle of Dogs, ground zero of the London docks Blitz. No one liked them; they did not care.' },
  { name: 'Charlton Athletic FC', short: 'Charlton', tla: 'CHA', div: 2, pot: 'D',
    codename: 'The Magazine',
    roots: 'Woolwich’s other team — raised in the shadow of the Arsenal’s powder magazines by the river.' },
  { name: 'Bolton Wanderers FC', short: 'Bolton', tla: 'BOL', div: 2, pot: 'D',
    codename: 'The Wartime Wanderers',
    roots: 'In 1939 the entire Bolton first team enlisted together in the 53rd Field Regiment, captain Harry Goslin leading. They fought from Dunkirk to the Chindwin.' },
  { name: 'Lincoln City FC', short: 'Lincoln', tla: 'LIN', div: 2, pot: 'D',
    codename: 'The First Tanks',
    roots: 'The tank was invented in Lincoln — William Foster & Co, 1915. "Little Willie" rolled first where the Imps now play.' },
];

// Pre-season odds rank within each division (1 = shortest odds). Derived from
// the order clubs are listed above, so the two can never fall out of step.
for (const div of [1, 2]) {
  TEAMS.filter((t) => t.div === div).forEach((t, i) => { t.rank = i + 1; });
}
export const DIV_SIZE = { 1: TEAMS.filter((t) => t.div === 1).length, 2: TEAMS.filter((t) => t.div === 2).length };

export const TEAM_BY_NAME = Object.fromEntries(TEAMS.map((t) => [t.name, t]));
export const POTS = { A: [], B: [], C: [], D: [] };
for (const t of TEAMS) POTS[t.pot].push(t.name);

export function getTeam(name) {
  return TEAM_BY_NAME[name] || null;
}

export function potFor(name) {
  const t = TEAM_BY_NAME[name];
  return t ? t.pot : null;
}
