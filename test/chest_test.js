// El cofre cerrado cuenta como muro: nadie lo pisa ni aparece encima. Al abrirlo, la casilla queda libre.
// Si el cofre está sobre una escalera no bloquea (si no, no se podría salir del nivel sin abrirlo).
const E = require('../src/engine.js');
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); };

function nivelConCofre(game) {
  E.useGame(game);
  for (let i = 0; i < E.LEVELS.length; i++) {
    const lv = E.LEVELS[i];
    if (lv.chestAt >= 0 && !lv.stairs.includes(lv.chestAt)) return i;
  }
  return -1;
}

const game = 'peak', li = nivelConCofre(game);
ok(li >= 0, 'no se encontró un nivel con cofre fuera de la escalera');
if (li >= 0) {
  const st = E.newRun('paladin', game, []); E.setupLevel(st, li);
  const lv = E.LEVELS[li], cofre = lv.chestAt;
  ok(E.chestBlock(st) === cofre, 'el cofre cerrado debería bloquear su casilla');

  // el héroe no puede llegar al cofre
  st.adv.hp = 6;
  E.rollTurn(st); st.turn.dice = [6, 6, 6]; st.turn.assign = { spd: 0, atk: 1, def: 2, rng: -1 }; E.confirmEnergy(st);
  let R = E.reachFromAdv(st);
  ok(R.dist[cofre] === Infinity, 'el héroe no debería poder pisar el cofre cerrado');

  // ni los monstruos: ninguno elige esa casilla ni la usa de paso
  for (const m of st.mons) ok(E.chooseMove(E._dbg.lv(st), st, m) !== cofre, 'un monstruo eligió la casilla del cofre');
  const antes = st.mons.map(m => [m.x, m.y]);
  E.playMonsters(st);
  ok(st.mons.every(m => E.idx(m.x, m.y) !== cofre), 'un monstruo terminó sobre el cofre');
  ok(antes.length === st.mons.length, 'la fase de monstruos cambió la cantidad de monstruos');

  // al abrirlo, la casilla queda libre
  st.chest.open = true;
  ok(E.chestBlock(st) === -1, 'el cofre abierto no debería bloquear');
  R = E.reachFromAdv(st);
  ok(R.dist[cofre] < Infinity || st.mons.some(m => E.idx(m.x, m.y) === cofre), 'con el cofre abierto la casilla debería poder pisarse');
}

// ninguna aventura propia ni original pone una aparición sobre un cofre que bloquea
for (const g of Object.keys(E.GAMES)) {
  E.useGame(g);
  E.LEVELS.forEach((lv, i) => {
    if (lv.chestAt >= 0 && !lv.stairs.includes(lv.chestAt) && lv.spawns.includes(lv.chestAt))
      fallos.push(`${g} nivel ${i + 1}: aparición sobre el cofre`);
  });
}

// y si alguna quedara mal, el motor la corre a otra casilla
E.useGame(game);
if (li >= 0) {
  const lv = E.LEVELS[li], original = lv.spawns.slice();
  lv.spawns = [lv.chestAt].concat(original.filter(p => p !== lv.chestAt));
  const st2 = E.newRun('paladin', game, []); E.setupLevel(st2, li);
  ok(st2.mons.every(m => E.idx(m.x, m.y) !== lv.chestAt), 'el motor debería correr una aparición que caiga sobre el cofre');
  ok(new Set(st2.mons.map(m => E.idx(m.x, m.y))).size === st2.mons.length, 'dos monstruos quedaron en la misma casilla');
  lv.spawns = original;
}

if (fallos.length) { console.log('FALLO: ' + fallos.join(' · ')); process.exit(1); }
console.log('ok  el cofre cerrado bloquea su casilla y nadie aparece encima');
