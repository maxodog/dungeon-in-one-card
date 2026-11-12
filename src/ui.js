/* ===== INTERFAZ ===== */
(function () {
  const $ = s => document.querySelector(s);
  const E = { newRun, rollDice, assignComplete, confirmEnergy, reachFromAdv, attackInfo, moveAdv, attackMon, popUndo, playMonsters, endTurnCleanup, levelCleared, applyBreak, nextLevel,
    rerollDice, useReroll, rollWithKeep, toggleRanger, abilityInfo, encodePassword, decodePassword, retryLevel,
    toggleSherpa, itemUsable, useItem, useFlame, resolveDamage, blizzPen, atkAvail, useGame };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const SAVE_KEY = 'dioc-run-v3', BEST_KEY = 'dioc-best-v1';
  const svg = inner => `<svg viewBox="0 0 32 32" aria-hidden="true">${inner}</svg>`;
  const F = 'fill="currentColor" fill-opacity=".25"', S = 'fill="currentColor"';

  const ICONS = {
    spider: svg(`<circle cx="16" cy="18" r="5" ${F}/><circle cx="16" cy="11" r="3"/><path d="M11.5 16 6 11 3 12M11 18.5 4 19M11.5 21 6 26 4 29M13 22.5 10 29M20.5 16 26 11 29 12M21 18.5 28 19M20.5 21 26 26 28 29M19 22.5 22 29"/>`),
    rat: svg(`<path d="M6 23c0-6 4-10 11-10 4 0 8 2 9 6l-3 4H8z" ${F}/><circle cx="21" cy="12" r="3"/><circle cx="25" cy="19" r="1" ${S}/><path d="M6 23c-3 0-4 3-2 5"/>`),
    slime: svg(`<path d="M5 26c-2-9 4-18 11-18s13 9 11 18z" ${F}/><circle cx="12" cy="18" r="1.6" ${S}/><circle cx="20" cy="18" r="1.6" ${S}/><path d="M13 22q3 2 6 0"/>`),
    bat: svg(`<path d="M16 14c-3-5-8-6-13-4 2 2 2 5 1 8 3-2 6-1 8 2 1-2 2-4 4-6zM16 14c3-5 8-6 13-4-2 2-2 5-1 8-3-2-6-1-8 2-1-2-2-4-4-6z" ${F}/><ellipse cx="16" cy="17" rx="3" ry="5"/><circle cx="14.8" cy="15" r=".9" ${S}/><circle cx="17.2" cy="15" r=".9" ${S}/>`),
    skeleton: svg(`<path d="M8 14a8 8 0 1 1 16 0c0 3-1 4-2 5v4H10v-4c-1-1-2-2-2-5z" ${F}/><circle cx="12.5" cy="14" r="2" ${S}/><circle cx="19.5" cy="14" r="2" ${S}/><path d="M14.5 19l1.5 2 1.5-2M13 23v4M16 23v4M19 23v4"/>`),
    goblin: svg(`<path d="M9 17C3 17 2 11 2 11s5-1 7 2M23 17c6 0 7-6 7-6s-5-1-7 2"/><circle cx="16" cy="17" r="8" ${F}/><circle cx="12.5" cy="16" r="1.5" ${S}/><circle cx="19.5" cy="16" r="1.5" ${S}/><path d="M12 21l2 2 2-2 2 2 2-2"/>`),
    ghost: svg(`<path d="M7 27V14a9 9 0 0 1 18 0v13l-3-3-3 3-3-3-3 3-3-3z" ${F}/><circle cx="12.5" cy="14" r="1.8" ${S}/><circle cx="19.5" cy="14" r="1.8" ${S}/><ellipse cx="16" cy="20" rx="2" ry="2.5"/>`),
    orc: svg(`<rect x="7" y="7" width="18" height="19" rx="5" ${F}/><path d="M7 12 4 8M25 12l3-4M11 15l4 1.5M21 15l-4 1.5"/><path d="M11 22l1.5 5 1.5-5zM18 22l1.5 5 1.5-5z" ${S}/>`),
    golem: svg(`<rect x="10" y="3" width="12" height="9" rx="1.5" ${F}/><rect x="7" y="13" width="18" height="12" rx="1.5" ${F}/><path d="M4 14v12M28 14v12M10 25v4M22 25v4M13 7h2M17 7h2"/>`),
    wraith: svg(`<path d="M16 3c-7 3-9 10-8 17l-4 8h24l-4-8c1-7-1-14-8-17z" ${F}/><path d="M11 12c1-3 3-4 5-4s4 1 5 4c0 4-2 7-5 7s-5-3-5-7z" style="fill:var(--card)"/><circle cx="14" cy="13" r="1.3" ${S}/><circle cx="18" cy="13" r="1.3" ${S}/>`),
    demon: svg(`<path d="M8 12 5 3l8 5M24 12l3-9-8 5"/><circle cx="16" cy="17" r="9" ${F}/><path d="M10.5 15l4 2M21.5 15l-4 2"/><path d="M12 22l1.5 3 1.5-3zM17 22l1.5 3 1.5-3z" ${S}/>`),
    wolf: svg(`<path d="M5 4l1 12c0 5 4 8 10 12 6-4 10-7 10-12l1-12-7 5h-8z" ${F}/><path d="M10 15l4 1.5M22 15l-4 1.5"/><path d="M14 22h4l-2 2z" ${S}/><path d="M13 25l1 2.5 1-2.5M17 25l1 2.5 1-2.5"/>`),
    yeti: svg(`<path d="M6 12c0-6 4-9 10-9s10 3 10 9v8c0 5-4 9-10 9S6 25 6 20z" ${F}/><path d="M10 13h12v7c0 3-2 5-6 5s-6-2-6-5z" style="fill:var(--card)"/><circle cx="13" cy="16" r="1.4" ${S}/><circle cx="19" cy="16" r="1.4" ${S}/><path d="M13 21l1.5 3.5L16 21l1.5 3.5L19 21M3 14l3 1M29 14l-3 1M4 21l3-1.5M28 21l-3-1.5"/>`),
    sorcerer: svg(`<path d="M16 2 8 16h16z" ${F}/><path d="M5 16h22"/><path d="M10 16v5c0 5 2.5 8 6 9 3.5-1 6-4 6-9v-5" ${F}/><circle cx="13.5" cy="19.5" r="1" ${S}/><circle cx="18.5" cy="19.5" r="1" ${S}/><path d="M12 24c2 1.5 6 1.5 8 0M15 27l1 2 1-2"/><path d="M27 8v9M25 8h4"/>`),
    dragon: svg(`<path d="M3 20 8 8l5 4 3-6 3 6 5-4 5 12-5 7H8z" ${F}/><circle cx="12" cy="19" r="1.5" ${S}/><circle cx="20" cy="19" r="1.5" ${S}/><path d="M14 24h4M16 14v3"/>`)
  };
  const ICON_ADV = svg(`<path d="M16 3 6 6v9c0 7 4 11 10 14 6-3 10-7 10-14V6z" ${F}/><path d="M16 9v13M11 13h10"/>`);
  const HERO_ICONS = {
    paladin: ICON_ADV,
    barbarian: svg(`<path d="M7 28 21 8"/><path d="M13 9c4-6 12-5 15-1-1 6-6 10-12 9z" ${F}/><path d="M18 14l5-4"/>`),
    ranger: svg(`<path d="M9 3c12 4 12 22 0 26" ${F}/><path d="M9 3v26M4 16h20M19 11l5 5-5 5"/>`),
    sherpa: svg(`<path d="M2 27 11 9l5 8 3-4 11 14z" ${F}/><path d="M11 9l-2.500 4.500 2.500-1 2.500 2 3-3"/><path d="M5 30h22" stroke-dasharray="2 3"/>`),
    mage: svg(`<path d="M7 29 19 13"/><path d="M23 3l1.8 4.7L29.5 9.5l-4.7 1.8L23 16l-1.8-4.7L16.5 9.5l4.7-1.8z" ${F}/><path d="M8 8v4M6 10h4M26 21v4M24 23h4"/>`)
  };
  const HEROES = {
    paladin: { name: 'Paladín', txt: 'Una vez por nivel, antes de tirar, conserva el dado que diste a una habilidad el turno anterior y tira solo los otros dos.' },
    barbarian: { name: 'Bárbaro', txt: 'Con 1 de Vida, puede volver a tirar los tres dados una vez por turno.' },
    ranger: { name: 'Ranger', txt: 'Una vez por nivel, puede sumar un dado al Alcance en lugar de al Movimiento.' },
    mage: { name: 'Mago', txt: 'Una vez por nivel, puede volver a tirar los tres dados.' },
    sherpa: { name: 'Sherpa', txt: 'Una vez por nivel, puede moverse ignorando los muros, pero no puede terminar sobre uno.' }
  };
  const ICON_WIND = svg(`<path d="M4 11h13c4 0 5-5 1.5-5.5M4 17h19c4 0 5 5 1.5 5.5M4 23h9c3 0 4 3 1.5 3.5"/>`);
  const ITEM_ICONS = {
    cloak: svg(`<path d="M11 5h10l5 8-3 15H9L6 13z" ${F}/><path d="M11 5c1 3 4 3 5 3s4 0 5-3M16 8v20"/>`),
    axe: svg(`<path d="M8 28 21 8"/><path d="M19 7c4-1 7 1 9 4-4 1-7 0-9-4z" ${F}/><path d="M4 6c4-2 7 2 4 4s-3 4 1 5"/>`),
    herbs: svg(`<path d="M16 29V13"/><path d="M16 20c-7 0-10-5-10-11 6 0 10 4 10 11zM16 16c0-6 4-11 10-11 0 6-4 11-10 11z" ${F}/>`),
    wyrm: svg(`<path d="M13 3h6M14 3v7l-6 14c-1 3 1 5 3 5h10c2 0 4-2 3-5l-6-14V3"/><path d="M10 21h12l2.5 5c.5 2-.7 3-2 3H9.5c-1.3 0-2.500-1-2-3z" ${F}/>`),
    flame: svg(`<path d="M16 3c1 6 8 9 8 17a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 4 2 4 1-4 0-8 2-13z" ${F}/><path d="M16 27c-2 0-3-1.500-3-3 0-2 2-3 3-5 1 2 3 3 3 5 0 1.500-1 3-3 3z"/>`)
  };
  const ITEMS = {
    cloak: { name: 'Capa de cuero', short: 'Capa', txt: 'Durante todo un nivel, ignoras el efecto de las ventiscas.' },
    axe: { name: 'Cuerda y piolet', short: 'Piolet', txt: 'En tu turno, suma +2 a tu Ataque y +2 a tu Alcance.' },
    herbs: { name: 'Hierbas curativas', short: 'Hierbas', txt: 'Al recibir un ataque, reduces el daño a la mitad, redondeando hacia arriba.' },
    wyrm: { name: 'Extracto de Wyrm', short: 'Extracto', txt: 'Suma hasta +4 a tu Movimiento este turno.' },
    flame: { name: 'Llama del destino', short: 'Llama', txt: 'En la fase de Energía, vuelve a tirar uno o más dados y quédate con la segunda tirada.' }
  };
  const ICON_STAIR = svg(`<path d="M4 26h7v-6h6v-6h6v-6h5"/>`);

  const NAMES = { spd: 'Mov', atk: 'Atq', def: 'Def', rng: 'Alc' };
  const LONG = { spd: 'Movimiento', atk: 'Ataque', def: 'Defensa', rng: 'Alcance' };
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  let keepSet = new Set();
  let G = null, busy = false, rolling = false, builtLevel = -1, lastHp = START_HP;
  const tok = { adv: null, mons: new Map() };
  let bestLevel = 0;

  /* ---------- persistencia ligera ---------- */
  function save() {
    try {
      if (!G) return;
      if (G.phase === 'won') { localStorage.removeItem(SAVE_KEY); return; }
      let sv = G;
      if (G.phase === 'dead') { sv = E.retryLevel(G); sv.totalTurns = G.totalTurns; }
      localStorage.setItem(SAVE_KEY, JSON.stringify(sv));
    } catch (e) {}
  }
  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const g = JSON.parse(raw);
      return validState(g) ? g : null;
    } catch (e) { return null; }
  }
  const okItems = (a, game) => Array.isArray(a) && a.length <= 3 && new Set(a).size === a.length && a.every(i => ITEM_KEYS.includes(i)) && (game === 'peak' || !a.length);
  function validState(g) {
    if (!g || !g.adv || !g.turn || !Array.isArray(g.mons)) return false;
    if (g.game == null) g.game = 'base';             // partidas guardadas antes de las expansiones
    if (!GAMES[g.game]) return false;
    useGame(g.game);
    if (!LEVELS[g.levelIdx]) return false;
    if (g.items == null) g.items = [];
    if (g.cp && g.cp.items == null) g.cp.items = [];
    if (g.cloak == null) g.cloak = false;
    if (g.sherpaOn == null) g.sherpaOn = false;
    if (g.pendingDmg == null) g.pendingDmg = 0;
    if (!okItems(g.items, g.game) || !g.cp || !okItems(g.cp.items, g.game)) return false;
    if (!HERO_KEYS.includes(g.hero) || !Number.isInteger(g.cp.hp) || g.cp.hp < 1 || g.cp.hp > START_HP) return false;
    const m0 = LEVELS[g.levelIdx].mon;
    const inGrid = o => Number.isInteger(o.x) && Number.isInteger(o.y) && o.x >= 0 && o.y >= 0 && o.x < COLS && o.y < ROWS;
    return inGrid(g.adv) && g.mons.every(m => inGrid(m) && m.def === m0.def && m.atk === m0.atk && m.spd === m0.spd && m.rng === m0.rng && m.maxHp === m0.hp);
  }
  function loadBest() { try { bestLevel = +localStorage.getItem(BEST_KEY) || 0; } catch (e) {} }
  function noteBest() {
    const n = G.levelIdx + 1;
    if (n > bestLevel) { bestLevel = n; try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) {} }
  }

  /* ---------- tablero ---------- */
  function fit() {
    const w = $('#boxBoard').clientWidth || 340;
    const t = Math.max(40, Math.min(68, Math.floor((w - 4) / COLS)));
    document.documentElement.style.setProperty('--t', t + 'px');
  }

  function buildBoard() {
    const lv = LEVELS[G.levelIdx];
    const grid = $('#grid');
    grid.innerHTML = '';
    for (let i = 0; i < N; i++) {
      const [x, y] = XY(i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile' + (lv.walls[i] ? ' wall' : '') + (lv.voids[i] ? ' void' : '') + (lv.blizz[i] ? ' blizz' : '');
      b.dataset.i = i;
      b.setAttribute('aria-label', lv.voids[i] ? 'Hueco' : lv.walls[i] ? 'Muro' : lv.blizz[i] ? `Ventisca, columna ${x + 1}, fila ${y + 1}` : `Casilla columna ${x + 1}, fila ${y + 1}`);
      if (lv.walls[i]) b.tabIndex = -1;
      if (lv.stairs.includes(i)) b.innerHTML = `<span class="stair">${ICON_STAIR}</span>`;
      else if (lv.blizz[i]) b.innerHTML = `<span class="wind">${ICON_WIND}</span>`;
      grid.appendChild(b);
    }
    $('#tokens').innerHTML = '';
    tok.adv = null; tok.mons = new Map();
    builtLevel = G.levelIdx;
  }

  const setPos = (el, x, y) => { el.style.setProperty('--x', x); el.style.setProperty('--y', y); };

  function syncTokens() {
    const layer = $('#tokens');
    if (!tok.adv) {
      const a = document.createElement('div');
      a.className = 'token adv';
      a.innerHTML = (HERO_ICONS[G.hero] || ICON_ADV) + '<span class="badge"></span>';
      layer.appendChild(a); tok.adv = a;
    }
    if (!tok.adv.dataset.anim) setPos(tok.adv, G.adv.x, G.adv.y);
    tok.adv.querySelector('.badge').textContent = G.adv.hp;
    const alive = new Set(G.mons.map(m => m.id));
    for (const [id, el] of tok.mons) {
      if (!alive.has(id)) { el.classList.add('dying'); setTimeout(() => el.remove(), 400); tok.mons.delete(id); }
    }
    const key = LEVELS[G.levelIdx].mon.key;
    for (const m of G.mons) {
      let el = tok.mons.get(m.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'token mon k-' + key;
        el.innerHTML = ICONS[key] + '<span class="badge"></span>';
        setPos(el, m.x, m.y);
        layer.appendChild(el); tok.mons.set(m.id, el);
      }
      if (!el.dataset.anim) setPos(el, m.x, m.y);
      el.querySelector('.badge').textContent = m.hp;
    }
  }

  function renderTiles() {
    const tiles = $('#grid').children;
    let reach = null;
    const targets = new Set();
    if (G.phase === 'move' && !busy) {
      reach = E.reachFromAdv(G);
      for (const m of G.mons) if (E.attackInfo(G, m).ok) targets.add(idx(m.x, m.y));
    }
    for (let i = 0; i < N; i++) {
      const t = tiles[i];
      const isReach = reach && reach.dist[i] > 0 && reach.dist[i] <= G.turn.spdLeft;
      t.classList.toggle('reach', !!isReach);
      if (isReach) t.dataset.cost = reach.dist[i]; else delete t.dataset.cost;
      t.classList.toggle('target', targets.has(i));
    }
  }

  // Desliza una ficha por un camino. Cada casilla en recto dura 4 s / velocidad total y cada casilla
  // en diagonal 6 s / velocidad total (la diagonal cuesta 3 de Mov y la recta 2: misma proporción).
  const STEP_S = { straight: 4, diagonal: 6 };
  async function glide(el, path, speed) {
    el.dataset.anim = '1';
    el.classList.add('walking');
    el.style.transitionTimingFunction = 'linear';
    for (let k = 1; k < path.length; k++) {
      const [px, py] = XY(path[k - 1]), [x, y] = XY(path[k]);
      const dur = 1000 * (px !== x && py !== y ? STEP_S.diagonal : STEP_S.straight) / Math.max(1, speed);
      el.style.transitionDuration = dur + 'ms';
      if (x !== px) el.style.setProperty('--flip', x < px ? -1 : 1);
      setPos(el, x, y);
      await sleep(dur);
    }
    el.classList.remove('walking');
    el.style.transitionDuration = ''; el.style.transitionTimingFunction = '';
    delete el.dataset.anim;
  }

  function floatText(x, y, text, cls) {
    const f = document.createElement('div');
    f.className = 'float ' + cls; f.textContent = text;
    setPos(f, x, y);
    $('#tokens').appendChild(f);
    setTimeout(() => f.remove(), 950);
  }

  /* ---------- panel ---------- */
  function dieHTML(v, extra) {
    const on = PIPS[v] || [];
    let s = '';
    for (let i = 0; i < 9; i++) s += `<i class="${on.includes(i) ? 'on' : ''}"></i>`;
    return `<span class="die ${extra || ''}" aria-label="Dado ${v}">${s}</span>`;
  }

  function renderHead() {
    const lv = LEVELS[G.levelIdx];
    $('#lvlNum').textContent = G.levelIdx + 1;
    $('#lvlTot').textContent = LEVELS.length;
    $('#lvlName').textContent = lv.title;
    $('#dots').innerHTML = LEVELS.map((_, i) => `<i class="${i < G.levelIdx ? 'done' : i === G.levelIdx ? 'now' : ''}"></i>`).join('');
    const m = lv.mon;
    $('#foot').innerHTML = `
      <div class="ico">${ICONS[m.key]}</div>
      <div>
        <div class="nm">${m.plural}<small>quedan ${G.mons.length} de ${lv.spawns.length}</small></div>
        <div class="stats">
          <div><b>${m.hp}</b><span>Vida</span></div><div><b>${m.spd}</b><span>Vel</span></div>
          <div><b>${m.atk}</b><span>Atq</span></div><div><b>${m.def}</b><span>Def</span></div>
          <div><b>${m.rng}</b><span>Alc</span></div>
        </div>
      </div>`;
  }

  function renderHP() {
    const hp = G.adv.hp;
    $('#pips').innerHTML = Array.from({ length: START_HP }, (_, i) =>
      `<i class="${i < hp ? 'on' : ''}${i >= hp && i < lastHp ? ' lost' : ''}"></i>`).join('');
    $('#hpnum').textContent = `Vida ${hp} / ${START_HP}`;
    $('#heroTag').textContent = HEROES[G.hero].name;
    if (tok.adv) tok.adv.querySelector('.badge').textContent = hp;
    lastHp = hp;
  }

  const slotKeys = t => (t.ranger ? ['atk', 'def', 'rng'] : ['spd', 'atk', 'def']);
  const usedDice = t => new Set([t.assign.spd, t.assign.atk, t.assign.def, t.assign.rng]);

  const pen0 = k => (G.phase === 'move' || G.phase === 'monsters') && (k === 'atk' || k === 'def') && E.blizzPen(G) > 0;
  function renderChips() {
    const t = G.turn, a = G.adv, ph = G.phase;
    const sk = slotKeys(t);
    const out = [];
    for (const k of ['spd', 'atk', 'def', 'rng']) {
      let val = a[k], sub = 'base', cls = 'chip', bar = '';
      const slot = ph === 'energy' && sk.includes(k);
      if (slot) {
        cls += ' slot';
        if (t.dice) {
          const di = t.assign[k];
          if (di >= 0) { val = a[k] + t.dice[di]; sub = `${a[k]} + ${dieHTML(t.dice[di], 'mini')}`; cls += ' filled' + (t.lock === k ? ' locked' : ''); }
          else { sub = 'asigna un dado'; if (t.sel >= 0) cls += ' armed'; }
        }
      } else if (ph === 'energy') sub = 'sin dado';
      else if (ph === 'move' || ph === 'monsters') {
        const pen = E.blizzPen(G);
        if (k === 'spd') { val = t.spdLeft; sub = `de ${t.spd}`; bar = `<span class="bar"><i style="width:${t.spd ? (100 * t.spdLeft / t.spd) : 0}%"></i></span>`; }
        else if (k === 'atk') { val = E.atkAvail(G); sub = pen ? 'ventisca −1' : `de ${t.atk}`; bar = `<span class="bar"><i style="width:${t.atk ? (100 * t.atkLeft / t.atk) : 0}%"></i></span>`; }
        else if (k === 'def') { val = Math.max(1, t.def - pen); sub = pen ? 'ventisca −1' : 'este turno'; }
        else { val = t.rng || a.rng; sub = t.ranger ? 'este turno' : 'fijo'; }
      }
      if (pen0(k)) cls += ' chilled';
      const clickable = slot && t.dice && !rolling && t.lock !== k;
      out.push(`<button type="button" class="${cls}" data-k="${k}" ${clickable ? '' : 'tabindex="-1"'} aria-label="${LONG[k]} ${val}">
        <span class="lbl">${NAMES[k]}</span><span class="val">${val}</span><span class="sub">${sub}</span>${bar}</button>`);
    }
    $('#chips').innerHTML = out.join('');
  }

  function renderDice() {
    const t = G.turn, row = $('#diceRow');
    if (G.phase !== 'energy') {
      if (G.phase === 'move' && t.dice) row.innerHTML = t.dice.map(v => dieHTML(v, 'used')).join('');
      else row.innerHTML = '';
      return;
    }
    if (!t.dice) { row.innerHTML = '<span class="hint">Tres dados de Energía por turno</span>'; return; }
    if (rolling) {
      row.innerHTML = [0, 1, 2].map(i => (t.lock >= 0 && i === 0) ? dieHTML(t.dice[0], 'locked') : keepSet.has(i) ? dieHTML(t.dice[i], 'used') : dieHTML(1 + Math.floor(Math.random() * 6), 'rolling')).join('');
      return;
    }
    const used = usedDice(t);
    row.innerHTML = t.dice.map((v, i) => {
      const d = dieHTML(v, (t.sel === i ? 'sel ' : '') + (used.has(i) ? 'used' : ''));
      return d.replace('<span class="die', `<button type="button" data-d="${i}" class="die`).replace('</span>', '</button>');
    }).join('');
  }

  function renderBanner() {
    const t = G.turn, ph = G.phase;
    let step = '1', txt = '';
    if (ph === 'energy') {
      if (!t.dice) txt = 'Tira los tres dados de <em>Energía</em>.';
      else if (!E.assignComplete(t)) txt = t.ranger ? 'Toca un dado y luego <em>Alc</em>, <em>Atq</em> o <em>Def</em>.' : 'Toca un dado y luego <em>Mov</em>, <em>Atq</em> o <em>Def</em>.';
      else txt = 'Reparto listo. Confírmalo o toca una habilidad para cambiarlo.';
    } else if (ph === 'move') { step = '2'; txt = 'Toca una casilla marcada para <em>moverte</em> o un monstruo resaltado para <em>atacar</em>.'; }
    else if (ph === 'monsters') { step = '3'; txt = 'Turno de los monstruos.'; }
    else if (ph === 'clear') { step = '2'; txt = 'Nivel superado.'; }
    $('#step').textContent = step;
    $('#bannerText').innerHTML = txt;
  }

  function nothingLeft() {
    if (G.phase !== 'move') return false;
    const R = E.reachFromAdv(G);
    for (let i = 0; i < N; i++) if (R.dist[i] > 0 && R.dist[i] <= G.turn.spdLeft) return false;
    return !G.mons.some(m => E.attackInfo(G, m).ok);
  }

  function renderActions() {
    const t = G.turn, ph = G.phase, box = $('#actions');
    if (ph === 'energy') {
      const ab = E.abilityInfo(G);
      const abBtn = ab ? `<button type="button" class="btn abil" id="btnAbil" ${rolling ? 'disabled' : ''}>${ab.label}</button>` : '';
      if (!t.dice) box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnRoll" ${rolling ? 'disabled' : ''}>Tirar dados</button>`;
      else box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnConfirm" ${E.assignComplete(t) && !rolling ? '' : 'disabled'}>Confirmar</button>`;
    } else if (ph === 'move') {
      const ab = E.abilityInfo(G);
      const abBtn = ab ? `<button type="button" class="btn abil tight ${G.sherpaOn ? 'on' : ''}" id="btnAbil" ${busy ? 'disabled' : ''}>${ab.label}</button>` : '';
      box.innerHTML = `<button type="button" class="btn small" id="btnUndo" ${G.undo.length && !busy ? '' : 'disabled'}>Deshacer</button>${abBtn}
        <button type="button" class="btn primary ${nothingLeft() ? 'pulse' : ''}" id="btnEnd" ${busy ? 'disabled' : ''}>Fin de turno</button>`;
    } else {
      box.innerHTML = `<button type="button" class="btn" disabled>${ph === 'monsters' ? 'Los monstruos actúan…' : '…'}</button>`;
    }
  }

  function renderItems() {
    const box = $('#items');
    const list = G.items || [];
    if (!list.length && !G.cloak) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    const idle = id => !E.itemUsable(G, id) || busy || rolling || G.phase === 'monsters';
    box.innerHTML = list.map(id => `<button type="button" class="item ${idle(id) ? 'idle' : ''}" data-item="${id}" aria-label="${ITEMS[id].name}">
        <span class="ico">${ITEM_ICONS[id]}</span><span>${ITEMS[id].short}</span></button>`).join('')
      + (G.cloak ? `<span class="item on" aria-label="Capa de cuero activa"><span class="ico">${ITEM_ICONS.cloak}</span><span>Capa activa</span></span>` : '');
  }

  function say(html) { $('#log').innerHTML = html; }

  function render() {
    if (builtLevel !== G.levelIdx) buildBoard();
    renderHead();
    syncTokens();
    renderHP();
    renderChips();
    renderDice();
    renderBanner();
    renderItems();
    renderActions();
    renderTiles();
    if (!busy) save();
  }

  /* ---------- hojas ---------- */
  function openSheet(html, buttons, dismiss) {
    closeSheet();
    const veil = document.createElement('div');
    veil.className = 'veil'; veil.id = 'veil';
    veil.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(veil);
    if (dismiss) veil.addEventListener('click', e => { if (e.target === veil) closeSheet(); });
    for (const [sel, fn] of buttons || []) {
      const el = veil.querySelector(sel);
      if (el) el.addEventListener('click', fn);
    }
    const first = veil.querySelector('button'); if (first) first.focus({ preventScroll: true });
    return veil;
  }
  function closeSheet() { const v = $('#veil'); if (v) v.remove(); }

  function rulesSheet() {
    openSheet(`
      <h3>Cómo se juega</h3>
      <p class="lead">${G && G.game === 'peak' ? 'Sube los 10 niveles de la Montaña Eterna. En el último te espera el Hechicero Blanco.' : G ? 'Atraviesa 12 niveles. En el último hay que derrotar a los tres demonios.' : 'Aventura original: 12 niveles y, al final, tres demonios. Montaña Eterna: 10 niveles y el Hechicero Blanco.'} Si tu Vida llega a 0, caes.</p>
      <h4>1 · Energía</h4>
      <p>Tira tres dados. Asigna uno a <b>Mov</b>, otro a <b>Atq</b> y otro a <b>Def</b>: su valor se suma a la habilidad base. <b>Alc</b> no recibe dado, salvo con la habilidad del Ranger.</p>
      <h4>2 · Tu turno</h4>
      <ul>
        <li>Mueve y ataca en el orden que quieras. No tienes que gastar todo.</li>
        <li>Un paso recto cuesta <b>2</b> de Mov; uno en diagonal, <b>3</b>. No puedes pisar muros ni monstruos.</li>
        <li>Para atacar, el monstruo debe estar a tu <b>Alcance</b> y a la vista. La distancia se mide en coste de movimiento: pegado en recto es 2, en diagonal 3.</li>
        <li>Cada golpe cuesta tantos puntos de Atq como la <b>Defensa</b> del monstruo y le quita 1 de Vida.</li>
        <li>Ver o no ver: una línea recta desde cualquier esquina de tu casilla hasta cualquier esquina de la suya, sin cruzar muros ni otros monstruos.</li>
      </ul>
      <h4>3 · Monstruos</h4>
      <p>Se mueven, del más cercano al más lejano, buscando la casilla desde la que te ven a su Alcance máximo. Luego atacan todos los que te vean a su alcance: el daño es <b>Ataque total ÷ tu Defensa</b>, redondeado hacia abajo.</p>
      <h4>Entre niveles</h4>
      <p>Mejora una habilidad en 1 <b>o</b> recupera tu Vida hasta 6. Nunca las dos.</p>
      <h4>Héroes</h4>
      <ul>${HERO_KEYS.map(k => `<li><b>${HEROES[k].name}.</b> ${HEROES[k].txt}</li>`).join('')}</ul>
      ${!G || G.game === 'peak' ? `<h4>Montaña Eterna</h4>
      <ul>
        <li><b>Ventisca.</b> Mientras estés sobre una casilla de ventisca, tu Ataque y tu Defensa bases valen 1 menos.</li>
        <li><b>Objetos.</b> Al empezar recibes 3 de estos 5, a tu elección o al azar. Cada uno se usa una vez y se descarta.</li>
        ${ITEM_KEYS.map(k => `<li><b>${ITEMS[k].name}.</b> ${ITEMS[k].txt}</li>`).join('')}
      </ul>` : ''}
      <h4>Contraseña</h4>
      <p>Cada nivel empieza con una contraseña (botón <b>Contraseña</b>): 4 letras o números en la aventura original y 5 en la Montaña Eterna, que también guarda tus objetos. Anótala: desde el menú, «Continuar con contraseña» te devuelve al inicio de ese nivel con tu héroe, tu Vida y tus mejoras de ese momento. No guarda el turno en curso.</p>
      <p class="fine">Versión web no oficial del juego solitario One Card Dungeon y de su pack Eternal Peak, de Barny Skinner (Little Rocket Games). Los mapas, las cifras de los monstruos y su aparición por nivel siguen las cartas originales; las ilustraciones del juego y los textos son propios. Las portadas del menú son de Little Rocket Games. Si te gusta, apoya al autor y consigue el juego.</p>
      <button type="button" class="btn primary" id="x">Entendido</button>`, [['#x', closeSheet]], true);
  }

  function breakSheet() {
    const a = G.adv;
    const ch = ['spd', 'atk', 'def', 'rng'].map(k =>
      `<button type="button" class="choice" data-c="${k}"><b>${LONG[k]}</b><span><em>${a[k]}</em> → <em>${a[k] + 1}</em></span></button>`).join('');
    const full = a.hp >= START_HP;
    openSheet(`<h3>Nivel superado</h3>
      <p class="lead">Descansa un momento. Elige una sola cosa.</p>
      <div class="choices">${ch}
        <button type="button" class="choice wide" data-c="heal" ${full ? 'disabled' : ''}><b>Curarte</b><span>Vida <em>${a.hp}</em> → <em>${START_HP}</em></span></button>
      </div>`, [], false);
    document.querySelectorAll('#veil .choice').forEach(b => b.addEventListener('click', () => chooseBreak(b.dataset.c)));
  }

  function deathSheet() {
    noteBest();
    const n = G.levelIdx + 1, pw = E.encodePassword(G);
    openSheet(`<h3>Has caído</h3>
      <p class="lead">Llegaste al nivel ${n} de ${LEVELS.length} en ${G.totalTurns} turnos. Tu mejor marca es el nivel ${bestLevel}.</p>
      <p>Puedes reintentar el nivel ${n} tal como lo empezaste${pw ? `: contraseña <b>${pw}</b>` : ''}.</p>
      <button type="button" class="btn primary" id="retry">Reintentar nivel ${n}</button>
      <button type="button" class="btn" id="menu">Ir al menú</button>`,
      [['#retry', retry], ['#menu', goMenu]], false);
  }

  function winSheet() {
    noteBest();
    const peak = G.game === 'peak';
    openSheet(`<h3>${peak ? 'Cima despejada' : 'Cáliz de Brasas'}</h3>
      <p class="lead">${peak ? 'El Hechicero Blanco ha caído y la tormenta se calma.' : 'Los tres demonios han caído y el cáliz es tuyo.'} Superaste los ${LEVELS.length} niveles como ${HEROES[G.hero].name} en ${G.totalTurns} turnos con ${G.adv.hp} de Vida.</p>
      <button type="button" class="btn primary" id="menu">Ir al menú</button>`, [['#menu', goMenu]], false);
  }

  /* ---------- pantallas de inicio ---------- */
  function showScreen(html, binds) {
    closeSheet();
    const sc = $('#screen');
    sc.innerHTML = html;
    document.body.classList.add('menu');
    window.scrollTo(0, 0);
    for (const [sel, fn] of binds || []) { const el = sc.querySelector(sel); if (el) el.addEventListener('click', fn); }
    return sc;
  }
  function hideScreen() { document.body.classList.remove('menu'); $('#screen').innerHTML = ''; fit(); }

  const LOGO = '<div class="logo"><span class="mark">Dungeon</span><span class="sub">in one card</span></div>';

  function menuScreen() {
    G = null; busy = false; rolling = false;
    const sv = loadSaved();
    showScreen(`<div class="splash">${LOGO}
      <p class="tagline">Una carta, tres dados y una aventura por elegir.</p>
      <div class="menu-btns">
        ${sv ? `<button type="button" class="btn primary menu-main" id="mContinue"><span>Seguir en este dispositivo</span><small>${HEROES[sv.hero].name} · ${GAMES[sv.game].name} · nivel ${sv.levelIdx + 1} · Vida ${sv.adv.hp}</small></button>` : ''}
        <button type="button" class="btn ${sv ? '' : 'primary'} menu-main" id="mNew"><span>Nueva partida</span></button>
        <button type="button" class="btn menu-main" id="mPass"><span>Continuar con contraseña</span><small>4 o 5 letras o números</small></button>
        <button type="button" class="ghost" id="mRules">Cómo se juega</button>
      </div>
      <p class="fine">Versión no oficial de One Card Dungeon, de Barny Skinner.</p></div>`,
      [['#mContinue', () => resume(sv)], ['#mNew', adventureScreen], ['#mPass', () => passScreen('')], ['#mRules', rulesSheet]]);
  }

  const ADV_INFO = {
    base: { img: 'img/core.jpg', alt: 'Portada de One Card Dungeon', tag: 'Original', txt: '12 niveles y tres demonios.' },
    peak: { img: 'img/peak.jpg', alt: 'Portada de One Card Dungeon: Eternal Peak', tag: 'Expansión', txt: '10 niveles, ventiscas, Sherpa y objetos.' }
  };

  function adventureScreen() {
    const sc = showScreen(`<div class="splash">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Elige la aventura</h2>
      <div class="adv-list">${Object.keys(GAMES).map(k => `<button type="button" class="adv-card" data-game="${k}">
        <img src="${ADV_INFO[k].img}" alt="${ADV_INFO[k].alt}" width="440" height="614" loading="eager" decoding="async">
        <span class="adv-tag">${ADV_INFO[k].tag}</span><b>${GAMES[k].name}</b><p>${ADV_INFO[k].txt}</p></button>`).join('')}</div>
      <p class="fine">Portadas © Little Rocket Games. One Card Dungeon es de Barny Skinner.</p></div>`,
      [['#back', menuScreen]]);
    sc.querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => heroScreen(b.dataset.game)));
  }

  function heroScreen(game) {
    const sc = showScreen(`<div class="splash">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Elige a tu héroe</h2>
      <div class="hero-list">${HERO_KEYS.map(k => `<button type="button" class="hero-card" data-hero="${k}">
        <span class="ico">${HERO_ICONS[k]}</span><span><b>${HEROES[k].name}</b><p>${HEROES[k].txt}</p></span></button>`).join('')}</div></div>`,
      [['#back', adventureScreen]]);
    sc.querySelectorAll('[data-hero]').forEach(b => b.addEventListener('click', () => {
      if (game === 'peak') itemsScreen(game, b.dataset.hero); else startGame(b.dataset.hero, game, []);
    }));
  }

  function drawItems() {
    const a = ITEM_KEYS.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, 3);
  }

  function itemsScreen(game, hero, pick) {
    pick = pick || drawItems();
    const list = () => ITEM_KEYS.map(k => `<button type="button" class="hero-card item-card ${pick.includes(k) ? 'chosen' : ''}" data-it="${k}" aria-pressed="${pick.includes(k)}">
        <span class="ico">${ITEM_ICONS[k]}</span><span><b>${ITEMS[k].name}</b><p>${ITEMS[k].txt}</p></span><i class="tick" aria-hidden="true"></i></button>`).join('');
    const sc = showScreen(`<div class="splash">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Tus tres objetos</h2>
      <p class="lead">Se han sorteado tres. Puedes quedártelos o elegir los que prefieras para ${HEROES[hero].name}. Cada objeto se usa una sola vez.</p>
      <div class="hero-list" id="itList">${list()}</div>
      <p class="err" id="itMsg" role="status"></p>
      <div class="actions"><button type="button" class="btn mini" id="itRoll">Sortear otra vez</button></div>
      <button type="button" class="btn primary" id="itGo">Empezar</button></div>`,
      [['#back', () => heroScreen(game)], ['#itRoll', () => itemsScreen(game, hero, drawItems())], ['#itGo', () => { if (pick.length === 3) startGame(hero, game, pick); }]]);
    const go = sc.querySelector('#itGo'), msg = sc.querySelector('#itMsg');
    const refresh = () => { go.disabled = pick.length !== 3; };
    sc.querySelector('#itList').addEventListener('click', e => {
      const b = e.target.closest('[data-it]'); if (!b) return;
      const k = b.dataset.it;
      if (pick.includes(k)) pick = pick.filter(x => x !== k);
      else if (pick.length < 3) pick = pick.concat(k);
      else { msg.textContent = 'Ya tienes tres: quita uno antes de elegir otro.'; return; }
      msg.textContent = '';
      b.classList.toggle('chosen', pick.includes(k)); b.setAttribute('aria-pressed', pick.includes(k));
      refresh();
    });
    refresh();
  }

  function passScreen(err) {
    const sc = showScreen(`<div class="splash">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Contraseña</h2>
      <p class="lead">Escribe la contraseña que te dio el juego al empezar un nivel: 4 letras o números en la aventura original, 5 en la Montaña Eterna.</p>
      <input id="pwIn" class="pw" type="text" maxlength="5" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="•••••" aria-label="Contraseña de 4 o 5 caracteres">
      <p class="err" id="pwErr" role="alert">${err || ''}</p>
      <button type="button" class="btn primary" id="pwGo" disabled>Continuar</button>
      <p class="fine">Las contraseñas no usan 0, 1, I ni O, para que no se confundan.</p></div>`,
      [['#back', menuScreen], ['#pwGo', submitPass]]);
    const inp = sc.querySelector('#pwIn'), go = sc.querySelector('#pwGo');
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      go.disabled = inp.value.length < 4;
      $('#pwErr').textContent = '';
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitPass(); });
    if (err) inp.value = '', go.disabled = true;
    setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }

  function submitPass() {
    const inp = $('#pwIn'); if (!inp || inp.value.length < 4) return;
    const g = E.decodePassword(inp.value);
    if (!g) { $('#pwErr').textContent = 'Esa contraseña no es válida. Revisa las letras y números.'; return; }
    G = g; G.totalTurns = 0; lastHp = G.adv.hp; builtLevel = -1;
    hideScreen(); render();
    say(`<b>Contraseña aceptada.</b> ${GAMES[G.game].name}: ${HEROES[G.hero].name}, nivel ${G.levelIdx + 1} (${LEVELS[G.levelIdx].title}) con ${G.adv.hp} de Vida${G.items.length ? ' y ' + G.items.length + ' objeto' + (G.items.length > 1 ? 's' : '') : ''}. Tira los dados.`);
  }

  function startGame(hero, game, items) {
    G = E.newRun(hero, game, items); G.totalTurns = 0; lastHp = START_HP; builtLevel = -1;
    hideScreen(); render();
    say(game === 'peak'
      ? `<b>${HEROES[hero].name}.</b> Montaña Eterna: las casillas de ventisca restan 1 a tu Atq y Def. Tira los dados para empezar.`
      : `<b>${HEROES[hero].name}.</b> Una carta, doce niveles. Tira los dados para empezar.`);
  }

  function resume(g) {
    G = g; useGame(G.game || 'base');
    if (G.totalTurns == null) G.totalTurns = 0;
    if (G.phase === 'monsters') G.phase = 'move';
    lastHp = G.adv.hp; builtLevel = -1;
    hideScreen(); render();
    if (G.phase === 'clear') breakSheet();
    else say(G.levelIdx === 0 && G.turnNo === 1 && !G.turn.dice ? `Una carta, ${LEVELS.length} niveles. Tira los dados para empezar.` : `Nivel ${G.levelIdx + 1}: ${LEVELS[G.levelIdx].title}.`);
  }

  function goMenu() { if (busy) return; closeSheet(); menuScreen(); }

  function retry() {
    const t = G.totalTurns;
    G = E.retryLevel(G); G.totalTurns = t; lastHp = G.adv.hp; builtLevel = -1;
    closeSheet(); render();
    say(`Reintentas el nivel ${G.levelIdx + 1}: ${LEVELS[G.levelIdx].title}. Tira los dados.`);
  }

  function passwordSheet() {
    if (busy || rolling || !G) return;
    const pw = E.encodePassword(G) || '----';
    const veil = openSheet(`<h3>Contraseña del nivel ${G.levelIdx + 1}</h3>
      <div class="pwshow" role="img" aria-label="Contraseña ${pw.split('').join(' ')}">${[...pw].map(c => `<span>${c}</span>`).join('')}</div>
      <p class="lead">Anótala o cópiala. En el menú, «Continuar con contraseña» te devuelve al inicio de este nivel como ${HEROES[G.hero].name}, con la Vida y las mejoras que tenías al empezarlo. No guarda el turno en curso.</p>
      <p class="fine" id="pwMsg" aria-live="polite"></p>
      <div class="actions"><button type="button" class="btn mini" id="pwCopy">Copiar</button><button type="button" class="btn mini" id="pwMenu">Ir al menú</button></div>
      <button type="button" class="btn primary" id="pwClose">Seguir jugando</button>`,
      [['#pwClose', closeSheet], ['#pwMenu', goMenu], ['#pwCopy', () => {
        const m = $('#pwMsg');
        let p = null;
        try { p = navigator.clipboard && navigator.clipboard.writeText(pw); } catch (e) { p = null; }
        if (p && p.then) p.then(() => { m.textContent = 'Copiada.'; }, () => { m.textContent = 'No se pudo copiar. Anótala a mano.'; });
        else m.textContent = 'No se pudo copiar. Anótala a mano.';
      }]], true);
    return veil;
  }

  function keepSheet() {
    const ks = ['spd', 'atk', 'def'].filter(k => G.prev && G.prev[k] != null);
    const veil = openSheet(`<h3>Conservar un dado</h3>
      <p class="lead">Habilidad del Paladín, una vez por nivel. Elige la habilidad cuyo dado del turno anterior quieres repetir; solo se tiran los otros dos.</p>
      <div class="choices">${ks.map(k => `<button type="button" class="choice" data-k="${k}"><b>${LONG[k]}</b><span>dado <em>${G.prev[k]}</em></span></button>`).join('')}</div>
      <button type="button" class="btn" id="no">Cancelar</button>`, [['#no', closeSheet]], true);
    veil.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      closeSheet();
      E.rollWithKeep(G, k);
      animateRoll(`Conservas el dado de ${LONG[k]} (<b>${G.turn.dice[0]}</b>). Reparte los otros dos.`);
    }));
  }

  /* ---------- flujo ---------- */
  async function flipTo(fn) {
    const card = $('#card');
    card.classList.add('flip-out');
    await sleep(330);
    fn();
    card.classList.remove('flip-out'); card.classList.add('flip-in');
    await sleep(370);
    card.classList.remove('flip-in');
  }

  async function chooseBreak(c) {
    closeSheet();
    busy = true;
    E.applyBreak(G, c);
    const msg = c === 'heal' ? 'Te curas hasta 6 de Vida.' : `${LONG[c]} sube a ${G.adv[c]}.`;
    noteBest();
    if (G.levelIdx === LEVELS.length - 1) { busy = false; G.phase = 'won'; render(); winSheet(); return; }
    await flipTo(() => { E.nextLevel(G); builtLevel = -1; busy = false; render(); say(`<b>${msg}</b> Nivel ${G.levelIdx + 1}: ${LEVELS[G.levelIdx].title}. Contraseña: <b>${E.encodePassword(G)}</b>`); });
  }

  async function animateRoll(msg) {
    rolling = true;
    render();
    const iv = setInterval(renderDice, 110);
    await sleep(700);
    clearInterval(iv);
    rolling = false; keepSet = new Set();
    render();
    say(msg);
  }

  async function doRoll() {
    if (rolling || G.phase !== 'energy' || G.turn.dice) return;
    G.turn.dice = E.rollDice();
    await animateRoll(G.turn.ranger ? '' : 'Reparte los dados entre Mov, Atq y Def.');
  }

  function onAbility() {
    const ab = E.abilityInfo(G);
    if (!ab || rolling || busy) return;
    if (ab.id === 'keep') keepSheet();
    else if (ab.id === 'reroll') { E.useReroll(G); animateRoll('Vuelves a tirar. Reparte los dados otra vez.'); }
    else if (ab.id === 'sherpa') {
      E.toggleSherpa(G);
      render();
      say(G.sherpaOn ? 'Habilidad del Sherpa: tu próximo traslado <b>ignora los muros</b>, pero no puedes terminar sobre uno. Toca el destino.' : 'Habilidad cancelada.');
    }
    else if (ab.id === 'ranger') {
      E.toggleRanger(G);
      render();
      say(G.turn.ranger ? 'Habilidad del Ranger: un dado irá a <b>Alc</b> en lugar de Mov.' : 'Habilidad cancelada: vuelve a repartir a Mov, Atq y Def.');
    }
  }

  function onDie(i) {
    const t = G.turn;
    if (G.phase !== 'energy' || rolling) return;
    if (usedDice(t).has(i)) return;
    t.sel = t.sel === i ? -1 : i;
    render();
  }

  function onSlot(k) {
    const t = G.turn;
    if (G.phase !== 'energy' || !t.dice || rolling || !slotKeys(t).includes(k) || t.lock === k) return;
    if (t.sel >= 0) { t.assign[k] = t.sel; t.sel = -1; }
    else if (t.assign[k] >= 0) t.assign[k] = -1;
    else {
      const used = usedDice(t);
      const free = [0, 1, 2].filter(i => !used.has(i));
      if (free.length === 1) t.assign[k] = free[0];
    }
    render();
  }

  function doConfirm() {
    if (!E.assignComplete(G.turn)) return;
    E.confirmEnergy(G);
    render();
    say(`Mov <b>${G.turn.spd}</b> · Atq <b>${G.turn.atk}</b> · Def <b>${G.turn.def}</b>${G.turn.ranger ? ` · Alc <b>${G.turn.rng}</b>` : ''}. ${nothingLeft() ? 'No puedes hacer nada útil: termina el turno.' : ''}`);
  }

  async function onTile(i) {
    if (G.phase !== 'move' || busy) return;
    const lv = LEVELS[G.levelIdx];
    if (lv.walls[i]) return;
    const m = G.mons.find(o => idx(o.x, o.y) === i);
    if (m) {
      const info = E.attackInfo(G, m);
      if (!info.ok) {
        if (info.why === 'range') say(`Está a distancia <b>${info.rd}</b> y tu Alcance es <b>${G.turn.rng || G.adv.rng}</b>. Acércate o mejora Alcance.`);
        else if (info.why === 'los') say('Sin línea de visión: un muro u otro monstruo lo tapa.');
        else say(`Te faltan puntos: cada golpe cuesta <b>${m.def}</b> de Atq y te quedan <b>${G.turn.atkLeft}</b>.`);
        return;
      }
      const dead = E.attackMon(G, m);
      floatText(m.x, m.y, dead ? '✕' : '−1', 'good');
      const el = tok.mons.get(m.id); if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 500); }
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(dead ? `<b>${LEVELS[G.levelIdx].mon.name} abatido.</b>` : `Golpe. Le quedan <b>${m.hp}</b> de Vida.`);
      return;
    }
    if (i === idx(G.adv.x, G.adv.y)) return;
    const R = E.reachFromAdv(G);
    if (R.dist[i] > 0 && R.dist[i] <= G.turn.spdLeft) {
      const path = [];
      for (let c = i; c !== -1; c = R.prev[c]) path.push(c);
      path.reverse();
      E.moveAdv(G, i, R.dist[i]);
      busy = true;
      tok.adv.dataset.anim = '1';
      render();
      say('Te mueves…');
      await glide(tok.adv, path, G.turn.spd);
      busy = false;
      render();
      say(`Te mueves. Te quedan <b>${G.turn.spdLeft}</b> de Mov y <b>${E.atkAvail(G)}</b> de Atq.${E.blizzPen(G) ? ' <b>Ventisca:</b> −1 a tu Atq y Def mientras estés aquí.' : ''}`);
    } else if (R.dist[i] < Infinity) say(`Llegar ahí cuesta <b>${R.dist[i]}</b> de Mov y te quedan <b>${G.turn.spdLeft}</b>.`);
    else say('No hay camino hasta esa casilla.');
  }

  /* ---------- objetos ---------- */
  function itemSheet(id) {
    if (busy || rolling || !G || G.phase === 'monsters') return;
    const it = ITEMS[id], ok = E.itemUsable(G, id);
    const why = id === 'herbs' ? 'Se te ofrecerá solas cuando un ataque te haga daño.'
      : id === 'cloak' ? 'Úsala en la fase de Energía o de movimiento.'
      : id === 'flame' ? 'Solo en la fase de Energía, con los dados ya tirados.'
      : 'Solo en tu fase de movimiento y ataque, después de confirmar la Energía.';
    openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS[id]}</span><h3>${it.name}</h3></div>
      <p class="lead">${it.txt}</p>
      ${ok ? '' : `<p class="fine">${why}</p>`}
      <button type="button" class="btn primary" id="iUse" ${ok ? '' : 'disabled'}>Usar</button>
      <button type="button" class="btn" id="iNo">Cerrar</button>`,
      [['#iNo', closeSheet], ['#iUse', () => useItemUI(id)]], true);
  }

  function useItemUI(id) {
    closeSheet();
    if (id === 'flame') { flameSheet(); return; }
    if (!E.useItem(G, id)) return;
    render();
    const t = G.turn;
    if (id === 'cloak') say('<b>Capa de cuero.</b> Ignoras las ventiscas hasta el final del nivel.');
    else if (id === 'axe') say(`<b>Cuerda y piolet.</b> Este turno: Atq <b>${t.atk}</b> (te quedan <b>${E.atkAvail(G)}</b>) y Alcance <b>${t.rng}</b>.`);
    else if (id === 'wyrm') say(`<b>Extracto de Wyrm.</b> Mov +4: te quedan <b>${t.spdLeft}</b>.`);
  }

  function flameSheet() {
    const t = G.turn, picks = new Set();
    const open = () => {
      const die = i => t.lock === i
        ? dieHTML(t.dice[i], 'locked')
        : dieHTML(t.dice[i], picks.has(i) ? 'sel' : '').replace('<span class="die', `<button type="button" data-p="${i}" class="die`).replace('</span>', '</button>');
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.flame}</span><h3>Llama del destino</h3></div>
        <p class="lead">Toca los dados que quieres volver a tirar. Te quedas con la segunda tirada.</p>
        <div class="dice-row pick">${[0, 1, 2].map(die).join('')}</div>
        <button type="button" class="btn primary" id="fGo" ${picks.size ? '' : 'disabled'}>Volver a tirar${picks.size ? ' (' + picks.size + ')' : ''}</button>
        <button type="button" class="btn" id="fNo">Cancelar</button>`,
        [['#fNo', closeSheet], ['#fGo', () => {
          const list = [...picks];
          closeSheet();
          keepSet = new Set([0, 1, 2].filter(i => !list.includes(i)));
          if (!E.useFlame(G, list)) { keepSet = new Set(); return; }
          animateRoll('<b>Llama del destino.</b> Dados nuevos: reparte o revisa tu reparto.');
        }]], true);
      document.querySelectorAll('#veil [data-p]').forEach(b => b.addEventListener('click', () => {
        const i = +b.dataset.p;
        if (picks.has(i)) picks.delete(i); else picks.add(i);
        open();
      }));
    };
    open();
  }

  function askHerbs(dmg) {
    return new Promise(res => {
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.herbs}</span><h3>Hierbas curativas</h3></div>
        <p class="lead">Te van a hacer <b>${dmg}</b> de daño. Con las hierbas solo recibirías <b>${Math.ceil(dmg / 2)}</b>. Se gastan al usarlas.</p>
        <button type="button" class="btn primary" id="hUse">Usar hierbas (−${Math.ceil(dmg / 2)})</button>
        <button type="button" class="btn" id="hNo">Recibir ${dmg}</button>`,
        [['#hUse', () => { closeSheet(); res(true); }], ['#hNo', () => { closeSheet(); res(false); }]], false);
    });
  }

  async function levelClear() {
    busy = true;
    G.phase = 'clear';
    noteBest();
    render();
    say('<b>Nivel superado.</b>');
    await sleep(650);
    busy = false;
    breakSheet();
  }

  function undo() {
    if (G.phase !== 'move' || busy || !G.undo.length) return;
    E.popUndo(G);
    render();
    say('Acción deshecha.');
  }

  async function endTurn() {
    if (G.phase !== 'move' || busy) return;
    busy = true;
    G.phase = 'monsters';
    render();
    renderTiles();
    say('Los monstruos se mueven…');
    await sleep(250);
    const ev = E.playMonsters(G);
    for (const e of ev) {
      if (e.t === 'move') {
        const el = tok.mons.get(e.id);
        if (el) await glide(el, e.path, LEVELS[G.levelIdx].mon.spd);
      } else if (e.t === 'attack') {
        if (e.ids.length) {
          for (const id of e.ids) { const el = tok.mons.get(id); if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 500); } }
          await sleep(350);
          let dmg = e.dmg;
          if (e.pending) dmg = E.resolveDamage(G, await askHerbs(e.dmg));
          if (dmg > 0) {
            floatText(G.adv.x, G.adv.y, '−' + dmg, 'dmg');
            tok.adv.classList.add('hurt'); setTimeout(() => tok.adv.classList.remove('hurt'), 500);
          } else {
            floatText(G.adv.x, G.adv.y, 'BLOCK', 'dmg block');
            tok.adv.classList.add('blocked'); setTimeout(() => tok.adv.classList.remove('blocked'), 600);
          }
          renderHP();
          say(`Atacan <b>${e.ids.length}</b>: Ataque total <b>${e.total}</b> ÷ Defensa <b>${e.def}</b> = <b>${e.dmg}</b> de daño.${e.dmg ? (dmg < e.dmg ? ` Con las hierbas recibes <b>${dmg}</b>.` : '') : ' <b>¡Bloqueado!</b>'}`);
          await sleep(650);
        } else say('Ningún monstruo te alcanza este turno.');
      }
    }
    G.totalTurns++;
    E.endTurnCleanup(G);
    busy = false;
    if (G.phase === 'dead') { render(); deathSheet(); return; }
    render();
    if (!ev.some(e => e.t === 'attack' && e.ids.length)) say('Ningún monstruo te alcanza. Tira los dados.');
  }

  /* ---------- arranque ---------- */
  function wire() {
    $('#grid').addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) onTile(+t.dataset.i); });
    $('#chips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) onSlot(c.dataset.k); });
    $('#diceRow').addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (d) onDie(+d.dataset.d); });
    $('#actions').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.id === 'btnRoll') doRoll(); else if (b.id === 'btnConfirm') doConfirm();
      else if (b.id === 'btnAbil') onAbility();
      else if (b.id === 'btnUndo') undo(); else if (b.id === 'btnEnd') endTurn();
    });
    $('#items').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) itemSheet(b.dataset.item); });
    $('#btnRules').addEventListener('click', rulesSheet);
    $('#btnPass').addEventListener('click', passwordSheet);
    if (window.ResizeObserver) new ResizeObserver(fit).observe($('#boxBoard')); else window.addEventListener('resize', fit);
    fit();
  }

  function start(data) {
    loadBest();
    wire();
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => (G ? JSON.parse(JSON.stringify(G)) : null));
    if (data && validState(data)) resume(data); else menuScreen();
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
