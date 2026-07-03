// Conflict-history banter for match-ups. Same register as teamDescriptions:
// deadpan, historically literate, sympathetic to the trampled-on.
// Keys are the two team names sorted alphabetically, joined by '|'.

const PAIRS = {
  // ── Group A ──
  'Mexico|South Africa':
    "Never fought a war against each other, which is impressive given how many each has been dragged into by other people. Both were carved up by empires, both got handed a World Cup, both were told to be grateful. Tonight, finally, a fair fight.",
  'Mexico|South Korea':
    "No shared wars, but a shared experience: both spent the 20th century next to a superpower that kept 'helping.' Korea got partitioned. Mexico got NAFTA. Historians disagree on which recovered faster.",
  'Czech Republic|Mexico':
    "The Czechs were sold out at Munich in 1938 by allies who promised to protect them. Mexico lost half its territory to a neighbour who promised to respect it. Two nations united by the knowledge that a handshake means nothing. Should be friendly.",
  'South Africa|South Korea':
    "One was divided by apartheid, the other by the 38th parallel. Both lines were drawn by men in rooms very far away. Both nations turned out fine at football anyway, just to be annoying about it.",
  'Czech Republic|South Africa':
    "Czechoslovakia armed half the world's liberation movements, including the one that ended apartheid. So technically South Africa owes them one. The Czechs would like it repaid in goals conceded, please.",
  'Czech Republic|South Korea':
    "Czechoslovakia sent arms to North Korea in the 50s, which the South remembers, and then dissolved itself in 1993, which the Czechs prefer to discuss instead. Anyway. Football.",

  // ── Group B ──
  'Bosnia & Herzegovina|Canada':
    "Canadian peacekeepers served in Bosnia during the worst of it, so these two have actually met before, under considerably worse circumstances. This fixture is the rare sequel that improves on the original.",
  'Canada|Qatar':
    "One country built its reputation on peacekeeping, the other on buying whatever reputation was available that year. Canada says sorry too much. Qatar has never said it once.",
  'Canada|Switzerland':
    "The two most aggressively neutral nations on Earth, meeting at last. Switzerland stayed out of both World Wars. Canada joined both early and politely. Someone has to lose tonight and both will apologise for it.",
  'Bosnia & Herzegovina|Qatar':
    "Bosnia survived a siege the world watched on television and did nothing about. Qatar owns the television networks now. History doesn't repeat, but it does buy broadcast rights.",
  'Bosnia & Herzegovina|Switzerland':
    "Half of Bosnia's diaspora lives in Switzerland, so this is less an international fixture than a family argument. Several Swiss players' parents will be quietly cheering for the other dressing room.",
  'Qatar|Switzerland':
    "One hides money, the other spends it. Swiss banks have held assets for every regime Qatar has ever outbid. Tonight the ledger gets settled in the only currency neither can print: goals.",

  // ── Group C ──
  'Brazil|Morocco':
    "Both were Portuguese property at some point — Morocco briefly, Brazil at length. Portugal isn't in this group, but rest assured both teams will be playing against them in spirit.",
  'Brazil|Scotland':
    "Scotland invented the passing game; Brazil perfected it and never sent a thank-you card. The student became the master, the master became a nation of 5 million people screaming at a television in the rain.",
  'Brazil|Haiti':
    "The two great revolutions of the Americas: Haiti freed itself from France, Brazil's junta freed Brazilians from democracy for 21 years. Haiti's was better. Brazil's had better football, which the generals knew, which is why you got to watch it.",
  'Morocco|Scotland':
    "Morocco beat back European empires for centuries. Scotland mostly invited theirs in via a signature in 1707 and has regretted it at every major tournament since. Two kingdoms, very different paperwork.",
  'Haiti|Morocco':
    "Both humiliated a French army, which makes this group stage's most exclusive club. Napoleon lost to Haiti; France lost to Morocco in 2022 in front of the whole world. Paris will not be watching this one.",
  'Haiti|Scotland':
    "Haiti defeated Napoleon. Scotland was defeated by, at various points, England, the weather, and itself. Both have suffered enough that neutrals are legally required to want them both to win. Someone check the rules.",

  // ── Group D ──
  'Australia|USA':
    "Allies in every war since 1917, which is the diplomatic way of saying Australia has joined every American war since 1917. Tonight the invoice arrives. The Socceroos would like the Pacific back, or at least three points.",
  'Paraguay|USA':
    "Paraguay once fought three neighbours simultaneously and lost most of its male population doing it. The USA has never fought anyone with that level of commitment. Respect the small dog in this fight.",
  'Turkey|USA':
    "NATO allies who have spent seventy years one incident away from not being NATO allies. They share an alliance, an arms catalogue, and a mutual conviction that the other one is the difficult one.",
  'Australia|Paraguay':
    "Australia's bloodiest defeat was Gallipoli, planned by the British. Paraguay's was the War of the Triple Alliance, which Paraguay planned itself. There's a lesson there about outsourcing.",
  'Australia|Turkey':
    "Gallipoli, 1915: Australia's national legend, Turkey's national victory, everyone's national tragedy. Atatürk later told the Anzac mothers their sons now rest as Turkey's sons. A century on they meet again, thankfully with a ball.",
  'Paraguay|Turkey':
    "The Ottomans and Paraguay never met in battle, being on opposite sides of the planet, but both empires peaked early and have been explaining it ever since. Tonight, a chance at a comeback neither saw coming.",

  // ── Group E ──
  'Ecuador|Germany':
    "Germany spent the 20th century redrawing maps by force. Ecuador had its map redrawn by Peru in 1941 and would simply like a word with whoever keeps doing this to small countries. The word is 'pressing.'",
  'Germany|Ivory Coast':
    "Germany's African colonies were taken away in 1919 for behaviour the other empires found excessive, which from THOSE empires is a hell of a review. Ivory Coast was France's problem instead. Tonight: closure, possibly.",
  'Curaçao|Germany':
    "In 1940 Germany invaded the Netherlands; Curaçao, a Dutch colony, suddenly found itself at war with Berlin while sitting quietly in the Caribbean refining oil for the Allies. The smallest nation at this World Cup has unfinished business with the largest economy in Europe. Wonderful.",
  'Ecuador|Ivory Coast':
    "Two nations that export the world's cocoa and bananas and have been paid in coups for the privilege. The commodity traders of London and New York will not be thanked in either anthem tonight.",
  'Curaçao|Ecuador':
    "Curaçao was a Dutch slave port; Ecuador was Spanish silver country. Different empires, same business model. Both anthems are best understood as very polite revenge.",
  'Curaçao|Ivory Coast':
    "Population 150,000 versus population 28 million, and the small island has the colonial paperwork to prove it's seen worse odds. The Dutch taught Curaçao football. The French taught Ivory Coast bureaucracy. Advantage: island.",

  // ── Group F ──
  'Japan|Netherlands':
    "For 200 years the Dutch were the only Europeans Japan allowed in, confined to a man-made island in Nagasaki harbour like a quarantined houseguest. Then Japan ran the Dutch East Indies camps in WWII. It's complicated, is what the historians say. Tonight it's just complicated at left-back.",
  'Netherlands|Sweden':
    "Fought each other in the 1650s over Baltic shipping tolls, a war so Dutch and so Swedish that the casualties were mostly invoices. Total football versus total furniture. Someone's flat-pack empire falls tonight.",
  'Netherlands|Tunisia':
    "Dutch corsairs and Barbary corsairs robbed each other's ships for two centuries in a rare example of perfectly balanced piracy. Eventually everyone agreed to call it 'trade.' Tonight's match is also officially friendly.",
  'Japan|Sweden':
    "Sweden was neutral in WWII; Japan was extremely not. Sweden's embassy in Tokyo actually represented enemy interests during the war, making them the designated adult in the room. They meet tonight, the adult and the reformed arsonist, both now impeccably behaved.",
  'Japan|Tunisia':
    "Carthage fell to Rome; Japan never fell to anyone until 1945, and they'd note it took two atomic bombs and the entire Pacific fleet. Two proud ruins of empire, fully rebuilt, very fast on the counter.",
  'Sweden|Tunisia':
    "Sweden actually fought Tunisia once — a forgotten 1700s naval scuffle with the Barbary states over, you guessed it, shipping. Sweden has been in so few wars that this counts as a heated rivalry. Lock the doors.",

  // ── Group G ──
  'Belgium|Egypt':
    "Belgium's king ran the Congo as a private estate; Britain ran Egypt as a 'temporary' arrangement that lasted 70 years. Two graduates of the same finishing school for empires, except Egypt graduated 5,000 years earlier and built the pyramids while Belgium was still a swamp with opinions.",
  'Belgium|Iran':
    "Belgium wrote Iran's first constitution-era customs law in 1900, then Belgian administrators ran Iranian customs for decades, which is the most Belgian form of empire imaginable: invading via paperwork. Iran has never forgotten. Belgium has never remembered.",
  'Belgium|New Zealand':
    "New Zealanders died in their thousands defending Belgian mud at Passchendaele in 1917. Belgium has honoured them ever since, which is classy. Tonight the All Whites ask for the favour back: lie down for ninety minutes.",
  'Egypt|Iran':
    "Persia conquered Egypt in 525 BC, allegedly winning a battle by herding cats in front of the Egyptian army, who refused to harm them. If that's true it's the greatest tactical decision in military history. Expect Iran to try something similar tonight.",
  'Egypt|New Zealand':
    "The Kiwis trained in the shadow of the pyramids in both World Wars before being shipped off to other people's catastrophes. Egypt was the last good memory before Gallipoli. A century later, New Zealand returns the visit with studs.",
  'Iran|New Zealand':
    "One nation has been sanctioned by everyone; the other has been invaded by no one, ever, mostly because it's too far away and the sheep aren't talking. The most geopolitically lopsided fixture of the round. The ball doesn't know that.",

  // ── Group H ──
  'Spain|Uruguay':
    "Spain founded Montevideo, lost it, and has been pretending the whole continent thing went fine ever since. Uruguay won two World Cups before Spain won one, which Uruguayans mention, on average, hourly.",
  'Saudi Arabia|Spain':
    "Al-Andalus: 700 years of Arab rule in Spain, ending in 1492, after which Spain immediately went looking for other people's land to make up for it. The Reconquista, the rematch, kicks off at nine.",
  'Cape Verde|Spain':
    "Spain and Portugal split the entire planet between them at Tordesillas in 1494, and Cape Verde — uninhabited rocks turned slave depot — was the literal line on the map. Tonight the line on the map gets a vote.",
  'Saudi Arabia|Uruguay':
    "Two nations that have never had a single reason to quarrel, separated by 12,000 km, an ocean, and a slightly different relationship with beef. The group of death this is not. The football might be.",
  'Cape Verde|Uruguay':
    "Both tiny, both shipped through the same Atlantic slave economy from opposite ends, both punching up ever since. Uruguay has the trophies. Cape Verde has the morna and nothing to lose. Dangerous combination.",
  'Cape Verde|Saudi Arabia':
    "One nation got rich on oil; the other got left with volcanic rock, drought, and a diaspora bigger than its population. Tonight the rock plays the oil. The neutrals know exactly whose side they're on.",

  // ── Group I ──
  'France|Senegal':
    "Senegal was the jewel of French West Africa, supplied the Tirailleurs Sénégalais who died for France in both wars, and was repaid in 1944 with the Thiaroye massacre — France shooting its own returning soldiers over back pay. Senegal beat France 1-0 at the 2002 World Cup. It wasn't enough. Nothing would be.",
  'France|Norway':
    "Napoleon's wars got Norway traded from Denmark to Sweden in 1814 like a fantasy football asset. Norway never got a say. Two centuries later they get a say. It's a 4-4-2.",
  'France|Iraq':
    "France sold Iraq the Mirage jets, the reactor, most of the 80s arsenal — then joined the coalition bombing it all in 1991. Arms dealing's only rule: eventually you meet your customer. Tonight, customer service.",
  'Norway|Senegal':
    "Norway's only colonies were ice. Senegal's experience of Europe was considerably warmer and considerably worse. The world's most decent country meets one of its most patient. The patience runs out in the penalty area.",
  'Iraq|Senegal':
    "Cradle of civilisation versus gateway of the slave trade — two nations that gave the world more than they ever got back. Mesopotamia invented writing; tonight someone rewrites a group table.",
  'Iraq|Norway':
    "Norway helped broker peace deals while Iraq was being handed war after war, often by committee. One has a sovereign wealth fund from oil; the other has the oil and somehow none of the fund. Discuss. Or don't, and watch the football.",

  // ── Group J ──
  'Argentina|Algeria':
    "Both threw out a European power — Argentina politely in 1816, Algeria after a war so brutal France didn't admit it WAS a war until 1999. Both produced football the colonisers now claim credit for. The nerve.",
  'Argentina|Austria':
    "After 1945, Argentina became the retirement destination of choice for Austrians with gaps in their CV. The less said the better, which is exactly what the immigration forms concluded too. Anyway — the champions versus the waltz.",
  'Argentina|Jordan':
    "Jordan has spent a century being the calm one in history's loudest neighbourhood. Argentina has spent a century being the loud one in history's calmest. Tonight, role reversal: Jordan parks the bus and Argentina loses its mind.",
  'Algeria|Austria':
    "The Habsburgs and the Barbary corsairs of Algiers genuinely skirmished for centuries over Mediterranean shipping. Austria eventually lost its entire coastline and, with it, the argument. The empire of landlocked grudges sails again tonight.",
  'Algeria|Jordan':
    "Both born from the carve-up of empires — one fought 132 years of French rule, the other was drawn by a British pen, allegedly with a hiccup in it (look up 'Winston's Hiccup,' it's real). Brothers in arbitrary borders.",
  'Austria|Jordan':
    "The Habsburgs and the Hashemites: two dynasties, one of which still runs its country. Austria retired its royals in 1918; Jordan's still show up to work. Tonight monarchy takes on bureaucracy, and bureaucracy has a better midfield.",

  // ── Group K ──
  'Colombia|Portugal':
    "Portugal claimed Brazil and called the rest of South America Spain's problem. Colombia, accordingly, has no quarrel with Portugal — just with everyone Portugal sent next door. A rare clean slate. Expect cards anyway.",
  'DR Congo|Portugal':
    "Portugal reached the Kongo Kingdom in 1482, was welcomed as a trading partner, and within decades was shipping its hosts across the Atlantic. Five centuries of receipts. The Leopards have never wanted a win more, and neutral football has never agreed harder.",
  'Portugal|Uzbekistan':
    "Vasco da Gama sailed around Africa specifically to cut Uzbekistan's ancestors out of the deal — the Silk Road's middlemen, bankrupted by Portuguese shipping. Samarkand's revenge has been pending since 1498. Tonight it's listed as a 7:30 kickoff.",
  'Colombia|DR Congo':
    "Two nations cursed with everything valuable — emeralds, cobalt, coffee, coltan — and the foreign business partners that come with it. The resource curse derby. Whoever wins, a mining executive somewhere takes credit.",
  'Colombia|Uzbekistan':
    "Both spent the 20th century as the misunderstood middle of someone else's map — one in Bolívar's broken dream, one in the Soviet Union's cotton ledger. Both came out the other side with terrifying wingers.",
  'DR Congo|Uzbekistan':
    "King Leopold owned one; Moscow ran the other. Neither was asked. Two nations playing their first-ever match against each other, with a combined history of being someone else's property that should disqualify the rest of us from complaining about anything.",

  // ── Group L ──
  'Croatia|England':
    "England invented football and Croatia invented the necktie, and only one of those has caused more national heartbreak. Croatia knocked England out of a World Cup semi in 2018, ending it coming home. It is still in transit.",
  'England|Panama':
    "England's pirates — sorry, 'privateers' — sacked Panama in 1671 under Henry Morgan, who was knighted for it, because the only difference between piracy and policy is the flag. Panama remembers. England named a rum after him.",
  'England|Ghana':
    "The Gold Coast was Britain's model colony, which meant the gold went one way and the model stayed. Ghana was the first African nation to break free, in 1957, and has been first at most things since. England, meanwhile, invented the queue.",
  'Croatia|Panama':
    "Croatia's coastline ran Adriatic shipping; Panama IS shipping. Two nations that exist because geography put them in everyone's way. Both monetised it brilliantly. One of them did it without registering other people's boats.",
  'Croatia|Ghana':
    "Croatia became a nation in 1991 after a brutal war; Ghana became one in 1957 with a speech at midnight. Both made the World Cup look easy immediately, which 200-year-old federations find very annoying.",
  'Ghana|Panama':
    "Connected by the worst route in history — the Atlantic triangle ran through both. Five centuries later they meet as equals at a World Cup in the hemisphere that profited. Football doesn't fix history, but the symbolism is free.",

  // ── Round of 32 (actual 2026 draw) ──
  'Canada|South Africa':
    "Both spent a century as Britain's favourite children — one got peacekeeping medals and apologies, the other got apartheid and an arms embargo. The Commonwealth: a family where some kids got bikes and some got sanctions. Tonight the estate gets settled.",
  'Germany|Paraguay':
    "Paraguay once declared war on Brazil, Argentina and Uruguay simultaneously — a decision so catastrophically confident it cost most of the male population. Germany looked at that record and said 'twice, and bigger.' History's two most committed 'we can take them' nations, finally taking each other.",
  'Morocco|Netherlands':
    "The Dutch imported Moroccan workers in the 60s to do the jobs nobody wanted; two generations on, half this Dutch squad has family at both ends of the fixture. Less an international than a custody hearing. The pre-match handshakes take forty minutes and someone's auntie is disappointed either way.",
  'Brazil|Japan':
    "The largest Japanese community outside Japan lives in São Paulo — shipped over from 1908 to cut coffee when slavery's paperwork expired but the job description didn't. A century later their descendants watch this fixture with two flags and no good options.",
  'France|Sweden':
    "Napoleon's own marshal, Bernadotte, defected to become King of Sweden in 1810 — then declared war on France. The greatest act of leaving a group chat in history. His descendants still hold the Swedish throne. France still hasn't unblocked him.",
  'Ivory Coast|Norway':
    "Norway found oil in the sea and gave every citizen a pension. Ivory Coast grows 40% of the world's cocoa and somehow owes money on it. Same planet, very different invoices. The chocolate section of Oslo's supermarkets is playing away tonight.",
  'Ecuador|Mexico':
    "Two nations that lost half their map to a neighbour and were told to be flattered by the attention. Mexico's went to Washington in 1848; Ecuador's went to Peru in 1941 while the referees looked away. Tonight, at long last, a border dispute with VAR.",
  'DR Congo|England':
    "Leopold ran the Congo as a private slaughterhouse while Britain wrote strongly worded reports about it — colonialism peer-reviewing colonialism, one star, would not recommend. The Leopards versus the inventors of looking concerned. Neutrals tonight: the entire planet.",
  'Bosnia & Herzegovina|USA':
    "America bombed its way into ending the Bosnian war in 1995, which Bosnians will tell you was three years late and still the only time the cavalry actually arrived. The favour gets repaid the Balkan way tonight: a deep block, a 1-0, and no thank-you note.",
  'Belgium|Senegal':
    "Belgium's African record is the worst document in the colonial archive, and the colonial archive is not a good archive. Senegal spent that same century dying in French uniforms and getting massacred over back pay at Thiaroye. Two survivors of Europe's worst impulses — one of which is Europe.",
  'Croatia|Portugal':
    "Two coastal operations of very different sizes: Portugal mapped the planet; Ragusa — Croatian Dubrovnik — mapped the loopholes in everyone else's blockades. Both got rich on other people's cargo. Tonight's cargo is a spot in the next round, and neither intends to pay duty.",
  'Austria|Spain':
    "The Habsburgs ran both crowns through two centuries of strategic inbreeding, until Spain's Charles II — chin like a boot, family tree like a ladder — died heirless in 1700 and triggered a world war over the paperwork. Tonight's the family reunion. The genetics have improved; the midfield is debatable.",
  'Algeria|Switzerland':
    "Algeria fought 132 years of French rule; Switzerland banked France's side of the receipts. Every empire needs a vault and the Alps never asked questions. The ledger plays the safe tonight. Expect Switzerland to hold everything, as per policy.",
  'Argentina|Cape Verde':
    "The world champions versus ten volcanic islands whose main export is their own population. Argentina has more World Cups than Cape Verde has stadiums. But Argentina knows exactly what small islands can do to a confident nation — ask them about 1982. Actually, don't.",
  'Colombia|Ghana':
    "Gold Coast and El Dorado: both named by Europeans after the stuff they were about to remove. Five centuries on, the gold sits in London and the debt stayed local. Two nations still being lectured about diversifying their economies by the people who took the diversity.",
  'Australia|Egypt':
    "The Anzacs trained in Cairo before Gallipoli, raced donkeys around the pyramids and carved their names into 4,000-year-old stone like absolute tourists. Egypt mostly forgave them, because most of them didn't come home. A century later: the rematch nobody's great-grandfather got.",

  // ── Round of 16 (confirmed + possible) ──
  'France|Paraguay':
    "France's colonial ledger somehow never reached Paraguay, making this the rare France fixture with no outstanding invoices. Paraguay survived the deadliest war in the Americas and two dictators named López. France survived — no. Too easy. We're above it. (Are we?)",
  'Canada|Morocco':
    "The two nicest reputations in world football: one earned by peacekeeping, one earned by knocking out European giants while their fans cleaned the stadium behind them. Somebody's clean image dies tonight, and the other one will apologise for it.",
  'Brazil|Norway':
    "Brazil has played Norway four times and never won — the five-time champions' only unsolved opponent is a nation that mostly exports salmon and pension advice. Someone in Oslo has had Brazil's number since 1998 and keeps it in a fjord.",
  'England|Mexico':
    "Mexico hosted in 1970 and watched England's world champions melt in the Guadalajara heat while locals banged drums outside their hotel until 4am. Fifty-six years later England still files it under 'lessons learned.' The drums are already booked and the forecast says warm.",
  'DR Congo|Mexico':
    "Silver through Veracruz, cobalt through everywhere — two nations whose ground built everyone else's fortunes. Your phone contains both countries; neither has seen the receipt. Winner gets a quarter-final. The invoice remains outstanding.",
  'Portugal|Spain':
    "Iberia's siblings split the entire planet at Tordesillas in 1494 — drew a line down the Atlantic like children dividing a bedroom, except the bedroom was Earth. Spain took the silver, Portugal took the spice routes, everyone else took 400 years of unsolicited visitors. Tonight the line finally gets a winner.",
  'Austria|Portugal':
    "Two retired empires: one lost its entire coastline and kept the naval anthem, the other lost the world's biggest colonial map and kept the melancholy. Austria has no sea; Portugal is essentially nothing but coast. Sadness in two different time signatures.",
  'Croatia|Spain':
    "Habsburg cousins: Croatia spent centuries as Vienna's military frontier — a human shield with farming rights — while Spain served as the dynasty's cash machine. Both perfected dying for someone else's family business. Tonight, refreshingly, they compete for their own.",
  'Austria|Croatia':
    "Vienna ran Croatia's border for four centuries and staffed half its army with Croatian officers and all of its best moustaches. The empire's HR department meets its old security detail. Expect deep organisation, zero romance, and one 25-yarder out of pure spite.",
  'Belgium|USA':
    "Flanders fields hold thousands of Americans who died evicting Germany from Belgium, and Belgian chocolate and guilt have flowed west ever since. Meanwhile FN Herstal quietly arms half of America — the world's politest arms dealer versus its very best customer.",
  'Senegal|USA':
    "Gorée Island's Door of No Return points across the Atlantic directly at America — the two ends of history's worst supply chain, meeting at a World Cup in the destination country. One team can visit the memorials. The other one's economy was the exhibit.",
  'Belgium|Bosnia & Herzegovina':
    "One country's crimes happened far away in the Congo and turned a profit; the other's tragedy happened in Europe, on television, while everyone watched and drafted memos. Brussels writes the rules now. Sarajevo remembers what happens while the rules are being drafted.",
  'Bosnia & Herzegovina|Senegal':
    "A Bosnian and a Senegalese soldier could have faced each other in 1917 — one drafted by Vienna, one by Paris, neither consulted. Their great-grandsons meet on grass, in their own shirts, under their own flags. Progress is slow, but it does occasionally score.",
  'Argentina|Australia':
    "Two settler nations at opposite ends of the Pacific, both convinced they're European, both wrong. Argentina has never lost to Australia at a World Cup — but Australia won the 1988 Bicentennial Gold Cup, a trophy celebrating colonisation itself. You could not script this fixture darker if you tried.",
  'Argentina|Egypt':
    "One civilisation is 5,000 years old; the other treats its 1913 GDP ranking as a personality. Messi is already remembered like a pharaoh — worshipped, embalmed in statistics, surrounded by people trying to get into the tomb. Tonight the actual pharaohs' descendants check the security.",
  'Australia|Cape Verde':
    "One was founded as a British prison, the other as a Portuguese slave depot — both open conversations with 'you'll never guess how we started.' Two nations of beaches, diaspora, and grievances with Lisbon and London respectively. The prison colony is favourite; the depot has less to lose.",
  'Cape Verde|Egypt':
    "The pharaohs built monuments to eternity; Cape Verde built boats to leave. The oldest state on Earth versus one of the newest, five thousand years of paperwork between them. The ball, mercifully, respects neither carbon dating nor visa queues.",
  'Colombia|Switzerland':
    "Where did Colombia's most controversial export economy historically keep its profits? In the other team's basement, is where. Producer meets distributor at last — the most honest fixture of the round, listed by UEFA as 'neutral ground.'",
  'Ghana|Switzerland':
    "Most of the world's gold — including Ghana's — passes through Swiss refineries, where it gets a stamp and loses its accent. The mine plays the safe tonight. The safe is favourite. That, in one sentence, is the entire twentieth century.",
  'Algeria|Colombia':
    "The 20th century used one as a colonial battleground and the other as a drug-war theatre, then billed both for damages. They produced Zidane's bloodline and García Márquez's typewriter anyway. Magic realism versus le football champagne — realism is magic where these two are from.",
  'Algeria|Ghana':
    "Africa's first nation to break free by ballot meets the one that needed 132 years and a war of independence. Nkrumah's Ghana and the FLN's Algeria sheltered and funded each other's revolutions — tonight is two liberation movements comparing notes, with a whistle.",

  // ── Deeper rounds (likely collisions) ──
  'France|Morocco':
    "The 2022 semi-final again: protectorate versus metropole, half the Moroccan squad born in France and playing against their own birth certificates. Paris deployed riot police for the last one. Everyone is older now, wiser, and exactly as unhinged.",
  'Canada|France':
    "France traded Canada away to Britain in 1763, deciding a sugar island mattered more than Quebec — the worst swap in imperial history until someone invents fantasy football. Seven million abandoned francophones would like a word, and the word is in joual, and France will pretend not to understand it.",
  'Canada|Paraguay':
    "The hemisphere's two most underrated war records: Canada stormed Vimy Ridge and got remembered as polite; Paraguay fought three countries at once and got remembered as a warning label. Underdogs with body counts. Someone's niceness is a front.",
  'Morocco|Paraguay':
    "Two nations no empire could digest: Morocco outlasted the Ottomans and the French; Paraguay survived a war that should have deleted it from the map. The tournament's great endurance artists, meeting in a fixture that is legally guaranteed to reach penalties.",
  'Brazil|England':
    "England invented the game and Brazil made it art, and 1970 settled the argument so thoroughly that England spent five decades studying the tape. Gordon Banks made the save of the century that day and England still lost — the most English sentence ever written.",
  'Brazil|Mexico':
    "Mexico's quarter-final curse meets its favourite executioner. Brazil ended El Tri's last two World Cups, one of them via Neymar's theatrical genius and all of them via Mexican lawyers drafting complaints to FIFA. Somewhere, Memo Ochoa is stretching. Just in case.",
  'England|Norway':
    "The Vikings ran England for a century under the Danegeld — history's original protection racket — and Norwegian still lives inside English like a sleeper cell: 'knife,' 'ransack,' 'berserk.' Tonight the longships return, funded by a sovereign wealth fund and a 9-goal striker.",
  'Argentina|Brazil':
    "South America's forever war, waged without weapons since 1828 and without mercy since. Pelé or Maradona — a question that has ended marriages on two continents. The Superclásico at a World Cup: somewhere a Uruguayan whispers 'we won it first' and nobody hears him. Again.",
  'Argentina|England':
    "1986: the Hand of God and the Goal of the Century, four minutes apart, four years after the Falklands. Maradona called it 'pickpocketing an Englishman.' England brought VAR this time — closing the stable door forty years after the horse robbed you at sea.",
  'Argentina|France':
    "The 2022 final was the greatest match ever played, and both nations have spent four years refusing to emotionally process it. Argentine fans wrote songs about Mbappé; the Argentine keeper saved his changed-nothing hat-trick for the trophy photos. The rematch was inevitable. It's here.",
  'England|France':
    "A thousand years of taking turns burning each other's coastlines, briefly interrupted by two world wars of deeply awkward alliance. The Hundred Years' War ran 116 years because neither side could admit it was over — the exact energy this fixture's penalty shootout will have.",
  'Brazil|France':
    "1998: Ronaldo's mystery seizure hours before the final, a defeat so strange Brazil held an actual parliamentary inquiry into a football match. 2006: Zidane declined the inquiry and answered with his instep. France owns Brazil at World Cups. Brazil owns the transcripts.",
  'England|Spain':
    "The Armada sank in 1588 and England has done victory laps for 437 years, quietly omitting that its own counter-Armada sank the following year. Gibraltar is still parked on Spain's foot like an abandoned shopping trolley. The Euro 2024 final gets its rematch, with imperial baggage.",
  'France|Spain':
    "Napoleon put his brother on Spain's throne; Spain responded by inventing the word 'guerrilla' specifically to remove him. Goya painted what happened next, and it is not in the gift shop. Two footballing aristocracies, one genuinely deranged historical grudge.",
  'Mexico|USA':
    "The border derby at the World Cup they're co-hosting — divorced parents splitting the wedding bill. One took half the other's territory in 1848 and now argues about the fence around it. 'Dos a cero' is an American folk song; 'Cielito Lindo' is the answer. Canada will watch politely from the spare room.",
};

const FALLBACKS = [
  "These two nations have never fought a war against each other, which historians attribute to distance, disinterest, and neither being able to afford the shipping. Ninety minutes to make up for lost time.",
  "No shared wars, no disputed borders, no stolen exhibits in either's museums from the other — a bilateral record so clean it's frankly suspicious. Interpol has been notified. Kickoff is on schedule.",
  "History kept them apart. Geography kept them apart. FIFA, a more powerful force than either, said 'be there Tuesday.'",
  "Diplomatic relations: cordial. Trade: negligible. Grudges: none on file. Tonight two nations invent a rivalry from absolutely nothing, which is how every good one started.",
  "Their empires never overlapped, their wars never intersected, and their diasporas mostly met at other people's taxi ranks. Football: finally giving these two a reason.",
  "The history books contain nothing on this fixture — which the losing team will, by 11pm tonight, describe as 'the good old days.'",
  "Somewhere in an archive there is exactly one strongly worded letter between these two foreign ministries, circa 1907, concerning fishing rights. Tonight it escalates.",
  "Two nations with no shared history and therefore no excuses. Whatever happens out there tonight is original sin.",
  "Never allies, never enemies, never within artillery range of each other. The 20th century somehow missed this matchup, and the 20th century missed nothing. Long overdue.",
  "No colonial paperwork connects these two — a World Cup rarity, like meeting a stranger at a family reunion. They'll be properly related by full time.",
  "The United Nations seats them fourteen desks apart and they have never once passed a note. Tonight, in front of eighty thousand people, the note gets passed. It says 'you're going home.'",
  "War never happened here because someone's navy would have had to pack lunch. The distance has finally been closed by the only institution more expansionist than any empire: the World Cup group stage's paperwork.",
];

const norm = (s) => (s || '').trim();

export function getBanter(teamA, teamB) {
  const [a, b] = [norm(teamA), norm(teamB)].sort();
  const hit = PAIRS[`${a}|${b}`];
  if (hit) return hit;
  let h = 0;
  for (const ch of a + b) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACKS[h % FALLBACKS.length];
}
