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

const key = (a, b) => [a, b].sort().join('|');
const MAP = new Map(RIVALRIES.map((r) => [key(r.teams[0], r.teams[1]), r]));

export function getRivalry(teamA, teamB) {
  return MAP.get(key(teamA, teamB)) || null;
}
