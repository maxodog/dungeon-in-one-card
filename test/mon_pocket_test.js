// Harbour Clash nivel 3: el monstruo que viene por el lado oeste no debe dar la vuelta entera al muro
// hacia la casilla de Alcance máximo (4,4); debe acercarse por (2,3) y atacar desde (2,4).
const E = require('/home/claude/dungeon-in-one-card/src/engine.js');
const st = E.newRun('corsair', 'harbour', ['hourglass', 'eye', 'sands']); E.setupLevel(st, 2);
st.chest.open = true; st.adv.x = 3; st.adv.y = 4; st.adv.hp = 99;
st.mons = [{ id: 1, x: 0, y: 1, hp: 4, maxHp: 4, spd: 3, atk: 6, def: 6, rng: 2 }];
const trail = [];
for (let t = 0; t < 4; t++) { const ev = E.playMonsters(st); trail.push(st.mons[0].x + ',' + st.mons[0].y + (ev.find(e => e.t === 'attack').ids.length ? '*' : '')); }
console.log(trail.join(' → '));
const ok = trail[2] === '2,4*' && trail[1] === '2,3';
console.log(ok ? 'ok  el monstruo toma la ruta corta por (2,3)' : 'FALLA'); process.exit(ok ? 0 : 1);
