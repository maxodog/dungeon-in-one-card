'use strict';
const E = require('../src/engine.js');
const { LEVELS, idx, XY, N } = E;

// ---- comprobaciones estáticas de mapas ----
let bad = 0;
LEVELS.forEach((lv, i) => {
  if (lv.map.length !== 5 || lv.map.some(r => r.length !== 5)) { console.log('mapa mal formado', i + 1); bad++; }
  if (lv.start < 0) { console.log('sin inicio', i + 1); bad++; }
  const d = E.dijkstra(lv, lv.start, null).dist;
  for (let t = 0; t < N; t++) if (!lv.walls[t] && d[t] === Infinity) { console.log('casilla aislada', i + 1, XY(t)); bad++; }
});
LEVELS.forEach((lv, i) => lv.spawns.forEach(p => { if (lv.walls[p] || p === lv.start) { console.log('spawn inválido', i + 1, XY(p)); bad++; } }));
console.log('mapas ok:', bad === 0, '· niveles', LEVELS.length, '· monstruos por nivel', LEVELS.map(l => l.spawns.length).join(' '));

// ---- bot ----
function clone(st) { return JSON.parse(JSON.stringify(st)); }
function evalState(st) { // menor es mejor
  const c = clone(st); const hp0 = c.adv.hp;
  if (c.mons.length === 0) return -1000 + 0;
  E.playMonsters(c);
  const lost = hp0 - c.adv.hp;
  const hpLeft = c.mons.reduce((s, m) => s + m.hp, 0);
  return lost * 40 + hpLeft * 3;
}
function playTurnGreedy(st) {
  // ataca siempre que puede; si no, busca la mejor casilla alcanzable
  for (let guard = 0; guard < 30; guard++) {
    // ataques
    let acted = false;
    const targets = st.mons.map(m => ({ m, info: E.attackInfo(st, m) })).filter(x => x.info.ok)
      .sort((a, b) => a.m.hp - b.m.hp || a.m.def - b.m.def);
    if (targets.length) { E.attackMon(st, targets[0].m); acted = true; if (!st.mons.length) return; continue; }
    // movimiento: casilla alcanzable con mejor evaluación
    const R = E.reachFromAdv(st);
    let best = null;
    const here = evalMove(st, idx(st.adv.x, st.adv.y), 0);
    best = { i: idx(st.adv.x, st.adv.y), score: here, cost: 0 };
    for (let i = 0; i < N; i++) {
      if (R.dist[i] > 0 && R.dist[i] <= st.turn.spdLeft) {
        const s = evalMove(st, i, R.dist[i]);
        if (s < best.score - 1e-9) best = { i, score: s, cost: R.dist[i] };
      }
    }
    if (best.cost > 0) { E.moveAdv(st, best.i, best.cost); acted = true; } else break;
    if (!acted) break;
  }
}
function evalMove(st, i, cost) {
  const c = clone(st);
  const [x, y] = XY(i); c.adv.x = x; c.adv.y = y; c.turn.spdLeft -= cost;
  // cuántos ataques posibles desde aquí (potencial)
  let potential = 0, atkLeft = c.turn.atkLeft;
  const tg = c.mons.map(m => ({ m, info: E.attackInfo(c, m) })).filter(t => t.info.ok);
  potential = tg.length ? 1 : 0;
  // distancia al monstruo más cercano
  const lv = LEVELS[c.levelIdx];
  let dmin = Infinity; for (const m of c.mons) dmin = Math.min(dmin, E.rangeDist(lv, i, idx(m.x, m.y)));
  // simula ataques potenciales para estimar daño recibido
  const c2 = clone(c);
  for (let g = 0; g < 10; g++) {
    const t = c2.mons.map(m => ({ m, info: E.attackInfo(c2, m) })).filter(z => z.info.ok).sort((a, b) => a.m.hp - b.m.hp);
    if (!t.length) break; c2.turn.atkLeft -= t[0].m.def; t[0].m.hp--; if (t[0].m.hp <= 0) c2.mons = c2.mons.filter(o => o !== t[0].m);
  }
  const base = evalState(c2);
  return base - potential * 5 + dmin * 0.5;
}
function perms() { return [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]; }
function playTurn(st) {
  st.turn.dice = E.rollDice();
  let bestSt = null, bestScore = Infinity;
  for (const p of perms()) {
    const c = clone(st);
    c.turn.assign = { spd: p[0], atk: p[1], def: p[2] };
    E.confirmEnergy(c);
    playTurnGreedy(c);
    const sc = evalState(c);
    if (sc < bestScore) { bestScore = sc; bestSt = c; }
  }
  // aplica
  Object.assign(st, bestSt);
}
function chooseBreak(st, policy) {
  const a = st.adv;
  if (a.hp <= policy.healAt) return 'heal';
  const order = policy.order;
  // sube el que tenga menor valor relativo a su peso
  let best = null, bs = Infinity;
  for (const k of order) { const s = a[k] / (policy.w[k] || 1); if (s < bs) { bs = s; best = k; } }
  return best;
}
const LOSS=new Array(13).fill(0), TURNS=new Array(13).fill(0), CNT=new Array(13).fill(0);
function runGame(policy, maxTurns = 400) {
  const st = E.newRun(); let turns = 0; let lv0 = 0, hp0 = 6, tstart = 0;
  while (turns < maxTurns) {
    turns++;
    if (st.levelIdx !== lv0 || turns === 1) { lv0 = st.levelIdx; hp0 = st.adv.hp; tstart = turns; }
    playTurn(st);
    if (!st.mons.length) {
      LOSS[st.levelIdx+1] += hp0 - st.adv.hp; TURNS[st.levelIdx+1] += turns - tstart + 1; CNT[st.levelIdx+1]++;
      if (st.levelIdx === LEVELS.length - 1) return { win: true, lvl: 12, turns };
      E.applyBreak(st, chooseBreak(st, policy));
      E.nextLevel(st);
      continue;
    }
    E.playMonsters(st);
    if (st.adv.hp <= 0) return { win: false, lvl: st.levelIdx + 1, turns };
    st.turn = E.freshTurn(); st.phase = 'energy';
  }
  return { win: false, lvl: st.levelIdx + 1, turns };
}

const policy = { healAt: +(process.env.HEAL || 2), order: ['atk', 'def', 'spd', 'rng'], w: process.env.W ? JSON.parse(process.env.W) : { atk: 1, def: 1, spd: 0.7, rng: 0.8 } };
const GAMES = +(process.env.GAMES || 60);
let wins = 0; const died = new Array(13).fill(0); let tt = 0;
const t0 = Date.now();
for (let g = 0; g < GAMES; g++) {
  const r = runGame(policy);
  if (r.win) wins++; else died[r.lvl]++;
  tt += r.turns;
}
console.log(`victorias ${wins}/${GAMES} (${(100 * wins / GAMES).toFixed(0)}%) · turnos medios ${(tt / GAMES).toFixed(0)} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('derrotas por nivel:', died.slice(1).join(' '));

console.log('daño medio por nivel:', LOSS.slice(1).map((v,i)=>(v/Math.max(1,CNT[i+1])).toFixed(1)).join(' '));
console.log('turnos medios por nivel:', TURNS.slice(1).map((v,i)=>(v/Math.max(1,CNT[i+1])).toFixed(1)).join(' '));
