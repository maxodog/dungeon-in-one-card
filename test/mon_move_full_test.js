// Revisión exhaustiva del movimiento de monstruos en todas las mazmorras (un monstruo, héroe quieto):
//  1) Si este turno puede quedar en posición de ataque, termina en una y a la mayor distancia de Alcance posible.
//  2) Nunca tarda más turnos en atacar que las versiones anteriores del motor.
const NEW = require(process.env.NEWENG || '/home/claude/dungeon-in-one-card/src/engine.js');
const OLDS = (process.env.OLDENGS || '/tmp/eng_pre1b.js,/tmp/eng_pub.js').split(',').filter(f => require('fs').existsSync(f)).map(f => require(f));
function mk(E, game, L, h, m, open) {
  E.useGame(game); const st = E.newRun('knight', game, [], game !== 'base'); E.setupLevel(st, L);
  const lv = E.LEVELS[L]; if (st.chest) st.chest.open = open;
  [st.adv.x, st.adv.y] = E.XY(h); st.adv.hp = 999; const m0 = lv.mon;
  const [mx, my] = E.XY(m); st.mons = [{ id: 1, x: mx, y: my, hp: m0.hp, maxHp: m0.hp, spd: m0.spd, atk: m0.atk, def: m0.def, rng: m0.rng }];
  return st;
}
function turnsToAttack(E, game, L, h, m, open) {
  const st = mk(E, game, L, h, m, open);
  for (let t = 1; t <= 12; t++) if (E.playMonsters(st).find(e => e.t === 'attack').ids.length) return t;
  return 99;
}
let cases = 0, bad1 = 0, worse = 0, better = 0;
for (const game of ['base', 'mguf', 'peak', 'harbour', 'hell']) {
  NEW.useGame(game); const nL = NEW.LEVELS.length;
  for (let L = 0; L < nL; L++) {
    NEW.useGame(game); const lv = NEW.LEVELS[L];
    const free = []; for (let i = 0; i < 25; i++) if (!lv.walls[i] && i !== lv.chestAt) free.push(i);
    for (const open of (game === 'base' ? [true] : [false, true])) for (const h of free) for (const m of free) {
      if (h === m) continue; cases++;
      // 1) mejor posición de ataque alcanzable este turno (fuerza bruta independiente)
      const st = mk(NEW, game, L, h, m, open), mon = st.mons[0];
      const reach = NEW._dbg.reach(st, mon);
      let bestRd = -1; for (const i of reach) if (NEW._dbg.canHit(st, mon, i)) bestRd = Math.max(bestRd, NEW._dbg.rd(st, i, h));
      NEW.playMonsters(st); const end = NEW.idx(st.mons[0].x, st.mons[0].y);
      if (bestRd >= 0) {
        const okHit = NEW._dbg.canHit(st, st.mons[0], end), rd = NEW._dbg.rd(st, end, h);
        if (!okHit || rd !== bestRd) { bad1++; if (bad1 <= 5) console.log('FALLA 1', game, L + 1, NEW.XY(h), NEW.XY(m), open, 'termina', NEW.XY(end), 'rd', rd, 'mejor', bestRd); }
      }
      // 2) turnos hasta atacar frente a versiones anteriores
      const b = turnsToAttack(NEW, game, L, h, m, open);
      for (const O of OLDS) { const a = turnsToAttack(O, game, L, h, m, open); if (b > a) { worse++; if (worse <= 5) console.log('PEOR', game, L + 1, NEW.XY(h), NEW.XY(m), open, a, '→', b); } else if (b < a) better++; }
    }
  }
}
console.log(`casos ${cases}: posición de ataque mal elegida ${bad1}; frente a versiones anteriores: empeora ${worse}, mejora ${better}`);
console.log(bad1 === 0 && worse === 0 ? 'ok  movimiento de monstruos revisado en todas las mazmorras' : 'HAY FALLAS'); process.exit(bad1 || worse ? 1 : 0);
