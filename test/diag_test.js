const E=require('../src/engine.js'); const I=E.idx; let bad=0;
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
