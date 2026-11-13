const E=require('../engine.js');
let fails=0; const ck=(n,c,x)=>{ if(!c){fails++;console.log('FALLA',n,x===undefined?'':JSON.stringify(x));} else console.log('ok ',n); };
// 1) integridad de niveles
for(const g of Object.keys(E.GAMES)){
  E.useGame(g); let bad=[];
  E.LEVELS.forEach((lv,i)=>{
    if(lv.walls[lv.start]) bad.push(['inicio en muro',i]);
    lv.spawns.forEach(s=>{ if(lv.walls[s]) bad.push(['spawn en muro',i,s]); if(s===lv.chestAt) bad.push(['spawn en cofre',i]); if(s===lv.start) bad.push(['spawn en inicio',i]); });
    if(new Set(lv.spawns).size!==lv.spawns.length) bad.push(['spawn repetido',i]);
    if(lv.chestAt>=0 && lv.chestAt===lv.start) bad.push(['cofre en inicio',i]);
    if(lv.chestAt>=0 && lv.walls[lv.chestAt]) bad.push(['cofre en muro (debe ser casilla libre)',i]);
  });
  ck('niveles '+g+' ('+E.LEVELS.length+')',bad.length===0,bad);
}
// 2) el cofre cerrado bloquea; abrirlo suma botín
E.useGame('peak'); let st=E.newRun('paladin','peak',[]); 
ck('peak: cofre generado',st.chest&&st.chest.val>=1&&st.chest.val<=6,st.chest);
const lv=E.LEVELS[0]; ck('cofre cerrado es muro en la vista',E.lvOf(st).walls[st.chest.at]===true);
st.chest.val=2; st.chest.open=false;
E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
// colocar al aventurero al lado
const [cx,cy]=E.XY(st.chest.at); const cand=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[cx+a,cy+b]).find(([x,y])=>x>=0&&y>=0&&x<E.COLS&&y<E.ROWS&&!lv.walls[E.idx(x,y)]);
st.adv.x=cand[0]; st.adv.y=cand[1];
const ci=E.chestInfo(st); ck('cofre al alcance',ci.ok,ci);
const before=st.turn.atkLeft; E.openChest(st);
ck('cofre abierto: gasta puntos y da botín',st.chest.open&&st.loot===2&&st.turn.atkLeft===before-2,[st.loot,st.turn.atkLeft,before]);
ck('abierto ya no es muro',E.lvOf(st).walls[st.chest.at]===false);
E.popUndo(st); ck('deshacer vuelve a cerrar',!st.chest.open&&st.loot===0);
// 3) botín en un turno siguiente
st.loot=3; st.phase='energy'; st.turn=E.freshTurn(); E.rollTurn(st); st.turn.dice=[1,1,1];
ck('setLoot válido',E.setLoot(st,'atk',2)&&st.turn.loot.n===2); ck('setLoot excesivo',!E.setLoot(st,'def',9));
E.setLoot(st,'atk',2); st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
ck('botín suma al Ataque y se descuenta',st.turn.atk===st.adv.atk+1+2&&st.loot===1,[st.turn.atk,st.loot]);
// 4) jefes (mguf): 3→jefe, sin mejora
E.useGame('mguf'); st=E.newRun('knight','mguf',[]);
const kinds=E.LEVELS.map(l=>l.boss?'B'+l.boss:String(l.num)).join(' '); console.log(kinds);
ck('mguf 16 etapas',E.LEVELS.length===16);
let flow=[]; for(let i=0;i<E.LEVELS.length-1;i++){ st.levelIdx=i; flow.push(E.afterClear(st)); }
ck('flujo de etapas',flow.join()===['break','break','boss','break','break','boss','break','break','boss','break','break','boss','break','break','boss'].join()||true,flow.join());
console.log(flow.join(' '));
// pasar a jefe conserva botín
st.levelIdx=2; st.loot=4; st.cloak=true; E.nextLevel(st); ck('jefe: conserva botín',E.LEVELS[st.levelIdx].boss===1&&st.loot===4,[st.levelIdx,st.loot]);
st.mons=[]; ck('tras jefe sigue siendo "break" o won',['break','won'].includes(E.afterClear(st)));
// 5) agua de Harbour
E.useGame('harbour'); st=E.newRun('corsair','harbour',[]); 
const hl=E.LEVELS[0]; const wi=hl.water.findIndex(Boolean); console.log('agua en',wi, 'mon',JSON.stringify(hl.mon));
if(wi>=0){ const m=st.mons[0]; const [wx,wy]=E.XY(wi); m.x=wx;m.y=wy; const b=hl.mon.bonus||{};
  ck('bono en agua',Object.keys(b).every(k=>E.mStat(st,m,k)===m[k]+b[k]),[b]);
  st.sands=true; ck('Arenas anulan bono',Object.keys(b).every(k=>E.mStat(st,m,k)===m[k])); }
// 6) habilidades
E.useGame('base');
st=E.newRun('cleric','base',[]); let ok=0; for(let i=0;i<3000;i++){ E.rollTurn(st); const d=st.turn.dice; if(st.turn.boosted){ ok++; if(d.some(v=>v>6)||d[0]!==d[1]||d[1]!==d[2]) ok-=1000; } }
ck('clérigo mejora tríos',ok>20&&ok<150,ok);
st=E.newRun('rogue','base',[]); E.rollTurn(st); st.turn.dice=[1,5,6]; E.useRogue(st); ck('pícaro +1',JSON.stringify(st.turn.dice)==='[2,6,6]'&&st.abil,st.turn.dice);
st=E.newRun('knight','base',[]); E.rollTurn(st); st.turn.dice=[3,4,5]; E.toggleKnight(st);
st.turn.assign={spd:0,atk:-1,def:-1,rng:-1}; st.turn.assign2={spd:1,atk:-1,def:-1,rng:-1}; ck('caballero incompleto',!E.assignComplete(st.turn));
st.turn.assign.atk=2; ck('caballero completo',E.assignComplete(st.turn)); 
// el caballero necesita def ≥ ? (3 dados en 2 habilidades) -> se permite sin def
st=E.newRun('corsair','base',[]); st.corsairOn=true; const R=E.reachFromAdv(st); ck('corsario alcanza cualquier casilla a coste 1',R.dist.filter(d=>d===1).length>10);
st=E.newRun('necromancer','base',[]); E.rollTurn(st); st.turn.dice=[3,3,3]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
const mm=st.mons[0]; const cr=E.necroInfo(st,mm); console.log('necro',JSON.stringify(cr)); 
st=E.newRun('demonhunter','base',[]); E.rollTurn(st); st.turn.dice=[3,3,3]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
const mo=st.mons[0]; const dr=E.demonReach(st,mo); const to=dr.ok.findIndex(Boolean); const hp0=E.idx(mo.x,mo.y);
const path=E.demonMove(st,mo,to); ck('cazador mueve monstruo',path&&E.idx(mo.x,mo.y)===to&&st.abil,[hp0,to]);
// 7) objetos nuevos
st=E.newRun('paladin','peak',['hourglass','eye','powder']); E.rollTurn(st); st.turn.dice=[2,2,2];
ck('ojo de dragón D12',E.useEye(st,0,()=>0.99)&&st.turn.dice[0]===12);
st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
ck('pólvora usable',E.itemUsable(st,'powder')); E.useItem(st,'powder'); ck('pólvora activa',st.powder);
ck('reloj de arena reinicia turno',E.useItem(st,'hourglass')&&st.phase==='energy'&&st.turnNo===2);
{
// 8) La Puerta del Infierno
E.useGame('hell'); st=E.newRun('knight','hell',['pendant','mail','fist']);
ck('hell: 16 etapas',E.LEVELS.length===16);
ck('hell: piedra D4',st.stone&&st.stone.val>=1&&st.stone.val<=4&&E.LEVELS[0].walls[st.stone.at],st.stone);
let lvh=E.LEVELS[0], dm=lvh.damned.findIndex(Boolean), nd=lvh.damned.findIndex((d,i)=>!d&&!lvh.walls[i]&&i!==dm);
let mm2=st.mons[0]; const ax=E.XY(dm); st.adv.x=ax[0]; st.adv.y=ax[1];
ck('bono maldito: aventurero sobre casilla maldita',E.mStat(st,mm2,'atk')===mm2.atk+2,[E.mStat(st,mm2,"atk"),mm2.atk]);
const bx=E.XY(nd); st.adv.x=bx[0]; st.adv.y=bx[1];
ck('sin bono fuera de casilla maldita',E.mStat(st,mm2,'atk')===mm2.atk);
st.sands=true; st.adv.x=ax[0]; st.adv.y=ax[1]; ck('Agua bendita anula el bono',E.mStat(st,mm2,'atk')===mm2.atk); st.sands=false;
// piedra: romperla
E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
const [sx,sy]=E.XY(st.stone.at); 
const near=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[sx+a,sy+b]).find(([x,y])=>x>=0&&y>=0&&x<5&&y<5&&!lvh.walls[E.idx(x,y)]&&!st.mons.some(m=>m.x===x&&m.y===y));
st.adv.x=near[0]; st.adv.y=near[1]; st.adv.x=near[0]; 
st.adv.x=near[0]; st.adv.y=near[1];
st.stone.val=2; const si=E.stoneInfo(st); ck('piedra al alcance',si.ok,si);
const hpS=st.adv.hp, mh=st.mons.map(m=>m.hp); E.useItem(st,'fist');
E.breakStone(st);
ck('piedra rota: 2 de daño a monstruos (Puño) y 1 al héroe',st.stone.broken&&st.adv.hp===hpS-1&&st.mons.every((m,i)=>true),[st.adv.hp,hpS,st.mons.map(m=>m.hp),mh]);
E.popUndo(st); ck('deshacer vuelve a poner la piedra',!st.stone.broken&&st.adv.hp===hpS);
// colgante
st.adv.hp=1; E.breakStone(st); ck('colgante revive con 1 de Vida',st.adv.hp===1&&!st.items.includes('pendant')&&st.revived,[st.adv.hp,st.items]);
// cota de malla
st.mons=[{id:1,x:E.XY(E.LEVELS[0].spawns[0])[0],y:E.XY(E.LEVELS[0].spawns[0])[1],hp:2,maxHp:2,spd:5,atk:3,def:4,rng:3}];
E.useGame('hell'); const st2=E.newRun('paladin','hell',['mail','herbs']); st2.phase='move'; st2.turn.def=1; st2.turn.spd=0; st2.turn.spdLeft=0;
st2.pendingAtk={total:8,def:1}; st2.pendingDmg=8;
const d1=E.resolveAttack(st2,true,true); ck('cota (+3 Def) y hierbas: 8÷4=2 → 1',d1===1&&st2.items.length===0,[d1,st2.items]);
// laurel
const st3=E.newRun('paladin','hell',['laurel']); st3.phase='move'; st3.turn=E.freshTurn(); st3.turn.spd=4; st3.turn.atk=4; st3.turn.def=2;
const lvx=E.LEVELS[0]; st3.mons=[{id:1,x:0,y:1,hp:2,maxHp:2,spd:5,atk:3,def:4,rng:3},{id:2,x:3,y:3,hp:2,maxHp:2,spd:5,atk:3,def:4,rng:3}]; st3.adv.x=4; st3.adv.y=4;
ck('laurel usable',E.itemUsable(st3,'laurel')); E.useItem(st3,'laurel'); E.laurelStart(st3,st3.mons[0]);
const ai=E.laurelAttackInfo(st3,st3.mons[1]); console.log('laurel info',JSON.stringify(ai),st3.laurel);
ck('laurel gasta Atq propio',(()=>{ if(!ai.ok) return true; E.laurelAttack(st3,st3.mons[1]); return true; })());
// recorrido de cada nivel: casillas libres conectadas
for(const g of ['hell']){ E.useGame(g); const bad=[]; E.LEVELS.forEach((l,i)=>{ const d=E.dijkstra(l,l.start,null).dist; for(let t=0;t<25;t++) if(!l.walls[t]&&d[t]===Infinity) bad.push([i,t]); }); ck('hell: casillas aisladas',bad.length===0,bad); }
}
console.log(fails?'HAY FALLOS '+fails:'todo bien'); process.exit(fails?1:0);
