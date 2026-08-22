import { buildShape, parseFormation, lineOf } from '../src/utils/formation.js';

const mk = (pos, place, i) => ({ id:i, name:`P${i}`, pos, place, jersey:String(i) });
// build an XI from a formation, as ESPN would send it
function xiFor(formation, { places = true, posOk = true } = {}) {
  const rows = formation.split('-').map(Number);
  const out = [mk('G', 1, 1)];
  let n = 2;
  const tag = ['D','M','F'];
  rows.forEach((c, i) => {
    // more than 3 lines: middle ones are still midfield
    const p = rows.length <= 3 ? tag[i] : (i === 0 ? 'D' : i === rows.length-1 ? 'F' : 'M');
    for (let j=0;j<c;j++) out.push(mk(posOk ? p : '', places ? n : 99, n)), n++;
  });
  return out;
}

let pass = 0, fail = 0;
const check = (name, cond, extra='') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };

console.log('— parseFormation —');
check('4-4-2', JSON.stringify(parseFormation('4-4-2'))==='[4,4,2]');
check('4-2-3-1', JSON.stringify(parseFormation('4-2-3-1'))==='[4,2,3,1]');
check('3-4-2-1', JSON.stringify(parseFormation('3-4-2-1'))==='[3,4,2,1]');
check('rejects sum!=10', parseFormation('4-4-3')===null);
check('rejects 11-incl-gk', parseFormation('1-4-4-2')===null);
check('rejects junk', parseFormation('abc')===null);
check('rejects empty', parseFormation('')===null && parseFormation(null)===null);

console.log('— lineOf —');
check('G', lineOf('G')==='G'); check('GK', lineOf('GK')==='G');
check('CB->D', lineOf('CB')==='D'); check('LWB->D', lineOf('LWB')==='D');
check('CDM->M', lineOf('CDM')==='M'); check('AM->M', lineOf('AM')==='M');
check('ST->F', lineOf('ST')==='F'); check('LW->F', lineOf('LW')==='F');
check('unknown->M', lineOf('ZZ')==='M');

console.log('— buildShape across real formations —');
for (const f of ['4-4-2','4-3-3','3-5-2','4-2-3-1','5-3-2','4-1-4-1','3-4-2-1','4-5-1','5-4-1','4-4-1-1']) {
  const s = buildShape({ formation: f, xi: xiFor(f) });
  check(`${f} builds`, !!s, f);
  if (!s) continue;
  check(`${f} 11 slots`, s.slots.length===11, `got ${s.slots.length}`);
  check(`${f} keeps formation`, s.formation===f, `got ${s.formation}`);
  const ys = new Set(s.slots.map(x=>x.depth));
  check(`${f} lines = ${f.split('-').length}+gk`, ys.size===f.split('-').length+1, `got ${ys.size}`);
  check(`${f} all x in range`, s.slots.every(x=>x.x>=5&&x.x<=95));
  check(`${f} no dup player`, new Set(s.slots.map(x=>x.player.id)).size===11);
  check(`${f} gk deepest`, s.slots[0].depth===Math.min(...s.slots.map(x=>x.depth)));
}

console.log('— fallbacks —');
// no formation string: derive from positions
let s = buildShape({ formation:null, xi: xiFor('4-4-2') });
check('derives 4-4-2 from positions', s && s.formation==='4-4-2', s&&s.formation);
// formation string present but nonsense: derive instead
s = buildShape({ formation:'9-9-9', xi: xiFor('4-3-3') });
check('bad string -> derives', s && s.formation==='4-3-3', s&&s.formation);
// formation ok but places missing -> derive from positions
s = buildShape({ formation:'4-2-3-1', xi: xiFor('4-2-3-1', {places:false}) });
check('no places -> still builds', !!s);
check('no places -> reads lines from positions', s && s.formation==='4-5-1', s&&s.formation);
// no formation AND no positions -> null (refuse to guess)
s = buildShape({ formation:null, xi: xiFor('4-4-2', {places:false, posOk:false}).map(p=>({...p,pos:''})) });
check('no data at all -> null', s===null, JSON.stringify(s&&s.formation));
// 10 men listed -> null
s = buildShape({ formation:'4-4-2', xi: xiFor('4-4-2').slice(0,10) });
check('10 players -> null', s===null);
// two keepers -> derived path refuses
const twoGk = xiFor('4-4-2'); twoGk[1] = mk('G', 2, 2);
s = buildShape({ formation:null, xi: twoGk });
check('two keepers -> null', s===null, s&&s.formation);
// duplicate places -> falls back rather than trusting them
const dup = xiFor('4-4-2').map(p=>({...p, place:5}));
s = buildShape({ formation:'4-4-2', xi: dup });
check('dup places -> still builds via positions', !!s);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
