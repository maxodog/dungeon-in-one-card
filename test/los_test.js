const E=require('../src/engine.js');
// nivel sintético: muros dados como lista de [x,y]
function lv(walls){const w=new Array(E.N).fill(false);for(const [x,y] of walls)w[E.idx(x,y)]=true;return{walls:w,lm:{}};}
const I=E.idx; let bad=0;
function t(name,got,exp){const ok=got===exp;if(!ok)bad++;console.log((ok?'ok  ':'MAL ')+name+' → '+got+(ok?'':' (esperado '+exp+')'));}
// 1) vecinos ortogonales sin nada: visibles
t('vecinos sin muros', E.hasLOS(lv([]),I(0,0),I(1,0),[]), true);
// 2) pasillo de 1 casilla de ancho (muros arriba y abajo): vecinos se ven
t('pasillo estrecho', E.hasLOS(lv([[0,0],[1,0],[0,2],[1,2]]),I(0,1),I(1,1),[]), true);
// 3) diagonal con muros en las otras dos casillas: bloquea (solo hay un punto de paso)
t('diagonal con dos muros', E.hasLOS(lv([[1,0],[0,1]]),I(0,0),I(1,1),[]), false);
// 4) diagonal con un solo muro: se ve
t('diagonal con un muro', E.hasLOS(lv([[1,0]]),I(0,0),I(1,1),[]), true);
// 5) muro entero en medio
t('muro en medio', E.hasLOS(lv([[1,0]]),I(0,0),I(2,0),[]), false);
// 6) roce de esquina: A(0,0) a B(2,2) con muros que solo tocan por una esquina la única recta posible
//    muros en (1,0) y (0,1): la línea (0,0)->(2,2) pasa justo por el punto (1,1) que es esquina de ambos
t('roce de esquina (2 muros)', E.hasLOS(lv([[1,0],[0,1]]),I(0,0),I(2,2),[]), false);
// 7) enemigo en medio bloquea; enemigo que no está en medio no
t('monstruo en medio', E.hasLOS(lv([]),I(0,0),I(2,0),[I(1,0)]), false);
t('monstruo al lado', E.hasLOS(lv([]),I(0,2),I(2,2),[I(1,0)]), true);
// 8) roce con borde: la casilla (1,1) bloquea (0,0)->(2,2)? hay otras rectas libres → se ve
t('monstruo en la casilla central diagonal', E.hasLOS(lv([]),I(0,0),I(2,2),[I(1,1)]), false);
t('monstruo fuera de la diagonal', E.hasLOS(lv([]),I(0,0),I(2,2),[I(1,0)]), true);
// 9) rendija: B detrás de una fila de muros con un hueco de ancho 1 alineado → se ve
t('hueco alineado', E.hasLOS(lv([[0,1],[2,1]]),I(1,0),I(1,2),[]), true);
// 10) hueco que solo se ve rozando una esquina (diagonal estrecha): A(0,0) B(2,1) muros (1,0),(0,1)? 
t('hueco diagonal estrecho', E.hasLOS(lv([[1,0],[1,2],[0,1]]),I(0,0),I(2,1),[]), false);
console.log(bad?('FALLOS '+bad):'todo bien');
