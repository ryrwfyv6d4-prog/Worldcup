// Derby matches — war-framed. Key: the two openfootball names, either order.
// Only same-division pairs can actually meet in the league.
const RIVALRIES = [
  {
    teams: ['Manchester United FC', 'Manchester City FC'],
    title: 'The Manchester Derby',
    blurb: "The Landlords' Grudge. When the Luftwaffe flattened Old Trafford in 1941, City took United in at Maine Road for eight years. The rent has been rising ever since.",
  },
  {
    teams: ['Arsenal FC', 'Tottenham Hotspur FC'],
    title: 'The North London Derby',
    blurb: 'The Munitions marched up from Woolwich in 1913 and dug in on Tottenham’s doorstep. The Knights have treated it as an illegal occupation for a century.',
  },
  {
    teams: ['Liverpool FC', 'Everton FC'],
    title: 'The Merseyside Derby',
    blurb: 'One city, two flags, families split down the middle — the Convoys against the Watchtower, fought across Stanley Park since 1892.',
  },
  {
    teams: ['Newcastle United FC', 'Sunderland AFC'],
    title: 'The Tyne–Wear Derby',
    blurb: 'This one is literally a war: Newcastle was Royalist, Sunderland Parliamentarian in the English Civil War. Artillery against shipyards, four hundred years and counting.',
  },
  {
    teams: ['Leeds United FC', 'Manchester United FC'],
    title: 'The Roses Rivalry',
    blurb: 'York against Lancaster — a fixture whose original legs were played in the 1460s with actual armies. The Court-Martialed against the Railwaymen.',
  },
  {
    teams: ['Crystal Palace FC', 'Brighton & Hove Albion FC'],
    title: 'The M23 Derby',
    blurb: 'The Phoney War: two garrisons forty miles apart who cannot stand each other, for reasons neither can fully explain. The Dry Docks against the Channel Fleet.',
  },
  {
    teams: ['Chelsea FC', 'Fulham FC'],
    title: 'The West London Derby',
    blurb: 'The Pensioners against the Cottage Garrison — old soldiers and river sentries, neighbours across a few hundred yards of SW6.',
  },
  {
    teams: ['West Ham United FC', 'Millwall FC'],
    title: "The Dockers' Derby",
    blurb: 'The fiercest works rivalry in football: shipwrights of the Thames Ironworks against the dockers of the Isle of Dogs. Both yards armed the Navy; neither forgave the other for it.',
  },
  {
    teams: ['Cardiff City FC', 'Swansea City AFC'],
    title: 'The South Wales Derby',
    blurb: 'The Coaling Station against the Three Nights — coal against copper, the valleys at war since the docks competed for the same ships.',
  },
  {
    teams: ['Portsmouth FC', 'Southampton FC'],
    title: 'The South Coast Derby',
    blurb: 'The Home Fleet against the Spitfires — sailors against shipfitters, seventeen miles of pure hostility. D-Day sailed from one; the planes above it were built in the other.',
  },
  {
    teams: ['Wolverhampton Wanderers FC', 'West Bromwich Albion FC'],
    title: 'The Black Country Derby',
    blurb: 'The Wolfpack against the Foundrymen — two furnace towns, one seam of iron, and a rivalry forged hotter than either.',
  },
  {
    teams: ['Burnley FC', 'Blackburn Rovers FC'],
    title: 'The East Lancashire Derby',
    blurb: 'The Cotton Wars: Pals battalions were raised from these rival mill towns street by street. The Pals against the Ordnance.',
  },
  {
    teams: ['Preston North End FC', 'Blackburn Rovers FC'],
    title: 'The Lancashire Derby',
    blurb: 'The Invincibles against the Ordnance — two founder members of the Football League itself, feuding since 1888.',
  },
  {
    teams: ['Charlton Athletic FC', 'Millwall FC'],
    title: 'The South-East London Derby',
    blurb: 'The Magazine against the Docklands — both raised in the armament belt of the Thames, separated by one river bend and no goodwill.',
  },
  {
    teams: ['Cardiff City FC', 'Wrexham AFC'],
    title: 'The Welsh Derby',
    blurb: 'North against South Wales — the Fusiliers marching down to meet the Coaling Station. National service, both directions.',
  },
  {
    teams: ['Birmingham City FC', 'West Bromwich Albion FC'],
    title: 'The Second City Skirmish',
    blurb: 'The Small Arms against the Foundrymen — Birmingham made the rifles, the Black Country forged the barrels.',
  },
];


// The firms, as social history. English football's hooligan era is heavily
// documented — books, court records, a shelf of documentaries — and these
// rivalries can't honestly be described without it. Written in the past tense
// on purpose: this is what these fixtures were, not an advert for what they
// should be.
const FIRMS = {
  'Manchester City FC|Manchester United FC':
    "United's Red Army were the template for the seventies travelling mob; City's Guvnors answered in the eighties. Both are now a documentary and a lot of dads in the pub.",
  'Newcastle United FC|Sunderland AFC':
    "Newcastle's Gremlins and Sunderland's Seaburn Casuals. The confrontation at Seaburn in 2000 drew some of the longest hooliganism sentences English courts had handed down.",
  'Leeds United FC|Manchester United FC':
    "The Service Crew against the Red Army. More than any other fixture, this is the one that put the phrase 'the English disease' into seventies newspapers.",
  'Chelsea FC|Fulham FC':
    "Chelsea's Headhunters were the most notorious firm in the country and the target of a famous undercover police operation. Fulham, to their eternal credit, never really bothered.",
  'Millwall FC|West Ham United FC':
    "The big one: West Ham's Inter City Firm against Millwall's Bushwackers. New Cross in 1976, Upton Park in 2009. Still the most heavily policed fixture in London, and the reason 'no one likes us' became a song.",
  'Cardiff City FC|Swansea City AFC':
    "The Soul Crew against the Swansea Jacks — policed like a state visit, away fans bussed in convoy. By most measures the most genuinely bitter derby in Britain.",
  'Portsmouth FC|Southampton FC':
    "Pompey's 6.57 Crew, named after the early train to away games, against the Southampton mob. Seventeen miles and a great deal of history nobody is especially proud of.",
  'West Bromwich Albion FC|Wolverhampton Wanderers FC':
    "Wolves' Subway Army against Albion's Section Five. Black Country furnaces, Black Country tempers.",
  'Blackburn Rovers FC|Burnley FC':
    "Burnley's Suicide Squad against the Blackburn mob. Cotton towns eight miles apart, and the reason this fixture spent years with its kick-off time chosen by the police rather than the TV.",
  'Blackburn Rovers FC|Preston North End FC':
    "Two founder members of the Football League, a hundred and forty years of grievance, and the Preston Para Squad to carry it.",
  'Charlton Athletic FC|Millwall FC':
    "The Bushwackers against Charlton's B Mob, fought out across one bend of the Thames in the old armament belt.",
  'Birmingham City FC|West Bromwich Albion FC':
    "Birmingham's Zulu Warriors were one of the few genuinely multiracial firms of the eighties, which quietly said more about the city than the fighting did.",
  'Cardiff City FC|Wrexham AFC':
    "North against south, the Soul Crew against the Wrexham Frontline. National service, both directions.",
  'Brighton & Hove Albion FC|Crystal Palace FC':
    "Nobody can properly explain this one. Forty miles apart, no shared border, barely any history — and still a category A fixture on police paperwork.",
  'Everton FC|Liverpool FC':
    "Famously the derby that mostly did not go that way. Families split down the middle, so the County Road Cutters and their Anfield counterparts largely saved it for everyone else.",
};

const key = (a, b) => [a, b].sort().join('|');
const MAP = new Map(RIVALRIES.map((r) => [key(r.teams[0], r.teams[1]), r]));

export function getRivalry(teamA, teamB) {
  const r = MAP.get(key(teamA, teamB));
  if (!r) return null;
  const firms = FIRMS[key(teamA, teamB)] || null;
  return firms ? { ...r, firms } : r;
}

// Firms note for any pairing, derby or not
export function getFirms(teamA, teamB) {
  return FIRMS[key(teamA, teamB)] || null;
}

// Pot pairing → a line of framing. Keyed by the sorted pot pair.
const POT_FRAMING = {
  'A|A': 'Two Armoured Divisions grind against each other — heavy metal, no quarter, the sort of engagement that decides campaigns.',
  'A|B': 'An Armoured Division rolls into Infantry country. The big guns are favoured — but the mud has swallowed bigger.',
  'B|B': 'Infantry against Infantry in the trenches of the bottom half. Won by whoever wants it more, and worth double either way.',
  'A|C': 'A top-flight Armoured Division is dragged down a division into a cup-tie skirmish. Upsets are written here.',
  'A|D': 'An Armoured Division meets the Territorials — a mismatch on paper that the Territorials have not read.',
  'B|C': 'Infantry and Reserves collide across the divide between the divisions — pride, and doubled points, on the line.',
  'B|D': 'Infantry against Territorials — two units who win their battles in the rain, both paid double for the privilege.',
  'C|C': 'Two of the Reserves jockey for the front of the promotion queue. The Championship’s real war.',
  'C|D': 'Reserves against Territorials — a Championship scrap where a Territorial win pays double and stings triple.',
  'D|D': 'Territorial against Territorial in the deep field. Unglamorous, doubled, and absolutely decisive for someone’s survival.',
};

// A war-based line for EVERY fixture. Famous derby → its dossier; otherwise a
// composed framing from the two regiments' codenames, roots and pots.
export function getMatchup(teamA, teamB, infoA, infoB) {
  const derby = getRivalry(teamA, teamB);
  if (derby) return { ...derby, derby: true };
  if (!infoA || !infoB) return null;
  const potKey = [infoA.pot, infoB.pot].sort().join('|');
  const framing = POT_FRAMING[potKey] || '';
  return {
    derby: false,
    title: `${infoA.codename} v ${infoB.codename}`,
    blurb: `${framing} ${infoA.short} (${infoA.codename}) line up against ${infoB.short} (${infoB.codename}).`.trim(),
  };
}
