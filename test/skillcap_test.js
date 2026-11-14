const E = require('/home/claude/dungeon-in-one-card/engine.js');
const st = E.newRun ? E.newRun('knight') : null;
let ok = true; const chk = (c, m) => { if (!c) { ok = false; console.log('FALLA', m); } };
st.adv.spd = 5;
chk(E.applyBreak(st, 'spd') === true && st.adv.spd === 6, 'sube de 5 a 6');
chk(E.applyBreak(st, 'spd') === false && st.adv.spd === 6, 'no pasa de 6');
st.adv.rng = 5; E.applyBreak(st, 'rng'); chk(st.adv.rng === 6, 'alcance llega a 6'); chk(E.applyBreak(st, 'rng') === false && st.adv.rng === 6, 'alcance no pasa de 6');
st.adv.hp = 2; chk(E.applyBreak(st, 'heal') && st.adv.hp === 6, 'curar sigue funcionando');
console.log(ok ? 'ok  tope de habilidades en 6' : 'ERRORES');
