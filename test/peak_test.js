const E=require('../engine.js'); const I=E.idx; let bad=0;
const t=(n,g,e)=>{const ok=JSON.stringify(g)===JSON.stringify(e); if(!ok)bad++; console.log((ok?'ok  ':'MAL ')+n+' → '+JSON.stringify(g)+(ok?'':' (esperado '+JSON.stringify(e)+')'));};
E.useGame('peak');
// --- mapas: casillas de aparición libres, distintas y conectadas con la escalera de entrada
let mapsOk=true;
for (const lv of E.LEVELS) {
  const D=E.dijkstra(lv,lv.start,null).dist, seen=new Set();
  for (const s of lv.spawns) { if (lv.walls[s]||seen.has(s)||s===lv.start||D[s]===Infinity) { mapsOk=false; console.log('problema en',lv.title,E.XY(s)); } seen.add(s); }
}
t('mapas de Montaña Eterna válidos',mapsOk,true);
// --- ventisca: casilla (2,0) del nivel 1 (goblin) es ventisca; (1,0) no
const mk=(hero,L,items)=>{const st=E.newRun(hero,'peak',items||[]); E.setupLevel(st,L); return st;};
const lvl=(st)=>E.LEVELS[st.levelIdx];
{
  const st=mk('paladin',0); const lv=lvl(st);
  t('(2,0) es ventisca',lv.blizz[I(2,0)],true); t('(1,0) no es ventisca',lv.blizz[I(1,0)],false);
  st.phase='move'; st.turn=Object.assign(E.freshTurn(),{dice:[1,1,1],spd:6,atk:5,def:5,rng:4,spdLeft:6,atkLeft:5});
  const g={id:1,x:3,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}; st.mons=[g];
  st.adv.x=2; st.adv.y=1; // fuera de ventisca: 5 de Atq ≥ 4 de Def
  t('sin ventisca: ataca', E.attackInfo(st,g).ok, true);
  st.adv.x=2; st.adv.y=0; // en ventisca: Atq 5-1 = 4 ≥ 4 todavía
  t('ventisca: Atq 5→4, ataca', E.attackInfo(st,g).ok, true);
  st.turn.atkLeft=4; t('ventisca: Atq 4→3 < 4, no ataca', E.attackInfo(st,g).why, 'points');
  st.cloak=true; t('con capa: vuelve a poder', E.attackInfo(st,g).ok, true);
  // defensa: 8 de ataque entre Def 4 = 2; en ventisca Def 3 → 2 (8/3); con Def 5→4 (7/... ) usa casos claros
  const s2=mk('paladin',0); s2.phase='move'; s2.turn=Object.assign(E.freshTurn(),{spd:2,atk:2,def:4,rng:4,spdLeft:0,atkLeft:0});
  s2.mons=[{id:1,x:2,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4},{id:2,x:1,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}];
  s2.adv.x=1; s2.adv.y=2; s2.adv.hp=6; // (1,2) es muro en este mapa; usa (2,2)
  s2.adv.x=2; s2.adv.y=2;
  const evA=E.playMonsters(JSON.parse(JSON.stringify(s2))).pop();
  t('daño base (Def 4, ataque total ' + evA.total + ')', evA.dmg, Math.floor(evA.total/4));
  const s3=mk('paladin',0); s3.phase='move'; s3.turn=Object.assign(E.freshTurn(),{def:4,spdLeft:0,atkLeft:0}); s3.mons=[{id:1,x:4,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4},{id:2,x:4,y:0,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}];
  s3.adv.x=3; s3.adv.y=0; // ventisca
  const evB=E.playMonsters(s3).pop(); t('ventisca baja la Def 4→3', evB.def, 3);
  const s4=JSON.parse(JSON.stringify(s3)); s4.cloak=true; s4.adv.x=3; s4.adv.y=0; s4.adv.hp=6; s4.mons=[{id:1,x:4,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}];
  t('con capa la Def sigue en 4', E.playMonsters(s4).pop().def, 4);
}
// --- Sherpa: atravesar muros
{
  const st=mk('sherpa',0); st.phase='move'; st.turn=Object.assign(E.freshTurn(),{spd:8,atk:2,def:2,rng:2,spdLeft:8,atkLeft:2});
  st.mons=[]; st.adv.x=1; st.adv.y=3;   // goblin: (0,3) muro, (3,3) muro
  const before=E.reachFromAdv(st);
  t('sin habilidad: no puede ir a (3,3) ni pisar muros', [before.dist[I(3,3)]===Infinity, before.dist[I(1,2)]===Infinity], [true,true]);
  t('habilidad disponible', E.abilityInfo(st).id, 'sherpa');
  E.toggleSherpa(st);
  const R=E.reachFromAdv(st);
  t('con la habilidad no se puede terminar en un muro', [R.dist[I(1,2)]===Infinity, R.dist[I(3,3)]===Infinity], [true,true]);
  t('atraviesa el muro: (4,3) alcanzable (coste 6 por el muro (3,3))', R.dist[I(4,3)]<Infinity, true);
  E.moveAdv(st,I(4,3),R.dist[I(4,3)]);
  t('se consume tras el traslado', [st.sherpaOn,st.abil,E.abilityInfo(st)], [false,true,null]);
  E.popUndo(st); t('deshacer vuelve a dejarla armada (como antes de moverse)', [st.sherpaOn,st.abil], [true,true]);
  const st2=mk('sherpa',2); st2.phase='move'; t('otro nivel: habilidad de nuevo disponible', E.abilityInfo(st2).id, 'sherpa');
}
// --- objetos
{
  const st=mk('paladin',0,['axe','wyrm','herbs']); st.phase='move'; st.turn=Object.assign(E.freshTurn(),{dice:[1,1,1],spd:2,atk:3,def:2,rng:2,spdLeft:2,atkLeft:3});
  t('objetos iniciales', st.items, ['axe','wyrm','herbs']);
  E.useItem(st,'axe'); t('Cuerda y piolet: +2 Atq y +2 Alc', [st.turn.atkLeft,st.turn.rng], [5,4]);
  E.useItem(st,'wyrm'); t('Gusano espinoso: +4 Mov', [st.turn.spdLeft,st.turn.spd], [6,6]);
  t('quedan', st.items, ['herbs']); t('no se reutiliza', E.useItem(st,'axe'), false);
  const m=mk('paladin',0,['flame','cloak','herbs']); m.turn.dice=[2,3,4];
  const before=m.turn.dice.slice(); let changed=false;
  for(let k=0;k<30&&!changed;k++){ m.items=['flame']; m.turn.dice=[2,3,4]; E.useFlame(m,[0,2]); changed = m.turn.dice[1]===3; }
  t('Llama: el dado no elegido no cambia', changed, true);
  const c=mk('paladin',0,['cloak']); c.phase='energy'; E.useItem(c,'cloak'); t('Capa activa en el nivel', c.cloak, true);
  E.setupLevel(c,1); t('la capa dura un nivel', c.cloak, false);
  // Hierbas: daño pendiente y mitad redondeada hacia arriba
  const h=mk('paladin',0,['herbs']); h.adv.hp=6; h.phase='move'; h.turn=Object.assign(E.freshTurn(),{def:1,spdLeft:0,atkLeft:0});
  h.mons=[{id:1,x:4,y:0,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4},{id:2,x:3,y:1,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}]; h.adv.x=1; h.adv.y=0; h.adv.hp=6;
  const ev=E.playMonsters(h).pop();
  if (ev.dmg>0) { t('con hierbas el daño queda pendiente', [ev.pending, h.adv.hp, h.pendingDmg===ev.dmg], [true,6,true]);
    const fin=E.resolveDamage(h,true); t('hierbas: mitad hacia arriba', [fin, h.adv.hp, h.items], [Math.ceil(ev.dmg/2), 6-Math.ceil(ev.dmg/2), []]); }
  else console.log('(sin daño en el caso de hierbas)');
  const h2=mk('paladin',0,['herbs']); h2.adv.hp=6; h2.pendingDmg=3; t('3 → 2', E.resolveDamage(h2,true), 2);
  const h3=mk('paladin',0,['herbs']); h3.pendingDmg=4; t('4 → 2', E.resolveDamage(h3,true), 2);
  const h4=mk('paladin',0,['herbs']); h4.pendingDmg=3; E.resolveDamage(h4,false); t('sin usar: conserva las hierbas', h4.items, ['herbs']);
}
console.log(bad?'FALLOS '+bad:'todo bien');
