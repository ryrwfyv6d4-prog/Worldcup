// The editorial lines under each masthead. Generated from the live standings so
// they stay true — never hard-coded copy.
import { getTeam } from '../data/england2027.js';

function clubList(teams, n = 2) {
  return teams.slice(0, n).map((t) => getTeam(t)?.short || t).join(' and ');
}

// Standings strapline: leader + gap, and whoever is propping it up.
export function tableLine(ladder, anyResults) {
  if (!ladder.length) return 'Nobody drawn yet. The season starts without you.';
  if (!anyResults) {
    return `${ladder.length} in, four clubs each, not a ball kicked. Everyone is joint top and everyone is wrong.`;
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
export function fixturesLine(matches, mineCount) {
  if (!matches.length) return 'Nothing on. Enjoy the weekend off.';
  const live = matches.filter((m) => m.status === 'IN_PLAY').length;
  if (live) return `${live} still running. Nobody is safe until the whistle.`;
  if (mineCount === 0) return 'None of yours this week. A rare weekend of watching in peace.';
  return `${mineCount} of yours in this lot. Points on the table either way.`;
}

// Wall strapline
export const WALL_LINE = 'Photographic evidence. Kept for the tribunal in May.';
