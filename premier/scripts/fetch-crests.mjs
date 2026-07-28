// Download club crests into public/crests/<TLA>.png at deploy time.
//
// This runs in CI, where the runner has open network access — the dev container
// this was written in does not, so the ids below are best-effort and the script
// is deliberately forgiving: anything it can't fetch is simply skipped, and the
// app falls back to generated insignia for that club. The summary it prints
// tells us exactly which ids are wrong so they can be corrected.
//
// Source: football-data.org's public crest CDN (no key required for images).

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'crests');
const BASE = 'https://crests.football-data.org';

// TLA -> football-data.org team id. Verified ids for the well-known clubs;
// the rest are best guesses and will be corrected from the CI summary.
const IDS = {
  ARS: 57, MCI: 65, LIV: 64, MUN: 66, CHE: 61, AVL: 58, NEW: 67, TOT: 73,
  BHA: 397, CRY: 354, NFO: 351, EVE: 62, FUL: 63, BRE: 402, BOU: 1044,
  LEE: 341, SUN: 71, IPS: 349, COV: 1076, HUL: 322,
  WHU: 563, WOL: 76, BUR: 328, BIR: 332, MID: 343, SHU: 356, WRX: 1160,
  SOU: 340, NOR: 68, WBA: 74, WAT: 346, BRC: 387,
  STK: 70, SWA: 72, QPR: 69, BLB: 59, PNE: 1081, CAR: 715, DER: 342,
  POR: 325, MIL: 384, CHA: 348, BOL: 329, LIN: 379,
};

await mkdir(OUT, { recursive: true });

const ok = [];
const failed = [];

async function grab(tla, id) {
  for (const ext of ['png', 'svg']) {
    try {
      const res = await fetch(`${BASE}/${id}.${ext}`, {
        headers: { 'User-Agent': 'eagles-nest-sweep/1.0 (private club app)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      // Guard against HTML error pages served with a 200
      if (buf.length < 500) continue;
      const isPng = buf[0] === 0x89 && buf[1] === 0x50;
      const isSvg = buf.slice(0, 400).toString('utf8').includes('<svg');
      if (!isPng && !isSvg) continue;
      await writeFile(join(OUT, `${tla}.png`), buf);
      ok.push(`${tla}(${id}.${ext})`);
      return true;
    } catch { /* try next extension */ }
  }
  failed.push(`${tla}(${id})`);
  return false;
}

await Promise.all(Object.entries(IDS).map(([tla, id]) => grab(tla, id)));

console.log(`\ncrests: ${ok.length} fetched, ${failed.length} missing`);
if (ok.length) console.log('  ok     :', ok.sort().join(' '));
if (failed.length) console.log('  MISSING:', failed.sort().join(' '), '\n  (these clubs fall back to generated insignia)');

// Never fail the build over artwork
process.exit(0);
