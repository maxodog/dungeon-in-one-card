// Secuencia estricta: en una fase cada monstruo se mueve como máximo una vez y nunca gasta más que su Velocidad.
const E = require('../src/engine.js');
let dobles = 0, over = 0, movs = 0, tot = 0;
for (const game of ['base', 'harbour', 'hell', 'peak', 'mguf']) {
  const n = E.GAMES[game].levels.length;
  for (let li = 0; li < n; li++) for (let it = 0; it < 800; it++) {
    const st = E.newRun('paladin', game, []); E.setupLevel(st, li, null);
    const lv = E.LEVELS[li];
    const free = []; for (let i = 0; i < E.N; i++) if (!lv.walls[i] && !lv.voids[i]) free.push(i);
    const pick = () => free.splice(Math.floor(Math.random() * free.length), 1)[0];
    const a = pick(); st.adv.x = E.XY(a)[0]; st.adv.y = E.XY(a)[1];
    const m0 = lv.mon; st.mons = [];
    for (let j = 0; j < lv.spawns.length; j++) { const p = pick(); if (p == null) break; const [x, y] = E.XY(p); st.mons.push({ id: j + 1, x, y, hp: m0.hp, maxHp: m0.hp, spd: m0.spd, atk: m0.atk, def: m0.def, rng: m0.rng }); }
    const ev = E.playMonsters(st); tot++;
    const cost = {};
    for (const e of ev) if (e.t === 'move') {
      let c = 0; for (let k = 1; k < e.path.length; k++) { const [x1, y1] = E.XY(e.path[k - 1]), [x2, y2] = E.XY(e.path[k]); c += (x1 !== x2 && y1 !== y2) ? 3 : 2; }
      cost[e.id] = (cost[e.id] || 0) + c;
    }
    const moves = ev.filter(e => e.t === 'move').map(e => e.id);
    movs += moves.length;
    if (new Set(moves).size < moves.length) dobles++;
    for (const id in cost) if (cost[id] > m0.spd) over++;
  }
}
console.log(`${tot} casos, ${movs} movimientos, monstruos que se movieron dos veces: ${dobles}, excesos de velocidad: ${over}`);
if (dobles || over) { console.log('FALLO'); process.exit(1); }
console.log('ok  un movimiento por monstruo y por fase, sin pasarse de la Velocidad');
