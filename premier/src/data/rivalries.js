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
  'Millwall FC|West Ham United FC':
    "The Inter City Firm against the Bushwackers, and the most documented feud in the English game. Trouble around the 1976 meetings ended with a Millwall supporter dead under a train at New Cross. When the clubs were drawn together again in the League Cup on 25 August 2009, there were three pitch invasions at Upton Park and a man was stabbed in the street outside. The policing bill is now the reason the fixture is dreaded rather than anticipated.",
  'Newcastle United FC|Sunderland AFC':
    "Newcastle's Gremlins and Sunderland's Seaburn Casuals arranged to meet away from the ground entirely, on Seaburn seafront in 2000. Several hundred were involved, it was filmed, and the courts handed down some of the longest sentences English football violence had produced. Both firms were effectively finished by the prosecutions.",
  'Chelsea FC|Fulham FC':
    "Chelsea's Headhunters were notorious enough that police ran an undercover operation against them in the mid-eighties. The convictions that followed were quashed on appeal in 1989 after the evidence fell apart, which became a case study in how not to infiltrate a firm. Fulham, a few hundred yards away, never had anything comparable and were rather proud of it.",
  'Cardiff City FC|Swansea City AFC':
    "The Soul Crew against the Swansea Jacks. Ninian Park in 1993 is the one everyone cites, and the fixture has since been played with away fans bussed in police convoy, sometimes under a full escort from the county line. It is routinely graded the highest-risk match in Britain.",
  'Manchester City FC|Manchester United FC':
    "City's Guvnors against United's Red Army. The reference point is 27 April 1974: Denis Law backheeled the goal that helped send his old club down, United supporters came onto the pitch to get the game abandoned, and the result stood anyway. It set the tone for a decade in which United's travelling support became the template every other firm copied.",
  'Birmingham City FC|West Bromwich Albion FC':
    "Birmingham's Zulu Warriors were unusual in being genuinely multiracial when most firms were not, which said more about the city than the fighting did. St Andrew's in May 1985 was the low point: a riot during a match against Leeds brought a wall down and killed a fifteen-year-old boy, on the same afternoon as the Bradford fire. The Popplewell inquiry covered both.",
  'Brighton & Hove Albion FC|Crystal Palace FC':
    "The strangest rivalry in England, because there is no geography behind it. It traces to bad-tempered FA Cup ties in 1976 and Brighton manager Alan Mullery's reaction to Palace supporters afterwards, and the clubs have simply never let it go. Still a category A fixture on police paperwork half a century later.",
  'Blackburn Rovers FC|Burnley FC':
    "Burnley's Suicide Squad and the Blackburn mob, eight miles apart in East Lancashire. For years this was the fixture whose kick-off time was chosen by the police rather than the broadcasters, with the ground segregated street by street outside as well as in.",
  'Portsmouth FC|Southampton FC':
    "Pompey's 6.57 Crew took their name from the first train out of Portsmouth Harbour on a Saturday. Seventeen miles of genuine hatred, a fixture that has spent long stretches with restricted or banned away support, and one that both sets of police forces plan for months ahead.",
  'Leeds United FC|Manchester United FC':
    "The Service Crew against the Red Army through the seventies and eighties, when this fixture did more than any other to put the phrase 'the English disease' into the papers. The hostility long outlived the firms and now mostly lives in the away end and the songs.",
  'West Bromwich Albion FC|Wolverhampton Wanderers FC':
    "Wolves' Subway Army were named for the underpasses around Molineux where they waited for visiting support. Albion's lot answered in kind. Two furnace towns four miles apart, and a fixture the West Midlands force still treats as a full weekend operation.",
  'Charlton Athletic FC|Millwall FC':
    "The Bushwackers against Charlton's B Mob, fought out across one bend of the Thames in the old armament belt. Sharpened by the years Charlton spent groundsharing at Selhurst Park, which left both sets with a grievance about territory.",
  'Blackburn Rovers FC|Preston North End FC':
    "Two founder members of the Football League with a hundred and forty years of grievance behind them, and the Preston Para Squad to carry it through the eighties.",
  'Cardiff City FC|Wrexham AFC':
    "North against south, the Soul Crew against the Wrexham Frontline, in a fixture that only comes round when the divisions allow it — which is part of why it still has an edge.",
  'Everton FC|Liverpool FC':
    "Famously the derby that mostly did not go that way. Families split down the middle, the two ends often mixed, and the County Road Cutters and their Anfield counterparts largely saved it for everyone else. In 1984 both sets of supporters travelled to Wembley together.",
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

// Shown under the firms note so the section reads as what it is: a record of
// what these fixtures were, not a highlight reel.
export const FIRMS_FOOTNOTE =
  'Historical record. Most of these firms were broken up by prosecutions, banning orders and all-seater grounds decades ago.';

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
