// lift the matcher out of the worker verbatim and exercise it
const norm = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/\b(fc|afc)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function makeFits(home, homeShort, away, awayShort) {
  const sameClub = (segment, full, short) => {
    const s = norm(segment);
    if (!s) return false;
    for (const name of [norm(full), norm(short)]) {
      if (!name) continue;
      if (s === name) return true;
      if (name.length >= 4 && s.includes(name)) return true;
      if (s.length >= 4 && name.includes(s)) return true;
    }
    return false;
  };
  return (title) => {
    const parts = String(title || '').split('|');
    if (parts.length < 2) return false;
    const rest = norm(parts.slice(1).join(' '));
    if (!rest.includes('highlight')) return false;
    const fixture = parts[0].match(/^\s*(.+?)\s+v\.?\s+(.+?)\s*$/i);
    if (!fixture) return false;
    return sameClub(fixture[1], home, homeShort) && sameClub(fixture[2], away, awayShort);
  };
}

let pass=0, fail=0;
const t=(want,got,label)=>{ if(want===got){pass++;} else {fail++; console.log(`  FAIL ${label}  wanted ${want} got ${got}`);} };

// the two the user reported
const chelsea = makeFits('Fulham FC','Fulham','Chelsea FC','Chelsea');
console.log('— Fulham v Chelsea —');
t(true,  chelsea('Fulham v Chelsea | Highlights | Premier League 2026/27'), 'the real one');
t(false, chelsea('Chelsea v Fulham | Highlights | Premier League 2026/27'), 'REVERSE fixture');
t(false, chelsea('Chelsea v Arsenal | Highlights | Premier League 2026/27'), 'other Chelsea game');
t(false, chelsea('Fulham v Brentford | Highlights | Premier League 2026/27'), 'other Fulham game');
t(false, chelsea('Chelsea, Fulham and Arsenal | Every goal | Premier League 2026/27'), 'compilation naming both');
t(false, chelsea('Matchweek 1 | All the highlights | Premier League 2026/27'), 'round-up');
t(false, chelsea('Fulham v Chelsea | Preview | Premier League 2026/27'), 'preview not highlights');
t(false, chelsea('Fulham v Chelsea'), 'no pipe, not their format');

const bmth = makeFits('Manchester City FC','Man City','AFC Bournemouth','Bournemouth');
console.log('— Man City v Bournemouth —');
t(true,  bmth('Manchester City v AFC Bournemouth | Highlights | Premier League 2026/27'), 'full names');
t(true,  bmth('Man City v Bournemouth | Highlights | Premier League 2026/27'), 'short names');
t(false, bmth('AFC Bournemouth v Manchester City | Highlights | Premier League 2026/27'), 'REVERSE fixture');
t(false, bmth('Manchester United v AFC Bournemouth | Highlights | Premier League 2026/27'), 'United not City');

console.log('— awkward club names still match —');
t(true, makeFits('Nottingham Forest FC','Forest','Leeds United FC','Leeds')("Nott'm Forest v Leeds United | Highlights | Premier League 2026/27"), 'apostrophe short form');
t(true, makeFits('Brighton & Hove Albion FC','Brighton','Aston Villa FC','Aston Villa')('Brighton & Hove Albion v Aston Villa | Highlights | Premier League 2026/27'), 'ampersand');
t(true, makeFits('Tottenham Hotspur FC','Spurs','Everton FC','Everton')('Spurs v Everton | Highlights | Premier League 2026/27'), 'Spurs short form');
t(true, makeFits('Wolverhampton Wanderers FC','Wolves','Stoke City FC','Stoke')('Wolves v Stoke City | Highlights | Premier League 2026/27'), 'Wolves');

console.log('— the pair that must never cross —');
const mci = makeFits('Manchester City FC','Man City','Arsenal FC','Arsenal');
t(false, mci('Manchester United v Arsenal | Highlights | Premier League 2026/27'), 'Man Utd must not match Man City');
const mun = makeFits('Manchester United FC','Man Utd','Arsenal FC','Arsenal');
t(false, mun('Manchester City v Arsenal | Highlights | Premier League 2026/27'), 'Man City must not match Man Utd');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
