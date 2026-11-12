'use strict';
/* ===== MOTOR DEL JUEGO (sin DOM) ===== */
const COLS = 5, ROWS = 5, N = COLS * ROWS;
const idx = (x, y) => y * COLS + x;
const XY = i => [i % COLS, (i / COLS) | 0];
// [dx, dy, coste de Movimiento]: recto 2, diagonal 3
const DIRS = [[1,0,2],[-1,0,2],[0,1,2],[0,-1,2],[1,1,3],[1,-1,3],[-1,1,3],[-1,-1,3]];
const START_HP = 6;

/* Datos transcritos de la carta original (cuatro orientaciones).
   '#' muro, 'S' escalera de entrada (la de abajo), 'U' la otra escalera (se puede pisar). */
const ORIENTS = {
  spider:   { mon: { key: 'spider',   name: 'Araña',     plural: 'Arañas',      hp: 2, spd: 5, atk: 4, def: 4, rng: 3 },
              map: ['....U', '...#.', '.....', '.#.#.', 'S....'] },
  skeleton: { mon: { key: 'skeleton', name: 'Esqueleto', plural: 'Esqueletos',  hp: 3, spd: 4, atk: 5, def: 4, rng: 4 },
              map: ['U....', '.....', '#..#.', '...#.', '....S'] },
  orc:      { mon: { key: 'orc',      name: 'Orco',      plural: 'Orcos',       hp: 5, spd: 3, atk: 7, def: 7, rng: 2 },
              map: ['....U', '.#.#.', '.....', '.#...', 'S....'] },
  demon:    { mon: { key: 'demon',    name: 'Demonio',   plural: 'Demonios',    hp: 5, spd: 5, atk: 5, def: 5, rng: 5 },
              map: ['U....', '.#...', '.#..#', '.....', '....S'] }
};
// Casillas de salida de los monstruos por nivel: [columna, fila]
const LEVEL_DEFS = [
  { title: 'Telarañas',            o: 'spider',   at: [[3,0],[4,2]] },
  { title: 'Osario',               o: 'skeleton', at: [[2,0],[0,1]] },
  { title: 'Cubil del orco',       o: 'orc',      at: [[4,1]] },
  { title: 'Puerta del demonio',   o: 'demon',    at: [[1,0]] },
  { title: 'Telarañas II',         o: 'spider',   at: [[1,0],[4,1],[4,4]] },
  { title: 'Osario II',            o: 'skeleton', at: [[1,0],[1,1],[0,4]] },
  { title: 'Cubil del orco II',    o: 'orc',      at: [[2,1],[4,3]] },
  { title: 'Puerta del demonio II',o: 'demon',    at: [[3,0],[1,4]] },
  { title: 'Telarañas III',        o: 'spider',   at: [[0,0],[2,2],[4,3],[2,4]] },
  { title: 'Osario III',           o: 'skeleton', at: [[4,0],[2,1],[1,2],[0,3]] },
  { title: 'Cubil del orco III',   o: 'orc',      at: [[1,0],[3,0],[4,2]] },
  { title: 'Puerta del demonio III', o: 'demon',  at: [[0,1],[2,1],[0,3]] }
];

function buildLevel(def) {
  const O = ORIENTS[def.o];
  const walls = new Array(N).fill(false);
  const stairs = [];
  let start = -1;
  O.map.forEach((row, y) => {
    for (let x = 0; x < COLS; x++) {
      const c = row[x], i = idx(x, y);
      if (c === '#') walls[i] = true;
      else if (c === 'S') { start = i; stairs.push(i); }
      else if (c === 'U') stairs.push(i);
    }
  });
  const spawns = def.at.map(([x, y]) => idx(x, y));
  return { title: def.title, mon: O.mon, map: O.map, walls, start, stairs, spawns, rd: {}, lm: {} };
}
const LEVELS = LEVEL_DEFS.map(buildLevel);

/* ---------- Caminos y distancias ---------- */
function neighbors(lv, i, cut) {
  const [x, y] = XY(i), out = [];
  for (const [dx, dy, c] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const j = idx(nx, ny);
    if (lv.walls[j]) continue;
    // Una diagonal "corta la esquina": queda cerrada si las dos casillas contiguas (la horizontal y la
    // vertical) son impasables. Los muros siempre lo son; para los monstruos también el aventurero (cut).
    // Otros monstruos no cierran el paso.
    if (c === 3) {
      const h = idx(x + dx, y), v = idx(x, y + dy);
      if ((lv.walls[h] || (cut && cut[h])) && (lv.walls[v] || (cut && cut[v]))) continue;
    }
    out.push([j, c]);
  }
  return out;
}

function dijkstra(lv, src, blocked, cut) {
  const dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  dist[src] = 0;
  for (;;) {
    let u = -1, b = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < b) { b = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = true;
    for (const [v, c] of neighbors(lv, u, cut)) {
      if (blocked && blocked[v]) continue;
      if (b + c < dist[v]) { dist[v] = b + c; prev[v] = u; }
    }
  }
  return { dist, prev };
}

// Distancia de Alcance: menor coste de Movimiento entre dos casillas (solo los muros estorban)
function rangeDist(lv, a, b) {
  let d = lv.rd[a];
  if (!d) d = lv.rd[a] = dijkstra(lv, a, null).dist;
  return d[b];
}

/* ---------- Línea de visión ---------- */
// ¿El segmento comparte longitud positiva con la casilla cerrada (sx,sy)?
// Línea de visión: el segmento puede salir de cualquier punto de la casilla de origen y llegar a
// cualquier punto de la casilla de destino. Un muro u otro monstruo lo bloquea aunque lo roce solo
// con una esquina o un borde (un único punto): el cuadrado se trata como cerrado.
const LOS_PTS = [0.02, 0.2, 0.5, 0.8, 0.98];

function segTouches(ax, ay, bx, by, sx, sy) {
  const dx = bx - ax, dy = by - ay;
  let lo = 0, hi = 1;
  if (dx === 0) { if (ax < sx || ax > sx + 1) return false; }
  else {
    let t1 = (sx - ax) / dx, t2 = (sx + 1 - ax) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    lo = Math.max(lo, t1); hi = Math.min(hi, t2);
  }
  if (dy === 0) { if (ay < sy || ay > sy + 1) return false; }
  else {
    let t1 = (sy - ay) / dy, t2 = (sy + 1 - ay) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    lo = Math.max(lo, t1); hi = Math.min(hi, t2);
  }
  return hi - lo >= -1e-9;
}

// Segmentos de a a b que no tocan ningún muro (lista plana p,q,r,s,...)
function losSegs(lv, a, b) {
  const key = a * N + b;
  if (lv.lm[key] !== undefined) return lv.lm[key];
  const [ax, ay] = XY(a), [bx, by] = XY(b), walls = [], out = [];
  for (let w = 0; w < N; w++) if (lv.walls[w] && w !== a && w !== b) walls.push(XY(w));
  for (const u of LOS_PTS) for (const v of LOS_PTS) for (const x of LOS_PTS) for (const y of LOS_PTS) {
    const p = ax + u, q = ay + v, r = bx + x, s = by + y;
    let ok = true;
    for (const [wx, wy] of walls) if (segTouches(p, q, r, s, wx, wy)) { ok = false; break; }
    if (ok) out.push(p, q, r, s);
  }
  lv.lm[key] = out;
  return out;
}

function hasLOS(lv, a, b, blockers) {
  if (a === b) return true;
  const segs = losSegs(lv, a, b);
  if (!segs.length) return false;
  const bl = blockers.filter(t => t !== a && t !== b).map(XY);
  if (!bl.length) return true;
  for (let k = 0; k < segs.length; k += 4) {
    let ok = true;
    for (const [tx, ty] of bl) if (segTouches(segs[k], segs[k + 1], segs[k + 2], segs[k + 3], tx, ty)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

/* ---------- Estado ---------- */
const HERO_KEYS = ['paladin', 'barbarian', 'ranger', 'mage'];

function freshTurn() {
  return { dice: null, assign: { spd: -1, atk: -1, def: -1, rng: -1 }, sel: -1, lock: -1, ranger: false, rerolled: false,
           spd: 0, atk: 0, def: 0, rng: 0, spdLeft: 0, atkLeft: 0 };
}

function setupLevel(st, i) {
  const lv = LEVELS[i];
  st.levelIdx = i;
  const [x, y] = XY(lv.start);
  st.adv.x = x; st.adv.y = y;
  st.mons = lv.spawns.map((s, n) => {
    const [mx, my] = XY(s);
    const m = lv.mon;
    return { id: n + 1, x: mx, y: my, hp: m.hp, maxHp: m.hp, spd: m.spd, atk: m.atk, def: m.def, rng: m.rng };
  });
  st.phase = 'energy';
  st.turn = freshTurn();
  st.undo = [];
  st.turnNo = 1;
  st.cp = { hp: st.adv.hp };   // Vida al empezar el nivel (para la contraseña)
  st.abil = false;             // habilidad de héroe usada en este nivel
  return st;
}

function newRun(hero) {
  const st = { hero: HERO_KEYS.includes(hero) ? hero : 'paladin', levelIdx: 0,
               adv: { x: 0, y: 0, hp: START_HP, spd: 1, atk: 1, def: 1, rng: 2 },
               mons: [], phase: 'energy', turn: null, undo: [], turnNo: 1, prev: null };
  return setupLevel(st, 0);
}

const rollDie = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);
const rollDice = (rnd = Math.random) => [rollDie(rnd), rollDie(rnd), rollDie(rnd)];

function assignComplete(t) {
  return (t.ranger ? t.assign.rng : t.assign.spd) >= 0 && t.assign.atk >= 0 && t.assign.def >= 0;
}

function confirmEnergy(st) {
  const t = st.turn, a = st.adv;
  const d = k => (t.assign[k] >= 0 ? t.dice[t.assign[k]] : 0);
  t.spd = a.spd + d('spd'); t.atk = a.atk + d('atk'); t.def = a.def + d('def'); t.rng = a.rng + d('rng');
  t.spdLeft = t.spd; t.atkLeft = t.atk;
  t.sel = -1;
  const pv = {};
  for (const k of ['spd', 'atk', 'def', 'rng']) if (t.assign[k] >= 0) pv[k] = t.dice[t.assign[k]];
  st.prev = pv;
  st.phase = 'move';
  st.undo = [];
}

/* ---------- Habilidades de héroe ---------- */
function rerollDice(st) {
  const t = st.turn;
  t.dice = rollDice();
  t.assign = { spd: -1, atk: -1, def: -1, rng: -1 };
  t.sel = -1; t.lock = -1; t.ranger = false;
}
function useReroll(st) { if (st.hero === 'mage') st.abil = true; else st.turn.rerolled = true; rerollDice(st); }
function rollWithKeep(st, k) { // Paladín: conserva el dado que tenía la ranura k el turno anterior
  const t = st.turn;
  t.dice = rollDice(); t.dice[0] = st.prev[k]; t.assign[k] = 0; t.lock = k; st.abil = true;
}
function toggleRanger(st) {
  const t = st.turn;
  if (!t.ranger) { t.ranger = true; st.abil = true; t.assign.spd = -1; }
  else { t.ranger = false; st.abil = false; t.assign.rng = -1; }
}
function abilityInfo(st) {
  const t = st.turn;
  if (st.phase !== 'energy') return null;
  if (st.hero === 'paladin') return !t.dice && !st.abil && st.prev && Object.keys(st.prev).length ? { id: 'keep', label: 'Conservar dado' } : null;
  if (st.hero === 'barbarian') return t.dice && !t.rerolled && st.adv.hp === 1 ? { id: 'reroll', label: 'Volver a tirar' } : null;
  if (st.hero === 'mage') return t.dice && !st.abil ? { id: 'reroll', label: 'Volver a tirar' } : null;
  if (st.hero === 'ranger') return t.dice && (t.ranger || !st.abil) ? { id: 'ranger', label: t.ranger ? 'Dado al Mov' : 'Dado al Alcance' } : null;
  return null;
}

/* ---------- Fase del aventurero ---------- */
function reachFromAdv(st) {
  const lv = LEVELS[st.levelIdx];
  const blocked = new Array(N).fill(false);
  for (const m of st.mons) blocked[idx(m.x, m.y)] = true;
  return dijkstra(lv, idx(st.adv.x, st.adv.y), blocked);
}

function attackInfo(st, m) {
  const lv = LEVELS[st.levelIdx], a = idx(st.adv.x, st.adv.y), t = idx(m.x, m.y);
  const rd = rangeDist(lv, a, t);
  if (rd > (st.turn.rng || st.adv.rng)) return { ok: false, why: 'range', rd };
  const others = st.mons.filter(o => o !== m).map(o => idx(o.x, o.y));
  if (!hasLOS(lv, a, t, others)) return { ok: false, why: 'los', rd };
  if (st.turn.atkLeft < m.def) return { ok: false, why: 'points', rd };
  return { ok: true, rd };
}

function pushUndo(st) {
  st.undo.push(JSON.stringify({ x: st.adv.x, y: st.adv.y, mons: st.mons,
                                spdLeft: st.turn.spdLeft, atkLeft: st.turn.atkLeft }));
}
function popUndo(st) {
  const s = JSON.parse(st.undo.pop());
  st.adv.x = s.x; st.adv.y = s.y; st.mons = s.mons;
  st.turn.spdLeft = s.spdLeft; st.turn.atkLeft = s.atkLeft;
}

function moveAdv(st, i, dist) {
  pushUndo(st);
  const [x, y] = XY(i);
  st.turn.spdLeft -= dist;
  st.adv.x = x; st.adv.y = y;
}

// devuelve true si el monstruo muere
function attackMon(st, m) {
  pushUndo(st);
  st.turn.atkLeft -= m.def;
  m.hp -= 1;
  if (m.hp <= 0) { st.mons = st.mons.filter(o => o !== m); return true; }
  return false;
}

/* ---------- Fase de los monstruos ---------- */
function walkToward(D, me, target, spd, others) {
  const path = [];
  for (let c = target; c !== -1; c = D.prev[c]) path.push(c);
  path.reverse();
  let last = 0;
  for (let k = 1; k < path.length; k++) { if (D.dist[path[k]] <= spd) last = k; else break; }
  while (last > 0 && others.includes(path[last])) last--;
  return path[last];
}

function chooseMove(lv, st, m) {
  const advI = idx(st.adv.x, st.adv.y), me = idx(m.x, m.y);
  const others = st.mons.filter(o => o !== m).map(o => idx(o.x, o.y));
  const blocked = new Array(N).fill(false);
  blocked[advI] = true;
  const D = dijkstra(lv, me, blocked, blocked);
  const free = i => !lv.walls[i] && i !== advI && !others.includes(i) && D.dist[i] < Infinity;
  const R = m.rng;
  let target = -1, bestCost = Infinity;
  // 1) casilla a Alcance máximo, con visión, la más cercana al monstruo
  for (let i = 0; i < N; i++) {
    if (free(i) && rangeDist(lv, i, advI) === R && D.dist[i] < bestCost && hasLOS(lv, i, advI, others)) {
      bestCost = D.dist[i]; target = i;
    }
  }
  // 2) si no hay, la de mayor Alcance posible con visión
  if (target < 0) {
    let bestRd = -1; bestCost = Infinity;
    for (let i = 0; i < N; i++) {
      if (!free(i)) continue;
      const rd = rangeDist(lv, i, advI);
      if (rd > R || !hasLOS(lv, i, advI, others)) continue;
      if (rd > bestRd || (rd === bestRd && D.dist[i] < bestCost)) { bestRd = rd; bestCost = D.dist[i]; target = i; }
    }
  }
  if (target >= 0) return walkToward(D, me, target, m.spd, others);
  // 3) acercarse todo lo posible
  let best = me, bestD = rangeDist(lv, me, advI), bestC = 0;
  for (let i = 0; i < N; i++) {
    if (!free(i) || D.dist[i] > m.spd) continue;
    const d = rangeDist(lv, i, advI);
    if (d < bestD || (d === bestD && D.dist[i] < bestC)) { best = i; bestD = d; bestC = D.dist[i]; }
  }
  return best;
}

function attackers(st) {
  const lv = LEVELS[st.levelIdx], advI = idx(st.adv.x, st.adv.y);
  return st.mons.filter(m => {
    const me = idx(m.x, m.y);
    if (rangeDist(lv, me, advI) > m.rng) return false;
    return hasLOS(lv, me, advI, st.mons.filter(o => o !== m).map(o => idx(o.x, o.y)));
  });
}

// Muta el estado y devuelve los eventos para animarlos
function playMonsters(st) {
  const lv = LEVELS[st.levelIdx], advI = idx(st.adv.x, st.adv.y), ev = [];
  const order = st.mons.slice().sort((a, b) =>
    rangeDist(lv, advI, idx(a.x, a.y)) - rangeDist(lv, advI, idx(b.x, b.y)) || a.id - b.id);
  for (const m of order) {
    const from = idx(m.x, m.y), to = chooseMove(lv, st, m);
    if (to !== from) {
      // camino casilla a casilla (el mismo que calcula chooseMove) para animarlo
      const bl = new Array(N).fill(false); bl[advI] = true;
      const D = dijkstra(lv, from, bl, bl), path = [];
      for (let c = to; c !== -1; c = D.prev[c]) path.push(c);
      path.reverse();
      const [x, y] = XY(to); m.x = x; m.y = y;
      ev.push({ t: 'move', id: m.id, from, to, path });
    }
  }
  const att = attackers(st);
  const total = att.reduce((s, m) => s + m.atk, 0);
  const dmg = Math.floor(total / st.turn.def);
  st.adv.hp = Math.max(0, st.adv.hp - dmg);
  ev.push({ t: 'attack', ids: att.map(m => m.id), total, def: st.turn.def, dmg });
  return ev;
}

function endTurnCleanup(st) {
  st.phase = st.adv.hp <= 0 ? 'dead' : 'energy';
  st.turn = freshTurn();
  st.undo = [];
  st.turnNo++;
}

/* ---------- Entre niveles ---------- */
function levelCleared(st) { return st.mons.length === 0; }
function applyBreak(st, choice) { // 'spd' | 'atk' | 'def' | 'rng' | 'heal'
  if (choice === 'heal') st.adv.hp = START_HP; else st.adv[choice] += 1;
}
function nextLevel(st) {
  if (st.levelIdx >= LEVELS.length - 1) { st.phase = 'won'; return false; }
  setupLevel(st, st.levelIdx + 1);
  return true;
}

/* ---------- Contraseña de 4 caracteres (inicio de nivel) ---------- */
const PW_ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 32 símbolos, sin 0 1 I O
const PW_MOD = 1 << 20, PW_A = 618033, PW_B = 0x5A3C1;
const PW_PAIRS = [], PW_INDEX = new Map();
for (let L = 0; L < 12; L++)
  for (let a = 0; a <= L; a++) for (let b = 0; a + b <= L; b++)
    for (let c = 0; a + b + c <= L; c++) for (let d = 0; a + b + c + d <= L; d++) {
      PW_INDEX.set([L, a, b, c, d].join(), PW_PAIRS.length);
      PW_PAIRS.push([L, a, b, c, d]);
    }
const PW_N = PW_PAIRS.length;                          // 4368 (nivel + mejoras posibles)
const PW_TOTAL = HERO_KEYS.length * 6 * PW_N;          // héroe × vida × (nivel+mejoras)
function modInv(a, m) {
  let r0 = m, r1 = a % m, t0 = 0, t1 = 1;
  while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; }
  return ((t0 % m) + m) % m;
}
const PW_AINV = modInv(PW_A, PW_MOD);
const pwCheck = n => (n ^ (n >> 3) ^ (n >> 7) ^ (n >> 11) ^ (n >> 15)) & 7;

function fromCheckpoint(hero, L, hp, u) {
  const st = newRun(hero);
  st.adv.hp = hp; st.adv.spd = 1 + u[0]; st.adv.atk = 1 + u[1]; st.adv.def = 1 + u[2]; st.adv.rng = 2 + u[3];
  return setupLevel(st, L);
}
const upgradesOf = st => [st.adv.spd - 1, st.adv.atk - 1, st.adv.def - 1, st.adv.rng - 2];

function encodePassword(st) {
  const pi = PW_INDEX.get([st.levelIdx].concat(upgradesOf(st)).join());
  const hp = st.cp ? st.cp.hp : st.adv.hp;
  if (pi === undefined || hp < 1 || hp > START_HP) return null;
  const n = ((HERO_KEYS.indexOf(st.hero) * 6 + (hp - 1)) * PW_N) + pi;
  let p = ((n * 8 + pwCheck(n)) * PW_A + PW_B) % PW_MOD;
  let out = '';
  for (let i = 0; i < 4; i++) { out = PW_ALPHA[p & 31] + out; p >>= 5; }
  return out;
}

function decodePassword(text) {
  const s = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 4) return null;
  let p = 0;
  for (const ch of s) { const v = PW_ALPHA.indexOf(ch); if (v < 0) return null; p = p * 32 + v; }
  const raw = ((((p - PW_B) % PW_MOD) + PW_MOD) % PW_MOD * PW_AINV) % PW_MOD;
  if (raw >= PW_TOTAL * 8) return null;
  const n = raw >> 3;
  if ((raw & 7) !== pwCheck(n)) return null;
  const [L, a, b, c, d] = PW_PAIRS[n % PW_N];
  const rest = Math.floor(n / PW_N);
  return fromCheckpoint(HERO_KEYS[Math.floor(rest / 6)], L, (rest % 6) + 1, [a, b, c, d]);
}

// Reintenta el nivel actual desde su inicio (vida y mejoras del inicio)
function retryLevel(st) {
  const r = fromCheckpoint(st.hero, st.levelIdx, st.cp.hp, upgradesOf(st));
  r.prev = st.prev;
  return r;
}

if (typeof module !== 'undefined') {
  module.exports = { COLS, ROWS, N, idx, XY, LEVELS, LEVEL_DEFS, START_HP, dijkstra, rangeDist, hasLOS, newRun, setupLevel,
    rollDice, assignComplete, confirmEnergy, HERO_KEYS, rerollDice, useReroll, rollWithKeep, toggleRanger, abilityInfo,
    encodePassword, decodePassword, retryLevel, PW_TOTAL, reachFromAdv, attackInfo, moveAdv, attackMon, popUndo,
    playMonsters, endTurnCleanup, levelCleared, applyBreak, nextLevel, attackers, freshTurn };
}
