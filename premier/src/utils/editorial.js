// The editorial lines under each masthead. Generated from the live standings so
// they stay true — never hard-coded copy.
import { getTeam } from '../data/england2027.js';
import { clubLabel } from './teamMatch.js';

function clubList(teams, n = 2) {
  return teams.slice(0, n).map((t) => clubLabel(t)).join(' and ');
}

// Standings strapline: leader + gap, and whoever is propping it up.
export function tableLine(ladder, anyResults) {
  if (!ladder.length) return 'Nobody drawn yet. The season starts without you.';
  if (!anyResults) {
    // The squad size comes from the headcount, so "four" was a guess that goes
    // wrong the moment twelve turn up and everyone gets three.
    const each = ladder[0] && ladder[0].teams ? ladder[0].teams.length : 4;
    return `${ladder.length} in, ${each} club${each === 1 ? '' : 's'} each, not a ball kicked. `
      + 'Everyone is joint top and everyone is wrong.';
  }
  const top = ladder[0];
  const second = ladder[1];
  const bottom = ladder[ladder.length - 1];
  const gap = second ? top.total - second.total : 0;

  const lead = gap === 0 && second
    ? `${top.name} and ${second.name} are level at the top.`
    : gap <= 3
      ? `${top.name} leads by ${gap}, which is nothing at all.`
      : `${top.name} is ${gap} clear at the top and insufferable about it.`;

  const tail = bottom && bottom !== top
    ? ` ${bottom.name} has ${clubList(bottom.teams)}. Pray for ${bottom.name}.`
    : '';

  return lead + tail;
}

// A line for the bottom club in the table
export function lastPlaceJibe(row) {
  if (!row) return null;
  return 'Buying the crisps at Christmas.';
}

// Fixtures closing line — reacts to what is actually on
export function fixturesLine(matches, mineCount, hasClubs = true) {
  if (!matches.length) return 'Nothing on. Enjoy the weekend off.';
  const live = matches.filter((m) => m.status === 'IN_PLAY').length;
  if (live) return `${live} still running. Nobody is safe until the whistle.`;
  // Someone who tapped "just watching" has no clubs at all, and being told
  // none of theirs are out reads as a bug rather than a joke.
  if (mineCount === 0) {
    return hasClubs
      ? 'None of yours this week. A rare weekend of watching in peace.'
      : `${matches.length} on. No skin in it, so enjoy them all.`;
  }
  return `${mineCount} of yours in this lot. Points on the table either way.`;
}

// Wall strapline
export const WALL_LINE = 'Photographic evidence. Kept for the tribunal in May.';
