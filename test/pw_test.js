const E=require('../engine.js');
function sweep(game, nLevels, itemSets) {
  let n=0, bad=0; const seen=new Map();
  for (const hero of E.HERO_KEYS) for (let L=0;L<nLevels;L++) for(let a=0;a<=L;a++) for(let b=0;a+b<=L;b++) for(let c=0;a+b+c<=L;c++) for(let d=0;a+b+c+d<=L;d++) for(let hp=1;hp<=6;hp++) for (const items of itemSets){
    const st=E.newRun(hero,game,items); st.adv.hp=hp; st.adv.spd=1+a; st.adv.atk=1+b; st.adv.def=1+c; st.adv.rng=2+d; E.setupLevel(st,L);
    const pw=E.encodePassword(st); n++;
    const len=game==='peak'?5:4;
    if(!pw||pw.length!==len||seen.has(pw)){bad++; continue;} seen.set(pw,1);
    const r=E.decodePassword(pw);
    const want=JSON.stringify(st.cp.items);
    if(!r||r.game!==game||r.hero!==hero||r.levelIdx!==L||r.adv.hp!==hp||r.adv.spd!==1+a||r.adv.atk!==1+b||r.adv.def!==1+c||r.adv.rng!==2+d||r.cp.hp!==hp||JSON.stringify(r.cp.items)!==want) bad++;
  }
  return {n,bad,uniq:seen.size,keys:[...seen.keys()]};
}
const base=sweep('base',12,[[]]);
console.log('base: estados',base.n,'esperado',E.PW_TOTAL,'únicos',base.uniq,'errores',base.bad);
// Montaña Eterna: todos los subconjuntos de 0..3 objetos (26) × el resto → 1.561.560 estados
const K=E.ITEM_KEYS, sets=[[]];
for(let m=1;m<32;m++){const it=K.filter((_,b)=>(m>>b)&1); if(it.length<=3) sets.push(it);}
const peak=sweep('peak',10,sets);
console.log('peak: estados',peak.n,'esperado',E.PW5_TOTAL,'únicos',peak.uniq,'errores',peak.bad);
let ok=0,T=200000; const A='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
for(let i=0;i<T;i++){let s='';for(let j=0;j<4;j++)s+=A[Math.floor(Math.random()*32)]; if(E.decodePassword(s))ok++;}
let ok5=0; for(let i=0;i<T;i++){let s='';for(let j=0;j<5;j++)s+=A[Math.floor(Math.random()*32)]; if(E.decodePassword(s))ok5++;}
console.log('aleatorias válidas 4:', (100*ok/T).toFixed(1)+'%', '| 5:', (100*ok5/T).toFixed(1)+'%', '| inválidas:', E.decodePassword('0000'), E.decodePassword('ABC'), E.decodePassword('ABCDEF'));
console.log('ejemplos', base.keys.slice(0,3).join(' '), '|', peak.keys.slice(0,3).join(' '));
// compatibilidad: contraseñas del juego original generadas antes (4 héroes) siguen valiendo
const old=E.decodePassword('DAY3'); console.log('DAY3 →', old.hero, old.levelIdx+1, old.adv.hp, old.game);
