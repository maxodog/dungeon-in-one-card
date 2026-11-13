const E=require('../engine.js');
const A='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
let fails=0; const ck=(n,c)=>{ if(!c){fails++;console.log('FALLA',n);} };
const same=(r,st,items)=>r&&r.game===st.game&&r.hero===st.hero&&r.levelIdx===st.levelIdx&&r.adv.hp===st.adv.hp&&
  r.adv.spd===st.adv.spd&&r.adv.atk===st.adv.atk&&r.adv.def===st.adv.def&&r.adv.rng===st.adv.rng&&
  JSON.stringify(r.cp.items)===JSON.stringify(items)&&r.chests===st.chests&&(r.loot||0)===(st.loot||0)&&r.cp.hp===st.adv.hp;

// --- formatos antiguos: 4 caracteres (base) y 5 (Montaña antigua, sin cofres), solo 5 héroes originales
function legacy(game,nL,len,itemSets,chests){
  let n=0,bad=0;const seen=new Set();
  for(const hero of E.HERO_KEYS.slice(0,5)) for(let L=0;L<nL;L++) for(let a=0;a<=L;a++) for(let b=0;a+b<=L;b++) for(let c=0;a+b+c<=L;c++) for(let d=0;a+b+c+d<=L;d++) for(let hp=1;hp<=6;hp++) for(const items of itemSets){
    const st=E.newRun(hero,game,items,chests); st.adv.hp=hp; st.adv.spd=1+a; st.adv.atk=1+b; st.adv.def=1+c; st.adv.rng=2+d; E.setupLevel(st,L);
    const pw=E.encodePassword(st); n++;
    if(!pw||pw.length!==len||seen.has(pw)){bad++;continue;} seen.add(pw);
    if(!same(E.decodePassword(pw),st,st.cp.items)) bad++;
  }
  return {n,bad,u:seen.size};
}
const b=legacy('base',12,4,[[]],undefined);
console.log('base 4 car.:',b.n,'únicos',b.u,'errores',b.bad,'esperado',E.PW_TOTAL/5*5); ck('base',b.bad===0&&b.n===E.PW_TOTAL&&b.u===E.PW_TOTAL);
const sets=[[]];for(let m=1;m<32;m++){const it=E.ITEM_KEYS.slice(0,5).filter((_,k)=>(m>>k)&1);if(it.length<=3)sets.push(it);}
const p=legacy('peak',10,5,sets,false);
console.log('peak 5 car.:',p.n,'únicos',p.u,'errores',p.bad,'esperado',E.PW5_TOTAL); ck('peak',p.bad===0&&p.n===E.PW5_TOTAL&&p.u===E.PW5_TOTAL);
const old=E.decodePassword('DAY3'); ck('DAY3',old&&old.hero==='paladin'&&old.levelIdx===0&&old.adv.hp===1&&old.game==='base'); console.log('DAY3 →',old.hero,old.levelIdx+1,old.adv.hp);

// --- formato de 7 caracteres: barrido por aventura (muestreo determinista de héroe/vida/mejoras/objetos y todos los niveles)
let seen7=new Map(), n7=0, bad7=0; const seenS=new Set();
function check7(st){
  n7++; const pw=E.encodePassword(st); const items=st.cp.items.slice().sort((a,b)=>E.ITEM_KEYS.indexOf(a)-E.ITEM_KEYS.indexOf(b));
  if(!pw||pw.length!==(st.game==='hell'?8:7)){bad7++;console.log('sin contraseña',st.game,st.hero,st.levelIdx,pw);return;}
  const sk=[st.game,st.hero,st.levelIdx,st.adv.hp,st.adv.spd,st.adv.atk,st.adv.def,st.adv.rng,items.join(),st.loot||0].join('|');
  if(seenS.has(sk)){n7--;return;} seenS.add(sk);
  if(seen7.has(pw)){bad7++;console.log('colisión',pw);return;} seen7.set(pw,1);
  if(!same(E.decodePassword(pw),st,items)){bad7++;console.log('no coincide',pw,st.game,st.hero,st.levelIdx);}
}
const ik=E.ITEM_KEYS;
for(const g of [...E.PW7_GAMES,E.PW8_GAME]){ 
  const heroes=E.HERO_KEYS;
  for(const hero of heroes){
    E.useGame(g.key);
    const nLv=E.LEVELS.length;
    for(let L=0;L<nLv;L++){
      const lv=E.LEVELS[L], upLevels=lv.boss?3*lv.boss-1:lv.num-1; // mejoras posibles al empezar el nivel
      for(let hp=1;hp<=6;hp++){
        const reps=[[0,0,0,0],[upLevels,0,0,0],[0,0,0,upLevels],[Math.floor(upLevels/2),upLevels-Math.floor(upLevels/2),0,0]];
        for(const u of reps){
          const items=g.items?[ik[(L+hp)%15],ik[(L*3+hero.length)%15],ik[(hp*7+L)%15]].filter((x,i,a)=>a.indexOf(x)===i).slice(0,(L+hp)%4):[];
          const st=E.newRun(hero,g.key,items); st.adv.hp=hp; st.adv.spd=1+u[0]; st.adv.atk=1+u[1]; st.adv.def=1+u[2]; st.adv.rng=2+u[3];
          E.setupLevel(st,L,lv.boss?{loot:(hp+L)%7}:null);
          // base/hasta héroes originales solo usan 7 car. cuando no entran en el formato antiguo
          const pw=E.encodePassword(st);
          if(pw&&pw.length!==7&&pw.length!==8) continue;   // formato antiguo, ya validado arriba
          check7(st);
        }
      }
    }
  }
}
console.log('7 caracteres:',n7,'estados, únicos',seen7.size,'errores',bad7); ck('7car',bad7===0&&n7>1000);
console.log('espacio 7 car.:',E.pw7Total.toLocaleString(),'de',(2**30).toLocaleString());
// aleatorias
let ok4=0,ok5=0,ok7=0,T=200000;
let ok8=0; for(const [len,fn] of [[4,()=>ok4++],[5,()=>ok5++],[7,()=>ok7++],[8,()=>ok8++]]) for(let i=0;i<T;i++){let s='';for(let j=0;j<len;j++)s+=A[Math.floor(Math.random()*32)]; if(E.decodePassword(s))fn();}
console.log('aleatorias válidas 4:',(100*ok4/T).toFixed(1)+'% | 5:',(100*ok5/T).toFixed(1)+'% | 7:',(100*ok7/T).toFixed(2)+'% | 8:',(100*ok8/T).toFixed(2)+'%');
ck('inválidas',E.decodePassword('0000')===null&&E.decodePassword('ABC')===null&&E.decodePassword('ABCDEF')===null&&E.decodePassword('ABCDEFGH')===null);
console.log(fails?'HAY FALLOS '+fails:'todo bien');
process.exit(fails?1:0);
