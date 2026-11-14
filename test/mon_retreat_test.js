// Captura del usuario (juego base, nivel 8): el demonio pegado al héroe (Alcance 5, Vel 5) debe alejarse
// hasta la casilla de mayor Alcance que alcance, (0,1), en vez de quedarse pegado.
const E = require('/home/claude/dungeon-in-one-card/src/engine.js');
E.useGame('base'); const st = E.newRun('wizard', 'base', []); E.setupLevel(st, 7); const m0 = E.LEVELS[7].mon;
st.adv.x = 0; st.adv.y = 3; st.adv.hp = 99;
const mk = (id, x, y, hp) => ({ id, x, y, hp, maxHp: 5, spd: m0.spd, atk: m0.atk, def: m0.def, rng: m0.rng });
st.mons = [mk(1, 0, 2, 1), mk(2, 2, 2, 5)];
const ev = E.playMonsters(st), a = st.mons.find(m => m.id === 1);
const ok = a.x === 0 && a.y === 1 && ev.find(e => e.t === 'attack').ids.length === 2;
console.log(ok ? 'ok  el monstruo pegado se aleja a su mayor Alcance y sigue atacando' : 'FALLA ' + a.x + ',' + a.y); process.exit(ok ? 0 : 1);
