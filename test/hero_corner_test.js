// El héroe no puede pasar en diagonal entre dos obstáculos (monstruos o muros) que se tocan por la esquina.
const E = require('/home/claude/dungeon-in-one-card/src/engine.js');
E.useGame('base'); const st = E.newRun('knight', 'base', []); E.setupLevel(st, 0);
const lv = E.LEVELS[0]; let ok = true; const chk = (c, m) => { if (!c) { ok = false; console.log('FALLA', m); } };
// buscamos una casilla central libre con sus 4 vecinas libres
let c = null; for (let y = 1; y < 4 && !c; y++) for (let x = 1; x < 4 && !c; x++) { const ids = [[x,y],[x,y-1],[x+1,y],[x+1,y-1]].map(([a,b]) => E.idx(a,b)); if (ids.every(i => !lv.walls[i])) c = [x, y]; }
const [x, y] = c; const mk = (px, py) => ({ id: 1 + st.mons.length, x: px, y: py, hp: 3, maxHp: 3, spd: 3, atk: 1, def: 1, rng: 2 });
st.adv.x = x; st.adv.y = y; st.mons = [mk(x, y - 1), mk(x + 1, y)];
let R = E.reachFromAdv(st); const ne = E.idx(x + 1, y - 1);
chk(R.dist[ne] > 3, 'no debe colarse al noreste entre monstruo norte y monstruo este (coste ' + R.dist[ne] + ')');
st.mons = [mk(x, y - 1)];            // con un solo monstruo la diagonal sigue abierta
R = E.reachFromAdv(st); chk(R.dist[ne] === 3, 'con un solo monstruo la diagonal cuesta 3 (' + R.dist[ne] + ')');
st.mons = [mk(x + 1, y)]; R = E.reachFromAdv(st); chk(R.dist[ne] === 3, 'solo monstruo este: diagonal abierta');
// monstruo + muro
const wall = E.idx(x + 1, y); const saved = lv.walls[wall]; lv.walls[wall] = true;
st.mons = [mk(x, y - 1)]; R = E.reachFromAdv(st); chk(R.dist[ne] > 3, 'monstruo + muro cierran la diagonal');
lv.walls[wall] = saved;
console.log(ok ? 'ok  la diagonal entre dos obstáculos queda cerrada' : 'ERRORES'); process.exit(ok ? 0 : 1);
