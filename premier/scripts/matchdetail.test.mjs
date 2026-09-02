// Regression tests for the ESPN match-summary normalisers.
//
// Why these exist: the openfootball parser was written against an assumed
// shape, failed silently, and produced plausible-looking rubbish for weeks.
// The match-centre normalisers reach four levels into a feed this container
// cannot call, so the shapes below are copied verbatim out of the CI probe
// (scripts/probe-summary.mjs, run 287) rather than guessed. If ESPN changes
// the feed these will not catch it — the probe is what does that — but they do
// pin the code to what the feed really said on the day it was read.

import {
  statRow, normaliseStatGroups, normaliseCommentary, normaliseH2H, normaliseForm,
  normaliseOdds, impliedFromMoneyline,
} from '../src/hooks/useMatchDetail.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL:', name, extra); }
};

// ── Stat rows ───────────────────────────────────────────────────────────────
console.log('— stat rows —');

// West Bromwich Albion v Burnley, exactly as the boxscore returned it
const WBA = {
  foulsCommitted: 8, yellowCards: 1, redCards: 0, offsides: 8, wonCorners: 3,
  saves: 3, possessionPct: 51.3, totalShots: 11, shotsOnTarget: 7, shotPct: 0.6,
  penaltyKickGoals: 0, penaltyKickShots: 1, accuratePasses: 446, totalPasses: 508,
  passPct: 0.9, accurateCrosses: 3, totalCrosses: 12, crossPct: 0.3,
  totalLongBalls: 35, accurateLongBalls: 10, longballPct: 0.3, blockedShots: 2,
  effectiveTackles: 7, totalTackles: 12, tacklePct: 0.6, interceptions: 11,
  effectiveClearance: 21, totalClearance: 21,
};
const BUR = {
  foulsCommitted: 13, yellowCards: 2, redCards: 0, offsides: 0, wonCorners: 6,
  saves: 4, possessionPct: 48.7, totalShots: 11, shotsOnTarget: 3, shotPct: 0.3,
  penaltyKickGoals: 0, penaltyKickShots: 0, accuratePasses: 406, totalPasses: 479,
  passPct: 0.8, accurateCrosses: 6, totalCrosses: 16, crossPct: 0.4,
  totalLongBalls: 54, accurateLongBalls: 26, longballPct: 0.5, blockedShots: 5,
  effectiveTackles: 5, totalTackles: 12, tacklePct: 0.4, interceptions: 4,
  effectiveClearance: 10, totalClearance: 10,
};

const poss = statRow({ key: 'possessionPct', label: 'Ball possession', pct: true }, WBA, BUR);
check('possession is already 0-100, not a ratio', poss.home === '51%' && poss.away === '49%',
  `${poss.home}/${poss.away}`);
check('possession bar splits by share', Math.round(poss.homeShare) === 51, poss.homeShare);

const passPct = statRow({ key: 'passPct', label: 'Pass accuracy', pct: true }, WBA, BUR);
check('other percentages are ratios and get scaled', passPct.home === '90%', passPct.home);

const shots = statRow({ key: 'totalShots', label: 'Total shots' }, WBA, BUR);
check('an equal row has no winner', shots.better === null, String(shots.better));
check('an equal row splits the bar evenly', Math.round(shots.homeShare) === 50, shots.homeShare);

const onTarget = statRow({ key: 'shotsOnTarget', label: 'On target' }, WBA, BUR);
check('more is better for shots on target', onTarget.better === 'home', String(onTarget.better));

// The one that a naive numeric comparison gets backwards
const fouls = statRow({ key: 'foulsCommitted', label: 'Fouls', low: true }, WBA, BUR);
check('fewer fouls wins the row', fouls.better === 'home', String(fouls.better));
check('fouls still show the real numbers', fouls.home === '8' && fouls.away === '13',
  `${fouls.home}/${fouls.away}`);

const cards = statRow({ key: 'redCards', label: 'Red cards', low: true }, WBA, BUR);
check('a row nobody registered is dropped', cards === null);
check('possession is never dropped',
  statRow({ key: 'possessionPct', label: 'Ball possession', pct: true },
    { possessionPct: 0 }, { possessionPct: 0 }) !== null);
check('a stat neither side has is dropped', statRow({ key: 'nope', label: 'x' }, WBA, BUR) === null);

// ── Groups off the real boxscore ────────────────────────────────────────────
console.log('— grouping —');
const box = {
  teams: [
    { team: { id: '383' }, statistics: Object.entries(WBA).map(([name, v]) => ({ name, displayValue: String(v) })) },
    { team: { id: '379' }, statistics: Object.entries(BUR).map(([name, v]) => ({ name, displayValue: String(v) })) },
  ],
};
const groups = normaliseStatGroups(box, '383', '379');
check('four groups come back', groups.length === 4, String(groups.length));
check('overview leads', groups[0].title === 'Match overview', groups[0].title);
check('red cards did not survive into the overview',
  !groups[0].rows.some((r) => r.key === 'redCards'));
check('possession did', groups[0].rows.some((r) => r.key === 'possessionPct'));
check('the home column is the home club',
  groups[0].rows.find((r) => r.key === 'wonCorners').home === '3');
// swapping the ids must swap the columns, or the whole tab reads backwards
const flipped = normaliseStatGroups(box, '379', '383');
check('ids drive which side is which',
  flipped[0].rows.find((r) => r.key === 'wonCorners').home === '6');
check('an unknown id yields nothing rather than the wrong club',
  normaliseStatGroups(box, '999', '888').length === 0);

// ── Commentary ──────────────────────────────────────────────────────────────
console.log('— commentary —');
// verbatim: keys are sequence, time, text and (not always) play
const COMMENTARY = [
  { sequence: 1, time: { displayValue: '' }, text: 'Lineups are announced and players are warming up.' },
  { sequence: 2, time: { displayValue: '' }, text: 'First Half begins.', play: { type: { text: 'Kickoff' } } },
  { sequence: 3, time: { displayValue: "4'" }, text: 'Foul by Josh Laurent (Burnley).', play: { type: { text: 'Foul' } } },
  { sequence: 4, time: { displayValue: "8'" }, text: 'Own Goal by Callum Styles.', play: { type: { text: 'Own Goal' } } },
  { sequence: 5, time: { displayValue: "9'" }, text: '   ' },
];
const comm = normaliseCommentary(COMMENTARY);
check('blank lines are dropped', comm.length === 4, String(comm.length));
check('newest first', comm[0].text.startsWith('Own Goal'), comm[0].text);
check('minute read off time.displayValue', comm[0].minute === "8'", comm[0].minute);
// the bug this pins: play.scoringPlay is not in this feed, so a flag check
// marked every line with any play type as a key moment, fouls included
check('a foul is not a key moment', comm.find((c) => c.kind === 'Foul').key === false);
check('an own goal is', comm[0].key === true && comm[0].goal === true);
check('kickoff is a key moment', comm.find((c) => c.kind === 'Kickoff').key === true);
check('no play block is not a key moment', comm[3].key === false, String(comm[3].key));

// ── Head to head ────────────────────────────────────────────────────────────
console.log('— head to head —');
// verbatim shape: competitors sit on the event, status is a string and the
// detail lives on statusType — there is no nested competitions array
const SERIES = [{
  type: 'head-to-head',
  summary: 'BUR leads series 1-0-4',
  events: [
    {
      id: '708055', date: '2025-03-11T19:45:00Z', status: 'post',
      statusType: { completed: true, shortDetail: 'FT' },
      competitionName: 'Championship',
      competitors: [
        { homeAway: 'home', winner: false, score: '1', team: { id: '379', displayName: 'Burnley', abbreviation: 'BUR' } },
        { homeAway: 'away', winner: true, score: '2', team: { id: '383', displayName: 'West Bromwich Albion', abbreviation: 'WBA' } },
      ],
    },
    {
      id: '708056', date: '2024-10-02T19:45:00Z', status: 'post',
      statusType: { completed: true, shortDetail: 'FT' },
      competitors: [
        { homeAway: 'home', winner: false, score: '0', team: { id: '383', displayName: 'West Bromwich Albion' } },
        { homeAway: 'away', winner: true, score: '3', team: { id: '379', displayName: 'Burnley' } },
      ],
    },
    // a meeting with no score published: the winner flag has to carry it
    {
      id: '708057', date: '2024-01-05T15:00:00Z', status: 'post',
      statusType: { completed: true, shortDetail: 'FT' },
      competitors: [
        { homeAway: 'home', winner: true, team: { id: '383', displayName: 'West Bromwich Albion' } },
        { homeAway: 'away', winner: false, team: { id: '379', displayName: 'Burnley' } },
      ],
    },
  ],
}];

const h2h = normaliseH2H(SERIES, '383');   // WBA at home in the match being viewed
check('every meeting comes through', h2h.games.length === 3, String(h2h.games.length));
check('newest first', h2h.games[0].id === '708055', h2h.games[0].id);
check('a win away from home still counts as a win', h2h.games[0].result === 'W', h2h.games[0].result);
check('a home defeat reads as a defeat', h2h.games[1].result === 'L', h2h.games[1].result);
check('the winner flag stands in for a missing score', h2h.games[2].result === 'W', h2h.games[2].result);
check('scores land the right way round',
  h2h.games[0].homeScore === 1 && h2h.games[0].awayScore === 2);
check('tally adds up', h2h.homeWins === 2 && h2h.awayWins === 1 && h2h.draws === 0,
  `${h2h.homeWins}/${h2h.draws}/${h2h.awayWins}`);
check('status detail comes off statusType', h2h.games[0].note === 'FT', String(h2h.games[0].note));
check('competition name survives', h2h.games[0].comp === 'Championship', String(h2h.games[0].comp));

// and the whole thing inverts when the other club is at home
const flip = normaliseH2H(SERIES, '379');
check('perspective follows the home id', flip.homeWins === 1 && flip.awayWins === 2,
  `${flip.homeWins}/${flip.awayWins}`);
check('an empty series is not a crash', normaliseH2H([], '383').games.length === 0);
check('a missing series is not a crash', normaliseH2H(undefined, '383').games.length === 0);

// ── Last five ───────────────────────────────────────────────────────────────
console.log('— last five —');
const LAST5 = [
  {
    displayOrder: 1,
    team: { id: '383', displayName: 'West Bromwich Albion' },
    events: [
      { id: '745120', gameDate: '2026-04-21T18:45Z', score: '3-0', gameResult: 'W', competitionName: 'Championship', atVs: 'vs' },
      { id: '745121', gameDate: '2026-04-14T18:45Z', score: '1-1', gameResult: 'D', competitionName: 'Championship', atVs: 'at' },
    ],
  },
  { displayOrder: 2, team: { id: '379', displayName: 'Burnley' }, events: [] },
];
const form = normaliseForm(LAST5);
check('keyed by team id', Boolean(form['383']), Object.keys(form).join(','));
check('the result is taken as given', form['383'].games[0].result === 'W');
check('the score string is kept whole', form['383'].games[0].score === '3-0');
check('a side with no games is still listed', form['379'].games.length === 0);
check('an empty feed is not a crash', Object.keys(normaliseForm(undefined)).length === 0);

// ── The market ──────────────────────────────────────────────────────────────
console.log('— bookmaker odds —');

// verbatim from the probe: Liverpool at Ipswich, two days out. Liverpool were
// -175 favourites away from home.
const ODDS = [{
  provider: { id: '100', name: 'DraftKings', priority: 1 },
  details: 'LIV -175', overUnder: 3.5, spread: 1.5,
  awayTeamOdds: { favorite: true, underdog: false, moneyLine: -175, spreadOdds: 135 },
  homeTeamOdds: { favorite: false, underdog: true, moneyLine: 425, spreadOdds: -105 },
  drawOdds: { moneyLine: 320 },
}];

check('a negative line is the favourite',
  Math.abs(impliedFromMoneyline(-175) - 0.6364) < 0.001, impliedFromMoneyline(-175));
check('a positive line is the underdog',
  Math.abs(impliedFromMoneyline(425) - 0.1905) < 0.001, impliedFromMoneyline(425));
check('zero and rubbish give nothing',
  impliedFromMoneyline(0) === null && impliedFromMoneyline('x') === null
  && impliedFromMoneyline(undefined) === null);

const mkt = normaliseOdds(ODDS);
check('the market comes back', Boolean(mkt));
check('provider kept', mkt.provider === 'DraftKings', mkt.provider);
// the away side was the favourite, so it must carry the biggest share
check('the favourite has the biggest share', mkt.away > mkt.home && mkt.away > mkt.draw,
  `${mkt.home}/${mkt.draw}/${mkt.away}`);
// the bookmaker's margin is stripped, so the three add up exactly
check('the three sum to 100', mkt.home + mkt.draw + mkt.away === 100,
  `${mkt.home}+${mkt.draw}+${mkt.away}`);
check('over/under carried', mkt.goals === 3.5, String(mkt.goals));

// Guessing a nested field name is how this feed has bitten before, so a block
// missing any of the three must yield nothing rather than a partial market.
check('a missing draw price yields nothing',
  normaliseOdds([{ ...ODDS[0], drawOdds: undefined }]) === null);
check('an empty block yields nothing', normaliseOdds([{}]) === null);
check('no odds at all is not a crash',
  normaliseOdds(undefined) === null && normaliseOdds([]) === null);
// it should skip a useless block and take a later usable one
check('skips a broken block for a good one',
  normaliseOdds([{ provider: { name: 'Bad' } }, ODDS[0]])?.provider === 'DraftKings');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
