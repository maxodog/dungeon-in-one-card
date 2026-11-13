const E=require('../engine.js'); const I=E.idx; let bad=0;
function lv(walls){const w=new Array(E.N).fill(false);for(const [x,y] of walls)w[I(x,y)]=true;return{walls:w,lm:{},rd:{}};}
function arr(cells){const a=new Array(E.N).fill(false);for(const [x,y] of cells)a[I(x,y)]=true;return a;}
function t(name,got,exp){const ok=got===exp;if(!ok)bad++;console.log((ok?'ok  ':'MAL ')+name+' → '+got+(ok?'':' (esperado '+exp+')'));}
// Monstruo en (0,0) quiere ir a (1,1). Cuesta 3 si puede cortar la esquina en diagonal.
// Los monstruos solo ven al aventurero como obstáculo (blocked = cut = aventurero).
const go=(walls,hero,mons)=>{ const b=arr(hero); return E.dijkstra(lv(walls),I(0,0),b,b).dist[I(1,1)]; };
// 1) dos muros → no puede en diagonal (rodea o es imposible)
t('muro + muro: diagonal cerrada (no llega a 3)', go([[1,0],[0,1]],[],[])>3, true);
// 2) dos monstruos → sí (los monstruos no bloquean)
t('monstruo + monstruo: diagonal abierta', go([],[],[[1,0],[0,1]]), 3);
// 3) aventurero + muro → no
t('aventurero + muro: diagonal cerrada', go([[0,1]],[[1,0]],[])>3, true);
t('muro + aventurero (al revés)', go([[1,0]],[[0,1]],[])>3, true);
// 4) aventurero + monstruo → sí
t('aventurero + monstruo: diagonal abierta', go([],[[1,0]],[[0,1]]), 3);
// extras
t('solo un muro: diagonal abierta', go([[1,0]],[],[]), 3);
t('solo el aventurero en un lado: diagonal abierta', go([],[[1,0]],[]), 3);
t('muro + monstruo: diagonal abierta (el monstruo es transitable)', go([[1,0]],[],[[0,1]]), 3);
// el aventurero (su propio movimiento) no cambia: solo dos muros cierran
const hb=arr([]); t('héroe: muro+muro cerrado', E.dijkstra(lv([[1,0],[0,1]]),I(0,0),hb).dist[I(1,1)]>3, true);
t('héroe: un muro abierto', E.dijkstra(lv([[1,0]]),I(0,0),hb).dist[I(1,1)], 3);
console.log(bad?'FALLOS '+bad:'todo bien');
// Araña (vel 5, alc 3) en el nivel 1: no llega al alcance, pero debe gastar toda su velocidad.
{
  const st=E.newRun('paladin'); const m=E.LEVELS[0].mon;
  st.adv.x=4; st.adv.y=2;
  st.mons=[{id:1,x:1,y:0,hp:m.hp,maxHp:m.hp,spd:m.spd,atk:m.atk,def:m.def,rng:m.rng}];
  const before=E.rangeDist(E.LEVELS[0],E.idx(1,0),E.idx(4,2));
  E.playMonsters(st);
  const after=E.rangeDist(E.LEVELS[0],E.idx(st.mons[0].x,st.mons[0].y),E.idx(4,2));
  console.log('araña: distancia', before, '→', after, 'en', st.mons[0].x+','+st.mons[0].y);
  if (after!==4) { console.log('MAL: debía quedar a 4'); process.exitCode=1; }
}
