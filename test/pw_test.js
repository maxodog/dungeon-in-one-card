const E=require('../src/engine.js');
let n=0, bad=0; const seen=new Map();
for (const hero of E.HERO_KEYS) for (let L=0;L<12;L++) for(let a=0;a<=L;a++) for(let b=0;a+b<=L;b++) for(let c=0;a+b+c<=L;c++) for(let d=0;a+b+c+d<=L;d++) for(let hp=1;hp<=6;hp++){
  const st=E.newRun(hero); st.adv.hp=hp; st.adv.spd=1+a; st.adv.atk=1+b; st.adv.def=1+c; st.adv.rng=2+d; E.setupLevel(st,L);
  const pw=E.encodePassword(st); n++;
  if(!pw||pw.length!==4||seen.has(pw)){bad++; continue;} seen.set(pw,1);
  const r=E.decodePassword(pw);
  if(!r||r.hero!==hero||r.levelIdx!==L||r.adv.hp!==hp||r.adv.spd!==1+a||r.adv.atk!==1+b||r.adv.def!==1+c||r.adv.rng!==2+d||r.cp.hp!==hp) bad++;
}
console.log('estados',n,'esperado',E.PW_TOTAL,'únicos',seen.size,'errores',bad);
// cadenas al azar: cuántas son válidas
let ok=0, T=200000; const A='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
for(let i=0;i<T;i++){let s='';for(let j=0;j<4;j++)s+=A[Math.floor(Math.random()*32)]; if(E.decodePassword(s))ok++;}
console.log('aleatorias válidas', (100*ok/T).toFixed(1)+'%', '| minúsculas y espacios:', !!E.decodePassword(' '+[...seen.keys()][5].toLowerCase()+' '), '| inválidas:', E.decodePassword('0000'), E.decodePassword('ABC'));
console.log('ejemplos', [...seen.keys()].slice(0,5).join(' '));
// habilidades
const st=E.newRun('ranger'); st.turn.dice=[3,4,5]; E.toggleRanger(st); st.turn.assign.rng=0; st.turn.assign.atk=1; st.turn.assign.def=2;
console.log('ranger completo', E.assignComplete(st.turn)); E.confirmEnergy(st); console.log('alc', st.turn.rng, 'mov', st.turn.spd, 'prev', JSON.stringify(st.prev));
const p=E.newRun('paladin'); p.prev={spd:4,atk:2}; console.log('paladin hab', JSON.stringify(E.abilityInfo(p))); E.rollWithKeep(p,'atk'); console.log('keep', p.turn.dice[0], p.turn.assign.atk, p.turn.lock, p.abil);
