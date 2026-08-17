// The firms, club by club.
//
// English football's hooligan era is heavily documented — court records, the
// Popplewell and Taylor inquiries, a shelf of books and a longer shelf of
// documentaries. These lines are written in the past tense on purpose: this is
// what these ends were, not an advert for what they should be. Most of these
// firms were finished off decades ago by prosecutions, banning orders and
// all-seater grounds.
//
// [firm name, one line of history]
export const FIRM_LINES = {
  // ── Tier 1 ────────────────────────────────────────────────────────────────
  'Arsenal FC': ['The Herd',
    'Highbury had a firm and it was called The Herd, though north London never really rated them next to what came out of Tottenham and the East End. Their worst afternoons were reserved for the two miles up the Seven Sisters Road.'],
  'Manchester City FC': ['The Guvnors',
    'Salford-led and among the most active in the country through the late eighties, at a point when City were nowhere near the top of the league and the firm was the only thing they were winning at.'],
  'Liverpool FC': ['The Urchins',
    'Liverpool were never a firm city in the way Manchester or London were. The reputation the Anfield Road End took across Europe was for lifting whatever was not nailed down, which locals will tell you is a different skill entirely.'],
  'Manchester United FC': ['The Red Army',
    'The travelling support every other firm copied, and the reason the phrase got into the newspapers. On 27 April 1974, Denis Law backheeled the goal that helped relegate them, United came onto the pitch to get it abandoned, and the result stood anyway.'],
  'Chelsea FC': ['The Headhunters',
    'Notorious enough that the police ran an undercover operation against them in the mid-eighties. The convictions were quashed on appeal in 1989 when the evidence fell apart, and the case became a lesson in how not to infiltrate a firm.'],
  'Aston Villa FC': ['The Steamers',
    'Later Villa Youth, and forever the second answer to a question about Birmingham firms. Being measured against the Zulus from four miles down the road did nothing for anyone’s temper.'],
  'Newcastle United FC': ['The Gremlins',
    'In 2000 they arranged to meet Sunderland away from the ground entirely, on Seaburn seafront. Several hundred turned up, it was filmed, and the sentences were among the longest English football violence had produced. It effectively ended both firms.'],
  'Tottenham Hotspur FC': ['The Yid Army',
    'The eighties firm was the N17s, and the wider support took an antisemitic taunt from the terraces and wore it back at everyone, which is either the best or the worst thing any English crowd has ever done with an insult.'],
  'Brighton & Hove Albion FC': ['The West Street Firm',
    'Named for the road running down to the seafront, and the mods-and-rockers ground before them. Their rivalry with Palace has no geography behind it at all — it traces to bad-tempered cup ties in 1976 and Alan Mullery’s reaction afterwards, and it is still category A on police paperwork half a century on.'],
  'Crystal Palace FC': ['The Dirty Thirty',
    'A small firm with an outsized fixture list, most of it against Brighton for reasons neither set has ever managed to explain to an outsider.'],
  'Nottingham Forest FC': ['The Forest Executive Crew',
    'The executive in the name was the train carriage. They came out of the same late-seventies fashion for dressing well and travelling early that produced half the firms in the north.'],

  // ── Tier 2 ────────────────────────────────────────────────────────────────
  'Everton FC': ['The County Road Cutters',
    'Famously the derby that mostly did not go that way. Families split down the middle, the two ends often mixed, and in 1984 both sets travelled to Wembley together. The Cutters saved it for everyone else.'],
  'Fulham FC': ['The Thames Valley Travellers',
    'A few hundred yards from the Headhunters and never had anything remotely comparable, which Fulham have always been rather proud of.'],
  'Brentford FC': ['—',
    'No firm worth the name. Griffin Park was the ground with a pub on all four corners, which locals maintain settled most arguments before they started.'],
  'AFC Bournemouth': ['The Casuals',
    'A south-coast side whose support spent the eighties being shepherded through Portsmouth and Southampton, which was punishment enough without organising anything of their own.'],
  'Leeds United FC': ['The Service Crew',
    'Named for the service trains they travelled on. Through the seventies and eighties this fixture against United did more than any other to put the phrase the English disease into print.'],
  'Sunderland AFC': ['The Seaburn Casuals',
    'The other half of Seaburn in 2000. Prosecutions finished them, and the derby has been policed on that memory ever since.'],
  'Ipswich Town FC': ['The Ipswich Punishment Squad',
    'The most East Anglian thing about this rivalry is that it is with Norwich, forty-three miles away, and that both firms named themselves as though the distance were greater.'],
  'Coventry City FC': ['The Coventry Legion',
    'A Midlands firm in a city ringed by bigger ones, which meant most weekends involved travelling to somebody who fancied it more.'],
  'Hull City AFC': ['The Hull City Psychos',
    'Later the Silver Cod Squad. Hull is the end of the line in every sense — nobody passes through, so everything happened at home.'],
  'West Ham United FC': ['The Inter City Firm',
    'Named for the Inter-City trains, and the most documented firm in the country. Trouble around the 1976 Millwall meetings ended with a Millwall supporter dead under a train at New Cross.'],
  'Wolverhampton Wanderers FC': ['The Subway Army',
    'Named for the underpasses around Molineux where they waited for visiting support. Four miles from Albion, and the West Midlands force still plans that weekend months ahead.'],

  // ── Tier 3 ────────────────────────────────────────────────────────────────
  'Burnley FC': ['The Suicide Squad',
    'Eight miles from Blackburn, in a fixture whose kick-off time was chosen by the police rather than the broadcasters for years, with the streets outside segregated as well as the ground.'],
  'Birmingham City FC': ['The Zulu Warriors',
    'Unusual in being genuinely multiracial when most firms were not, which said more about the city than the fighting did. St Andrew’s in May 1985 was the low point: a riot against Leeds brought a wall down and killed a fifteen-year-old boy, on the same afternoon as the Bradford fire.'],
  'Middlesbrough FC': ['The Frontline',
    'Teesside, where the chemical works ran to the horizon and the away end was a long way from anywhere. They shared a name with Wrexham’s lot and never once shared anything else.'],
  'Sheffield United FC': ['The Blades Business Crew',
    'The most corporate-sounding firm in England, from the city that made the knives. They were not unaware of the joke.'],
  'Wrexham AFC': ['The Frontline',
    'North Wales, and a fixture with Cardiff that only comes round when the divisions allow it — which is part of why it still has an edge when it does.'],
  'Southampton FC': ['The Uglies',
    'Later the Suburban Casuals. Seventeen miles of genuine hatred with Portsmouth, a fixture that has spent long stretches with away support restricted or banned outright.'],
  'Norwich City FC': ['The Steins',
    'Before them the Barmy Army, which Norwich had first and England later borrowed for something much more cheerful.'],
  'West Bromwich Albion FC': ['The Section Five Squad',
    'Named after the public order offence they were most often charged with, which is at least honest.'],
  'Watford FC': ['The Category C',
    'Named for the police risk grading, in a decade when Watford were in the top flight and Elton John was in the directors’ box.'],
  'Bristol City FC': ['The City Service Firm',
    'The bigger half of a Bristol derby that has spent most of its history in different divisions, which has never cooled it down.'],
  'Stoke City FC': ['The Naughty Forty',
    'The most famous firm name in the country, and one of the very few that outlasted the era it came from. Stoke is a city of six towns and they never agreed on much else.'],

  // ── Tier 4 ────────────────────────────────────────────────────────────────
  'Swansea City AFC': ['The Jacks',
    'The Swansea Jacks against the Soul Crew. Ninian Park in 1993 is the one everyone cites, and away fans have since been bussed in police convoy, sometimes escorted from the county line.'],
  'Queens Park Rangers FC': ['The Bushbabies',
    'Later the C-Firm. West London had three clubs within four miles and only one of them had the Headhunters, which shaped everybody else’s Saturdays.'],
  'Blackburn Rovers FC': ['The Blackburn Youth',
    'A founder member of the Football League with a hundred and forty years of grievance against Preston, and the East Lancashire derby with Burnley on top of it.'],
  'Preston North End FC': ['The Para Squad',
    'The Invincibles of 1888 and, a century later, the firm that carried the Blackburn feud through the eighties.'],
  'Cardiff City FC': ['The Soul Crew',
    'Routinely graded the highest-risk fixture in Britain when Swansea come. The name came from the music, which is the most Cardiff detail available.'],
  'Derby County FC': ['The Derby Lunatic Fringe',
    'The best-named firm in the country by some distance, and the one most likely to be a pub quiz answer.'],
  'Portsmouth FC': ['The 6.57 Crew',
    'Named for the first train out of Portsmouth Harbour on a Saturday morning. Both police forces still plan the Southampton fixture months in advance.'],
  'Millwall FC': ['The Bushwackers',
    'Before them F-Troop and the Treatment. When West Ham came out of the hat in the League Cup on 25 August 2009 there were three pitch invasions at Upton Park and a man was stabbed outside. The policing bill is why the fixture is dreaded rather than anticipated.'],
  'Charlton Athletic FC': ['The B Mob',
    'One bend of the Thames from Millwall, in the old armament belt. Sharpened by the years Charlton spent groundsharing at Selhurst Park, which left both sides with a grievance about territory.'],
  'Bolton Wanderers FC': ['The Cuckoo Boys',
    'Named after a lane in Tonge Moor. Burnden Park held nearly seventy thousand once and thirty-three people died in a crush there in 1946, a full four decades before anyone was made to think seriously about terraces.'],
  'Lincoln City FC': ['The Lincoln Transit Elite',
    'Named after the van. Lincoln spent the era so far down the pyramid that the firm was mostly an aspiration, which is the least intimidating thing in this entire list.'],
};

export const FIRMS_NOTE =
  'Historical record. Most of these firms were broken up by prosecutions, banning orders and all-seater grounds decades ago.';

export function firmFor(clubName) {
  return FIRM_LINES[clubName] || null;
}
