// Segunda oportunidad: los monstruos sin disparo usan la velocidad que les sobra; nunca superan su velocidad total
const E = require('../src/engine.js');
let fired = 0, over = 0, worse = 0, tot = 0;
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
    if (new Set(moves).size < moves.length) fired++;
    for (const id in cost) if (cost[id] > m0.spd) over++;
  }
}
console.log(`${tot} casos, segunda oportunidad usada en ${fired}, excesos de velocidad: ${over}`);
if (over) { console.log('FALLO'); process.exit(1); }
console.log(fired > 0 ? 'ok  segunda oportunidad respeta la velocidad' : 'FALLO: nunca se usó');
if (!fired) process.exit(1);
