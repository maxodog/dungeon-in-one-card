/* ===== INTERFAZ ===== */
(function () {
  const $ = s => document.querySelector(s);
  const NO_SKILLS = () => ({ spd: -1, atk: -1, def: -1, rng: -1 });
  const E = { newRun, rollTurn, assignComplete, confirmEnergy, reachFromAdv, attackInfo, moveAdv, attackMon, popUndo, playMonsters, endTurnCleanup, levelCleared, applyBreak, SKILL_MAX, nextLevel,
    rerollDice, useReroll, rollWithKeep, toggleRanger, toggleKnight, useRogue, toggleCorsair, abilityInfo, encodePassword, decodePassword, retryLevel,
    toggleSherpa, itemUsable, useItem, useFlame, useEye, resolveDamage, blizzPen, atkAvail, heroDef, useGame, afterClear, lvOf, mStat, itemPool,
    chestInfo, openChest, setLoot, necroInfo, necroStrike, demonReach, demonMove,
    stoneInfo, breakStone, resolveAttack, laurelStart, laurelMon, laurelReach, laurelMove, laurelAttackInfo, laurelAttack, laurelEnd };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- idioma: español o inglés (detecta el del dispositivo; se cambia en el menú) ---------- */
  const LANG_KEY = 'dioc-lang';
  const LANG = (() => { try { const s = localStorage.getItem(LANG_KEY); if (s === 'es' || s === 'en') return s; } catch (e) {} return /^es\b/i.test(navigator.language || '') ? 'es' : 'en'; })();
  const L = (es, en) => LANG === 'en' ? en : es;
  document.documentElement.lang = LANG;
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} location.reload(); }
  // nombres de monstruos, niveles y aventuras (vienen del motor en español)
  if (LANG === 'en') {
    const MON = { spider: ['Spider', 'Spiders'], skeleton: ['Skeleton', 'Skeletons'], orc: ['Orc', 'Orcs'], demon: ['Demon', 'Demons'], ogre: ['Ember Ogre', 'Ember Ogre'],
      reaper: ['Skeletal Herald', 'Skeletal Herald'], drake: ['Winged Serpent', 'Winged Serpent'], mguf: ["M'Guf-yn", "M'Guf-yn"], goblin: ['Goblin', 'Goblins'], wolf: ['Wolf', 'Wolves'],
      yeti: ['Yeti', 'Yetis'], sorcerer: ['White Sorcerer', 'White Sorcerer'], crab: ['Crab', 'Crabs'], octopus: ['Octopus Man', 'Octopus Men'], zombie: ['Zombie Pirate', 'Zombie Pirates'],
      kraken: ['Kraken', 'Krakens'], imp: ['Imp', 'Imps'], chained: ['Damned', 'Damned'], fiend: ['Hell Bat', 'Hell Bats'], cultist: ['Crimson Priest', 'Crimson Priest'], maw: ['Abyssal', 'Abyssals'],
      goat: ['Flame Demon', 'Flame Demon'], butcher: ['Horned Executioner', 'Horned Executioner'], lord: ['Lord of Hell', 'Lord of Hell'] };
    const TIT = { 'Telarañas': 'Webs', 'Osario': 'Ossuary', 'Cubil del orco': "Orc's Den", 'Puerta del demonio': "Demon's Gate", 'Ogro de las brasas': 'Ember Ogre', 'Heraldo esquelético': 'Skeletal Herald',
      'Serpiente alada': 'Winged Serpent', "M'Guf-yn": "M'Guf-yn", 'Sendero helado': 'Frozen Trail', 'Aullidos en la nieve': 'Howls in the Snow', 'Guarida del yeti': "Yeti's Lair", 'Campamento goblin': 'Goblin Camp',
      'Colmillos de escarcha': 'Frost Fangs', 'Ventisquero del yeti': "Yeti's Snowdrift", 'Horda goblin': 'Goblin Horde', 'Manada del huargo': 'Warg Pack', 'Cumbre del yeti': "Yeti's Summit", 'El Hechicero Blanco': 'The White Sorcerer',
      'Orilla de cangrejos': 'Crab Shore', 'Muelle de tentáculos': 'Tentacle Pier', 'Marea de piratas': 'Pirate Tide', 'El Kraken despierta': 'The Kraken Awakens', 'Plaga de cangrejos': 'Crab Plague', 'Pulpos del rompeolas': 'Breakwater Octopi',
      'Tripulación maldita': 'Cursed Crew', 'Furia del Kraken': "Kraken's Fury", 'Umbral de brasas': 'Ember Threshold', 'Cadenas al rojo': 'Red-Hot Chains', 'Alas de ceniza': 'Ash Wings', 'Sacerdote carmesí': 'Crimson Priest',
      'Boca del abismo': 'Mouth of the Abyss', 'Legión de diablillos': 'Imp Legion', 'Penitentes del fuego': 'Fire Penitents', 'Demonio de las llamas': 'Flame Demon', 'Bandada infernal': 'Infernal Flock', 'Fauces gemelas': 'Twin Maws',
      'Horda del Averno': 'Horde of the Underworld', 'Verdugo cornudo': 'Horned Executioner', 'Cárcel de los condenados': 'Prison of the Damned', 'Tormenta de alas': 'Storm of Wings', 'Abismo sin fondo': 'Bottomless Abyss', 'Señor del Infierno': 'Lord of Hell' };
    const done = new Set();
    for (const g of Object.keys(GAMES)) for (const lv of GAMES[g].levels) {
      const b = lv.title.replace(/ (I|II|III)$/, ''), suf = lv.title.slice(b.length);
      lv.title = (TIT[b] || b) + suf;
      if (!done.has(lv.mon)) { done.add(lv.mon); const n = MON[lv.mon.key]; if (n) { lv.mon.name = n[0]; lv.mon.plural = n[1]; } }
    }
    Object.assign(GAMES.peak, { name: 'Eternal Peak' }); Object.assign(GAMES.hell, { name: "Hell's Door" });
  }

  /* ---------- sonido: cada acción sortea entre varios clips y no repite el último ---------- */
  const Sfx = (() => {
    let ctx = null, master = null, on = true; const bufs = {}, last = {};
    try { on = localStorage.getItem('dioc-sound') !== '0'; } catch (e) {}
    function init() {
      if (ctx || typeof SND_CLIPS === 'undefined') return;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { ctx = null; return; }
      master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
      for (const k of Object.keys(SND_CLIPS)) {
        try {
          const bin = atob(SND_CLIPS[k]), u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          const ok = b => { bufs[k] = b; }, bad = () => {};
          const p = ctx.decodeAudioData(u8.buffer, ok, bad); if (p && p.catch) p.catch(bad);
        } catch (e) {}
      }
    }
    const unlock = () => { init(); if (ctx && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} } };
    ['pointerdown', 'touchstart', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
    // pools: nombre de grupo o lista de grupos; vol: volumen 0–1
    function play(pools, vol) {
      if (!on || !ctx || document.hidden || typeof SND_POOLS === 'undefined') return;
      const names = Array.isArray(pools) ? pools : [pools];
      const list = [...new Set(names.flatMap(n => SND_POOLS[n] || []))].filter(k => bufs[k]);
      if (!list.length) return;
      const id = names.join('+');
      let k = list[Math.floor(Math.random() * list.length)];
      if (list.length > 1) while (k === last[id]) k = list[Math.floor(Math.random() * list.length)];
      last[id] = k;
      try {
        const s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = bufs[k]; s.playbackRate.value = .96 + Math.random() * .08; g.gain.value = vol == null ? 1 : vol;
        s.connect(g); g.connect(master); s.start(0);
      } catch (e) {}
    }
    const paint = () => {
      const any = on || Music.on, b = $('#btnSnd');
      if (b) { b.classList.toggle('muted', !any); b.title = L('Sonido y música', 'Sound and music'); }
    };
    function set(v) { on = !!v; try { localStorage.setItem('dioc-sound', on ? '1' : '0'); } catch (e) {} paint(); unlock(); if (on) play('atk', .5); }
    return { play, set, paint, ctx: () => { init(); return ctx; }, unlock, get on() { return on; } };
  })();

  /* ---------- música: una canción por piso según la aventura; BOSS en pisos de jefe; LOOP se repite todo el piso ---------- */
  const Music = (() => {
    const T = typeof MUSIC_TRACKS !== 'undefined' ? MUSIC_TRACKS : [];
    const http = /^https?:/.test(location.protocol);   // fuera de http (archivo local) no hay streaming con efectos
    const ls = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
    let on = ls('dioc-music', '1') !== '0', vol = parseFloat(ls('dioc-musvol', '0.5'));
    if (!(vol >= 0 && vol <= 1)) vol = .5;
    let ctx = null, out = null, slots = null, cur = null, floorId = null, want = null, seq = 0, lastF = null, unlocked = false, primed = false;
    const FADE = 1.4;
    const save = () => { try { localStorage.setItem('dioc-music', on ? '1' : '0'); localStorage.setItem('dioc-musvol', String(vol)); } catch (e) {} };

    function setup() {
      if (slots) return;
      ctx = http ? Sfx.ctx() : null;
      if (ctx) { out = ctx.createGain(); out.gain.value = vol; out.connect(ctx.destination); }
      slots = [0, 1].map(() => {
        const el = new Audio(); el.preload = 'auto';
        if (!ctx) return { el, lvl: 0 };
        try { const g = ctx.createGain(); g.gain.value = 0; ctx.createMediaElementSource(el).connect(g); g.connect(out); return { el, g }; }
        catch (e) { return { el, lvl: 0 }; }
      });
    }
    // sube o baja el nivel de un nodo (0–1) en s segundos
    function ramp(n, to, s) {
      if (n.g && ctx) { const t = ctx.currentTime; n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(to, t + s); return; }
      const el = n.slot && n.slot.el; if (!el) return;
      clearInterval(n.iv); const from = n.lvl || 0, t0 = performance.now();
      n.iv = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (s * 1000)); n.lvl = from + (to - from) * k; try { el.volume = Math.max(0, Math.min(1, n.lvl * vol)); } catch (e) {} if (k >= 1) clearInterval(n.iv); }, 50);
    }
    function fadeOut(n) {
      if (!n) return;
      ramp(n.kind === 'el' && n.slot.g ? n.slot : n, 0, FADE);
      setTimeout(() => {
        if (n.kind === 'buf') { try { n.s && n.s.stop(); n.g.disconnect(); } catch (e) {} }
        else { try { n.slot.el.pause(); n.slot.el.onended = null; } catch (e) {} }
      }, FADE * 1000 + 100);
    }
    const pool = (w, boss) => {
      let p = T.filter(t => t.g === w.game && t.b === boss);
      if (!p.length) p = T.filter(t => t.g === w.game && t.b === !boss);
      return p;
    };
    const inPool = (tr, w) => pool(w, w.boss).some(t => t.f === tr.f);
    function choose() {
      const p = pool(want, want.boss); if (!p.length) return null;
      const q = p.length > 1 ? p.filter(t => t.f !== lastF) : p;
      return q[Math.floor(Math.random() * q.length)];
    }
    function begin(tr) {
      if (!tr || !on || !unlocked) return;
      setup();
      const my = ++seq, old = cur; lastF = tr.f; fadeOut(old);
      const url = 'musica/' + tr.f;
      if (tr.l && ctx) {     // bucle sin cortes: se decodifica entera (son canciones cortas)
        const node = { tr, kind: 'buf', g: ctx.createGain(), t0: Date.now() }; node.g.gain.value = 0; node.g.connect(out); cur = node;
        fetch(url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
          .then(ab => new Promise((ok, bad) => { const p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); }))
          .then(buf => { if (my !== seq) return; const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(node.g); s.start(0); node.s = s; ramp(node, 1, FADE); })
          .catch(() => { if (my === seq) viaElement(tr, my, old); });
      } else viaElement(tr, my, old);
    }
    function viaElement(tr, my, old) {
      const used = old && old.slot;
      const slot = slots[0] === used ? slots[1] : slots[0];
      const node = { tr, kind: 'el', slot, lvl: 0 }; cur = node;
      const el = slot.el; el.onended = null; el.loop = !!tr.l; el.src = 'musica/' + tr.f;
      if (slot.g && ctx) { slot.g.gain.cancelScheduledValues(0); slot.g.gain.value = 0; } else { try { el.volume = 0; } catch (e) {} }
      const p = el.play();
      const ok = () => { if (my === seq) ramp(slot.g && ctx ? slot : node, 1, FADE); };
      if (p && p.then) p.then(ok, () => { if (my === seq) cur = null; }); else ok();
      el.onended = () => { if (cur === node && !tr.l) next(); };
      el.onerror = () => { if (cur === node) setTimeout(() => { if (cur === node) next(); }, 800); };
    }
    function next() { const tr = choose(); if (tr) begin(tr); }
    // Vigilante: si la música debería sonar y no suena (el navegador la pausó, falló la carga, el audio quedó
    // suspendido al volver de otra app…), la reanuda o pasa a otra canción. Corre en cada toque y cada 3 s.
    function kick() {
      if (!on || !T.length || document.hidden) return;
      if (ctx && ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
      if (!unlocked || !want) return;
      if (!cur) { next(); return; }
      if (cur.kind === 'el') {
        const el = cur.slot.el;
        if (el.error || (el.ended && !el.loop)) { next(); return; }
        if (el.paused) { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
      } else if (!cur.s && Date.now() - (cur.t0 || 0) > 12000) next();   // la canción en bucle no terminó de cargar
    }
    setInterval(kick, 3000);

    // al entrar a un piso: se mantiene la canción si sirve para este piso y no es un bucle
    function floor(game, boss) {
      if (document.body.classList.contains('menu') || !T.length) return;
      const id = game + ':' + G.levelIdx; if (id === floorId) return;
      floorId = id; want = { game, boss };
      if (!on || !unlocked) return;
      if (cur && !cur.tr.l && inPool(cur.tr, want)) return;
      const tr = choose(); if (tr && !(cur && cur.tr.f === tr.f)) begin(tr);
    }
    // música del menú (mientras no hay mazmorra en curso)
    function menu() {
      floorId = null; want = { game: 'menu', boss: false };
      if (!on || !unlocked || !T.length) return;
      if (cur && inPool(cur.tr, want)) return;
      const tr = choose(); if (tr) begin(tr);
    }
    function stop() { seq++; fadeOut(cur); cur = null; floorId = null; want = null; }
    function unlock() {
      if (!T.length) return;
      if (!unlocked) { unlocked = true; setup(); if (!primed) { primed = true; slots.forEach(s => { try { s.el.src = MUSIC_SILENCE; const p = s.el.play(); if (p && p.then) p.then(() => { if (s.el.src === MUSIC_SILENCE) s.el.pause(); }, () => {}); } catch (e) {} }); } }
      kick();
    }
    ['pointerdown', 'pointerup', 'mousedown', 'touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));
    // Intento de arranque nada más abrir el juego. Si el navegador permite audio sin gesto (o el sitio ya tiene confianza),
    // la música parte sola; si lo bloquea, queda a la espera del primer toque y se avisa con un letrero discreto.
    function auto() {
      if (!on || !T.length || unlocked) return;
      setup();
      const go = () => { if (unlocked) return; unlocked = true; if (want && !cur) next(); };
      if (!ctx) { go(); return; }
      if (ctx.state === 'running') go(); else { try { ctx.resume().then(() => { if (ctx.state === 'running') go(); }, () => {}); } catch (e) {} }
    }
    function hint() {
      if (!on || !T.length || unlocked || !document.body.classList.contains('menu')) return;
      let h = $('#musicHint'); if (h) return;
      h = document.createElement('div'); h.id = 'musicHint'; h.textContent = L('♪ Toca para activar la música', '♪ Tap to turn on the music'); document.body.appendChild(h);
      const gone = () => { h.classList.add('off'); setTimeout(() => h.remove(), 600); };
      const iv = setInterval(() => { if (unlocked || !document.body.classList.contains('menu')) { clearInterval(iv); gone(); } }, 200);
    }
    setTimeout(hint, 900);
    document.addEventListener('visibilitychange', () => {
      if (!slots) return;
      if (document.hidden) { slots.forEach(s => { try { s.el.pause(); } catch (e) {} }); if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
      else { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); if (cur && cur.kind === 'el') { try { cur.slot.el.play().catch(() => {}); } catch (e) {} } }
    });
    function setOn(v) { on = !!v; save(); if (!on) { seq++; fadeOut(cur); cur = null; } else if (want) { unlocked = true; setup(); Sfx.unlock(); next(); } Sfx.paint(); }
    function setVol(v) { vol = Math.max(0, Math.min(1, v)); save(); if (out && ctx) out.gain.value = vol; else if (cur && cur.kind === 'el') { try { cur.slot.el.volume = (cur.lvl || 1) * vol; } catch (e) {} } }
    auto();
    return { floor, menu, stop, setOn, setVol, get on() { return on; }, get vol() { return vol; }, get has() { return T.length > 0; } };
  })();
  const bossFloor = () => {
    const lv = LEVELS[G.levelIdx], k = lv.mon.key;
    return !!lv.boss || (G.game === 'peak' && k === 'sorcerer') || (G.game === 'harbour' && k === 'kraken') || (G.game === 'base' && k === 'demon');
  };
  const musicFloor = () => { if (G && G.game && LEVELS[G.levelIdx]) Music.floor(G.game, bossFloor()); };
  // voz del héroe: según el arte de cada carta (M masculina, F femenina, N sin distinguir)
  const HERO_VOICE = { mage: 'F', ranger: 'F', rogue: 'N', cleric: 'N', necromancer: 'N' };
  const voice = () => HERO_VOICE[G && G.hero] || 'M';
  // contadores de la partida (se guardan dentro de G.stats y salen en la pantalla final)
  const stat = (k, n = 1) => { if (!G) return; const s = G.stats || (G.stats = {}); s[k] = (s[k] || 0) + n; };
  const sfxHurt = (d = 1) => { stat('dmgIn', d); Sfx.play({ M: ['hurtM', 'hurtN'], F: ['hurtF', 'hurtN'], N: ['hurtM', 'hurtF', 'hurtN'] }[voice()]); };
  const sfxDie = () => Sfx.play({ M: ['dieM'], F: ['dieF'], N: ['dieM', 'dieF'] }[voice()]);
  const KILL_POOL = { spider: 'killS', goblin: 'killS', wolf: 'killS', skeleton: 'killS', crab: 'killS', octopus: 'killS', imp: 'killS',
    orc: 'killB', yeti: 'killB', zombie: 'killB', kraken: 'killB', demon: 'killD', fiend: 'killD', chained: 'killD', maw: 'killD' };
  const sfxKill = (n = 1) => { stat('kills', n); const lv = LEVELS[G.levelIdx]; Sfx.play(lv.boss || lv.mon.key === 'sorcerer' ? 'killJ' : (KILL_POOL[lv.mon.key] || 'killS')); };
  // golpe del héroe: si el monstruo cae suena su muerte; si no, el golpe
  const sfxStrike = dead => { stat('hits'); if (dead) sfxKill(); else Sfx.play('atk'); };
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
    dragon: svg(`<path d="M3 20 8 8l5 4 3-6 3 6 5-4 5 12-5 7H8z" ${F}/><circle cx="12" cy="19" r="1.5" ${S}/><circle cx="20" cy="19" r="1.5" ${S}/><path d="M14 24h4M16 14v3"/>`),
    crab: svg(`<ellipse cx="16" cy="19" rx="8" ry="5.500" ${F}/><circle cx="13" cy="13" r="1.400" ${S}/><circle cx="19" cy="13" r="1.400" ${S}/><path d="M13 14v3M19 14v3M8 17 4 12 3 6M4 12l5-1M24 17l4-5 1-6M28 12l-5-1M9 22l-4 4M12 24l-2 4M20 24l2 4M23 22l4 4"/>`),
    octopus: svg(`<path d="M7 17C7 8 11 4 16 4s9 4 9 13z" ${F}/><circle cx="12.500" cy="12" r="1.500" ${S}/><circle cx="19.500" cy="12" r="1.500" ${S}/><path d="M8 17c-2 4-1 8-4 10M12 17c0 4-1 7 0 11M16 17v10c0 1 1 2 2 1M20 17c0 4 1 7 0 11M24 17c2 4 1 8 4 10"/>`),
    zombie: svg(`<path d="M9 14a7 7 0 0 1 14 0v5a7 7 0 0 1-14 0z" ${F}/><circle cx="13" cy="14" r="1.500" ${S}/><circle cx="19.500" cy="13" r="1.100" ${S}/><path d="M12 20h8M14 18v4M17 18v4M20 18v4M9 11l4 1M3 26l6-4M29 26l-6-4"/>`),
    kraken: svg(`<path d="M5 15C5 6 10 2 16 2s11 4 11 13z" ${F}/><path d="M11 9l4 2M21 9l-4 2"/><circle cx="12" cy="11.500" r="1.400" ${S}/><circle cx="20" cy="11.500" r="1.400" ${S}/><path d="M14 15l2 2 2-2M5 15c-2 5 0 9-3 13M9 16c-1 5 1 8-1 12M13 17c0 5-1 7 0 11M19 17c0 5 1 7 0 11M23 16c1 5-1 8 1 12M27 15c2 5 0 9 3 13"/>`),
    ogre: svg(`<path d="M5 12c0-6 5-9 11-9s11 3 11 9v6c0 6-5 10-11 10S5 24 5 18z" ${F}/><path d="M8 9 4 3M24 9l4-6M10 14l5 2M22 14l-5 2"/><circle cx="12" cy="17" r="1.200" ${S}/><circle cx="20" cy="17" r="1.200" ${S}/><path d="M10 22l2 5 2-5M18 22l2 5 2-5M13 22h6"/>`),
    reaper: svg(`<path d="M16 3c-6 1-9 6-9 12v13h18V15c0-6-3-11-9-12z" ${F}/><path d="M11 13c1-2 3-3 5-3s4 1 5 3v5c-1 2-3 3-5 3s-4-1-5-3z" style="fill:var(--card)"/><circle cx="14" cy="15" r="1.200" ${S}/><circle cx="18" cy="15" r="1.200" ${S}/><path d="M14 19h4M28 5v24M28 5c-3 0-6 1-7 4"/>`),
    drake: svg(`<path d="M16 8l-5-5-1 7L3 8l5 7-3 4 7 1 4 7 4-7 7-1-3-4 5-7-7 2-1-7z" ${F}/><circle cx="13.500" cy="14" r="1.300" ${S}/><circle cx="18.500" cy="14" r="1.300" ${S}/><path d="M13 19l3 2 3-2M16 8v4"/>`),
    mguf: svg(`<path d="M5 12 3 4l6 4 4-6 3 5 3-5 4 6 6-4-2 8z" ${F}/><path d="M7 12h18"/><path d="M8 12v8c0 5 3 9 8 10 5-1 8-5 8-10v-8" ${F}/><path d="M11 17l4 2M21 17l-4 2"/><circle cx="12.500" cy="19" r="1" ${S}/><circle cx="19.500" cy="19" r="1" ${S}/><path d="M12 25l2 2 2-2 2 2 2-2"/>`)
  };
  Object.assign(ICONS, {
    imp: svg(`<path d="M8 12 5 3l8 5M24 12l3-9-8 5"/><path d="M5 18c-3-1-3-5-2-7l5 3M27 18c3-1 3-5 2-7l-5 3" ${F}/><circle cx="16" cy="17" r="8" ${F}/><path d="M11 15l3 1.500M21 15l-3 1.500"/><circle cx="13" cy="17" r="1" ${S}/><circle cx="19" cy="17" r="1" ${S}/><path d="M12 22q4 3 8 0M16 25c0 3 3 4 5 2"/>`),
    fiend: svg(`<path d="M16 8c-3-4-8-5-13-3 2 2 2 5 1 8 3-2 6-1 8 2 1-2 2-4 4-7zM16 8c3-4 8-5 13-3-2 2-2 5-1 8-3-2-6-1-8 2-1-2-2-4-4-7z" ${F}/><ellipse cx="16" cy="17" rx="4" ry="6" ${F}/><path d="M13 12l-2-5M19 12l2-5"/><circle cx="14.500" cy="15" r="1" ${S}/><circle cx="17.500" cy="15" r="1" ${S}/><path d="M16 23c0 4 3 5 6 4"/>`),
    chained: svg(`<circle cx="16" cy="9" r="5" ${F}/><circle cx="14" cy="8.500" r="1" ${S}/><circle cx="18" cy="8.500" r="1" ${S}/><path d="M12 15c-3 2-3 8-2 12h12c1-4 1-10-2-12M10 17 5 20M22 17l5 3M13 20h6M5 20v6M27 20v6"/><circle cx="5" cy="28" r="1.500"/><circle cx="27" cy="28" r="1.500"/>`),
    maw: svg(`<path d="M3 20c0-9 5-15 13-15s13 6 13 15z" ${F}/><ellipse cx="16" cy="19" rx="6" ry="7" style="fill:var(--card)"/><path d="M11 17l2 2 2-3 2 3 2-2M11 22l2-2 3 3 3-3 2 2"/><path d="M7 7 4 2M25 7l3-5M4 22l-2 6M28 22l2 6"/>`),
    cultist: svg(`<path d="M16 3c-5 1-8 6-8 11v14h16V14c0-5-3-10-8-11z" ${F}/><path d="M11 12c1-2 3-3 5-3s4 1 5 3v5c-1 2-3 3-5 3s-4-1-5-3z" style="fill:var(--card)"/><circle cx="14" cy="14" r="1.100" ${S}/><circle cx="18" cy="14" r="1.100" ${S}/><path d="M8 20h16M26 4v10M24 4c0 2 4 2 4 0"/>`),
    goat: svg(`<path d="M9 12 5 3l7 4M23 12l4-9-7 4"/><path d="M8 13h16l-2 10-6 6-6-6z" ${F}/><path d="M11 16l4 1.500M21 16l-4 1.500"/><circle cx="12.500" cy="19" r="1" ${S}/><circle cx="19.500" cy="19" r="1" ${S}/><path d="M13 24l3 2 3-2M16 29c-3-3-1-6 0-8 1 2 3 5 0 8z" ${F}/>`),
    butcher: svg(`<path d="M7 11 4 3l6 3M25 11l3-8-6 3"/><path d="M8 12c0-5 3-8 8-8s8 3 8 8v6c0 5-3 9-8 9s-8-4-8-9z" ${F}/><circle cx="13" cy="14" r="2" ${S}/><circle cx="19" cy="14" r="2" ${S}/><path d="M12 22h8M14 20v4M18 20v4M4 14l-1 14M3 17h4"/>`),
    lord: svg(`<path d="M6 12 3 2l8 6M26 12l3-10-8 6"/><path d="M16 4l-3 6M16 4l3 6" /><path d="M7 11h18v8c0 5-4 9-9 11-5-2-9-6-9-11z" ${F}/><path d="M10 15l4 2M22 15l-4 2"/><circle cx="12.500" cy="18" r="1.300" ${S}/><circle cx="19.500" cy="18" r="1.300" ${S}/><path d="M12 24l2 2 2-2 2 2 2-2M28 8v22M26 8c0 3 4 3 4 0"/>`)
  });
  const ICON_CURSE = svg(`<path d="M16 6c5-1 10 3 9 8-1 6-8 8-11 4-3-3-1-8 3-8 3 0 5 3 3 5"/><circle cx="16" cy="16" r="2" ${S}/><path d="M7 25c4 3 12 3 16 0"/>`);
  const ICON_STONE = svg(`<path d="M16 5l8 5v12l-8 5-8-5V10z" ${F}/><path d="M16 5v22M8 10l16 12M24 10 8 22"/>`);
  const ICON_CHEST = svg(`<path d="M4 14c0-5 5-8 12-8s12 3 12 8z" ${F}/><rect x="4" y="14" width="24" height="12" rx="1.500" ${F}/><path d="M4 14h24M14 14v5h4v-5"/><circle cx="16" cy="20" r="1" ${S}/>`);
  const ICON_WAVE = svg(`<path d="M3 11q3.500-4 7 0t7 0 7 0 5 0M3 18q3.500-4 7 0t7 0 7 0 5 0M3 25q3.500-4 7 0t7 0 7 0 5 0"/>`);
  const ICON_ADV = svg(`<path d="M16 3 6 6v9c0 7 4 11 10 14 6-3 10-7 10-14V6z" ${F}/><path d="M16 9v13M11 13h10"/>`);
  const HERO_ICONS = {
    paladin: ICON_ADV,
    barbarian: svg(`<path d="M7 28 21 8"/><path d="M13 9c4-6 12-5 15-1-1 6-6 10-12 9z" ${F}/><path d="M18 14l5-4"/>`),
    ranger: svg(`<path d="M9 3c12 4 12 22 0 26" ${F}/><path d="M9 3v26M4 16h20M19 11l5 5-5 5"/>`),
    sherpa: svg(`<path d="M2 27 11 9l5 8 3-4 11 14z" ${F}/><path d="M11 9l-2.500 4.500 2.500-1 2.500 2 3-3"/><path d="M5 30h22" stroke-dasharray="2 3"/>`),
    mage: svg(`<path d="M7 29 19 13"/><path d="M23 3l1.8 4.7L29.5 9.5l-4.7 1.8L23 16l-1.8-4.7L16.5 9.5l4.7-1.8z" ${F}/><path d="M8 8v4M6 10h4M26 21v4M24 23h4"/>`),
    necromancer: svg(`<path d="M9 13a7 7 0 1 1 14 0c0 3-1 4-2 5v3h-10v-3c-1-1-2-2-2-5z" ${F}/><circle cx="13" cy="13" r="1.800" ${S}/><circle cx="19" cy="13" r="1.800" ${S}/><path d="M15 17.500l1 1.500 1-1.500M13 24v4M16 24v5M19 24v4M5 6v22M3 8h4"/>`),
    cleric: svg(`<circle cx="16" cy="14" r="9" ${F}/><path d="M16 6v16M10 12h12"/><path d="M12 25h8M13 29h6M16 23v6"/>`),
    knight: svg(`<path d="M7 28V13C7 7 11 3 16 3s9 4 9 10v15z" ${F}/><path d="M7 14h18M16 14v14M11 18h2M19 18h2"/><path d="M16 3v-1"/>`),
    rogue: svg(`<path d="M5 27 21 11"/><path d="M21 11l5-7 2 2-7 5z" ${F}/><path d="M27 27 11 11"/><path d="M11 11 6 4 4 6l7 5z" ${F}/><path d="M13 23l3-3 3 3"/>`),
    corsair: svg(`<path d="M3 17c4-1 6-6 13-6s9 5 13 6-1 4-4 3c-3 2-6 1-9 1s-6 1-9-1c-3 1-8-1-4-3z" ${F}/><path d="M12 22c0 3 1 5 4 6 3-1 4-3 4-6"/><circle cx="14.500" cy="19" r="1" ${S}/><circle cx="17.500" cy="19" r="1" ${S}/><path d="M15 25h2"/>`),
    demonhunter: svg(`<path d="M5 17 27 5"/><path d="M8 12l-3 5 5 3M24 8l3-3 1 5"/><path d="M3 9c2-3 6-3 7 0M22 27c0-5 3-8 7-8 0 4-3 8-7 8z" ${F}/><path d="M13 14l7 11"/>`)
  };
  const HEROES = {
    paladin: { name: L('Paladín', 'Paladin'), pack: 'base', txt: L('Una vez por nivel, antes de tirar, conserva el dado que diste a una habilidad el turno anterior y tira solo los otros dos.', 'Once per level, before rolling, keep the die you gave a skill last turn and roll only the other two.') },
    barbarian: { name: L('Bárbaro', 'Barbarian'), pack: 'base', txt: L('Con 1 de Vida, puede volver a tirar los tres dados una vez por turno.', 'At 1 Health, may reroll all three dice once per turn.') },
    ranger: { name: L('Ranger', 'Ranger'), pack: 'base', txt: L('Una vez por nivel, puede sumar un dado al Alcance en lugar de al Movimiento.', 'Once per level, may add a die to Range instead of Move.') },
    mage: { name: L('Mago', 'Mage'), pack: 'base', txt: L('Una vez por nivel, puede volver a tirar los tres dados.', 'Once per level, may reroll all three dice.') },
    necromancer: { name: L('Nigromante', 'Necromancer'), pack: 'mguf', txt: L('Una vez por nivel, pierde 1 de Vida para hacer 1 de daño a un enemigo a su Alcance.', 'Once per level, loses 1 Health to deal 1 damage to an enemy within Range.') },
    cleric: { name: L('Clérigo', 'Cleric'), pack: 'mguf', txt: L('Cuando los tres dados de Energía salen iguales (por ejemplo 3-3-3), cada uno sube 2, hasta un máximo de 6.', 'When all three Energy dice match (e.g. 3-3-3), each goes up by 2, to a maximum of 6.') },
    knight: { name: L('Caballero', 'Knight'), pack: 'mguf', txt: L('Una vez por nivel, puede asignar dos dados de Energía a una misma habilidad (Movimiento, Ataque o Defensa).', 'Once per level, may assign two Energy dice to the same skill (Move, Attack or Defence).') },
    rogue: { name: L('Pícaro', 'Rogue'), pack: 'mguf', txt: L('Una vez por nivel, puede sumar 1 al valor de los tres dados de Energía.', 'Once per level, may add 1 to the value of all three Energy dice.') },
    sherpa: { name: L('Sherpa', 'Sherpa'), pack: 'peak', txt: L('Una vez por nivel, puede moverse ignorando los muros, pero no puede terminar sobre uno.', 'Once per level, may move ignoring walls, but cannot end on one.') },
    corsair: { name: L('Corsario', 'Corsair'), pack: 'harbour', txt: L('Una vez por nivel, puede moverse a cualquier casilla libre, sin importar su Movimiento.', 'Once per level, may move to any empty tile, regardless of Move.') },
    demonhunter: { name: L('Cazador de demonios', 'Demon Hunter'), pack: 'hell', txt: L('Una vez por nivel, en cualquier momento, puede mover a un monstruo hasta 3 puntos de Movimiento.', 'Once per level, at any time, may move a monster up to 3 Move points.') }
  };
  // Qué héroes trae cada caja y qué nombre lleva
  const PACKS = [
    { key: 'base', name: 'One Card Dungeon' }, { key: 'mguf', name: "M'Guf-yn Returns" }, { key: 'peak', name: L('Montaña Eterna', 'Eternal Peak') },
    { key: 'harbour', name: 'Harbour Clash' }, { key: 'hell', name: L('La Puerta del Infierno', "Hell's Door") }
  ];
  const heroesOf = pack => HERO_KEYS.filter(k => HEROES[k].pack === pack);
  const ICON_WIND = svg(`<path d="M4 11h13c4 0 5-5 1.5-5.5M4 17h19c4 0 5 5 1.5 5.5M4 23h9c3 0 4 3 1.5 3.5"/>`);
  const ITEM_ICONS = {
    cloak: svg(`<path d="M11 5h10l5 8-3 15H9L6 13z" ${F}/><path d="M11 5c1 3 4 3 5 3s4 0 5-3M16 8v20"/>`),
    axe: svg(`<path d="M8 28 21 8"/><path d="M19 7c4-1 7 1 9 4-4 1-7 0-9-4z" ${F}/><path d="M4 6c4-2 7 2 4 4s-3 4 1 5"/>`),
    herbs: svg(`<path d="M16 29V13"/><path d="M16 20c-7 0-10-5-10-11 6 0 10 4 10 11zM16 16c0-6 4-11 10-11 0 6-4 11-10 11z" ${F}/>`),
    wyrm: svg(`<path d="M13 3h6M14 3v7l-6 14c-1 3 1 5 3 5h10c2 0 4-2 3-5l-6-14V3"/><path d="M10 21h12l2.5 5c.5 2-.7 3-2 3H9.5c-1.3 0-2.500-1-2-3z" ${F}/>`),
    flame: svg(`<path d="M16 3c1 6 8 9 8 17a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 4 2 4 1-4 0-8 2-13z" ${F}/><path d="M16 27c-2 0-3-1.500-3-3 0-2 2-3 3-5 1 2 3 3 3 5 0 1.500-1 3-3 3z"/>`),
    hourglass: svg(`<path d="M8 3h16M8 29h16M10 3c0 7 5 9 6 13-1 4-6 6-6 13M22 3c0 7-5 9-6 13 1 4 6 6 6 13"/><path d="M12 7h8c-1 3-3 4-4 6-1-2-3-3-4-6zM11 26c1-3 3-4 5-6 2 2 4 3 5 6z" ${F}/>`),
    eye: svg(`<path d="M16 3 28 11 24 27H8L4 11z" ${F}/><path d="M7 16c4-5 14-5 18 0-4 5-14 5-18 0z"/><circle cx="16" cy="16" r="2.500" ${S}/>`),
    powder: svg(`<path d="M8 12c0-3 4-4 8-4s8 1 8 4v12c0 3-4 4-8 4s-8-1-8-4z" ${F}/><path d="M8 12c0 3 4 4 8 4s8-1 8-4M8 19c0 3 4 4 8 4s8-1 8-4M24 8l3-4M27 4l1 3 3-1"/>`),
    sands: svg(`<path d="M6 4h20v24H6z" ${F}/><path d="M6 12q5-3 10 0t10 0M6 19q5-3 10 0t10 0"/><path d="M10 23l5 2 6-2"/>`),
    pendant: svg(`<path d="M7 5c0 9 4 12 9 12s9-3 9-12" /><path d="M16 17c-4-3-7 1-4 4l4 5 4-5c3-3 0-7-4-4z" ${F}/>`),
    holy: svg(`<path d="M13 3h6v5h-6z" ${F}/><path d="M16 1v8M13 4h6"/><path d="M13 8v4c-5 2-7 6-7 10a10 10 0 0 0 20 0c0-4-2-8-7-10V8" ${F}/><path d="M10 21h12"/>`),
    laurel: svg(`<path d="M16 28c-7-1-11-8-9-17M16 28c7-1 11-8 9-17"/><path d="M7 11c3 0 4 3 3 5-3 0-4-3-3-5zM9 17c3 0 5 3 4 6-3 0-5-3-4-6zM25 11c-3 0-4 3-3 5 3 0 4-3 3-5zM23 17c-3 0-5 3-4 6 3 0 5-3 4-6z" ${F}/>`),
    fist: svg(`<path d="M9 14V8c0-2 3-2 3 0 0-2 3-2 3 0 0-2 3-2 3 0 0-2 3-1 3 1v8c0 5-2 8-5 9v3H11v-4c-3-1-5-4-5-8 0-3 3-3 3-1z" ${F}/><path d="M9 14v3M12 8v6M15 8v6M18 8v6"/>`),
    mail: svg(`<path d="M10 4 5 8l-3 6 5 2v12h18V16l5-2-3-6-5-4c-1 3-3 4-6 4s-5-1-6-4z" ${F}/><path d="M9 20h14M9 24h14"/>`),
    gorgon: svg(`<circle cx="16" cy="17" r="7" ${F}/><circle cx="13.500" cy="16" r="1.300" ${S}/><circle cx="18.500" cy="16" r="1.300" ${S}/><path d="M13 21c2 1.500 4 1.500 6 0M16 10C14 5 8 5 6 9s2 6 5 5M16 10c2-5 8-5 10-1s-2 6-5 5M9 20c-4 1-5 5-3 8M23 20c4 1 5 5 3 8M14 24c-1 3-3 4-3 5M18 24c1 3 3 4 3 5"/>`)
  };
  const ITEMS = {
    cloak: { name: L('Capa de cuero', 'Leather Cloak'), short: L('Capa', 'Cloak'), txt: L('Durante todo un nivel, ignoras el efecto de las ventiscas.', 'For a whole level, you ignore the effect of blizzards.') },
    axe: { name: L('Cuerda y piolet', 'Rope and Ice Axe'), short: L('Piolet', 'Ice Axe'), txt: L('En tu turno, suma +2 a tu Ataque y +2 a tu Alcance.', 'On your turn, add +2 to your Attack and +2 to your Range.') },
    herbs: { name: L('Hierbas curativas', 'Healing Herbs'), short: L('Hierbas', 'Herbs'), txt: L('Al recibir un ataque, reduces el daño a la mitad, redondeando hacia arriba.', 'When attacked, halve the damage, rounding up.') },
    wyrm: { name: L('Extracto de Wyrm', 'Wyrm Extract'), short: L('Extracto', 'Extract'), txt: L('Suma hasta +4 a tu Movimiento este turno.', 'Add up to +4 to your Move this turn.') },
    flame: { name: L('Llama del destino', 'Flame of Fate'), short: L('Llama', 'Flame'), txt: L('En la fase de Energía, vuelve a tirar uno o más dados y quédate con la segunda tirada.', 'In the Energy phase, reroll one or more dice and keep the second roll.') },
    hourglass: { name: L('Reloj de arena', 'Hourglass'), short: L('Reloj', 'Hourglass'), txt: L('Al terminar tu turno, los monstruos no actúan y vuelves a tirar los dados de Energía.', 'At the end of your turn, the monsters don\'t act and you roll the Energy dice again.') },
    eye: { name: L('Ojo de dragón', 'Dragon\'s Eye'), short: L('Ojo', 'Eye'), txt: L('En la fase de Energía, tira un D12 en lugar de un D6 y asígnalo a una habilidad como un dado normal.', 'In the Energy phase, roll a D12 instead of a D6 and assign it to a skill like a normal die.') },
    powder: { name: L('Pólvora negra', 'Black Powder'), short: L('Pólvora', 'Powder'), txt: L('Durante tu ataque, el daño a un monstruo se extiende a todos los demás monstruos, aunque estén fuera de Alcance o de visión.', 'During your attack, damage to one monster spreads to all other monsters, even out of Range or sight.') },
    sands: { name: L('Arenas ocultas', 'Hidden Sands'), short: L('Arenas', 'Sands'), txt: L('Durante todo un nivel, los monstruos no reciben los bonos del agua.', 'For a whole level, monsters don\'t get water bonuses.') },
    gorgon: { name: L('Cabeza de Gorgona', 'Gorgon\'s Head'), short: L('Gorgona', 'Gorgon'), txt: L('Durante un turno, los monstruos no se mueven (sí pueden atacar).', 'For one turn, monsters don\'t move (they can still attack).') },
    pendant: { name: L('Colgante de alma', 'Soul Pendant'), short: L('Colgante', 'Pendant'), txt: L('Si tu Vida llega a 0, vuelves a la vida con 1.', 'If your Health reaches 0, you come back to life with 1.') },
    holy: { name: L('Agua bendita', 'Holy Water'), short: L('Agua', 'Water'), txt: L('Durante todo un nivel, los monstruos no reciben los bonos de las casillas malditas.', 'For a whole level, monsters don\'t get bonuses from cursed tiles.') },
    laurel: { name: L('Corona de laurel', 'Laurel Crown'), short: L('Corona', 'Crown'), txt: L('Tras tu fase de aventurero, ordena a un monstruo que se mueva y ataque a otros monstruos con sus propias cifras. Luego siguen las fases normales de los monstruos.', 'After your adventurer phase, order a monster to move and attack other monsters with its own stats. Then the normal monster phases follow.') },
    fist: { name: L('Puño de hierro', 'Iron Fist'), short: L('Puño', 'Fist'), txt: L('Cuando rompas la Piedra de la Perdición, haces 2 de daño a todos los monstruos y 1 a tu aventurero.', 'When you break the Stone of Doom, you deal 2 damage to all monsters and 1 to your adventurer.') },
    mail: { name: L('Cota de malla', 'Chainmail'), short: L('Cota', 'Mail'), txt: L('Cuando te atacan los monstruos, suma 3 a tu Defensa.', 'When monsters attack you, add 3 to your Defence.') }
  };
  const ITEM_PACK = { cloak: 'Montaña Eterna', axe: 'Montaña Eterna', herbs: 'Montaña Eterna', wyrm: 'Montaña Eterna', flame: 'Montaña Eterna',
    hourglass: 'Harbour Clash', eye: 'Harbour Clash', powder: 'Harbour Clash', sands: 'Harbour Clash', gorgon: 'Harbour Clash',
    pendant: 'Puerta del Infierno', holy: 'Puerta del Infierno', laurel: 'Puerta del Infierno', fist: 'Puerta del Infierno', mail: 'Puerta del Infierno' };
  const ICON_LOCK = '<svg class="lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const ICON_LOCK_OPEN = '<svg class="lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg>';
  const ICON_STAIR = svg(`<path d="M4 26h7v-6h6v-6h6v-6h5"/>`);

  const NAMES = LANG === 'en' ? { spd: 'Mov', atk: 'Atk', def: 'Def', rng: 'Rng' } : { spd: 'Mov', atk: 'Atq', def: 'Def', rng: 'Alc' };
  const LONG = LANG === 'en' ? { spd: 'Move', atk: 'Attack', def: 'Defence', rng: 'Range' } : { spd: 'Movimiento', atk: 'Ataque', def: 'Defensa', rng: 'Alcance' };
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  let keepSet = new Set();
  let mode = null;   // habilidad en curso: 'necro' | 'demonPick' | { demon: monstruo }
  let G = null, busy = false, rolling = false, builtLevel = -1, lastHp = START_HP;
  const tok = { adv: null, mons: new Map() };
  let bestLevel = 0;

  /* ---------- persistencia ligera ---------- */
  function save() {
    try {
      if (!G || G.laurel) return;
      try { localStorage.setItem(saveKey(G.game) + ':t', String(Date.now())); } catch (e) {}
      if (G.phase === 'won' || G.abandoned) { localStorage.removeItem(saveKey(G.game)); return; }
      let sv = G;
      if (G.phase === 'dead') { sv = E.retryLevel(G); sv.totalTurns = G.totalTurns; sv.runId = G.runId; sv.trackAbil = G.trackAbil; sv.abilEver = G.abilEver; sv.startItems = G.startItems; sv.stats = Object.assign({}, G.stats, { deaths: ((G.stats || {}).deaths || 0) + 1 }); }
      localStorage.setItem(saveKey(G.game), JSON.stringify(sv));
    } catch (e) {}
  }
  // todas las partidas en curso (una por aventura), la más reciente primero
  function loadSlots() {
    const out = [];
    for (const g of ADV_ORDER) { const s = loadSaved(g); if (s) { let t = 0; try { t = +localStorage.getItem(saveKey(g) + ':t') || 0; } catch (e) {} out.push({ game: g, g: s, t }); } }
    return out.sort((a, b) => b.t - a.t);
  }
  function loadSaved(game) {
    try {
      const raw = localStorage.getItem(saveKey(game));
      if (!raw) return null;
      const g = JSON.parse(raw);
      return validState(g) && (!game || g.game === game) ? g : null;
    } catch (e) { return null; }
  }
  const okItems = (a, game) => Array.isArray(a) && a.length <= 3 && new Set(a).size === a.length && a.every(i => itemPool(game).includes(i)) && (GAMES[game].items || !a.length);
  const bool = (o, k) => { if (o[k] == null) o[k] = false; return typeof o[k] === 'boolean'; };
  function validState(g) {
    if (!g || !g.adv || !g.turn || !Array.isArray(g.mons)) return false;
    if (g.game == null) g.game = 'base';             // partidas guardadas antes de las expansiones
    if (!GAMES[g.game]) return false;
    useGame(g.game);
    const lv = LEVELS[g.levelIdx];
    if (!lv) return false;
    if (g.items == null) g.items = [];
    if (g.cp && g.cp.items == null) g.cp.items = [];
    if (g.chests == null) g.chests = false;           // las partidas antiguas de Montaña Eterna no tenían cofres
    if (g.chest === undefined) g.chest = null;
    if (g.loot == null) g.loot = 0;
    if (g.cp && g.cp.loot == null) g.cp.loot = 0;
    if (!['cloak', 'sherpaOn', 'corsairOn', 'powder', 'gorgon', 'sands', 'abil', 'fist', 'revived'].every(k => bool(g, k))) return false;
    g.laurel = null; g.pendingAtk = null;
    if (g.stone === undefined) g.stone = null;
    if (lv.stoneAt >= 0 ? !(g.stone && g.stone.at === lv.stoneAt && Number.isInteger(g.stone.val) && g.stone.val >= 1 && g.stone.val <= 4 && typeof g.stone.broken === 'boolean') : g.stone) return false;
    if (g.cp && !['cloak', 'sands', 'abil'].every(k => bool(g.cp, k))) return false;
    if (g.pendingDmg == null) g.pendingDmg = 0;
    if (!g.turn.assign2) g.turn.assign2 = NO_SKILLS();
    if (g.turn.knight == null) g.turn.knight = false;
    if (g.turn.boosted == null) g.turn.boosted = false;
    if (!g.turn.loot) g.turn.loot = { k: null, n: 0 };
    if (!Number.isInteger(g.loot) || g.loot < 0 || g.loot > 6) return false;
    if (g.chest && !(g.chests && g.chest.at === lv.chestAt && Number.isInteger(g.chest.val) && g.chest.val >= 1 && g.chest.val <= 6 && typeof g.chest.open === 'boolean')) return false;
    if (!okItems(g.items, g.game) || !g.cp || !okItems(g.cp.items, g.game)) return false;
    if (!HERO_KEYS.includes(g.hero) || !Number.isInteger(g.cp.hp) || g.cp.hp < 1 || g.cp.hp > START_HP) return false;
    const m0 = lv.mon;
    const inGrid = o => Number.isInteger(o.x) && Number.isInteger(o.y) && o.x >= 0 && o.y >= 0 && o.x < COLS && o.y < ROWS;
    return inGrid(g.adv) && g.mons.every(m => inGrid(m) && m.def === m0.def && m.atk === m0.atk && m.spd === m0.spd && m.rng === m0.rng && m.maxHp === m0.hp);
  }
  function loadBest() { bestLevel = 0; try { bestLevel = +localStorage.getItem(bestKey()) || 0; } catch (e) {} }
  function noteBest() {
    const n = G.levelIdx + 1;
    if (n > bestLevel) { bestLevel = n; try { localStorage.setItem(bestKey(), String(n)); } catch (e) {} }
  }

  /* ---------- usuarios locales (en este dispositivo) ---------- */
  // Cada usuario tiene su partida en curso, su mejor etapa y su historial: mazmorras, estadísticas y logros.
  // La contraseña se guarda resumida (SHA-256 con sal), nunca en claro. Todo vive en el navegador de este dispositivo;
  // la copia de seguridad es un código que permite recuperarlo en otro navegador o dispositivo.
  const USERS_KEY = 'dioc-users-v1', CUR_KEY = 'dioc-user';
  const ukey = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // ---- Nube (Firebase, por su API REST: sin librerías). El usuario entra con nombre y contraseña: por dentro el
  // nombre se convierte en un correo interno que nunca recibe mensajes, así que no hay validación por correo.
  const FB = { key: 'AIzaSyCls47aZSnrwdSZSxDDpaCEfFW6zJftGY4', project: 'dungeon-in-one-card' };
  const Cloud = (() => {
    const ID = 'https://identitytoolkit.googleapis.com/v1/accounts:';
    const DOC = uid => `https://firestore.googleapis.com/v1/projects/${FB.project}/databases/(default)/documents/users/${uid}`;
    const toks = {};
    const MSG = {
      EMAIL_EXISTS: L('Ese nombre de usuario ya existe. Elige otro o entra con él.', 'That username already exists. Pick another or sign in with it.'),
      EMAIL_NOT_FOUND: L('Usuario o contraseña incorrectos.', 'Wrong username or password.'), INVALID_PASSWORD: L('Usuario o contraseña incorrectos.', 'Wrong username or password.'),
      INVALID_LOGIN_CREDENTIALS: L('Usuario o contraseña incorrectos.', 'Wrong username or password.'), INVALID_EMAIL: L('Ese nombre no se puede usar. Prueba con letras y números.', "That name can't be used. Try letters and numbers."),
      USER_DISABLED: L('Este usuario está deshabilitado.', 'This user is disabled.'), TOO_MANY_ATTEMPTS_TRY_LATER: L('Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.'),
      OPERATION_NOT_ALLOWED: L('Falta activar «Correo electrónico/contraseña» en Firebase (Authentication).', 'Email/password sign-in is not enabled in Firebase (Authentication).'),
      CONFIGURATION_NOT_FOUND: L('Falta activar Authentication en Firebase.', 'Authentication is not enabled in Firebase.'),
      PERMISSION_DENIED: L('La base de datos rechazó el acceso: revisa las reglas de Firestore.', 'The database refused access: check the Firestore rules.'),
      NOT_FOUND: L('Falta crear la base de datos Firestore en Firebase.', 'The Firestore database has not been created in Firebase.')
    };
    const msg = c => { c = String(c || ''); const k = Object.keys(MSG).find(x => c.startsWith(x)); return k ? MSG[k] : c.startsWith('WEAK_PASSWORD') ? L('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.') : L('No se pudo conectar con la nube (', 'Could not connect to the cloud (') + (c || 'error') + ').'; };
    async function call(url, opt, okMissing) {
      let r;
      try { r = await fetch(url, opt); } catch (e) { const er = new Error(L('Sin conexión a internet.', 'No internet connection.')); er.off = true; throw er; }
      if (okMissing && r.status === 404) return null;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const er = new Error(msg(j.error && (j.error.status === 'PERMISSION_DENIED' || j.error.status === 'NOT_FOUND' ? j.error.status : j.error.message))); er.code = j.error && (j.error.message || j.error.status); throw er; }
      return j;
    }
    const post = (url, body) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    // nombre → correo interno válido: letras y números tal cual; lo demás, en hexadecimal
    function emailOf(name) {
      const b = new TextEncoder().encode(ukey(name)); let s = '';
      for (const c of b) s += (c >= 97 && c <= 122) || (c >= 48 && c <= 57) ? String.fromCharCode(c) : '_' + c.toString(16).padStart(2, '0');
      return s + '@usuarios.dioc.juego';
    }
    const auth = (j) => { toks[j.localId] = { id: j.idToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 - 60000 }; return { uid: j.localId, refresh: j.refreshToken }; };
    async function token(c) {
      const t = toks[c.uid]; if (t && t.exp > Date.now()) return t.id;
      const j = await call('https://securetoken.googleapis.com/v1/token?key=' + FB.key, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(c.refresh) });
      toks[c.uid] = { id: j.id_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 - 60000 }; c.refresh = j.refresh_token || c.refresh;
      return j.id_token;
    }
    return {
      emailOf,
      signUp: async (name, pw) => auth(await post(ID + 'signUp?key=' + FB.key, { email: emailOf(name), password: pw, returnSecureToken: true })),
      signIn: async (name, pw) => auth(await post(ID + 'signInWithPassword?key=' + FB.key, { email: emailOf(name), password: pw, returnSecureToken: true })),
      async pull(c) {
        const j = await call(DOC(c.uid), { headers: { Authorization: 'Bearer ' + await token(c) } }, true);
        if (!j || !j.fields || !j.fields.data) return null;
        try { return JSON.parse(j.fields.data.stringValue); } catch (e) { return null; }
      },
      async push(c, name, data) {
        await call(DOC(c.uid), { method: 'PATCH', headers: { Authorization: 'Bearer ' + await token(c), 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { name: { stringValue: name }, data: { stringValue: JSON.stringify(data) }, updated: { integerValue: String(Date.now()) } } }) });
      },
      async remove(c) {
        const t = await token(c);
        await call(DOC(c.uid), { method: 'DELETE', headers: { Authorization: 'Bearer ' + t } }, true);
        await post(ID + 'delete?key=' + FB.key, { idToken: t });
      }
    };
  })();

  // logros que una versión anterior otorgó por error (sin objetos en una aventura donde son opcionales)
  function fixRec(r) { for (const k of ['naked', 'purist']) if (r.ach && r.ach[k] && (!['peak', 'harbour', 'hell'].includes(r.ach[k].g) || r.ach[k].d < 1794777359144)) delete r.ach[k]; return r; }
  // Une dos historiales (el de este dispositivo y el de la nube) sin perder logros ni récords
  function mergeRec(a, b) {
    a = a || {}; b = b || {};
    const r = { games: {}, tot: {}, ach: {}, hist: [], heroes: [], runs: Object.assign({}, b.runs, a.runs) };
    for (const g of new Set([...Object.keys(a.games || {}), ...Object.keys(b.games || {})])) {
      const x = (a.games || {})[g] || {}, y = (b.games || {})[g] || {};
      const fast = [x.fastest, y.fastest].filter(v => v != null);
      r.games[g] = { wins: Math.max(x.wins || 0, y.wins || 0), falls: Math.max(x.falls || 0, y.falls || 0), best: Math.max(x.best || 0, y.best || 0),
        bestRank: RANK_ORDER.indexOf(x.bestRank) >= RANK_ORDER.indexOf(y.bestRank) ? (x.bestRank || null) : y.bestRank, fastest: fast.length ? Math.min(...fast) : null,
        heroes: [...new Set([...(x.heroes || []), ...(y.heroes || [])])], pure: [...new Set([...(x.pure || []), ...(y.pure || [])])] };
    }
    for (const k of new Set([...Object.keys(a.tot || {}), ...Object.keys(b.tot || {})])) r.tot[k] = Math.max((a.tot || {})[k] || 0, (b.tot || {})[k] || 0);
    for (const k of new Set([...Object.keys(a.ach || {}), ...Object.keys(b.ach || {})])) { const x = (a.ach || {})[k], y = (b.ach || {})[k]; r.ach[k] = !x ? y : !y ? x : (x.d <= y.d ? x : y); }
    const seen = new Set();
    r.hist = [...(a.hist || []), ...(b.hist || [])].filter(h => { const id = h.d + '|' + h.g + '|' + h.won; if (seen.has(id)) return false; seen.add(id); return true; }).sort((p, q) => q.d - p.d).slice(0, 12);
    r.heroes = [...new Set([...(a.heroes || []), ...(b.heroes || [])])];
    fixRec(r);
    r.heroWins = {}; for (const k of new Set([...Object.keys(a.heroWins || {}), ...Object.keys(b.heroWins || {})])) r.heroWins[k] = Math.max((a.heroWins || {})[k] || 0, (b.heroWins || {})[k] || 0);
    return r;
  }

  // ---- Usuarios: la nube es la fuente principal; este dispositivo guarda una copia para jugar sin internet
  const Users = (() => {
    const all = () => { try { const o = JSON.parse(localStorage.getItem(USERS_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
    const store = o => { try { localStorage.setItem(USERS_KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
    let cur = null; try { cur = localStorage.getItem(CUR_KEY) || null; } catch (e) {}
    if (cur && !all()[cur]) cur = null;
    const setCur = k => { cur = k; try { k ? localStorage.setItem(CUR_KEY, k) : localStorage.removeItem(CUR_KEY); } catch (e) {} };
    async function hash(pw, salt) {
      const data = new TextEncoder().encode(salt + '|' + pw);
      try { const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
      catch (e) { let a = 5381, b = 52711; for (const c of data) { a = ((a * 33) ^ c) >>> 0; b = ((b * 31) + c) >>> 0; } return 'x' + a.toString(16) + b.toString(16); }
    }
    const salt = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    const emptyRec = () => ({ games: {}, tot: {}, ach: {}, hist: [], heroes: [], runs: {} });
    const SLOTS = ['base', 'mguf', 'peak', 'harbour', 'hell'];   // una partida guardada por aventura
    const sKey = (k, g) => SAVE_KEY + ':u:' + k + ':' + g, tKey = (k, g) => sKey(k, g) + ':t';
    const getS = (k, g) => { try { return localStorage.getItem(sKey(k, g)); } catch (e) { return null; } };
    const getT = (k, g) => { try { return +localStorage.getItem(tKey(k, g)) || 0; } catch (e) { return 0; } };
    const allSaves = k => { const o = {}; for (const g of SLOTS) { const s = getS(k, g), t = getT(k, g); if (s || t) o[g] = { s, t }; } return o; };
    const gameOf = s => { try { return JSON.parse(s).game || 'base'; } catch (e) { return null; } };
    // datos antiguos de la nube (una sola partida) → por aventura
    const remoteSaves = r => { if (!r) return {}; if (r.saves) return r.saves; const o = {}; if (r.save) { const g = gameOf(r.save); if (g) o[g] = { s: r.save, t: r.saveAt || 0 }; } return o; };
    const putSave = (k, g, x) => { try { x.s ? localStorage.setItem(sKey(k, g), x.s) : localStorage.removeItem(sKey(k, g)); localStorage.setItem(tKey(k, g), String(x.t || 0)); } catch (e) {} };
    function checkName(name) {
      name = String(name || '').trim().replace(/\s+/g, ' ');
      if (name.length < 2 || name.length > 16) return [null, L('El nombre debe tener entre 2 y 16 caracteres.', 'The name must be 2 to 16 characters long.')];
      if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return [null, L('Usa solo letras, números, espacios, puntos o guiones.', 'Use only letters, numbers, spaces, dots or dashes.')];
      if (Cloud.emailOf(name).split('@')[0].length > 64) return [null, L('Ese nombre es demasiado largo. Prueba uno más corto.', 'That name is too long. Try a shorter one.')];
      return [name, null];
    }
    // trae lo de la nube y lo une con lo de este dispositivo; luego sube el resultado
    async function syncNow(k) {
      const o = all(), u = o[k]; if (!u || !u.cloud) return;
      const remote = await Cloud.pull(u.cloud);
      const o2 = all(), u2 = o2[k]; if (!u2) return;
      u2.cloud.refresh = u.cloud.refresh;
      u2.rec = mergeRec(u2.rec, remote && remote.rec);
      const rs = remoteSaves(remote);
      for (const g of Object.keys(rs)) if (SLOTS.includes(g) && (rs[g].t || 0) > getT(k, g)) putSave(k, g, rs[g]);
      store(o2);
      await Cloud.push(u2.cloud, u2.name, { v: 2, rec: u2.rec, saves: allSaves(k) });
      const o3 = all(); if (o3[k]) { o3[k].cloud = Object.assign({}, u2.cloud, { dirty: false, syncedAt: Date.now() }); store(o3); }
    }
    let pushing = null, again = false;
    async function sync(k) {
      k = k || cur; if (!k || !(all()[k] || {}).cloud) return;
      const o = all(); o[k].cloud.dirty = true; store(o);
      if (pushing) { again = true; return pushing; }
      pushing = (async () => { try { do { again = false; await syncNow(k); } while (again); } catch (e) { /* queda pendiente: se reintenta luego */ } finally { pushing = null; } })();
      return pushing;
    }
    const api = {
      get cur() { return cur; },
      list() { const o = all(); return Object.keys(o).map(k => ({ k, name: o[k].name, cloud: !!o[k].cloud })).sort((a, b) => a.name.localeCompare(b.name)); },
      get(k) { return all()[k || cur] || null; },
      exists: k => !!all()[k],
      // crear usuario nuevo en la nube
      async create(name, pw) {
        let e; [name, e] = checkName(name); if (e) return e;
        if ((pw || '').length < 6) return L('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.');
        const k = ukey(name);
        if (all()[k]) return L('Ya existe un usuario con ese nombre en este dispositivo.', 'There is already a user with that name on this device.');
        let c; try { c = await Cloud.signUp(name, pw); } catch (er) { return er.off ? L('Necesitas internet para crear el usuario.', 'You need internet to create the user.') : er.message; }
        const o = all(), s = salt();
        o[k] = { name, salt: s, hash: await hash(pw, s), created: Date.now(), rec: emptyRec(), cloud: c };
        if (!store(o)) return L('No se pudo guardar en este navegador.', 'Could not save in this browser.');
        setCur(k); sync(k); return null;
      },
      // entrar: con internet se comprueba en la nube; sin internet basta la copia de este dispositivo
      async login(name, pw) {
        const k = ukey(name), o = all(), u = o[k];
        if (u && !u.cloud) { if (await hash(pw, u.salt) !== u.hash) return L('Contraseña incorrecta.', 'Wrong password.'); setCur(k); return null; }
        let c;
        try { c = await Cloud.signIn(u ? u.name : name, pw); }
        catch (er) {
          if (er.off && u && await hash(pw, u.salt) === u.hash) { setCur(k); return null; }
          return er.off ? L('Necesitas internet para entrar con un usuario que no está en este dispositivo.', "You need internet to sign in with a user that isn't on this device.") : er.message;
        }
        const o2 = all(), s = salt();
        o2[k] = Object.assign(o2[k] || { name: String(name).trim(), created: Date.now(), rec: emptyRec() }, { salt: s, hash: await hash(pw, s), cloud: c });
        store(o2); setCur(k);
        try { await syncNow(k); } catch (er) { const o3 = all(); if (o3[k]) { o3[k].cloud.dirty = true; store(o3); } }
        return null;
      },
      // pasar a la nube un usuario que se creó solo en este dispositivo
      async upload(pw) {
        const o = all(), u = o[cur]; if (!u) return L('No hay usuario.', 'No user.');
        if (await hash(pw, u.salt) !== u.hash) return L('Contraseña incorrecta.', 'Wrong password.');
        if (pw.length < 6) return 'short';
        let c; try { c = await Cloud.signUp(u.name, pw); } catch (er) { return er.off ? L('Necesitas internet para subir el usuario a la nube.', 'You need internet to upload the user to the cloud.') : er.message; }
        const o2 = all(); o2[cur].cloud = c; store(o2);
        try { await syncNow(cur); } catch (er) { return null; }
        return null;
      },
      async setPassword(oldPw, newPw) {   // para usuarios locales con contraseña corta, antes de subirlos
        const o = all(), u = o[cur]; if (!u) return L('No hay usuario.', 'No user.');
        if (await hash(oldPw, u.salt) !== u.hash) return L('Contraseña incorrecta.', 'Wrong password.');
        if ((newPw || '').length < 6) return L('La contraseña nueva debe tener al menos 6 caracteres.', 'The new password must be at least 6 characters.');
        u.salt = salt(); u.hash = await hash(newPw, u.salt); store(o); return null;
      },
      logout() { setCur(null); },
      async remove(k, pw) {
        const o = all(), u = o[k]; if (!u) return null;
        if (await hash(pw, u.salt) !== u.hash) return L('Contraseña incorrecta.', 'Wrong password.');
        if (u.cloud) {
          try { await Cloud.signIn(u.name, pw).then(c => { u.cloud = c; }); await Cloud.remove(u.cloud); }
          catch (er) { return er.off ? L('Necesitas internet para borrar el usuario de la nube.', 'You need internet to delete the user from the cloud.') : er.message; }
        }
        const o2 = all(); delete o2[k]; store(o2);
        try { for (const g of SLOTS) { localStorage.removeItem(sKey(k, g)); localStorage.removeItem(tKey(k, g)); } localStorage.removeItem(BEST_KEY + ':u:' + k); } catch (e) {}
        if (cur === k) setCur(null); return null;
      },
      update(fn) { if (!cur) return null; const o = all(), u = o[cur]; if (!u) return null; u.rec = Object.assign(emptyRec(), u.rec); const r = fn(u.rec); store(o); sync(); return r; },
      sync, syncPending() { const u = all()[cur]; if (u && u.cloud && u.cloud.dirty) sync(); },
      savedNow(g) { if (cur && g) try { localStorage.setItem(tKey(cur, g), String(Date.now())); } catch (e) {} },
      keys() { return Object.keys(all()); },
      exportCode(k) {
        const o = all(), u = o[k || cur]; if (!u) return '';
        const json = JSON.stringify({ v: 2, k: k || cur, u: Object.assign({}, u, { cloud: undefined }), saves: allSaves(k || cur) });
        return 'DIOC1-' + btoa(unescape(encodeURIComponent(json)));
      },
      parseCode(code) {
        try {
          const s = String(code || '').replace(/\s+/g, ''); if (!s.startsWith('DIOC1-')) return null;
          const d = JSON.parse(decodeURIComponent(escape(atob(s.slice(6)))));
          return d && (d.v === 1 || d.v === 2) && d.u && d.u.name && d.u.hash && d.u.salt ? d : null;
        } catch (e) { return null; }
      },
      importData(d) {
        const o = all(), k = ukey(d.u.name), prev = o[k];
        o[k] = Object.assign({}, d.u, prev && prev.cloud ? { cloud: prev.cloud, rec: mergeRec(prev.rec, d.u.rec) } : {});
        if (!store(o)) return false;
        const ds = remoteSaves(d); for (const g of Object.keys(ds)) if (SLOTS.includes(g) && ds[g].s) putSave(k, g, ds[g]);
        setCur(k); sync(k); return true;
      }
    };
    window.addEventListener('online', () => api.syncPending());
    return api;
  })();
  function saveKey(g) { return (Users.cur ? SAVE_KEY + ':u:' + Users.cur : SAVE_KEY) + ':' + (g || 'base'); }
  // Partidas de versiones anteriores (una sola ranura) → la ranura de su aventura
  function migrateSaves() {
    for (const base of [SAVE_KEY, ...Users.keys().map(k => SAVE_KEY + ':u:' + k)]) {
      try {
        const raw = localStorage.getItem(base); if (!raw) continue;
        const g = (JSON.parse(raw) || {}).game || 'base';
        localStorage.setItem(base + ':' + g, raw); localStorage.setItem(base + ':' + g + ':t', String(Date.now()));
        localStorage.removeItem(base); localStorage.removeItem(base + ':t');
      } catch (e) {}
    }
  }
  function bestKey() { return Users.cur ? BEST_KEY + ':u:' + Users.cur : BEST_KEY; }
  const newRunId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Catálogo de logros: mazmorras completadas, rangos de victoria y premios (los mismos de la pantalla final)
  const ACH = [
    { t: 'bronce', g: L('Mazmorras', 'Dungeons'), id: 'win_base', name: L('Cáliz de Brasas', 'Ember Chalice'), txt: L('Completa One Card Dungeon.', 'Complete One Card Dungeon.') },
    { t: 'plata', g: L('Mazmorras', 'Dungeons'), id: 'win_mguf', name: L("Fin de M'Guf-yn", 'End of M\'Guf-yn'), txt: L("Completa M'Guf-yn Returns.", 'Complete M\'Guf-yn Returns.') },
    { t: 'plata', g: L('Mazmorras', 'Dungeons'), id: 'win_peak', name: L('Rey de la cima', 'King of the Peak'), txt: L('Completa la Montaña Eterna.', 'Complete Eternal Peak.') },
    { t: 'plata', g: L('Mazmorras', 'Dungeons'), id: 'win_harbour', name: L('Lobo de mar', 'Sea Wolf'), txt: L('Completa Harbour Clash.', 'Complete Harbour Clash.') },
    { t: 'oro', g: L('Mazmorras', 'Dungeons'), id: 'win_hell', name: L('Portero del Infierno', 'Gatekeeper of Hell'), txt: L('Completa La Puerta del Infierno.', 'Complete Hell\'s Door.') },
    { t: 'diamante', g: L('Mazmorras', 'Dungeons'), id: 'all', name: L('Leyenda de la mazmorra', 'Dungeon Legend'), txt: L('Completa las cinco aventuras.', 'Complete all five adventures.') },
    { t: 'plata', g: L('Mazmorras', 'Dungeons'), id: 'multi', name: L('Multiclase', 'Multiclass'), txt: L('Gana con 3 héroes distintos.', 'Win with 3 different heroes.') },
    { t: 'diamante', g: L('Rangos', 'Ranks'), id: 'Intocable', name: L('Intocable', 'Untouchable'), txt: L('Gana sin caer y con 10 de daño o menos.', 'Win without falling and taking 10 damage or less.') },
    { t: 'plata', g: L('Rangos', 'Ranks'), id: 'Héroe de manual', name: L('Héroe de manual', 'Textbook Hero'), txt: L('Gana sin caer ni una vez.', 'Win without falling even once.') },
    { t: 'bronce', g: L('Rangos', 'Ranks'), id: 'Terco con suerte', name: L('Terco con suerte', 'Lucky Stubborn'), txt: L('Gana tras caer 1 o 2 veces.', 'Win after falling 1 or 2 times.') },
    { t: 'bronce', g: L('Rangos', 'Ranks'), id: 'Cucaracha inmortal', name: L('Cucaracha inmortal', 'Immortal Cockroach'), txt: L('Gana tras caer 3 veces o más.', 'Win after falling 3 or more times.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Muro humano', name: L('Muro humano', 'Human Wall'), txt: L('Gana bloqueando 8 ataques o más.', 'Win blocking 8 or more attacks.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Exterminador', name: L('Exterminador', 'Exterminator'), txt: L('Gana venciendo 10 monstruos o más.', 'Win defeating 10 or more monsters.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Saqueador', name: L('Saqueador', 'Looter'), txt: L('Gana abriendo 3 cofres o más.', 'Win opening 3 or more chests.') },
    { t: 'oro', g: L('Premios', 'Awards'), id: 'Piel de roca', name: L('Piel de roca', 'Rock Skin'), txt: L('Gana recibiendo 5 de daño o menos.', 'Win taking 5 damage or less.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Manos rápidas', name: L('Manos rápidas', 'Quick Hands'), txt: L('Gana dando 15 golpes o más.', 'Win landing 15 or more hits.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Sin pausa para morir', name: L('Sin pausa para morir', 'No Time to Die'), txt: L('Gana sin caer.', 'Win without falling.') },
    { t: 'plata', g: L('Premios', 'Awards'), id: 'Con prisa', name: L('Con prisa', 'In a Hurry'), txt: L('Gana en 70 turnos o menos.', 'Win in 70 turns or less.') },
    { t: 'bronce', g: L('Premios', 'Awards'), id: 'Superviviente', name: L('Superviviente', 'Survivor'), txt: L('Gana sin ningún otro premio.', 'Win without any other award.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Saco de boxeo', name: L('Saco de boxeo', 'Punching Bag'), txt: L('Cae tras recibir 12 de daño o más.', 'Fall after taking 12 or more damage.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Pacifista involuntario', name: L('Pacifista involuntario', 'Accidental Pacifist'), txt: L('Cae sin haber vencido a ningún monstruo.', 'Fall without defeating a single monster.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Visitante frecuente', name: L('Visitante frecuente', 'Frequent Visitor'), txt: L('Cae por tercera vez en una misma partida.', 'Fall for the third time in the same run.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Defensa opcional', name: L('Defensa opcional', 'Optional Defence'), txt: L('Cae sin haber bloqueado ningún ataque.', 'Fall without blocking a single attack.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Premio participación', name: L('Premio participación', 'Participation Prize'), txt: L('Cae sin otro premio de consuelo.', 'Fall without any other consolation award.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'Retirada estratégica', name: L('Retirada estratégica', 'Strategic Retreat'), txt: L('Abandona una partida.', 'Abandon a run.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'trip', name: L('Tropezón', 'Stumble'), txt: L('Cae en el primer nivel de una aventura.', 'Fall on the first level of an adventure.') },
    { t: 'bronce', g: L('Premios consuelo', 'Consolation awards'), id: 'close', name: L('Tan cerca', 'So Close'), txt: L('Cae en el último nivel de una aventura.', 'Fall on the last level of an adventure.') },
    { t: 'diamante', g: L('Hazañas', 'Feats'), id: 'nodmg', name: L('Sin un rasguño', 'Not a Scratch'), txt: L('Gana sin recibir daño.', 'Win without taking damage.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'flash', name: L('Relámpago', 'Lightning'), txt: L('Gana en 50 turnos o menos.', 'Win in 50 turns or less.') },
    { t: 'plata', g: L('Hazañas', 'Feats'), id: 'marathon', name: L('Maratonista', 'Marathoner'), txt: L('Gana una partida de 150 turnos o más.', 'Win a run of 150 turns or more.') },
    { t: 'plata', g: L('Hazañas', 'Feats'), id: 'butcher', name: L('Carnicero', 'Butcher'), txt: L('Vence 20 monstruos en una sola partida.', 'Defeat 20 monsters in a single run.') },
    { t: 'plata', g: L('Hazañas', 'Feats'), id: 'fortress', name: L('Fortaleza', 'Fortress'), txt: L('Bloquea 15 ataques en una sola partida.', 'Block 15 attacks in a single run.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'treasure', name: L('Cazatesoros', 'Treasure Hunter'), txt: L('Abre 6 cofres en una sola partida.', 'Open 6 chests in a single run.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'edge', name: L('Al límite', 'On the Edge'), txt: L('Gana con 1 de Vida.', 'Win with 1 Health.') },
    { t: 'plata', g: L('Hazañas', 'Feats'), id: 'fullhp', name: L('Vida plena', 'Full Health'), txt: L('Gana con la Vida completa.', 'Win with full Health.') },
    { t: 'plata', g: L('Hazañas', 'Feats'), id: 'max6', name: L('Al tope', 'Maxed Out'), txt: L('Termina una partida con una habilidad en 6.', 'Finish a run with a skill at 6.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'balance', name: L('Equilibrado', 'Balanced'), txt: L('Gana con Mov, Atq y Def en 4 o más.', 'Win with Mov, Atk and Def at 4 or more.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'naked', name: L('Minimalista', 'Minimalist'), txt: L('Gana sin objetos en Montaña Eterna, Harbour Clash o La Puerta del Infierno.', 'Win without items in Eternal Peak, Harbour Clash or Hell\'s Door.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'notrick', name: L('Sin trucos', 'No Tricks'), txt: L('Gana sin usar nunca la habilidad del héroe (no vale el Clérigo).', 'Win without ever using your hero\'s ability (Cleric doesn\'t count).') },
    { t: 'diamante', g: L('Hazañas', 'Feats'), id: 'purist', name: L('Purista', 'Purist'), txt: L('Gana sin objetos y sin usar la habilidad del héroe en Montaña Eterna, Harbour Clash o La Puerta del Infierno.', 'Win without items and without using your hero\'s ability in Eternal Peak, Harbour Clash or Hell\'s Door.') },
    { t: 'oro', g: L('Hazañas', 'Feats'), id: 'phoenix', name: L('Fénix', 'Phoenix'), txt: L('Gana tras caer 5 veces o más.', 'Win after falling 5 or more times.') },
    { t: 'bronce', g: L('Hazañas', 'Feats'), id: 'half', name: L('A mitad de camino', 'Halfway There'), txt: L('Llega a la mitad de una aventura.', 'Reach the middle of an adventure.') },
    { t: 'oro', g: L('Héroes', 'Heroes'), id: 'h6', name: L('Maestro de armas', 'Weapon Master'), txt: L('Gana con 6 héroes distintos.', 'Win with 6 different heroes.') },
    { t: 'diamante', g: L('Héroes', 'Heroes'), id: 'hall', name: L('Panteón completo', 'Full Pantheon'), txt: L('Gana con todos los héroes.', 'Win with every hero.') },
    { t: 'plata', g: L('Héroes', 'Heroes'), id: 'loyal', name: L('Fiel compañero', 'Loyal Companion'), txt: L('Gana 3 veces con el mismo héroe.', 'Win 3 times with the same hero.') },
    { t: 'plata', g: L('Trayectoria', 'Career'), id: 'k100', name: L('Cien cabezas', 'A Hundred Heads'), txt: L('Vence 100 monstruos en total.', 'Defeat 100 monsters in total.') },
    { t: 'diamante', g: L('Trayectoria', 'Career'), id: 'k500', name: L('Azote de la mazmorra', 'Scourge of the Dungeon'), txt: L('Vence 500 monstruos en total.', 'Defeat 500 monsters in total.') },
    { t: 'oro', g: L('Trayectoria', 'Career'), id: 'w10', name: L('Veterano', 'Veteran'), txt: L('Gana 10 partidas.', 'Win 10 runs.') },
    { t: 'plata', g: L('Trayectoria', 'Career'), id: 'f25', name: L('Persistente', 'Persistent'), txt: L('Cae 25 veces en total.', 'Fall 25 times in total.') },
    { t: 'plata', g: L('Trayectoria', 'Career'), id: 't1000', name: L('Incansable', 'Tireless'), txt: L('Juega 1.000 turnos en total.', 'Play 1,000 turns in total.') },
    { t: 'diamante', g: L('Trayectoria', 'Career'), id: 'medals', name: L('Medallero', 'Medal Collector'), txt: L('Consigue 30 logros.', 'Earn 30 achievements.') }
  ];
  const ITEM_GAMES = ['peak', 'harbour', 'hell'];   // aventuras que se juegan con objetos
  const TIERS = [['diamante', L('Diamante', 'Diamond')], ['oro', L('Oro', 'Gold')], ['plata', L('Plata', 'Silver')], ['bronce', L('Bronce', 'Bronze')]];
  const TIER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18M15 3l-3 18"/></svg>';
  const RANK_ORDER = ['Cucaracha inmortal', 'Terco con suerte', 'Héroe de manual', 'Intocable'];
  const TOT_KEYS = ['kills', 'hits', 'dmgIn', 'blocks', 'chests'];

  // Anota el final de una partida (victoria) o una caída en el historial del usuario. Devuelve los logros nuevos.
  function recordEnd(won, rank, awards) {
    if (!Users.cur || !G) return [];
    if (!G.runId) G.runId = newRunId();
    const s = G.stats || {}, N = LEVELS.length, game = G.game, turns = G.totalTurns || 0, today = Date.now();
    return Users.update(r => {
      fixRec(r);
      // totales: solo lo nuevo desde la última vez que se anotó esta partida (las caídas y reintentos acumulan)
      const prev = r.runs[G.runId] || {};
      for (const k of TOT_KEYS) r.tot[k] = (r.tot[k] || 0) + Math.max(0, (s[k] || 0) - (prev[k] || 0));
      r.tot.turns = (r.tot.turns || 0) + Math.max(0, turns - (prev.turns || 0));
      const snap = { turns }; for (const k of TOT_KEYS) snap[k] = s[k] || 0;
      delete r.runs[G.runId]; r.runs[G.runId] = snap;
      const ids = Object.keys(r.runs); while (ids.length > 15) delete r.runs[ids.shift()];
      const gm = r.games[game] = Object.assign({ wins: 0, falls: 0, best: 0, bestRank: null, fastest: null, heroes: [], pure: [] }, r.games[game]);
      const fresh = [];
      const unlock = id => { if (!r.ach[id] && ACH.some(a => a.id === id)) { r.ach[id] = { d: today, g: game }; fresh.push(id); } };
      if (won) {
        gm.wins++; gm.best = N;
        gm.heroes = gm.heroes || []; if (!gm.heroes.includes(G.hero)) gm.heroes.push(G.hero);
        gm.pure = gm.pure || []; if (pureRun(game, runItems()) && !gm.pure.includes(G.hero)) gm.pure.push(G.hero);
        if (gm.fastest == null || turns < gm.fastest) gm.fastest = turns;
        if (RANK_ORDER.indexOf(rank) > RANK_ORDER.indexOf(gm.bestRank)) gm.bestRank = rank;
        if (!r.heroes.includes(G.hero)) r.heroes.push(G.hero);
        r.tot.wins = (r.tot.wins || 0) + 1;
        unlock('win_' + game); unlock(rank);
        if (ADV_ORDER.every(g => r.games[g] && r.games[g].wins)) unlock('all');
        if (r.heroes.length >= 3) unlock('multi');
        if (r.heroes.length >= 6) unlock('h6');
        if (r.heroes.length >= HERO_KEYS.length) unlock('hall');
        r.heroWins = r.heroWins || {}; r.heroWins[G.hero] = (r.heroWins[G.hero] || 0) + 1;
        if (r.heroWins[G.hero] >= 3) unlock('loyal');
        const a = G.adv;
        if ((s.dmgIn || 0) === 0) unlock('nodmg');
        if (turns <= 50) unlock('flash');
        if (turns >= 150) unlock('marathon');
        if (a.hp === 1) unlock('edge');
        if (a.hp >= START_HP) unlock('fullhp');
        if (a.spd >= 4 && a.atk >= 4 && a.def >= 4) unlock('balance');
        if (ITEM_GAMES.includes(game) && G.startItems && !G.startItems.length) unlock('naked');
        if ((s.deaths || 0) >= 5) unlock('phoenix');
        const noAbil = G.trackAbil && !G.abilEver && G.hero !== 'cleric';
        if (noAbil) unlock('notrick');
        if (noAbil && ITEM_GAMES.includes(game) && G.startItems && !G.startItems.length) unlock('purist');
      } else {
        gm.falls++; gm.best = Math.max(gm.best, G.levelIdx + 1);
        r.tot.falls = (r.tot.falls || 0) + 1;
        if (G.levelIdx === 0 && !G.abandoned) unlock('trip');
        if (G.levelIdx === N - 1 && !G.abandoned) unlock('close');
      }
      if ((s.kills || 0) >= 20) unlock('butcher');
      if ((s.blocks || 0) >= 15) unlock('fortress');
      if ((s.chests || 0) >= 6) unlock('treasure');
      if (['spd', 'atk', 'def', 'rng'].some(k => G.adv[k] >= 6)) unlock('max6');
      if (gm.best * 2 >= N) unlock('half');
      if ((r.tot.kills || 0) >= 100) unlock('k100');
      if ((r.tot.kills || 0) >= 500) unlock('k500');
      if ((r.tot.wins || 0) >= 10) unlock('w10');
      if ((r.tot.falls || 0) >= 25) unlock('f25');
      if ((r.tot.turns || 0) >= 1000) unlock('t1000');
      awards.forEach(unlock);
      if (Object.keys(r.ach).length >= 30) unlock('medals');
      r.hist.unshift({ d: today, g: game, h: G.hero, won, st: won ? N : G.levelIdx + 1, n: N, rank, t: turns });
      r.hist = r.hist.slice(0, 12);
      return fresh;
    }) || [];
  }

  /* ---------- desbloqueo de aventuras ----------
     Se empieza con la original. Cada aventura se abre completando la anterior con 2 héroes distintos; desde la
     tercera, uno de ellos debe ser de la expansión anterior, y si la anterior usa objetos, solo con objetos suyos.
     Lo ya jugado nunca se cierra. Los héroes y objetos de una expansión se desbloquean junto con su aventura. */
  const PACK_OF_GAME = { peak: 'Montaña Eterna', harbour: 'Harbour Clash', hell: 'Puerta del Infierno' };
  const UNLOCK = {
    mguf: { from: 'base', pack: null, own: false },
    peak: { from: 'mguf', pack: 'mguf', own: false },
    harbour: { from: 'peak', pack: 'peak', own: true },
    hell: { from: 'harbour', pack: 'harbour', own: true }
  };
  const GUEST_KEY = 'dioc-guest-prog-v1';
  const unlockAll = () => { try { return localStorage.getItem('dioc-unlock-all') === '1'; } catch (e) { return false; } };   // para pruebas
  const guestProg = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || {}; } catch (e) { return {}; } };
  const runItems = () => G.startItems || (G.cp && G.cp.items) || G.items || [];
  const pureRun = (game, items) => !PACK_OF_GAME[game] || (!!items && items.every(i => ITEM_PACK[i] === PACK_OF_GAME[game]));
  // héroes con los que se completó una aventura (todos) y los que lo hicieron solo con objetos de esa aventura
  function progOf(g) {
    const me = Users.get();
    if (me) {
      const x = (me.rec && me.rec.games && me.rec.games[g]) || {};
      const hs = new Set(x.heroes || []);
      for (const h of (me.rec && me.rec.hist) || []) if (h.won && h.g === g && h.h) hs.add(h.h);   // victorias anteriores a este registro
      return { heroes: [...hs], pure: x.pure || [], played: !!(x.wins || x.falls) };
    }
    const x = guestProg()[g] || {};
    return { heroes: x.heroes || [], pure: x.pure || [], played: !!x.played };
  }
  function unlockState(g) {
    if (g === 'base' || !UNLOCK[g] || unlockAll()) return { ok: true, have: [], req: '' };
    const u = UNLOCK[g], p = progOf(u.from), list = u.own ? p.pure : p.heroes;
    const fromPack = !u.pack || list.some(h => HEROES[h].pack === u.pack);
    const done = list.length >= 2 && fromPack;
    let saved = false; try { saved = !!localStorage.getItem(saveKey(g)); } catch (e) {}
    const played = progOf(g).played || saved;
    const packNames = u.pack ? heroesOf(u.pack).map(h => HEROES[h].name) : [];
    const req = L(`Completa ${GAMES[u.from].name} con 2 héroes distintos`, `Complete ${GAMES[u.from].name} with 2 different heroes`)
      + (u.pack ? (packNames.length === 1 ? L(`, uno de ellos el ${packNames[0]}`, `, one of them the ${packNames[0]}`) : L(`, al menos uno de ${GAMES[u.pack].name} (${packNames.join(', ')})`, `, at least one from ${GAMES[u.pack].name} (${packNames.join(', ')})`)) : '')
      + (u.own ? L(`, usando solo objetos de ${GAMES[u.from].name}`, `, using only ${GAMES[u.from].name} items`) : '') + '.';
    return { ok: done || played, req, have: list, fromPack, from: u.from };
  }
  const heroOpen = k => HEROES[k].pack === 'base' || unlockState(HEROES[k].pack).ok;
  const GAME_OF_PACK = { 'Montaña Eterna': 'peak', 'Harbour Clash': 'harbour', 'Puerta del Infierno': 'hell' };
  const itemOpen = k => !GAME_OF_PACK[ITEM_PACK[k]] || unlockState(GAME_OF_PACK[ITEM_PACK[k]]).ok;
  const openPool = game => E.itemPool(game).filter(itemOpen);
  // anota el progreso de quien juega sin usuario (con usuario se guarda en su historial)
  function noteGuest(won) {
    if (Users.cur || !G) return;
    const o = guestProg(), x = o[G.game] = Object.assign({ heroes: [], pure: [], played: true }, o[G.game]);
    x.played = true;
    if (won) { if (!x.heroes.includes(G.hero)) x.heroes.push(G.hero); if (pureRun(G.game, runItems()) && !x.pure.includes(G.hero)) x.pure.push(G.hero); }
    try { localStorage.setItem(GUEST_KEY, JSON.stringify(o)); } catch (e) {}
  }

  /* ---------- tablero ---------- */
  // El tamaño de casilla se ajusta al ancho y también al alto de la pantalla, para que el mapa y los mandos
  // quepan juntos sin tener que desplazarse (con un mínimo de 40 px: si aun así no cabe, queda un poco de scroll).
  const DESK = window.matchMedia('(min-width: 1000px) and (min-aspect-ratio: 3/2)');
  function fit() {
    if (document.body.classList.contains('menu')) return;
    if (DESK.matches) { document.body.classList.remove('tight'); return; }
    const root = document.documentElement, box = $('#boxBoard');
    const w = box.clientWidth || 340;
    let t = Math.max(40, Math.min(68, Math.floor((w - 4) / COLS)));
    const vh = window.innerHeight || 700;
    document.body.classList.toggle('tight', vh < 780);
    root.style.setProperty('--t', t + 'px');
    const app = $('.app'), board = $('#board'), panel = $('.panel'), dr = $('#diceRow');
    // alto de todo lo que no es el tablero; el panel se cuenta con la fila de dados, que solo se ve en la fase de Energía
    const panelH = panel.offsetHeight + (dr.offsetHeight ? 0 : 54);
    const cs = getComputedStyle(app), gap = parseFloat(cs.rowGap) || 0;
    const others = $('.top').offsetHeight + ($('#card').offsetHeight - board.offsetHeight) + panelH + gap * 2
      + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const byH = Math.floor((vh - others - 14) / ROWS);
    if (byH < t) t = Math.max(38, byH);
    root.style.setProperty('--t', t + 'px');
  }
  let fitTimer = 0, needFit = false, lastW = 0;
  const fitSoon = () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 120); };

  function buildBoard() {
    const lv = LEVELS[G.levelIdx];
    const grid = $('#grid');
    grid.innerHTML = '';
    for (let i = 0; i < N; i++) {
      const [x, y] = XY(i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile' + (lv.walls[i] ? ' wall' : '') + (lv.voids[i] ? ' void' : '') + (lv.blizz[i] ? ' blizz' : '') + (lv.water[i] ? ' water' : '') + (lv.damned && lv.damned[i] ? ' damned' : '') + (lv.stoneAt === i ? ' stone' : '');
      b.dataset.i = i;
      const cr = L(`columna ${x + 1}, fila ${y + 1}`, `column ${x + 1}, row ${y + 1}`);
      b.setAttribute('aria-label', lv.voids[i] ? L('Hueco', 'Gap') : lv.walls[i] ? L('Muro', 'Wall') : lv.blizz[i] ? L('Ventisca, ', 'Blizzard, ') + cr : lv.water[i] ? L('Agua, ', 'Water, ') + cr : lv.stoneAt === i ? L('Piedra de la Perdición', 'Stone of Doom') : lv.damned && lv.damned[i] ? L('Casilla maldita, ', 'Cursed tile, ') + cr : L('Casilla ', 'Tile ') + cr);
      if (lv.walls[i] && lv.stoneAt !== i) b.tabIndex = -1;
      if (lv.stairs.includes(i)) b.innerHTML = `<span class="stair">${ICON_STAIR}</span>`;
      else if (lv.blizz[i]) b.innerHTML = `<span class="wind">${ICON_WIND}</span>`;
      else if (lv.water[i]) b.innerHTML = `<span class="wave">${ICON_WAVE}</span>`;
      else if (lv.damned && lv.damned[i]) b.innerHTML = `<span class="curse">${ICON_CURSE}</span>`;
      else if (lv.stoneAt === i) b.innerHTML = `<span class="gem" aria-hidden="true">${ICON_STONE}<em></em></span>`;
      if (G.chest && G.chest.at === i) b.innerHTML += `<span class="chest" aria-hidden="true">${ICON_CHEST}<em></em></span>`;
      grid.appendChild(b);
    }
    $('#tokens').innerHTML = '';
    tok.adv = null; tok.mons = new Map();
    builtLevel = G.levelIdx;
    needFit = true;
    paintClassic();
    musicFloor();
  }

  const setPos = (el, x, y) => { el.style.setProperty('--x', x); el.style.setProperty('--y', y); };

  function syncTokens() {
    const layer = $('#tokens');
    if (!tok.adv) {
      const a = document.createElement('div');
      a.className = 'token pj';
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
      const boosted = E.mStat(G, m, 'atk') !== m.atk || E.mStat(G, m, 'def') !== m.def || E.mStat(G, m, 'rng') !== m.rng;
      const hellMon = LEVELS[G.levelIdx].mon.bonusOn === 'hero';
      el.classList.toggle('wet', boosted && !hellMon);
      el.classList.toggle('cursed', boosted && hellMon);
    }
  }

  function renderTiles() {
    const tiles = $('#grid').children;
    let reach = null, demon = null;
    const targets = new Set();
    let lau = null;
    if (G.phase === 'move' && !busy) {
      if (G.laurel) {
        const R = E.laurelReach(G), me = E.laurelMon(G);
        lau = { R, me };
        for (const m of G.mons) if (m !== me && E.laurelAttackInfo(G, m).ok) targets.add(idx(m.x, m.y));
      }
      else if (mode === 'laurelPick') { for (const m of G.mons) targets.add(idx(m.x, m.y)); }
      else if (mode && mode.demon) demon = E.demonReach(G, mode.demon);
      else if (mode === 'necro') { for (const m of G.mons) if (E.necroInfo(G, m).ok) targets.add(idx(m.x, m.y)); }
      else if (mode === 'demonPick') { for (const m of G.mons) targets.add(idx(m.x, m.y)); }
      else {
        reach = E.reachFromAdv(G);
        for (const m of G.mons) if (E.attackInfo(G, m).ok) targets.add(idx(m.x, m.y));
        if (G.chest && E.chestInfo(G).ok) targets.add(G.chest.at);
        if (G.stone && E.stoneInfo(G).ok) targets.add(G.stone.at);
      }
    }
    for (let i = 0; i < N; i++) {
      const t = tiles[i];
      const isLau = lau && lau.R.dist[i] > 0 && lau.R.dist[i] <= G.laurel.spdLeft;
      const isReach = (reach && reach.dist[i] > 0 && (reach.free ? reach.dist[i] < Infinity : reach.dist[i] <= G.turn.spdLeft)) || (demon && demon.ok[i]) || isLau;
      t.classList.toggle('reach', !!isReach);
      if (reach && isReach) t.dataset.cost = reach.free ? '·' : reach.dist[i]; else if (demon && isReach) t.dataset.cost = demon.dist[i]; else if (isLau) t.dataset.cost = lau.R.dist[i]; else delete t.dataset.cost;
      t.classList.toggle('target', targets.has(i));
    }
    // Segundo dibujo del héroe, fijo dentro de su casilla (sin transformaciones): así se ve aunque el navegador falle con la ficha flotante
    const hi = idx(G.adv.x, G.adv.y), showSpot = !(tok.adv && tok.adv.dataset.anim);
    for (let i = 0; i < N; i++) { const sp = tiles[i].querySelector('.herospot'); if (sp && !(showSpot && i === hi)) sp.remove(); }
    if (showSpot && !tiles[hi].querySelector('.herospot')) tiles[hi].insertAdjacentHTML('beforeend', `<span class="herospot" aria-hidden="true">${HERO_ICONS[G.hero] || ICON_ADV}</span>`);
    // el dibujo de la casilla mira hacia el mismo lado que la ficha (si no, los dos dibujos se ven superpuestos y espejados)
    if (showSpot && tok.adv) tiles[hi].querySelector('.herospot').style.setProperty('--flip', tok.adv.style.getPropertyValue('--flip') || 1);
    if (G.chest) {
      const c = $('#grid').children[G.chest.at].querySelector('.chest');
      if (c) { c.classList.toggle('open', G.chest.open); c.querySelector('em').textContent = G.chest.open ? '' : G.chest.val; }
    }
    if (G.stone) {
      const c = $('#grid').children[G.stone.at].querySelector('.gem');
      if (c) { c.classList.toggle('broken', G.stone.broken); c.querySelector('em').textContent = G.stone.broken ? '' : G.stone.val; }
    }
    for (const [id, el] of tok.mons) el.classList.toggle('ordered', !!(lau && lau.me && lau.me.id === id));
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
  // dado D12 (Ojo de dragón): dodecaedro violeta, distinto de los D6 con puntos
  const D12_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon class="o" points="50,3 96,37 79,94 21,94 4,37"/><polygon class="m" points="50,28 74,45 65,73 35,73 26,45"/><path class="l" d="M50 3v25M96 37 74 45M79 94 65 73M21 94 35 73M4 37 26 45"/></svg>';
  function dieHTML(v, extra, d12) {
    if (v > 6 || d12) return `<span class="die d12 ${extra || ''}" aria-label="${L('Dado', 'Die')} D12: ${v}">${D12_SVG}<b>${v}</b><small>D12</small></span>`;
    const on = PIPS[v] || [];
    let s = '';
    for (let i = 0; i < 9; i++) s += `<i class="${on.includes(i) ? 'on' : ''}"></i>`;
    return `<span class="die ${extra || ''}" aria-label="${L('Dado', 'Die')} ${v}">${s}</span>`;
  }

  const regularCount = () => LEVELS.filter(l => !l.boss).length;
  const bossCount = () => LEVELS.filter(l => l.boss).length;
  // nombre de cada mazmorra (títulos originales de las cajas)
  const GAME_TITLE = { base: 'One Card Dungeon', mguf: "M'Guf-yn Returns", peak: 'Eternal Peak', harbour: 'Harbour Clash', hell: "Hell's Door" };
  // modo clásico (solo escritorio): la carta real como tablero y dados de colores como fichas
  const CARD_SET = { base: ['spider', 'skeleton', 'orc', 'demon'], mguf: ['ogre', 'reaper', 'drake', 'mguf'], peak: ['goblin', 'wolf', 'yeti', 'sorcerer'],
    harbour: ['crab', 'octopus', 'zombie', 'kraken'], hell: ['imp', 'chained', 'fiend', 'cultist', 'maw', 'goat', 'butcher', 'lord'] };
  const cardUrl = (game, key) => { const g = (CARD_SET[game] || []).includes(key) ? game : 'base'; return `img/cards/${g}_${key}.webp`; };
  let classic = false;
  try { classic = localStorage.getItem('dioc-classic') === '1'; } catch (e) {}
  function paintClassic() {
    document.body.classList.toggle('classic', classic);
    const b = $('#classicBtn'); if (b) { b.classList.toggle('on', classic); b.setAttribute('aria-pressed', classic ? 'true' : 'false'); }
    if (G && LEVELS[G.levelIdx]) {
      const lv = LEVELS[G.levelIdx];
      $('#card').style.setProperty('--card-img', classic ? `url("${cardUrl(G.game, lv.mon.key)}")` : 'none');
    }
  }
  function toggleClassic() { classic = !classic; try { localStorage.setItem('dioc-classic', classic ? '1' : '0'); } catch (e) {} paintClassic(); needFit = true; fit(); }
  const AB_EN = { 'Cancelar muros': 'Cancel walls', 'Atravesar muros': 'Walk through walls', 'Cancelar abordaje': 'Cancel boarding', 'Abordaje': 'Boarding', 'Sacrificio −1 Vida': 'Sacrifice −1 Health',
    'Mover monstruo': 'Move monster', 'Conservar dado': 'Keep die', 'Volver a tirar': 'Reroll', 'Dado al Mov': 'Die to Mov', 'Dado al Alcance': 'Die to Range', 'Un dado por habilidad': 'One die per skill', 'Dos dados a una': 'Two dice to one', '+1 a los dados': '+1 to the dice' };
  const abLabel = s => LANG === 'en' ? (AB_EN[s] || s) : s;
  const stageLabel = lv => lv.boss ? L(`Jefe ${lv.boss}`, `Boss ${lv.boss}`) : L(`Nivel ${lv.num}`, `Level ${lv.num}`);
  function renderHead() {
    const lv = LEVELS[G.levelIdx];
    $('.lvl-num').innerHTML = lv.boss ? `${L('Jefe', 'Boss')} <b id="lvlNum">${lv.boss}</b> ${L('de', 'of')} <span id="lvlTot">${bossCount()}</span>` : `${L('Nivel', 'Level')} <b id="lvlNum">${lv.num}</b> ${L('de', 'of')} <span id="lvlTot">${regularCount()}</span>`;
    $('#lvlName').textContent = lv.title;
    $('#dots').innerHTML = LEVELS.map((l, i) => `<i class="${l.boss ? 'boss ' : ''}${i < G.levelIdx ? 'done' : i === G.levelIdx ? 'now' : ''}"></i>`).join('');
    const m = lv.mon, bo = m.bonus;
    const st = (k, v) => `<div><b>${v}</b>${bo && bo[k] ? `<u>+${bo[k]}</u>` : ''}<span>${(LANG === 'en' ? { hp: 'Health', spd: 'Spd', atk: 'Atk', def: 'Def', rng: 'Rng' } : { hp: 'Vida', spd: 'Vel', atk: 'Atq', def: 'Def', rng: 'Alc' })[k]}</span></div>`;
    $('#foot').innerHTML = `
      <div class="ico">${ICONS[m.key]}</div>
      <div>
        <div class="nm">${m.plural}<small>${lv.boss ? L('jefe', 'boss') : L(`quedan ${G.mons.length} de ${lv.spawns.length}`, `${G.mons.length} of ${lv.spawns.length} left`)}</small></div>
        <div class="stats">${['hp', 'spd', 'atk', 'def', 'rng'].map(k => st(k, m[k])).join('')}</div>
        ${bo ? (m.bonusOn === 'hero' ? `<div class="wnote hell ${G.sands ? 'off' : lv.damned[idx(G.adv.x, G.adv.y)] ? 'on' : ''}">${G.sands ? L('Agua bendita: los bonos no cuentan este nivel.', "Holy Water: bonuses don't count this level.") : lv.damned[idx(G.adv.x, G.adv.y)] ? L('Estás en casilla maldita: suman el bono.', "You're on a cursed tile: they add the bonus.") : L('Si estás en casilla maldita, suman el bono en rojo.', "If you're on a cursed tile, they add the red bonus.")}</div>` : `<div class="wnote">${L('En casillas de agua suman el bono en azul.', 'On water tiles they add the blue bonus.')}</div>`) : ''}
      </div>`;
    const gt = GAME_TITLE[G.game] || GAME_TITLE.base, wn = $('#foot .wnote');
    $('#gameName').textContent = gt; $('#sysSub').textContent = gt;
    $('#sysLvl').hidden = false;
    $('#sysLvl').innerHTML = `<b>${lv.boss ? L(`Jefe ${lv.boss} de ${bossCount()}`, `Boss ${lv.boss} of ${bossCount()}`) : L(`Nivel ${lv.num} de ${regularCount()}`, `Level ${lv.num} of ${regularCount()}`)}</b><span>${lv.title}</span>${wn ? `<em class="${wn.classList.contains('on') ? 'on' : ''}">${wn.textContent.trim()}</em>` : ''}`;
  }

  function renderHP() {
    const hp = G.adv.hp;
    $('#pips').innerHTML = Array.from({ length: START_HP }, (_, i) =>
      `<i class="${i < hp ? 'on' : ''}${i >= hp && i < lastHp ? ' lost' : ''}"></i>`).join('');
    $('#hpnum').textContent = `${L('Vida', 'Health')} ${hp} / ${START_HP}`;
    const hb = $('#heroBox');
    if (hb) {
      if (hb.dataset.hero !== G.hero) { hb.dataset.hero = G.hero; hb.innerHTML = `<span class="ico">${HERO_ICONS[G.hero] || ICON_ADV}</span><b>${HEROES[G.hero].name}</b><p>${HEROES[G.hero].txt}</p><div class="hpbar"><div class="pips"></div><span class="hpnum"></span></div>`; }
      hb.querySelector('.pips').innerHTML = $('#pips').innerHTML;
      hb.querySelector('.hpnum').textContent = `${L('Vida', 'Health')} ${hp} / ${START_HP}`;
    }
    $('#heroTag').textContent = HEROES[G.hero].name;
    if (tok.adv) tok.adv.querySelector('.badge').textContent = hp;
    lastHp = hp;
  }

  const slotKeys = t => (t.ranger ? ['atk', 'def', 'rng'] : ['spd', 'atk', 'def']);
  const usedDice = t => { const u = new Set(); for (const k of ['spd', 'atk', 'def', 'rng']) { u.add(t.assign[k]); if (t.assign2) u.add(t.assign2[k]); } return u; };

  const pen0 = k => (G.phase === 'move' || G.phase === 'monsters') && (k === 'atk' || k === 'def') && E.blizzPen(G) > 0;
  function renderChips() {
    const t = G.turn, a = G.adv, ph = G.phase;
    const sk = slotKeys(t);
    const out = [];
    for (const k of ['spd', 'atk', 'def', 'rng']) {
      let val = a[k], sub = L('base', 'base'), cls = 'chip', bar = '';
      const slot = ph === 'energy' && sk.includes(k);
      const lootHere = t.loot && t.loot.k === k ? t.loot.n : 0;
      if (ph === 'energy') {
        if (slot) cls += ' slot';
        if (t.dice) {
          const ds = [t.assign[k], t.assign2 ? t.assign2[k] : -1].filter(i => i >= 0);
          const parts = ds.map(i => dieHTML(t.dice[i], 'mini', (t.d12 || [])[i]));
          if (lootHere) parts.push(`<span class="lootn">+${lootHere}</span>`);
          if (ds.length || lootHere) {
            val = a[k] + ds.reduce((x, i) => x + t.dice[i], 0) + lootHere;
            sub = `${a[k]} + ${parts.join(' + ')}`;
            cls += ' filled' + (t.lock === k ? ' locked' : '');
          } else if (slot) { sub = L('asigna un dado', 'assign a die'); if (t.sel >= 0) cls += ' armed'; }
          else sub = L('sin dado', 'no die');
          if (slot && t.sel >= 0 && ds.length === 1 && t.knight) cls += ' armed';
        } else if (!slot) sub = L('sin dado', 'no die');
      } else if (ph === 'move' || ph === 'monsters') {
        const pen = E.blizzPen(G);
        if (k === 'spd') { val = t.spdLeft; sub = L(`de ${t.spd}`, `of ${t.spd}`); bar = `<span class="bar"><i style="width:${t.spd ? (100 * t.spdLeft / t.spd) : 0}%"></i></span>`; }
        else if (k === 'atk') { val = E.atkAvail(G); sub = pen ? L('ventisca −1', 'blizzard −1') : L(`de ${t.atk}`, `of ${t.atk}`); bar = `<span class="bar"><i style="width:${t.atk ? (100 * t.atkLeft / t.atk) : 0}%"></i></span>`; }
        else if (k === 'def') { val = E.heroDef(G); sub = pen ? L('ventisca −1', 'blizzard −1') : L('este turno', 'this turn'); }
        else { val = t.rng || a.rng; sub = t.rng !== a.rng ? L('este turno', 'this turn') : L('fijo', 'fixed'); }
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
    row.classList.toggle('moving', G.phase !== 'energy');
    if (G.phase !== 'energy') {
      if (G.phase === 'move' && t.dice) row.innerHTML = t.dice.map((v, i) => dieHTML(v, 'used', (t.d12 || [])[i])).join('');
      else row.innerHTML = '';
      return;
    }
    if (!t.dice) { row.innerHTML = `<span class="hint">${L('Tres dados de Energía por turno', 'Three Energy dice per turn')}</span>`; return; }
    if (rolling) {
      row.innerHTML = [0, 1, 2].map(i => (t.lock >= 0 && i === 0) ? dieHTML(t.dice[0], 'locked', (t.d12 || [])[0]) : keepSet.has(i) ? dieHTML(t.dice[i], 'used', (t.d12 || [])[i]) : (t.d12 || [])[i] ? dieHTML(1 + Math.floor(Math.random() * 12), 'rolling', true) : dieHTML(1 + Math.floor(Math.random() * 6), 'rolling')).join('');
      return;
    }
    const used = usedDice(t);
    row.innerHTML = t.dice.map((v, i) => {
      const d = dieHTML(v, (t.sel === i ? 'sel ' : '') + (used.has(i) ? 'used' : ''), (t.d12 || [])[i]);
      return d.replace('<span class="die', `<button type="button" data-d="${i}" class="die`).replace('</span>', '</button>');
    }).join('');
  }

  function renderBanner() {
    const t = G.turn, ph = G.phase;
    let step = '1', txt = '';
    if (ph === 'energy') {
      if (!t.dice) txt = L('Tira los tres dados de <em>Energía</em>.', 'Roll the three <em>Energy</em> dice.');
      else if (!E.assignComplete(t)) txt = t.knight ? L('Caballero: reparte los tres dados; puedes poner dos en la misma habilidad.', 'Knight: assign the three dice; you can put two on the same skill.') : t.ranger ? L('Toca un dado y luego <em>Alc</em>, <em>Atq</em> o <em>Def</em>.', 'Tap a die, then <em>Rng</em>, <em>Atk</em> or <em>Def</em>.') : L('Toca un dado y luego <em>Mov</em>, <em>Atq</em> o <em>Def</em>.', 'Tap a die, then <em>Mov</em>, <em>Atk</em> or <em>Def</em>.');
      else txt = L('Reparto listo. Confírmalo o toca una habilidad para cambiarlo.', 'Dice assigned. Confirm, or tap a skill to change it.');
    } else if (ph === 'move') {
      step = '2';
      txt = mode === 'necro' ? L('Nigromante: toca el monstruo al que quieres hacer <em>1 de daño</em> (cuesta 1 de tu Vida).', 'Necromancer: tap the monster you want to deal <em>1 damage</em> to (costs 1 of your Health).')
        : mode === 'demonPick' ? L('Cazador: toca el monstruo que quieres <em>mover</em>.', 'Hunter: tap the monster you want to <em>move</em>.')
        : mode && mode.demon ? L('Cazador: toca la casilla marcada a la que lo mueves (hasta 3 de Mov).', 'Hunter: tap the marked tile to move it to (up to 3 Mov).')
        : mode === 'laurelPick' ? L('Corona de laurel: toca el monstruo al que das la orden.', 'Laurel Crown: tap the monster you give the order to.')
        : G.laurel ? L('Corona de laurel: mueve al monstruo o toca a otro monstruo para que lo ataque. Termina la orden cuando quieras.', 'Laurel Crown: move the monster or tap another monster for it to attack. End the order whenever you like.')
        : L('Toca una casilla marcada para <em>moverte</em>, o un monstruo, el cofre o la piedra resaltados para <em>atacar</em>.', 'Tap a marked tile to <em>move</em>, or a highlighted monster, chest or stone to <em>attack</em>.');
    }
    else if (ph === 'monsters') { step = '3'; txt = L('Turno de los monstruos.', "Monsters' turn."); }
    else if (ph === 'clear') { step = '2'; txt = L('Nivel superado.', 'Level cleared.'); }
    $('#step').textContent = step;
    $('#bannerText').innerHTML = txt;
  }

  function nothingLeft() {
    if (G.phase !== 'move') return false;
    const R = E.reachFromAdv(G);
    for (let i = 0; i < N; i++) if (R.dist[i] > 0 && R.dist[i] <= G.turn.spdLeft) return false;
    if (G.chest && E.chestInfo(G).ok) return false;
    if (G.stone && E.stoneInfo(G).ok) return false;
    return !G.mons.some(m => E.attackInfo(G, m).ok);
  }

  function renderActions() {
    const t = G.turn, ph = G.phase, box = $('#actions');
    if (ph === 'energy') {
      const ab = E.abilityInfo(G);
      const abBtn = ab ? `<button type="button" class="btn abil" id="btnAbil" ${rolling ? 'disabled' : ''}>${abLabel(ab.label)}</button>` : '';
      if (!t.dice) box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnRoll" ${rolling ? 'disabled' : ''}>${L('Tirar dados', 'Roll dice')}</button>`;
      else box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnConfirm" ${E.assignComplete(t) && !rolling ? '' : 'disabled'}>${L('Confirmar', 'Confirm')}</button>`;
    } else if (ph === 'move') {
      if (G.laurel) { box.innerHTML = `<button type="button" class="btn primary" id="btnLaurelEnd" ${busy ? 'disabled' : ''}>${L('Terminar orden', 'End order')}</button>`; return; }
      if (mode === 'laurelPick') { box.innerHTML = `<button type="button" class="btn" id="btnLaurelNo">${L('Cancelar', 'Cancel')}</button>`; return; }
      const ab = E.abilityInfo(G);
      const cancel = (ab && ((ab.id === 'necro' && mode === 'necro') || (ab.id === 'demon' && mode))) ? L('Cancelar', 'Cancel') : null;
      const abBtn = ab ? `<button type="button" class="btn abil tight ${G.sherpaOn || G.corsairOn || cancel ? 'on' : ''}" id="btnAbil" ${busy ? 'disabled' : ''}>${cancel || abLabel(ab.label)}</button>` : '';
      box.innerHTML = `<button type="button" class="btn small" id="btnUndo" ${G.undo.length && !busy ? '' : 'disabled'}>${L('Deshacer', 'Undo')}</button>${abBtn}
        <button type="button" class="btn primary ${nothingLeft() ? 'pulse' : ''}" id="btnEnd" ${busy ? 'disabled' : ''}>${L('Fin de turno', 'End turn')}</button>`;
    } else {
      box.innerHTML = `<button type="button" class="btn" disabled>${ph === 'monsters' ? L('Los monstruos actúan…', 'Monsters are acting…') : '…'}</button>`;
    }
  }

  function renderItems() {
    const box = $('#items');
    const list = G.items || [];
    const act = [];
    if (G.cloak) act.push(['cloak', L('Capa activa', 'Cloak active')]);
    if (G.sands) act.push(LEVELS[G.levelIdx].damned && LEVELS[G.levelIdx].damned.some(Boolean) ? ['holy', L('Agua bendita activa', 'Holy Water active')] : ['sands', L('Arenas activas', 'Sands active')]);
    if (G.fist) act.push(['fist', L('Puño listo', 'Fist ready')]);
    if (G.powder) act.push(['powder', L('Pólvora lista', 'Powder ready')]);
    if (G.gorgon) act.push(['gorgon', L('Gorgona activa', 'Gorgon active')]);
    if (!list.length && !act.length) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    const idle = id => !E.itemUsable(G, id) || busy || rolling || G.phase === 'monsters';
    box.innerHTML = list.map(id => `<button type="button" class="item ${idle(id) ? 'idle' : ''}" data-item="${id}" aria-label="${ITEMS[id].name}">
        <span class="ico">${ITEM_ICONS[id]}</span><span>${ITEMS[id].short}</span></button>`).join('')
      + act.map(([id, txt]) => `<span class="item on" aria-label="${txt}"><span class="ico">${ITEM_ICONS[id]}</span><span>${txt}</span></span>`).join('');
  }

  function renderLoot() {
    const box = $('#loot'), t = G.turn;
    if (!(G.loot > 0)) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    const can = G.phase === 'energy' && t.dice && !rolling;
    const set = t.loot && t.loot.k && G.phase === 'energy' ? `+${t.loot.n} ${L('a', 'to')} ${NAMES[t.loot.k]}` : '';
    box.innerHTML = `<span class="ico">${ICON_CHEST}</span><span class="txt">${L('Botín del cofre', 'Chest loot')}: <b>${G.loot}</b> ${L('punto', 'point')}${G.loot > 1 ? 's' : ''}${set ? ' · ' + set : ''}</span>
      ${can ? `<button type="button" class="btn mini" id="btnLoot">${set ? L('Cambiar', 'Change') : L('Sumar', 'Add')}</button>` : ''}`;
  }

  function say(html) { $('#log').innerHTML = html; }

  function render() {
    if (G.phase !== 'move') mode = null;
    if (builtLevel !== G.levelIdx) buildBoard();
    renderHead();
    syncTokens();
    renderHP();
    renderChips();
    renderDice();
    renderBanner();
    renderItems();
    renderLoot();
    renderActions();
    renderTiles();
    if (needFit) { needFit = false; fit(); requestAnimationFrame(fit); }
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

  const GAME_LEAD = {
    base: L('Atraviesa 12 niveles. En el último hay que derrotar a los tres demonios.', 'Get through 12 levels. In the last one you must defeat the three demons.'),
    mguf: L("Atraviesa 12 niveles. Tras el 3, el 6 y el 9 te espera un comandante, y tras el 12, el mismísimo M'Guf-yn.", "Get through 12 levels. After 3, 6 and 9 a commander awaits, and after 12, M'Guf-yn himself."),
    peak: L('Sube los 10 niveles de la Montaña Eterna. En el último te espera el Hechicero Blanco.', 'Climb the 10 levels of Eternal Peak. The White Sorcerer awaits in the last one.'),
    harbour: L('Defiende el puerto a lo largo de 8 niveles. Al final despierta el Kraken.', 'Defend the harbour over 8 levels. At the end, the Kraken awakens.'),
    hell: L('Desciende 12 niveles por la Puerta del Infierno. Tras el 3, el 6 y el 9 te espera un jefe, y tras el 12, el Señor del Infierno.', "Descend 12 levels through Hell's Door. After 3, 6 and 9 a boss awaits, and after 12, the Lord of Hell.")
  };

  function soundSheet() {
    openSheet(`<h3>${L('Sonido', 'Sound')}</h3>
      <label class="opt"><input type="checkbox" id="oSfx" ${Sfx.on ? 'checked' : ''}><span>${L('Efectos de sonido', 'Sound effects')}</span></label>
      ${Music.has ? `<label class="opt"><input type="checkbox" id="oMus" ${Music.on ? 'checked' : ''}><span>${L('Música', 'Music')}</span></label>
      <label class="opt vol"><span>${L('Volumen de la música', 'Music volume')}</span><input type="range" id="oVol" min="0" max="100" value="${Math.round(Music.vol * 100)}"></label>
      <p class="small">${L('La música se descarga mientras suena (cerca de 1 MB por canción).', 'Music downloads while it plays (about 1 MB per song).')}</p>` : ''}
      <button type="button" class="btn" id="oOk">${L('Listo', 'Done')}</button>`, [['#oOk', closeSheet]], true);
    const q = s => document.querySelector('#veil ' + s);
    q('#oSfx').addEventListener('change', e => Sfx.set(e.target.checked));
    if (q('#oMus')) { q('#oMus').addEventListener('change', e => Music.setOn(e.target.checked)); q('#oVol').addEventListener('input', e => Music.setVol(e.target.value / 100)); }
  }

  function rulesSheet() {
    const g = G ? G.game : null;
    const has = k => !g || g === k;
    if (LANG === 'en') return openSheet(`
      <h3>How to play</h3>
      <p class="lead">${g ? GAME_LEAD[g] : "Pick an adventure to start: the original, M'Guf-yn Returns, Eternal Peak, Harbour Clash or Hell's Door."} To clear a level, defeat all its monsters. If your Health reaches 0, you fall.</p>
      <h4>1 · Energy</h4>
      <p>Roll three dice. Assign one to <b>Mov</b>, one to <b>Atk</b> and one to <b>Def</b>: its value is added to the base skill. <b>Rng</b> gets no die, except with the Ranger's ability.</p>
      <h4>2 · Your turn</h4>
      <ul>
        <li>Move and attack in any order. You don't have to spend everything.</li>
        <li>A straight step costs <b>2</b> Mov; a diagonal one, <b>3</b>. You can't step on walls or monsters, or slip diagonally between two of them (wall or monster) touching at the corner.</li>
        <li>To attack, the monster must be within your <b>Range</b> and in sight. Distance is measured in movement cost: adjacent straight is 2, diagonal 3.</li>
        <li>Each hit costs as many Atk points as the monster's <b>Defence</b> and takes away 1 Health.</li>
        <li>Line of sight: a straight line from any corner of your tile to any corner of theirs, without crossing walls or other monsters.</li>
      </ul>
      <h4>3 · Monsters</h4>
      <p>From nearest to farthest, they move to see you at their maximum Range (if they're closer than needed, they back away). Then everyone who sees you within range attacks: damage is <b>total Attack ÷ your Defence</b>, rounded down.</p>
      <h4>Between levels</h4>
      <p>Pick one: raise a skill by 1 (maximum 6) <b>or</b> heal up to 6 Health.</p>
      ${has('mguf') || has('peak') || has('harbour') || has('hell') ? `<h4>Treasure chest</h4>
      <p>${g === 'base' ? 'Only in adventures with chests. ' : ''}Each level has a chest on the stairs opposite the entrance (or on the tile marked with an X). Its number is its <b>Defence</b> and its <b>loot</b>. Until you open it, it counts as a wall: it can't be crossed and blocks sight. Open it by attacking it, within your Range and in sight, with at least that many Atk points. In an Energy phase, loot points are added to <b>one</b> skill per turn (Mov, Atk, Def or Rng), in that level and its boss. Whatever you don't spend is lost when the level ends.</p>` : ''}
      ${has('mguf') || has('hell') ? `<h4>Bosses</h4>
      <p>After levels 3, 6, 9 and 12 you play a boss map as an <b>extension</b> of the level: you can't upgrade or heal before it, and an opened chest stays with you. Bosses are shown with a 12-sided die. The final boss ends the adventure.</p>` : ''}
      ${has('harbour') ? `<h4>Water (Harbour Clash)</h4>
      <p>Monsters standing on a water tile add the blue bonuses to their Attack, Defence or Range. You don't get them.</p>` : ''}
      ${has('hell') ? `<h4>Cursed tiles and the Stone (Hell's Door)</h4>
      <p>Monsters get the red bonuses on their card <b>while you stand on a cursed tile</b> (the bonus applies to all of them). The <b>Stone of Doom</b> is a special wall with a number (D4): attack it within your Range and in sight, spending as many Atk points as its number. When it breaks, <b>every monster takes 1 damage</b> and <b>so do you</b>. It's still a wall. The Demon Hunter can move a monster up to 3 tiles.</p>` : ''}
      ${has('peak') ? `<h4>Blizzard (Eternal Peak)</h4>
      <p>While you stand on a blizzard tile, your base Attack and Defence are 1 lower.</p>` : ''}
      <h4>Items</h4>
      <p>You can play with three items, at random or of your choice: Eternal Peak, Harbour Clash and Hell's Door always use them; in the other adventures they're optional. Each one is used only once and then discarded.</p>
      <ul>${ITEM_KEYS.filter(k => ITEMS[k]).map(k => `<li><b>${ITEMS[k].name}.</b> ${ITEMS[k].txt}${k === 'cloak' ? ' (Eternal Peak only.)' : k === 'sands' ? ' (Harbour Clash only.)' : k === 'holy' || k === 'fist' ? " (Hell's Door only.)" : ''}</li>`).join('')}</ul>
      <h4>Heroes</h4>
      <p>In any adventure you play with the heroes from the original and from that expansion; the <b>Heroes from other expansions</b> button adds the rest.</p>
      <ul>${HERO_KEYS.map(k => `<li><b>${HEROES[k].name}.</b> ${HEROES[k].txt}</li>`).join('')}</ul>
      <h4>Adventures to unlock</h4>
      <p>You start with the original. Each adventure opens when you complete the previous one with 2 different heroes; from Eternal Peak on, one must be from the previous expansion and, if that adventure uses items, only with its own items. Its heroes and items unlock with it. In "New game" you'll see what's missing.</p>
      <h4>Saved games</h4>
      <p>Your game saves itself at all times, one per adventure: you can have one in progress in each dungeon. From the menu, <b>Resume</b> continues it and <b>Abandon</b> counts it as lost. If you fall, you can retry the level as you started it. With a user, your games, achievements and stats are saved in the cloud.</p>
      <p class="fine">Unofficial web version of the solo game One Card Dungeon and its expansions, by Barny Skinner (Little Rocket Games). Maps, monster stats and their appearance per level follow the original cards; the in-game illustrations and texts are our own. The menu covers are by Little Rocket Games. If you like it, support the author and get the game.</p>
      <button type="button" class="btn primary" id="x">Got it</button>`, [['#x', closeSheet]], true);
    openSheet(`
      <h3>Cómo se juega</h3>
      <p class="lead">${g ? GAME_LEAD[g] : 'Elige una aventura al empezar: la original, M\'Guf-yn Returns, Montaña Eterna, Harbour Clash o La Puerta del Infierno.'} Para superar un nivel, vence a todos sus monstruos. Si tu Vida llega a 0, caes.</p>
      <h4>1 · Energía</h4>
      <p>Tira tres dados. Asigna uno a <b>Mov</b>, otro a <b>Atq</b> y otro a <b>Def</b>: su valor se suma a la habilidad base. <b>Alc</b> no recibe dado, salvo con la habilidad del Ranger.</p>
      <h4>2 · Tu turno</h4>
      <ul>
        <li>Mueve y ataca en el orden que quieras. No tienes que gastar todo.</li>
        <li>Un paso recto cuesta <b>2</b> de Mov; uno en diagonal, <b>3</b>. No puedes pisar muros ni monstruos, ni colarte en diagonal entre dos de ellos (muro o monstruo) que se tocan por la esquina.</li>
        <li>Para atacar, el monstruo debe estar a tu <b>Alcance</b> y a la vista. La distancia se mide en coste de movimiento: pegado en recto es 2, en diagonal 3.</li>
        <li>Cada golpe cuesta tantos puntos de Atq como la <b>Defensa</b> del monstruo y le quita 1 de Vida.</li>
        <li>Ver o no ver: una línea recta desde cualquier esquina de tu casilla hasta cualquier esquina de la suya, sin cruzar muros ni otros monstruos.</li>
      </ul>
      <h4>3 · Monstruos</h4>
      <p>Se mueven, del más cercano al más lejano, para quedar viéndote a su Alcance máximo (si están más cerca de lo necesario, se alejan). Luego atacan todos los que te vean a su alcance: el daño es <b>Ataque total ÷ tu Defensa</b>, redondeado hacia abajo.</p>
      <h4>Entre niveles</h4>
      <p>Elige una: subir una habilidad en 1 (máximo 6) <b>o</b> curarte hasta 6 de Vida.</p>
      ${has('mguf') || has('peak') || has('harbour') || has('hell') ? `<h4>Cofre del tesoro</h4>
      <p>${g === 'base' ? 'Solo en las aventuras con cofre. ' : ''}Cada nivel tiene un cofre en la escalera opuesta a la de entrada (o en la casilla marcada con una X). Su número es su <b>Defensa</b> y su <b>botín</b>. Hasta que lo abras cuenta como un muro: no se cruza y tapa la visión. Ábrelo atacándolo, a tu Alcance y a la vista, con al menos esos puntos de Atq. Los puntos del botín se suman, en una fase de Energía, a <b>una</b> habilidad por turno (Mov, Atq, Def o Alc), en ese nivel y en su jefe. Lo que no gastes se pierde al terminar el nivel.</p>` : ''}
      ${has('mguf') || has('hell') ? `<h4>Jefes</h4>
      <p>Al terminar los niveles 3, 6, 9 y 12 se juega un mapa de jefe como <b>prolongación</b> del nivel: antes no puedes mejorar ni curarte, y el cofre abierto sigue contigo. Los jefes se representan con un dado de 12 caras. Con el jefe final termina la aventura.</p>` : ''}
      ${has('harbour') ? `<h4>Agua (Harbour Clash)</h4>
      <p>Los monstruos que estén sobre una casilla de agua suman los bonos en azul a su Ataque, Defensa o Alcance. Tú no los recibes.</p>` : ''}
      ${has('hell') ? `<h4>Casillas malditas y Piedra (La Puerta del Infierno)</h4>
      <p>Los monstruos ganan los bonos en rojo de su carta <b>mientras tú estés sobre una casilla maldita</b> (el bono es para todos a la vez). La <b>Piedra de la Perdición</b> es un muro especial con un número (D4): atácala a tu Alcance y a la vista, gastando tantos puntos de Atq como su número. Al romperla, <b>todos los monstruos reciben 1 de daño</b> y <b>tú también</b>. Sigue siendo un muro. El Cazador de demonios puede mover a un monstruo hasta 3 casillas.</p>` : ''}
      ${has('peak') ? `<h4>Ventisca (Montaña Eterna)</h4>
      <p>Mientras estés sobre una casilla de ventisca, tu Ataque y tu Defensa bases valen 1 menos.</p>` : ''}
      <h4>Objetos</h4>
      <p>Puedes jugar con tres objetos, al azar o a tu elección: la Montaña Eterna, Harbour Clash y La Puerta del Infierno los usan siempre; en las demás aventuras es opcional. Cada uno se usa una sola vez y se descarta.</p>
      <ul>${ITEM_KEYS.filter(k => ITEMS[k]).map(k => `<li><b>${ITEMS[k].name}.</b> ${ITEMS[k].txt}${k === 'cloak' ? ' (Solo Montaña Eterna.)' : k === 'sands' ? ' (Solo Harbour Clash.)' : k === 'holy' || k === 'fist' ? ' (Solo La Puerta del Infierno.)' : ''}</li>`).join('')}</ul>
      <h4>Héroes</h4>
      <p>Con cualquier aventura juegas con los héroes de la original y de esa expansión; el botón <b>Héroes de otras expansiones</b> añade los demás.</p>
      <ul>${HERO_KEYS.map(k => `<li><b>${HEROES[k].name}.</b> ${HEROES[k].txt}</li>`).join('')}</ul>
      <h4>Aventuras por desbloquear</h4>
      <p>Empiezas con la original. Cada aventura se abre al completar la anterior con 2 héroes distintos; desde Montaña Eterna, uno debe ser de la expansión anterior y, si esa aventura usa objetos, solo con objetos suyos. Sus héroes y objetos se abren con ella. En «Nueva partida» verás qué te falta.</p>
      <h4>Partidas guardadas</h4>
      <p>La partida se guarda sola en todo momento, una por aventura: puedes tener una en curso en cada mazmorra. Desde el menú, <b>Retomar</b> la continúa y <b>Abandonar</b> la da por perdida. Si caes, puedes reintentar el nivel tal como lo empezaste. Con un usuario, tus partidas, logros y estadísticas se guardan en la nube.</p>
      <p class="fine">Versión web no oficial del juego solitario One Card Dungeon y de sus expansiones, de Barny Skinner (Little Rocket Games). Los mapas, las cifras de los monstruos y su aparición por nivel siguen las cartas originales; las ilustraciones del juego y los textos son propios. Las portadas del menú son de Little Rocket Games. Si te gusta, apoya al autor y consigue el juego.</p>
      <button type="button" class="btn primary" id="x">Entendido</button>`, [['#x', closeSheet]], true);
  }

  function breakSheet() {
    const a = G.adv;
    const ch = ['spd', 'atk', 'def', 'rng'].map(k =>
      a[k] >= E.SKILL_MAX
        ? `<button type="button" class="choice" data-c="${k}" disabled><b>${LONG[k]}</b><span><em>${a[k]}</em> · ${L('máximo', 'max')}</span></button>`
        : `<button type="button" class="choice" data-c="${k}"><b>${LONG[k]}</b><span><em>${a[k]}</em> → <em>${a[k] + 1}</em></span></button>`).join('');
    const full = a.hp >= START_HP;
    // lo que viene: monstruo del próximo nivel, cuántos y sus cifras, para elegir con información
    const nx = LEVELS[G.levelIdx + 1];
    let foe = '';
    if (nx) {
      const m = nx.mon, n = nx.spawns.length, B = m.bonus || {};
      const st = k => `<span><b>${m[k]}${B[k] ? `<i>+${B[k]}</i>` : ''}</b>${(LANG === 'en' ? { hp: 'Health', spd: 'Spd', atk: 'Atk', def: 'Def', rng: 'Rng' } : { hp: 'Vida', spd: 'Vel', atk: 'Atq', def: 'Def', rng: 'Alc' })[k]}</span>`;
      const bon = Object.keys(B).length ? `<p class="nf-note">${m.bonusOn === 'hero' ? L('Si pisas una casilla maldita', 'If you step on a cursed tile they add') : L('En casillas de agua', 'On water tiles they add')}${L(' suman', '')} ${Object.keys(B).map(k => `+${B[k]} ${NAMES[k]}`).join(', ')}.</p>` : '';
      foe = `<div class="next-foe"><small>${L('Próximo', 'Next')} · ${stageLabel(nx).toLowerCase()}: ${nx.title}</small>
        <div class="nf-row"><span class="mico">${ICONS[m.key] || ''}</span><b>${n} ${n > 1 ? m.plural : m.name}</b>${m.boss ? `<em>${L('Jefe', 'Boss')}</em>` : ''}</div>
        <div class="nf-stats">${['hp', 'spd', 'atk', 'def', 'rng'].map(st).join('')}</div>${bon}</div>`;
    }
    openSheet(`<h3>${L('Nivel superado', 'Level cleared')}</h3>
      ${foe}
      <p class="lead">${L('Elige <b>una</b> mejora.', 'Choose <b>one</b> upgrade.')}</p>
      <div class="choices">${ch}
        <button type="button" class="choice wide" data-c="heal" ${full ? 'disabled' : ''}><b>${L('Curarte', 'Heal')}</b><span>${L('Vida', 'Health')} <em>${a.hp}</em> → <em>${START_HP}</em></span></button>
      </div>`, [], false);
    document.querySelectorAll('#veil .choice').forEach(b => b.addEventListener('click', () => chooseBreak(b.dataset.c)));
  }

  async function deathSheet() {
    sfxDie(); Music.stop();
    noteBest();
    await sleep(1700);                 // primero se oye el grito; después aparecen las estadísticas con «you died»
    if (G && G.phase === 'dead') endScreen(false);
  }

  // pantalla final (victoria o derrota) con las estadísticas de la partida, premios y frases con humor
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const SI = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const STAT_ICO = {
    stage: SI('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    turns: SI('<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>'),
    kills: SI('<path d="M5 11a7 7 0 1 1 14 0c0 2-1 3-2 4v3H7v-3c-1-1-2-2-2-4z"/><circle cx="9.5" cy="11" r="1.3"/><circle cx="14.5" cy="11" r="1.3"/><path d="M10 18v2M14 18v2"/>'),
    hits: SI('<path d="M14 4l6-1-1 6-9 9-3-3zM7 14l-3 3M5 19l2 2"/>'),
    dmg: SI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>'),
    blocks: SI('<path d="M12 3 5 6v6c0 4.500 3 7.500 7 9 4-1.500 7-4.500 7-9V6z"/>'),
    chests: SI('<rect x="3" y="9" width="18" height="11" rx="1.500"/><path d="M3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4M12 12v3"/>'),
    deaths: SI('<path d="M7 21V9a5 5 0 0 1 10 0v12zM12 9v6M9.500 12h5"/>'),
    life: SI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>'),
    best: SI('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4"/>')
  };
  const ICON_TOMB = `<svg viewBox="0 0 64 80" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M14 72V30a18 18 0 0 1 36 0v42z" fill="currentColor" fill-opacity=".14"/><path d="M32 22v22M24 31h16"/><path d="M6 72h52M20 72v-5M44 72v-5M10 66l6-2M50 66l5-2"/></svg>`;
  const ICON_TROPHY = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="currentColor" fill-opacity=".16"/><path d="M20 12h-9v3a9 9 0 0 0 9 9M44 12h9v3a9 9 0 0 1-9 9M32 34v10M22 56h20M26 44h12v12H26z"/><path d="m32 14 2 4.500 5 .6-3.700 3.300 1 5-4.300-2.500-4.300 2.500 1-5-3.700-3.300 5-.6z" fill="currentColor"/></svg>`;
  const EPITAFIOS = LANG === 'en' ? ['“They said: ‘I can take one more.’”', '“Their plan was good. The monster didn\'t read it.”', '“Here lies a hero and several questionable decisions.”',
    '“They went as they lived: trusting the dice.”', '“The dice betrayed them. They betrayed themselves a little too.”', '“Could have been a legend. Ended up an anecdote.”',
    '“Rest in peace. The monster rests on your loot.”', '“Died doing what they loved: falling for obvious traps.”'] : ['«Dijo: “yo puedo con uno más”.»', '«Su plan era bueno. El monstruo no lo leyó.»', '«Aquí yace un héroe y varias decisiones cuestionables.»',
    '«Se fue como vivió: confiando en los dados.»', '«Los dados lo traicionaron. Él también, un poco.»', '«Pudo ser leyenda. Quedó en anécdota.»',
    '«Descansa en paz. El monstruo descansa sobre tu botín.»', '«Murió haciendo lo que amaba: caer en trampas obvias.»'];
  const TAUNTS = LANG === 'en' ? ['Thanks for stopping by!', 'Was that all? How disappointing.', 'Five more minutes and I\'d have been bored.', 'Leave the door open on your way out.',
    'Relax, you can retry. I\'ll be waiting.', 'I didn\'t even scratch my armour.', 'I\'ll put this on my résumé.', 'I liked you. You were nice and soft.'] : ['¡Gracias por la visita!', '¿Eso era todo? Qué decepción.', 'Cinco minutos más y me aburría.', 'Deja la puerta abierta al salir.',
    'Tranquilo, puedes reintentar. Aquí te espero.', 'Ni siquiera despeiné mi armadura.', 'Anotaré esto en mi currículum.', 'Me caíste bien. Estabas muy blandito.'];
  const BOSS_LAST = LANG === 'en' ? ['This wasn\'t in my contract.', 'I\'m requesting a review of the fight.', 'I\'m complaining to dungeon management.',
    'But I was the final boss!', 'I\'ll call my lawyer… once I get up.', 'I wanted to be the villain of a sequel. Too bad.'] : ['Esto no estaba en mi contrato.', 'Voy a pedir una revisión del combate.', 'Me voy a quejar con la administración de la mazmorra.',
    '¡Pero si yo era el jefe final!', 'Llamaré a mi abogado… cuando me levante.', 'Quería ser el villano de una secuela. Qué mal.'];
  const RANK_EN = { 'Mártir': 'Martyr', 'Aperitivo': 'Snack', 'Lección aprendida': 'Lesson Learned', 'Daño colateral': 'Collateral Damage', 'Desertor': 'Deserter', 'Retirada estratégica': 'Strategic Retreat', 'Prudente': 'Cautious', 'Pies ligeros': 'Light Feet' };
  function endScreen(won) {
    const s = G.stats || {}, a = G.adv, lv = LEVELS[G.levelIdx], lab = stageLabel(lv), ab = !!G.abandoned;
    const w = WIN[G.game] || WIN.base, hasChest = G.game !== 'base', mon = lv.mon, N = LEVELS.length;
    const k = s.kills || 0, hits = s.hits || 0, dmg = s.dmgIn || 0, blk = s.blocks || 0, ch = s.chests || 0, dth = s.deaths || 0, turns = G.totalTurns || 0;
    const plural = n => LANG === 'en' ? (n === 1 ? 'time' : 'times') : (n === 1 ? 'vez' : 'veces');
    // título de rango / veredicto / premios
    let rank, quip, awards = [];
    if (won) {
      if (dth === 0 && dmg <= 10) { rank = 'Intocable'; quip = L('Ni despeinado. Los monstruos piden una reunión urgente con Recursos Humanos.', 'Not a hair out of place. The monsters are calling an urgent meeting with HR.'); }
      else if (dth === 0) { rank = 'Héroe de manual'; quip = L('Sin una sola caída. Los monstruos piden que, por favor, no vuelvas.', 'Not a single fall. The monsters kindly ask you not to come back.'); }
      else if (dth <= 2) { rank = 'Terco con suerte'; quip = L(`Caíste ${dth} ${plural(dth)} y te levantaste igual. Cabezadura con certificado.`, `You fell ${dth} ${plural(dth)} and got up anyway. Certified stubborn.`); }
      else { rank = 'Cucaracha inmortal'; quip = L(`${dth} caídas y aquí estás, sacudiéndote el polvo. Los monstruos ya perdieron la fe en la lógica.`, `${dth} falls and here you are, dusting yourself off. The monsters have lost all faith in logic.`); }
      if (blk >= 8) awards.push('Muro humano'); if (k >= 10) awards.push('Exterminador'); if (ch >= 3) awards.push('Saqueador'); if (dmg <= 5) awards.push('Piel de roca');
      if (hits >= 15) awards.push('Manos rápidas'); if (dth === 0) awards.push('Sin pausa para morir'); if (turns <= 70) awards.push('Con prisa');
      if (!awards.length) awards.push('Superviviente');
    } else {
      rank = pick(['Mártir', 'Aperitivo', 'Lección aprendida', 'Daño colateral']);
      const opts = [];
      if (dth >= 2) opts.push(L(`Es tu caída número ${dth + 1}. ${mon.name === 'Orco' ? 'El orco' : 'El monstruo'} ya te guarda el asiento.`, `That's fall number ${dth + 1}. The monster is already saving you a seat.`));
      if (blk === 0) opts.push(L('0 ataques bloqueados. La defensa era una sugerencia, claro.', '0 attacks blocked. Defence was just a suggestion, of course.'));
      if (k === 0) opts.push(L('0 monstruos vencidos. Más que una aventura, un paseo turístico.', '0 monsters defeated. Less an adventure, more a sightseeing tour.'));
      if (dmg >= 15) opts.push(L(`Recibiste ${dmg} de daño. Como saco de boxeo, de primera.`, `You took ${dmg} damage. As a punching bag, first class.`));
      if (turns <= 25) opts.push(L(`Solo ${turns} turnos. Hasta el café se enfría más lento.`, `Only ${turns} turns. Even coffee cools down slower.`));
      if (G.levelIdx === 0) opts.push(L(`Caíste en la primera etapa. ${mon.plural} están organizando una fiesta.`, `You fell on the first stage. The ${mon.plural} are throwing a party.`));
      if (G.levelIdx >= N - 2) opts.push(L('Tan cerca del final… y aun así tan lejos. Qué estilo para perder.', 'So close to the end… and yet so far. What style in defeat.'));
      opts.push(L('Las estadísticas dicen que fue una buena pelea. Las estadísticas mienten.', 'The stats say it was a good fight. The stats lie.'), L('Como héroe eres un excelente espectador de monstruos.', 'As a hero, you make an excellent monster spectator.'));
      quip = pick(opts);
      if (ab) { rank = pick(['Desertor', 'Retirada estratégica', 'Prudente', 'Pies ligeros']); quip = pick(LANG === 'en' ? ['A timely retreat is a victory too. A tiny one, but still.', 'The monsters are already telling the story of how you ran.', 'You ran off so gracefully it almost looked like a plan.', `The ${mon.plural} celebrate: they won without lifting a finger.`] : ['Una retirada a tiempo también es una victoria. Pequeñita, pero victoria.', 'Los monstruos ya están contando la historia de cómo huiste.', 'Saliste corriendo con tanta elegancia que casi parece un plan.', `${mon.plural} celebran: ganaron sin mover un dedo.`]); awards.push('Retirada estratégica'); }
      else awards.push(dmg >= 12 ? 'Saco de boxeo' : k === 0 ? 'Pacifista involuntario' : dth >= 2 ? 'Visitante frecuente' : blk === 0 ? 'Defensa opcional' : 'Premio participación');
    }
    const openBefore = ADV_ORDER.filter(g => unlockState(g).ok);
    noteGuest(won);
    const fresh = recordEnd(won, rank, awards), achName = id => (ACH.find(a => a.id === id) || {}).name || id, achT = id => (ACH.find(a => a.id === id) || {}).t || 'bronce', achTxt = id => (ACH.find(a => a.id === id) || {}).txt || '';
    const rankName = r => LANG === 'en' ? (RANK_EN[r] || achName(r)) : r;
    const byTier = l => l.slice().sort((x, y) => TIERS.findIndex(t => t[0] === achT(x)) - TIERS.findIndex(t => t[0] === achT(y)));
    const say = won ? `${mon.name}: «${pick(BOSS_LAST)}»` : `${mon.name}: «${pick(ab ? (LANG === 'en' ? ['Leaving already? We were just getting started.', 'Run, run! Nobody\'s following you… yet.', 'Close the door on your way out, it\'s cold.', 'I\'ll keep your loot, thanks.', 'Running away is a sport too. And you\'re good at it.'] : ['¿Ya te vas? Si recién empezábamos.', '¡Corre, corre! Nadie te sigue… por ahora.', 'Cierra la puerta al salir, que entra frío.', 'Me quedo con tu botín, gracias.', 'Huir también es un deporte. Y eres bueno.']) : TAUNTS)}»`;
    const cell = (ico, v, l, wide) => `<div class="${wide ? 'wide' : ''}"><i>${STAT_ICO[ico]}</i><b>${v}</b><span>${l}</span></div>`;
    const cells = [
      cell('stage', won ? `${N}/${N}` : `${G.levelIdx + 1}/${N}`, won ? L('Etapas superadas', 'Stages cleared') : L('Etapa alcanzada', 'Stage reached')),
      cell('turns', turns, L('Turnos', 'Turns')),
      cell('kills', k, L('Monstruos vencidos', 'Monsters defeated')),
      cell('hits', hits, L('Golpes dados', 'Hits landed')),
      cell('dmg', dmg, L('Daño recibido', 'Damage taken')),
      cell('blocks', blk, L('Ataques bloqueados', 'Attacks blocked')),
      hasChest ? cell('chests', ch, L('Cofres abiertos', 'Chests opened')) : '',
      won ? cell('life', `${a.hp}/${START_HP}`, L('Vida final', 'Final Health')) : cell('best', bestLevel, L('Mejor etapa', 'Best stage')),
      dth ? cell('deaths', dth, L('Veces caído', 'Times fallen')) : ''
    ].join('');
    const items = (G.items || []).map(i => ITEMS[i] ? `<span class="chip">${ITEMS[i].short || ITEMS[i].name}</span>` : '').join('');
    const embers = won ? Array.from({ length: 22 }, (_, i) => `<span style="--x:${(i * 47 + 9) % 100}%;--d:${(i * 0.37) % 4}s;--s:${3 + (i * 7) % 5}px;--t:${4 + (i * 3) % 4}s"></span>`).join('') : '';
    showScreen(`<div class="splash endscr ${won ? 'won' : 'lost'}">
      <div class="end-fx">${embers}</div>
      <div class="end-frame">
        <div class="end-badge">${won ? ICON_TROPHY : ICON_TOMB}</div>
        <div class="end-kicker">${won ? L('¡Mazmorra completada!', 'Dungeon complete!') : ab ? L('Partida abandonada', 'Run abandoned') : L('Fin del camino', 'End of the road')}</div>
        <h2>${won ? w[0] : ab ? L('Te retiraste', 'You retreated') : L('Has caído', 'You have fallen')}</h2>
        <p class="lead">${won ? w[1] : ab ? L(`Abandonaste ${GAMES[G.game].name} en ${lab.toLowerCase()}: ${lv.title}.`, `You abandoned ${GAMES[G.game].name} on ${lab.toLowerCase()}: ${lv.title}.`) : L(`Derrotado por ${mon.name} en ${lab.toLowerCase()}: ${lv.title}.`, `Defeated by the ${mon.name} on ${lab.toLowerCase()}: ${lv.title}.`)}</p>
        <div class="end-hero"><span class="ico">${HERO_ICONS[G.hero] || ICON_ADV}</span><span>${HEROES[G.hero].name} · ${GAMES[G.game].name}</span></div>
        ${won ? `<div class="end-rank"><small>${L('Rango obtenido', 'Rank earned')}</small><b>${rankName(rank)}</b></div>`
              : `<div class="end-epitaph"><small>${HEROES[G.hero].name} · ${rankName(rank)}</small><q>${pick(EPITAFIOS)}</q></div>`}
        <p class="end-quip">${quip}</p>
        <div class="end-grid">${cells}</div>
        <div class="end-skills"><b>${L('Habilidades', 'Skills')}</b>
          <span>${NAMES.spd} <em>${a.spd}</em></span><span>${NAMES.atk} <em>${a.atk}</em></span><span>${NAMES.def} <em>${a.def}</em></span><span>${NAMES.rng} <em>${a.rng}</em></span>${items ? `<span class="end-items">${items}</span>` : ''}</div>
        <div class="end-say"><span class="mico">${ICONS[mon.key] || ''}</span><q>${say}</q></div>
        ${awards.some(x => !fresh.includes(x)) ? `<div class="end-awards"><small>${won ? L('Premios', 'Awards') : L('Premio consuelo', 'Consolation award')}</small>${byTier(awards.filter(x => !fresh.includes(x))).map(x => `<span class="award">${achName(x)}<em>${achTxt(x)}</em></span>`).join('')}</div>` : ''}
        ${(() => { const nu = ADV_ORDER.filter(g => !openBefore.includes(g) && unlockState(g).ok); return nu.length ? `<div class="end-unlock">${ICON_LOCK_OPEN}<div><small>${L('¡Aventura desbloqueada!', 'Adventure unlocked!')}</small><b>${nu.map(g => GAMES[g].name).join(L(' y ', ' and '))}</b><span>${L('Ya puedes jugarla desde «Nueva partida»', 'You can now play it from "New game"')}${heroesOf(nu[0]).length ? L(`, con ${heroesOf(nu[0]).map(h => HEROES[h].name).join(', ')}`, `, with ${heroesOf(nu[0]).map(h => HEROES[h].name).join(', ')}`) : ''}.</span></div></div>` : ''; })()}
        ${Users.cur ? (fresh.length ? `<div class="end-new"><small>${L(`¡Logro${fresh.length > 1 ? 's' : ''} nuevo${fresh.length > 1 ? 's' : ''} para ${esc(Users.get().name)}!`, `New achievement${fresh.length > 1 ? 's' : ''} for ${esc(Users.get().name)}!`)}</small>${byTier(fresh).map(x => `<span class="${achT(x)}"><i>${TIER_ICON}</i><b>${achName(x)}</b><em>${TIERS.find(t => t[0] === achT(x))[1]} · ${achTxt(x)}</em></span>`).join('')}</div>` : `<p class="fine">${L(`Guardado en el perfil de ${esc(Users.get().name)}.`, `Saved to ${esc(Users.get().name)}'s profile.`)}</p>`)
          : `<p class="fine">${L('Entra con un usuario desde el menú para guardar tus logros y estadísticas.', 'Sign in with a user from the menu to save your achievements and stats.')}</p>`}
        ${won || ab ? '' : `<p class="fine">${L(`Puedes reintentar ${lab.toLowerCase()} tal como lo empezaste, ahora o más tarde desde el menú.`, `You can retry ${lab.toLowerCase()} as you started it, now or later from the menu.`)}</p>`}
        <div class="menu-btns">
          ${won || ab ? '' : `<button type="button" class="btn primary menu-main" id="eRetry"><span>${L('Reintentar', 'Retry')} ${lab.toLowerCase()}</span></button>`}
          <button type="button" class="btn ${won ? 'primary ' : ''}menu-main" id="eMenu"><span>${L('Ir al menú', 'Go to menu')}</span></button>
        </div>
      </div></div>`,
      [['#eRetry', () => { busy = false; retry(); }], ['#eMenu', () => { busy = false; goMenu(); }]], true);
    Sfx.play(won ? 'win' : 'died');
  }

  const WIN = {
    base: [L('Cáliz de Brasas', 'Ember Chalice'), L('Los tres demonios han caído y el cáliz es tuyo.', 'The three demons have fallen and the chalice is yours.')],
    mguf: [L("M'Guf-yn derrotado", "M'Guf-yn defeated"), L("El señor del inframundo cae y su ejército se desbanda.", 'The lord of the underworld falls and his army scatters.')],
    peak: [L('Cima despejada', 'Summit cleared'), L('El Hechicero Blanco ha caído y la tormenta se calma.', 'The White Sorcerer has fallen and the storm calms down.')],
    harbour: [L('Puerto a salvo', 'Harbour saved'), L('El Kraken vuelve a las profundidades y la marea se retira.', 'The Kraken returns to the depths and the tide recedes.')],
    hell: [L('Puerta cerrada', 'Door sealed'), L('El Señor del Infierno cae y las llamas se apagan.', 'The Lord of Hell falls and the flames die out.')]
  };
  function winSheet() {
    Music.stop();
    noteBest();
    setTimeout(() => { if (G && G.phase === 'won') endScreen(true); }, 500);
  }

  /* ---------- pantallas de inicio ---------- */
  function showScreen(html, binds, silent) {
    closeSheet(); if (silent) Music.stop(); else Music.menu();
    const sc = $('#screen');
    sc.innerHTML = html;
    document.body.classList.add('menu');
    window.scrollTo(0, 0);
    for (const [sel, fn] of binds || []) { const el = sc.querySelector(sel); if (el) el.addEventListener('click', fn); }
    return sc;
  }
  function hideScreen() { document.body.classList.remove('menu'); $('#screen').innerHTML = ''; fit(); musicFloor(); }

  const LOGO = '<div class="logo"><span class="mark">Dungeon</span><span class="sub">in one card</span></div>';

  function menuScreen() {
    G = null; busy = false; rolling = false; mode = null;
    const slots = loadSlots(), me = Users.get();
    const slotHTML = slots.length ? `<div class="rslots"><small class="rslots-h">${L('Partidas en curso · se guardan solas', 'Games in progress · saved automatically')}</small>${slots.map((x, i) => {
      const sv = x.g, lv = GAMES[sv.game].levels[sv.levelIdx];
      return `<div class="rslot"><span class="ico">${HERO_ICONS[sv.hero] || ICON_ADV}</span><div class="rslot-t"><b>${GAMES[sv.game].name}</b><small>${HEROES[sv.hero].name} · ${stageLabel(lv).toLowerCase()} ${L('de', 'of')} ${GAMES[sv.game].levels.length} · ${L('Vida', 'Health')} ${sv.adv.hp}</small></div>
        <div class="rslot-b"><button type="button" class="btn primary mini" data-res="${sv.game}"${i === 0 ? ' id="mContinue"' : ''}>${L('Retomar', 'Resume')}</button><button type="button" class="btn mini danger" data-ab="${sv.game}">${L('Abandonar', 'Abandon')}</button></div></div>`;
    }).join('')}</div>` : '';
    const sc = showScreen(`<div class="splash">${LOGO}
      <p class="tagline">${L('Una carta, tres dados y una aventura por elegir.', 'One card, three dice and an adventure to choose.')}</p>
      <button type="button" class="userbar ${me ? 'in' : ''}" id="mUser">${ICON_USER}<span>${me ? `<b>${esc(me.name)}</b><small>${L('Ver perfil, logros y estadísticas', 'View profile, achievements and stats')}</small>` : `<b>${L('Entrar o crear usuario', 'Sign in or create user')}</b><small>${L('Para guardar tus logros y estadísticas', 'To save your achievements and stats')}</small>`}</span><i aria-hidden="true">›</i></button>
      ${slotHTML}
      <div class="menu-btns">
        <button type="button" class="btn ${slots.length ? '' : 'primary'} menu-main" id="mNew"><span>${L('Nueva partida', 'New game')}</span></button>
        <button type="button" class="ghost" id="mRules">${L('Cómo se juega', 'How to play')}</button>
      </div>
      <div class="lang-sw" role="group" aria-label="${L('Idioma', 'Language')}"><button type="button" data-lang="es" class="${LANG === 'es' ? 'on' : ''}">Español</button><button type="button" data-lang="en" class="${LANG === 'en' ? 'on' : ''}">English</button></div>
      <p class="fine">${L('Versión no oficial de One Card Dungeon, de Barny Skinner.', 'Unofficial version of One Card Dungeon, by Barny Skinner.')} · ${L('versión', 'version')} ${(document.querySelector('meta[name=build]') || {}).content || '?'}</p></div>`,
      [['#mUser', () => (Users.cur ? profileScreen() : usersScreen())], ['#mNew', adventureScreen], ['#mRules', rulesSheet]]);
    sc.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => { const x = slots.find(s => s.game === b.dataset.res); if (x) resume(x.g); }));
    sc.querySelectorAll('[data-ab]').forEach(b => b.addEventListener('click', () => { const x = slots.find(s => s.game === b.dataset.ab); if (x) abandonSheet(x.g); }));
    sc.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }));
  }

  // Abandonar: pide confirmación y ejecuta la secuencia de derrota (grito, canción y estadísticas); la partida se borra
  function abandonSheet(g) {
    const sv = g || G; if (!sv) return;
    const lv = GAMES[sv.game].levels[sv.levelIdx];
    openSheet(`<h3>${L('¿Abandonar la partida?', 'Abandon this run?')}</h3>
      <p class="lead">${L(`${HEROES[sv.hero].name} en ${GAMES[sv.game].name}, ${stageLabel(lv).toLowerCase()}. Perderás todo el avance de esta aventura y contará como una derrota.`, `${HEROES[sv.hero].name} in ${GAMES[sv.game].name}, ${stageLabel(lv).toLowerCase()}. You'll lose all progress in this adventure and it will count as a defeat.`)}</p>
      <button type="button" class="btn danger" id="abGo">${L('Abandonar', 'Abandon')}</button>
      <button type="button" class="btn" id="abNo">${L('Cancelar', 'Cancel')}</button>`,
      [['#abNo', closeSheet], ['#abGo', () => { closeSheet(); abandonRun(sv); }]], true);
  }
  async function abandonRun(sv) {
    if (!G || G !== sv) resume(sv);
    closeSheet(); mode = null; busy = true;
    G.abandoned = true; G.phase = 'dead';
    try { localStorage.removeItem(saveKey(G.game)); localStorage.setItem(saveKey(G.game) + ':t', String(Date.now())); } catch (e) {}
    render(); say(L('Te retiras de la mazmorra…', 'You retreat from the dungeon…'));
    sfxDie(); Music.stop(); noteBest();
    await sleep(1700);
    if (G && G.abandoned) endScreen(false);
    Users.sync();
  }

  // Pausa (antes, la contraseña): la partida ya está guardada; se puede seguir, ir al menú o abandonar
  function pauseSheet() {
    if (busy || rolling || !G) return;
    const lv = LEVELS[G.levelIdx];
    return openSheet(`<h3>${L('Pausa', 'Pause')}</h3>
      <p class="lead">${HEROES[G.hero].name} · ${GAMES[G.game].name} · ${stageLabel(lv).toLowerCase()}: ${lv.title}.</p>
      <p class="fine">${L(`Tu partida se guarda sola en todo momento${Users.cur ? ' y se sincroniza con tu usuario' : ''}. Desde el menú puedes retomarla cuando quieras.`, `Your game saves itself at all times${Users.cur ? ' and syncs with your user' : ''}. You can resume it from the menu whenever you like.`)}</p>
      <button type="button" class="btn primary" id="pwClose">${L('Seguir jugando', 'Keep playing')}</button>
      <button type="button" class="btn" id="pwMenu">${L('Ir al menú', 'Go to menu')}</button>
      <button type="button" class="btn danger" id="pwAb">${L('Abandonar partida', 'Abandon run')}</button>`,
      [['#pwClose', closeSheet], ['#pwMenu', goMenu], ['#pwAb', () => abandonSheet()]], true);
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON_USER = '<svg class="uico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/></svg>';
  const fmtDate = t => { try { return new Date(t).toLocaleDateString(L('es-CL', 'en-GB'), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  const USERS_NOTE = `<p class="fine">${L('Tu usuario se guarda en la nube: entra con el mismo nombre y contraseña desde cualquier dispositivo. Este dispositivo guarda además una copia para jugar sin internet.', 'Your user is saved in the cloud: sign in with the same name and password from any device. This device also keeps a copy so you can play offline.')}</p>`;

  // Entrar, crear usuario o recuperar uno con un código de copia
  function usersScreen(view, arg, err) {
    const list = Users.list();
    view = view || 'pick';
    let body = '';
    if (view === 'pick') body = `<h2 class="screen-h">${L('Usuarios', 'Users')}</h2>
      ${list.length ? `<p class="lead">${L('Usuarios en este dispositivo:', 'Users on this device:')}</p>
      <div class="user-list">${list.map(x => `<button type="button" class="btn user-btn" data-uk="${esc(x.k)}">${ICON_USER}<span>${esc(x.name)}</span>${x.cloud ? '' : `<small class="loc">${L('solo aquí', 'this device only')}</small>`}</button>`).join('')}</div>` : `<p class="lead">${L('Entra con tu usuario o crea uno nuevo.', 'Sign in with your user or create a new one.')}</p>`}
      <div class="menu-btns"><button type="button" class="btn ${list.length ? '' : 'primary'}" id="uRem">${L('Entrar con mi usuario', 'Sign in with my user')}</button><button type="button" class="btn" id="uNew">${L('Crear usuario nuevo', 'Create new user')}</button><button type="button" class="ghost" id="uImp">${L('Recuperar con copia de seguridad', 'Restore from backup')}</button></div>`;
    else if (view === 'login') body = `<h2 class="screen-h">${esc((Users.get(arg) || {}).name)}</h2>
      <p class="lead">${L('Escribe tu contraseña.', 'Enter your password.')}</p>
      <input id="uPw" class="field" type="password" autocomplete="current-password" aria-label="${L('Contraseña', 'Password')}">
      <p class="err" id="uErr" role="alert">${err || ''}</p>
      <button type="button" class="btn primary" id="uGo">${L('Entrar', 'Sign in')}</button>`;
    else if (view === 'remote') body = `<h2 class="screen-h">${L('Entrar', 'Sign in')}</h2>
      <p class="lead">${L('Escribe tu nombre de usuario y tu contraseña.', 'Enter your username and password.')}</p>
      <label class="flabel">${L('Nombre', 'Name')}<input id="uName" class="field" type="text" maxlength="16" autocomplete="username" autocapitalize="off"></label>
      <label class="flabel">${L('Contraseña', 'Password')}<input id="uPw" class="field" type="password" autocomplete="current-password"></label>
      <p class="err" id="uErr" role="alert">${err || ''}</p>
      <button type="button" class="btn primary" id="uGo">${L('Entrar', 'Sign in')}</button>`;
    else if (view === 'new') body = `<h2 class="screen-h">${L('Crear usuario', 'Create user')}</h2>
      <label class="flabel">${L('Nombre', 'Name')}<input id="uName" class="field" type="text" maxlength="16" autocomplete="username" autocapitalize="words"></label>
      <label class="flabel">${L('Contraseña', 'Password')} <small>${L('(mínimo 6 caracteres)', '(at least 6 characters)')}</small><input id="uPw" class="field" type="password" autocomplete="new-password"></label>
      <label class="flabel">${L('Repite la contraseña', 'Repeat password')}<input id="uPw2" class="field" type="password" autocomplete="new-password"></label>
      <p class="err" id="uErr" role="alert">${err || ''}</p>
      <p class="fine">${L('No se pide correo: solo nombre y contraseña. Anótala, porque no hay forma automática de recuperarla.', "No email needed: just a name and password. Write it down, because there's no automatic way to recover it.")}</p>
      <button type="button" class="btn primary" id="uGo">${L('Crear y entrar', 'Create and sign in')}</button>`;
    else if (view === 'import') body = `<h2 class="screen-h">${L('Recuperar usuario', 'Restore user')}</h2>
      <p class="lead">${L('Pega el código de copia de seguridad que guardaste desde tu perfil.', 'Paste the backup code you saved from your profile.')}</p>
      <textarea id="uCode" class="field code" rows="5" spellcheck="false" autocomplete="off" placeholder="DIOC1-…"></textarea>
      <p class="err" id="uErr" role="alert">${err || ''}</p>
      <button type="button" class="btn primary" id="uGo">${L('Recuperar', 'Restore')}</button>`;
    const sc = showScreen(`<div class="splash users">
      <button type="button" class="ghost back" id="back">‹ ${L('Atrás', 'Back')}</button>${body}${USERS_NOTE}</div>`,
      [['#back', () => (view === 'pick' ? menuScreen() : usersScreen())], ['#uNew', () => usersScreen('new')], ['#uRem', () => usersScreen('remote')], ['#uImp', () => usersScreen('import')]]);
    sc.querySelectorAll('[data-uk]').forEach(b => b.addEventListener('click', () => usersScreen('login', b.dataset.uk)));
    const go = sc.querySelector('#uGo'), errEl = sc.querySelector('#uErr');
    if (!go) return;
    const fail = m => { errEl.textContent = m; go.disabled = false; go.classList.remove('wait'); };
    const done = () => { loadBest(); menuScreen(); };
    const act = async () => {
      go.disabled = true; go.classList.add('wait'); errEl.textContent = view === 'import' ? '' : L('Conectando…', 'Connecting…');
      if (view === 'login') { const e = await Users.login((Users.get(arg) || {}).name, sc.querySelector('#uPw').value); return e ? fail(e) : done(); }
      if (view === 'remote') { const e = await Users.login(sc.querySelector('#uName').value, sc.querySelector('#uPw').value); return e ? fail(e) : done(); }
      if (view === 'new') {
        const pw = sc.querySelector('#uPw').value;
        if (pw !== sc.querySelector('#uPw2').value) return fail(L('Las contraseñas no coinciden.', "Passwords don't match."));
        const e = await Users.create(sc.querySelector('#uName').value, pw); return e ? fail(e) : done();
      }
      if (view === 'import') {
        const d = Users.parseCode(sc.querySelector('#uCode').value);
        if (!d) return fail(L('Ese código no es válido. Cópialo completo, desde «DIOC1-».', 'That code is not valid. Copy all of it, starting from "DIOC1-".'));
        const k = ukey(d.u.name);
        if (Users.exists(k) && go.dataset.ok !== '1') { go.dataset.ok = '1'; go.textContent = L(`Reemplazar a ${d.u.name}`, `Replace ${d.u.name}`); return fail(L(`Ya existe ${d.u.name} en este dispositivo. Si recuperas la copia, se reemplaza por la del código.`, `${d.u.name} already exists on this device. If you restore the backup, it will be replaced by the one in the code.`)); }
        return Users.importData(d) ? done() : fail(L('No se pudo guardar en este navegador.', 'Could not save in this browser.'));
      }
    };
    go.addEventListener('click', act);
    sc.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') act(); }));
    const f = sc.querySelector('input,textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  }

  function cloudBox(me, panel) {
    const c = me.cloud;
    if (c) {
      const st = c.dirty ? L('Hay cambios por subir (se suben solos cuando haya internet).', 'There are changes to upload (they upload by themselves when online).') : c.syncedAt ? `${L('Guardado en la nube', 'Saved in the cloud')} · ${fmtDate(c.syncedAt)} ${new Date(c.syncedAt).toLocaleTimeString(L('es-CL', 'en-GB'), { hour: '2-digit', minute: '2-digit' })}` : L('Conectado a la nube.', 'Connected to the cloud.');
      return `<div class="cloud-box ok"><span>☁</span><p>${st}</p><button type="button" class="btn mini" id="cSync">${L('Sincronizar', 'Sync')}</button></div>`;
    }
    if (panel === 'upload' || panel === 'upload-new') return `<div class="cloud-box up"><p><b>${L('Subir a la nube', 'Upload to the cloud')}</b> ${L('Así podrás entrar con este usuario desde cualquier dispositivo.', "That way you'll be able to sign in with this user from any device.")}</p>
      <input id="upPw" class="field" type="password" placeholder="${L('Tu contraseña actual', 'Your current password')}" autocomplete="current-password">
      ${panel === 'upload-new' ? `<p class="fine">${L('En la nube la contraseña debe tener al menos 6 caracteres. Elige una nueva:', 'In the cloud the password must be at least 6 characters. Choose a new one:')}</p><input id="upNew" class="field" type="password" placeholder="${L('Contraseña nueva (mínimo 6)', 'New password (at least 6)')}" autocomplete="new-password">` : ''}
      <p class="err" id="upErr" role="alert"></p><button type="button" class="btn primary" id="upGo">${L('Subir a la nube', 'Upload to the cloud')}</button></div>`;
    return `<div class="cloud-box"><span>⚠</span><p>${L('Este usuario está <b>solo en este dispositivo</b>.', 'This user is <b>only on this device</b>.')}</p><button type="button" class="btn mini" id="cUp">${L('Subir a la nube', 'Upload to the cloud')}</button></div>`;
  }

  // Perfil: mazmorras, estadísticas, logros, últimas partidas y copia de seguridad
  function profileScreen(panel) {
    const me = Users.get(); if (!me) return usersScreen();
    const r = fixRec(Object.assign({ games: {}, tot: {}, ach: {}, hist: [], heroes: [] }, me.rec)), t = r.tot;
    const got = ACH.filter(a => r.ach[a.id]).length;
    const games = ADV_ORDER.map(g => {
      const x = r.games[g], n = GAMES[g].levels.length;
      const st = !x ? `<span class="dim">${L('Sin jugar', 'Not played')}</span>` : x.wins ? `<b class="ok">${L('Completada', 'Completed')}${x.wins > 1 ? ` ×${x.wins}` : ''}</b>` : `<span>${L('Mejor etapa', 'Best stage')} <b>${x.best}/${n}</b></span>`;
      const extra = x && x.wins ? `<small>${x.bestRank ? `${L('Rango', 'Rank')}: ${LANG === 'en' ? ((ACH.find(a => a.id === x.bestRank) || {}).name || x.bestRank) : x.bestRank} · ` : ''}${L('Récord', 'Record')}: ${x.fastest} ${L('turnos', 'turns')}</small>` : x ? `<small>${x.falls} ${L(`caída${x.falls === 1 ? '' : 's'}`, x.falls === 1 ? 'fall' : 'falls')}</small>` : '';
      return `<div class="pg ${x && x.wins ? 'won' : ''}"><span class="pg-n">${GAMES[g].name}</span>${st}${extra}</div>`;
    }).join('');
    const cell = (v, l) => `<div><b>${v || 0}</b><span>${l}</span></div>`;
    const groups = TIERS.map(([t, tn]) => {
      const list = ACH.filter(a => a.t === t), n = list.filter(a => r.ach[a.id]).length;
      // dentro de cada rareza, primero los conseguidos
      list.sort((x, y) => (!!r.ach[y.id]) - (!!r.ach[x.id]));
      return `<h4 class="tier-h ${t}"><i>${TIER_ICON}</i>${tn}<small>${n} ${L('de', 'of')} ${list.length}</small></h4><div class="ach-list">${list.map(a => {
        const h = r.ach[a.id];
        return `<div class="ach ${t} ${h ? 'on' : ''}"><b>${a.name}</b><span>${a.txt}</span><small class="cat">${a.g}${h ? ` · ${fmtDate(h.d)}${GAMES[h.g] ? ' · ' + GAMES[h.g].name : ''}` : ''}</small></div>`;
      }).join('')}</div>`;
    }).join('');
    const medals = `<div class="medals">${TIERS.map(([t, tn]) => `<span class="${t}"><i>${TIER_ICON}</i><b>${ACH.filter(a => a.t === t && r.ach[a.id]).length}</b>${tn}</span>`).join('')}</div>`;
    const hist = r.hist.length ? r.hist.map(h => `<li class="${h.won ? 'won' : ''}"><b>${h.won ? L('Victoria', 'Victory') : L('Caída', 'Fall')}</b> · ${GAMES[h.g] ? GAMES[h.g].name : ''} · ${HEROES[h.h] ? HEROES[h.h].name : ''} · ${L('etapa', 'stage')} ${h.st}/${h.n}${h.won ? ` · ${LANG === 'en' ? ((ACH.find(a => a.id === h.rank) || {}).name || h.rank) : h.rank}` : ''}<small>${fmtDate(h.d)}</small></li>`).join('') : `<li class="dim">${L('Todavía no hay partidas.', 'No games yet.')}</li>`;
    const sc = showScreen(`<div class="splash wide prof">
      <button type="button" class="ghost back" id="back">‹ ${L('Atrás', 'Back')}</button>
      <div class="prof-head">${ICON_USER}<div><h2 class="screen-h">${esc(me.name)}</h2><small>${L('Usuario desde', 'User since')} ${fmtDate(me.created)} · ${got}/${ACH.length} ${L('logros', 'achievements')}</small></div></div>
      ${cloudBox(me, panel)}
      <h3 class="pack-h">${L('Mazmorras', 'Dungeons')}</h3><div class="prof-games">${games}</div>
      <h3 class="pack-h">${L('Estadísticas', 'Stats')}</h3>
      <div class="prof-stats">${cell(t.wins, L('Victorias', 'Victories'))}${cell(t.falls, L('Caídas', 'Falls'))}${cell(t.kills, L('Monstruos vencidos', 'Monsters defeated'))}${cell(t.hits, L('Golpes dados', 'Hits landed'))}${cell(t.dmgIn, L('Daño recibido', 'Damage taken'))}${cell(t.blocks, L('Ataques bloqueados', 'Attacks blocked'))}${cell(t.chests, L('Cofres abiertos', 'Chests opened'))}${cell(t.turns, L('Turnos jugados', 'Turns played'))}</div>
      <h3 class="pack-h">${L('Logros', 'Achievements')} <small>${got} ${L('de', 'of')} ${ACH.length}</small></h3>${medals}<div class="prof-ach">${groups}</div>
      <h3 class="pack-h">${L('Últimas partidas', 'Recent games')}</h3><ul class="prof-hist">${hist}</ul>
      <h3 class="pack-h">${L('Copia de seguridad', 'Backup')}</h3>
      <p class="lead">${L('Opcional: con la nube ya no hace falta, pero puedes guardar este código como respaldo extra. Con él recuperas tu usuario desde «Recuperar con copia de seguridad».', 'Optional: with the cloud you no longer need it, but you can keep this code as an extra backup. With it you restore your user from "Restore from backup".')}</p>
      <div id="bkBox">${panel === 'backup' ? `<textarea class="field code" rows="5" readonly id="bkCode">${Users.exportCode()}</textarea><p class="fine" id="bkMsg" aria-live="polite"></p><button type="button" class="btn" id="bkCopy">${L('Copiar código', 'Copy code')}</button>` : `<button type="button" class="btn" id="bkShow">${L('Crear copia de seguridad', 'Create backup')}</button>`}</div>
      <div class="menu-btns prof-acts">
        <button type="button" class="btn primary" id="pMenu">${L('Ir al menú', 'Go to menu')}</button>
        <button type="button" class="btn" id="pOut">${L('Cerrar sesión', 'Sign out')}</button>
        <button type="button" class="ghost danger" id="pDel">${L('Borrar este usuario', 'Delete this user')}</button>
      </div>
      <div id="delBox"></div>${USERS_NOTE}</div>`,
      [['#back', menuScreen], ['#pMenu', menuScreen], ['#cSync', async () => { const b = $('#cSync'); b.disabled = true; b.textContent = L('Sincronizando…', 'Syncing…'); await Users.sync(); profileScreen(); }],
       ['#cUp', () => profileScreen('upload')], ['#pOut', () => { Users.logout(); loadBest(); menuScreen(); }], ['#bkShow', () => { profileScreen('backup'); setTimeout(() => { const b = $('#bkBox'); if (b) b.scrollIntoView({ block: 'center' }); }, 30); }]]);
    const up = sc.querySelector('#upGo');
    if (up) up.addEventListener('click', async () => {
      const er = sc.querySelector('#upErr'), pw = sc.querySelector('#upPw').value, np = sc.querySelector('#upNew');
      up.disabled = true; er.textContent = L('Conectando…', 'Connecting…');
      if (np) { const e1 = await Users.setPassword(pw, np.value); if (e1) { er.textContent = e1; up.disabled = false; return; } }
      const e = await Users.upload(np ? np.value : pw);
      if (e === 'short') { profileScreen('upload-new'); return; }
      if (e) { er.textContent = e; up.disabled = false; return; }
      profileScreen();
    });
    const cp = sc.querySelector('#bkCopy');
    if (cp) cp.addEventListener('click', () => {
      const code = sc.querySelector('#bkCode'), m = sc.querySelector('#bkMsg');
      let p = null; try { p = navigator.clipboard && navigator.clipboard.writeText(code.value); } catch (e) {}
      const manual = L('Selecciona el texto y cópialo a mano.', 'Select the text and copy it manually.');
      if (p && p.then) p.then(() => { m.textContent = L('Copiado. Pégalo en una nota o en un mensaje para ti.', 'Copied. Paste it in a note or a message to yourself.'); }, () => { code.select(); m.textContent = manual; });
      else { code.select(); m.textContent = manual; }
    });
    sc.querySelector('#pDel').addEventListener('click', () => {
      const box = sc.querySelector('#delBox');
      box.innerHTML = `<div class="del-box"><p class="lead">${L('Se borrarán el usuario, sus logros, estadísticas y partidas, también de la nube. No se puede deshacer. Escribe tu contraseña para confirmar.', "The user, its achievements, stats and games will be deleted, from the cloud too. This can't be undone. Enter your password to confirm.")}</p>
        <input id="dPw" class="field" type="password" autocomplete="current-password" aria-label="${L('Contraseña', 'Password')}"><p class="err" id="dErr" role="alert"></p>
        <button type="button" class="btn danger" id="dGo">${L('Borrar definitivamente', 'Delete permanently')}</button></div>`;
      box.querySelector('#dGo').addEventListener('click', async () => {
        const e = await Users.remove(Users.cur, box.querySelector('#dPw').value);
        if (e) box.querySelector('#dErr').textContent = e; else { loadBest(); menuScreen(); }
      });
      box.scrollIntoView({ block: 'center' }); setTimeout(() => box.querySelector('#dPw').focus({ preventScroll: true }), 50);
    });
  }

  const ADV_INFO = {
    base: { img: 'img/core.jpg', alt: L('Portada de One Card Dungeon', 'One Card Dungeon cover'), tag: 'Original', txt: L('12 niveles y tres demonios.', '12 levels and three demons.') },
    mguf: { img: 'img/mguf.jpg', alt: L("Portada de One Card Dungeon: M'Guf-yn Returns", "One Card Dungeon: M'Guf-yn Returns cover"), tag: L('Expansión', 'Expansion'), txt: L('12 niveles, 4 jefes, cofres y 4 héroes.', '12 levels, 4 bosses, chests and 4 heroes.') },
    peak: { img: 'img/peak.jpg', alt: L('Portada de One Card Dungeon: Eternal Peak', 'One Card Dungeon: Eternal Peak cover'), tag: L('Expansión', 'Expansion'), txt: L('10 niveles, ventiscas, Sherpa y objetos.', '10 levels, blizzards, Sherpa and items.') },
    harbour: { img: 'img/harbour.jpg', alt: L('Portada de One Card Dungeon: Harbour Clash', 'One Card Dungeon: Harbour Clash cover'), tag: L('Expansión', 'Expansion'), txt: L('8 niveles, agua, Corsario y objetos.', '8 levels, water, Corsair and items.') },
    hell: { img: 'img/hell.jpg', alt: L("Portada de One Card Dungeon: Hell's Door", "One Card Dungeon: Hell's Door cover"), tag: L('Expansión', 'Expansion'), txt: L('12 niveles, 4 jefes, casillas malditas, la Piedra de la Perdición y objetos.', '12 levels, 4 bosses, cursed tiles, the Stone of Doom and items.') }
  };
  const ADV_ORDER = ['base', 'mguf', 'peak', 'harbour', 'hell'];

  function lockedSheet(g) {
    const us = unlockState(g), U = UNLOCK[g];
    const have = us.have.length ? us.have.map(h => HEROES[h].name).join(', ') : L('ninguno todavía', 'none yet');
    const miss = [];
    if (us.have.length < 2) miss.push(L(`${2 - us.have.length} héroe${us.have.length === 1 ? '' : 's'} más`, `${2 - us.have.length} more hero${us.have.length === 1 ? '' : 'es'}`));
    if (!us.fromPack) miss.push(L(`uno de ${GAMES[U.pack].name}`, `one from ${GAMES[U.pack].name}`));
    openSheet(`<h3>${ICON_LOCK} ${GAMES[g].name}</h3>
      <p class="lead">${us.req}</p>
      <p class="fine">${L('Héroes que ya cuentan', 'Heroes that already count')}: <b>${have}</b>.${miss.length ? L(` Te falta: ${miss.join(' y ')}.`, ` Missing: ${miss.join(' and ')}.`) : ''}${U.own ? L(` Solo cuentan las victorias en las que todos tus objetos eran de ${GAMES[U.from].name}.`, ` Only wins where all your items were from ${GAMES[U.from].name} count.`) : ''}</p>
      <button type="button" class="btn primary" id="lkOk">${L('Entendido', 'Got it')}</button>`, [['#lkOk', closeSheet]], true);
  }

  function adventureScreen() {
    const slots = loadSlots();
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ ${L('Atrás', 'Back')}</button>
      <h2 class="screen-h">${L('Elige la aventura', 'Choose your adventure')}</h2>
      <div class="adv-list">${ADV_ORDER.map(k => `<button type="button" class="adv-card" data-game="${k}">
        <img src="${ADV_INFO[k].img}" alt="${ADV_INFO[k].alt}" width="440" height="614" loading="eager" decoding="async">
        <span class="adv-tag">${ADV_INFO[k].tag}</span>${slots.some(s => s.game === k) ? `<span class="adv-tag run">${L('En curso', 'In progress')}</span>` : ''}${unlockState(k).ok ? '' : `<span class="adv-lock">${ICON_LOCK}</span>`}<b>${GAMES[k].name}</b><p>${unlockState(k).ok ? ADV_INFO[k].txt : '<em class="req">' + L('Bloqueada. ', 'Locked. ') + unlockState(k).req + '</em>'}</p></button>`).join('')}</div>
      <p class="fine">${L('Portadas © Little Rocket Games. One Card Dungeon es de Barny Skinner.', 'Covers © Little Rocket Games. One Card Dungeon is by Barny Skinner.')}</p></div>`,
      [['#back', menuScreen]]);
    sc.querySelectorAll('[data-game]').forEach(b => { const us = unlockState(b.dataset.game); if (!us.ok) b.classList.add('locked'); });
    sc.querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => {
      const us = unlockState(b.dataset.game);
      if (!us.ok) return lockedSheet(b.dataset.game);
      const x = slots.find(s => s.game === b.dataset.game);
      if (!x) return heroScreen(b.dataset.game, false);
      const lv = GAMES[x.game].levels[x.g.levelIdx];
      openSheet(`<h3>${GAMES[x.game].name}: ${L('partida en curso', 'game in progress')}</h3>
        <p class="lead">${L(`Tienes una partida aquí con ${HEROES[x.g.hero].name}, ${stageLabel(lv).toLowerCase()}. Si empiezas otra, esa se pierde.`, `You have a game here with the ${HEROES[x.g.hero].name}, ${stageLabel(lv).toLowerCase()}. If you start another, that one is lost.`)}</p>
        <button type="button" class="btn primary" id="axRes">${L('Retomar', 'Resume')}</button>
        <button type="button" class="btn" id="axNew">${L('Empezar de nuevo', 'Start over')}</button>
        <button type="button" class="btn" id="axNo">${L('Cancelar', 'Cancel')}</button>`,
        [['#axRes', () => { closeSheet(); resume(x.g); }], ['#axNew', () => { closeSheet(); heroScreen(x.game, false); }], ['#axNo', closeSheet]], true);
    }));
  }

  // Héroes de la caja original y de la aventura elegida; un botón añade los de las demás expansiones
  function heroScreen(game, more) {
    const own = ['base', game];
    const card = k => heroOpen(k) ? `<button type="button" class="hero-card" data-hero="${k}">
        <span class="ico">${HERO_ICONS[k]}</span><span><b>${HEROES[k].name}</b><p>${HEROES[k].txt}</p></span></button>`
      : `<button type="button" class="hero-card locked" disabled>
        <span class="ico">${ICON_LOCK}</span><span><b>${HEROES[k].name}</b><p>${L('Se desbloquea con', 'Unlocks with')} ${GAMES[HEROES[k].pack].name}.</p></span></button>`;
    const section = pk => { const hs = heroesOf(pk.key); return hs.length ? `<h3 class="pack-h">${pk.name}</h3><div class="hero-list">${hs.map(card).join('')}</div>` : ''; };
    const mine = PACKS.filter(pk => own.includes(pk.key)), others = PACKS.filter(pk => !own.includes(pk.key));
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ ${L('Atrás', 'Back')}</button>
      <h2 class="screen-h">${L('Elige a tu héroe', 'Choose your hero')}</h2>
      <p class="lead">${GAMES[game].name}: ${L(`héroes de la caja original${game === 'base' ? '' : ' y de esta expansión'}`, `heroes from the original box${game === 'base' ? '' : ' and this expansion'}`)}.</p>
      ${mine.map(section).join('')}
      ${more ? others.map(section).join('') : ''}
      <button type="button" class="btn ${more ? '' : 'primary'}" id="moreH">${more ? L('Ocultar héroes de otras expansiones', 'Hide heroes from other expansions') : L('Héroes de otras expansiones', 'Heroes from other expansions')}</button></div>`,
      [['#back', adventureScreen], ['#moreH', () => heroScreen(game, !more)]]);
    sc.querySelectorAll('[data-hero]').forEach(b => b.addEventListener('click', () => itemsScreen(game, b.dataset.hero, null, more)));
    if (more) { const h = sc.querySelector('#moreH'); if (h) h.scrollIntoView({ block: 'start' }); }
  }

  function drawItems(game) {
    const a = openPool(game);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, 3);
  }

  // Peak y Harbour Clash siempre usan tres objetos; en las demás aventuras es opcional (se puede empezar sin ellos)
  function itemsScreen(game, hero, pick, more) {
    const must = game === 'peak' || game === 'harbour' || game === 'hell';
    pick = pick || (must ? drawItems(game) : []);
    const pool = openPool(game);
    // primero los de la expansión en juego y luego, con su título, los de cada expansión en orden
    const PACKS = [['Montaña Eterna', 'peak'], ['Harbour Clash', 'harbour'], ['Puerta del Infierno', 'hell']];
    const order = PACKS.slice().sort((a, b) => (b[1] === game) - (a[1] === game));
    const card = k => `<button type="button" class="hero-card item-card ${pick.includes(k) ? 'chosen' : ''}" data-it="${k}" aria-pressed="${pick.includes(k)}">
        <span class="ico">${ITEM_ICONS[k]}</span><span><b>${ITEMS[k].name}</b><p>${ITEMS[k].txt}</p></span><i class="tick" aria-hidden="true"></i></button>`;
    const list = () => order.map(([pk, g]) => {
      const ks = pool.filter(k => ITEM_PACK[k] === pk); if (!ks.length) return '';
      return `<h3 class="pack-h">${GAME_TITLE[g]}${g === game ? `<small>${L('esta aventura', 'this adventure')}</small>` : ''}</h3>` + ks.map(card).join('');
    }).join('');
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ ${L('Atrás', 'Back')}</button>
      <h2 class="screen-h">${must ? L('Tus tres objetos', 'Your three items') : L('Objetos (opcional)', 'Items (optional)')}</h2>
      <p class="lead">${must ? L(`Se han sorteado tres. Puedes quedártelos o elegir los que prefieras para ${HEROES[hero].name}.`, `Three have been drawn. Keep them or pick the ones you prefer for the ${HEROES[hero].name}.`) : L('Puedes jugar sin objetos o con tres, al azar o a tu elección.', 'You can play without items or with three, at random or of your choice.')} ${L('Cada objeto se usa una sola vez.', 'Each item can be used only once.')}</p>
      <div class="hero-list" id="itList">${list()}</div>
      <p class="err" id="itMsg" role="status"></p>
      <div class="actions"><button type="button" class="btn mini" id="itRoll">${L('Sortear tres', 'Draw three')}</button>${must ? '' : `<button type="button" class="btn mini" id="itNone">${L('Ninguno', 'None')}</button>`}</div>
      <button type="button" class="btn primary" id="itGo">${L('Empezar', 'Start')}</button></div>`,
      [['#back', () => heroScreen(game, !!more)],
       ['#itGo', () => { if (pick.length === 3 || (!must && !pick.length)) startGame(hero, game, pick); }]]);
    const go = sc.querySelector('#itGo'), msg = sc.querySelector('#itMsg');
    const refresh = () => { go.disabled = !(pick.length === 3 || (!must && !pick.length)); go.textContent = !pick.length && !must ? L('Empezar sin objetos', 'Start without items') : L('Empezar', 'Start'); };
    sc.querySelector('#itList').addEventListener('click', e => {
      const b = e.target.closest('[data-it]'); if (!b) return;
      const k = b.dataset.it;
      if (pick.includes(k)) pick = pick.filter(x => x !== k);
      else if (pick.length < 3) pick = pick.concat(k);
      else { msg.textContent = L('Ya tienes tres: quita uno antes de elegir otro.', 'You already have three: remove one before picking another.'); return; }
      msg.textContent = '';
      b.classList.toggle('chosen', pick.includes(k)); b.setAttribute('aria-pressed', pick.includes(k));
      refresh();
    });
    // Sortear / Ninguno actualizan la lista en el sitio: la página no vuelve arriba
    const setPick = np => { pick = np; sc.querySelector('#itList').innerHTML = list(); msg.textContent = ''; refresh(); };
    sc.querySelector('#itRoll').addEventListener('click', () => setPick(drawItems(game)));
    const none = sc.querySelector('#itNone'); if (none) none.addEventListener('click', () => setPick([]));
    refresh();
  }

  const START_MSG = {
    base: L('Vence a todos los monstruos de cada nivel.', 'Defeat every monster on each level.'),
    mguf: L("M'Guf-yn Returns: abre cofres para ganar puntos extra y derrota a los comandantes.", "M'Guf-yn Returns: open chests for extra points and defeat the commanders."),
    peak: L('Montaña Eterna: las casillas de ventisca restan 1 a tu Atq y Def.', 'Eternal Peak: blizzard tiles take 1 off your Atk and Def.'),
    harbour: L('Harbour Clash: los monstruos en agua se vuelven más fuertes.', 'Harbour Clash: monsters in water get stronger.'),
    hell: L('La Puerta del Infierno: si pisas una casilla maldita, los monstruos se fortalecen. La Piedra de la Perdición se rompe a costa de tu Vida.', "Hell's Door: if you step on a cursed tile, the monsters get stronger. Breaking the Stone of Doom costs you Health.")
  };
  function startGame(hero, game, items) {
    G = E.newRun(hero, game, items); G.totalTurns = 0; G.runId = newRunId(); G.trackAbil = true; G.abilEver = false; G.startItems = (items || []).slice(); lastHp = START_HP; builtLevel = -1;
    hideScreen(); render();
    say(`<b>${HEROES[hero].name}.</b> ${START_MSG[game]} ${L('Tira los dados para empezar.', 'Roll the dice to begin.')}`);
  }

  function resume(g) {
    G = g; useGame(G.game || 'base');
    if (G.totalTurns == null) G.totalTurns = 0;
    if (G.phase === 'monsters') G.phase = 'move';
    lastHp = G.adv.hp; builtLevel = -1;
    hideScreen(); render();
    if (G.phase === 'clear') nextStep();
    else say(G.levelIdx === 0 && G.turnNo === 1 && !G.turn.dice ? L(`Una carta, ${LEVELS.length} etapas. Tira los dados para empezar.`, `One card, ${LEVELS.length} stages. Roll the dice to begin.`) : `${stageLabel(LEVELS[G.levelIdx])}: ${LEVELS[G.levelIdx].title}.`);
  }

  function goMenu() { if (busy) return; closeSheet(); menuScreen(); Users.sync(); }

  function retry() {
    const t = G.totalTurns, stt = G.stats, rid = G.runId, tr = G.trackAbil, ae = G.abilEver, si = G.startItems;
    G = E.retryLevel(G); G.totalTurns = t; G.stats = stt; G.runId = rid; G.trackAbil = tr; G.abilEver = ae; G.startItems = si; stat('deaths'); lastHp = G.adv.hp; builtLevel = -1;
    closeSheet(); hideScreen(); render();
    say(L(`Reintentas ${stageLabel(LEVELS[G.levelIdx]).toLowerCase()}: ${LEVELS[G.levelIdx].title}. Tira los dados.`, `You retry ${stageLabel(LEVELS[G.levelIdx]).toLowerCase()}: ${LEVELS[G.levelIdx].title}. Roll the dice.`));
  }



  function keepSheet() {
    const ks = ['spd', 'atk', 'def'].filter(k => G.prev && G.prev[k] != null);
    const veil = openSheet(`<h3>${L('Conservar un dado', 'Keep a die')}</h3>
      <p class="lead">${L('Habilidad del Paladín, una vez por nivel. Elige la habilidad cuyo dado del turno anterior quieres repetir; solo se tiran los otros dos.', "Paladin's ability, once per level. Choose the skill whose die from last turn you want to keep; only the other two are rolled.")}</p>
      <div class="choices">${ks.map(k => `<button type="button" class="choice" data-k="${k}"><b>${LONG[k]}</b><span>${L('dado', 'die')} <em>${G.prev[k]}</em></span></button>`).join('')}</div>
      <button type="button" class="btn" id="no">${L('Cancelar', 'Cancel')}</button>`, [['#no', closeSheet]], true);
    veil.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      closeSheet();
      E.rollWithKeep(G, k);
      animateRoll(L(`Conservas el dado de ${LONG[k]} (<b>${G.turn.dice[0]}</b>). Reparte los otros dos.`, `You keep the ${LONG[k]} die (<b>${G.turn.dice[0]}</b>). Assign the other two.`));
    }));
  }

  /* ---------- flujo ---------- */
  async function flipTo(fn) {
    const card = $('#card');
    Sfx.play('floor');
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
    Sfx.play('lvl');
    const msg = c === 'heal' ? L('Te curas hasta 6 de Vida.', 'You heal up to 6 Health.') : L(`${LONG[c]} sube a ${G.adv[c]}.`, `${LONG[c]} goes up to ${G.adv[c]}.`);
    noteBest();
    await flipTo(() => { E.nextLevel(G); builtLevel = -1; busy = false; render(); say(`<b>${msg}</b> ${stageLabel(LEVELS[G.levelIdx])}: ${LEVELS[G.levelIdx].title}. ${L('Partida guardada.', 'Game saved.')}`); });
  }

  async function animateRoll(msg) {
    rolling = true; Sfx.play('roll');
    render();
    const iv = setInterval(renderDice, 110);
    await sleep(700);
    clearInterval(iv);
    rolling = false; keepSet = new Set();
    render();
    say(msg);
  }

  const rollMsg = base => (G.turn.boosted ? L('<b>Clérigo:</b> ¡tres dados iguales! Cada uno sube 2. ', '<b>Cleric:</b> three matching dice! Each goes up by 2. ') : '') + base;
  async function doRoll() {
    if (rolling || G.phase !== 'energy' || G.turn.dice) return;
    E.rollTurn(G);
    await animateRoll(rollMsg(L('Reparte los dados entre Mov, Atq y Def.', 'Assign the dice to Mov, Atk and Def.')));
  }

  function onAbility() {
    const ab = E.abilityInfo(G);
    if (!ab || rolling || busy) return;
    if (ab.id === 'keep') keepSheet();
    else if (ab.id === 'reroll') { E.useReroll(G); animateRoll(rollMsg(L('Vuelves a tirar. Reparte los dados otra vez.', 'You reroll. Assign the dice again.'))); }
    else if (ab.id === 'sherpa') {
      E.toggleSherpa(G);
      render();
      say(G.sherpaOn ? L('Habilidad del Sherpa: tu próximo traslado <b>ignora los muros</b>, pero no puedes terminar sobre uno. Toca el destino.', "Sherpa's ability: your next move <b>ignores walls</b>, but you can't end on one. Tap the destination.") : L('Habilidad cancelada.', 'Ability cancelled.'));
    }
    else if (ab.id === 'knight') {
      E.toggleKnight(G);
      render();
      say(G.turn.knight ? L('Habilidad del Caballero: reparte los tres dados y pon <b>dos en la misma habilidad</b>.', "Knight's ability: assign the three dice and put <b>two on the same skill</b>.") : L('Habilidad cancelada: un dado por habilidad.', 'Ability cancelled: one die per skill.'));
    }
    else if (ab.id === 'rogue') {
      E.useRogue(G);
      render();
      say(L('Habilidad del Pícaro: <b>+1</b> a cada dado (máximo 6).', "Rogue's ability: <b>+1</b> to each die (maximum 6)."));
    }
    else if (ab.id === 'corsair') {
      E.toggleCorsair(G);
      render();
      say(G.corsairOn ? L('Habilidad del Corsario: toca <b>cualquier casilla libre</b> para abordarla sin gastar Movimiento.', "Corsair's ability: tap <b>any empty tile</b> to board it without spending Move.") : L('Habilidad cancelada.', 'Ability cancelled.'));
    }
    else if (ab.id === 'necro') {
      mode = mode === 'necro' ? null : 'necro';
      render();
      say(mode ? L('Nigromante: toca el monstruo que quieres dañar. Perderás 1 de Vida.', "Necromancer: tap the monster you want to damage. You'll lose 1 Health.") : L('Habilidad cancelada.', 'Ability cancelled.'));
    }
    else if (ab.id === 'demon') {
      mode = mode ? null : 'demonPick';
      render();
      say(mode ? L('Cazador de demonios: toca el monstruo que quieres mover.', 'Demon Hunter: tap the monster you want to move.') : L('Habilidad cancelada.', 'Ability cancelled.'));
    }
    else if (ab.id === 'ranger') {
      E.toggleRanger(G);
      render();
      say(G.turn.ranger ? L('Habilidad del Ranger: un dado irá a <b>Alc</b> en lugar de Mov.', "Ranger's ability: one die goes to <b>Rng</b> instead of Mov.") : L('Habilidad cancelada: vuelve a repartir a Mov, Atq y Def.', 'Ability cancelled: assign to Mov, Atk and Def again.'));
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
    if (t.sel >= 0) {
      if (t.knight && t.assign[k] >= 0) t.assign2[k] = t.sel; else t.assign[k] = t.sel;
      t.sel = -1;
    }
    else if (t.assign2 && t.assign2[k] >= 0) t.assign2[k] = -1;
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
    say(nothingLeft() ? L('No puedes hacer nada útil: termina el turno.', "There's nothing useful left to do: end your turn.") : L('Muévete o ataca. Cuando termines, Fin de turno.', "Move or attack. When you're done, End turn."));
  }

  const hitFx = m => { const el = tok.mons.get(m.id); if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 500); } };
  const whyMsg = (info, need, have, what) => info.why === 'range' ? L(`${what} está a distancia <b>${info.rd}</b> y tu Alcance es <b>${G.turn.rng || G.adv.rng}</b>. Acércate o mejora Alcance.`, `${what} is at distance <b>${info.rd}</b> and your Range is <b>${G.turn.rng || G.adv.rng}</b>. Get closer or improve Range.`)
    : info.why === 'los' ? L('Sin línea de visión: un muro, el cofre u otro monstruo lo tapa.', 'No line of sight: a wall, the chest or another monster blocks it.')
    : L(`Te faltan puntos: cada golpe cuesta <b>${need}</b> de Atq y te quedan <b>${have}</b>.`, `Not enough points: each hit costs <b>${need}</b> Atk and you have <b>${have}</b> left.`);

  async function onTile(i) {
    if (G.phase !== 'move' || busy) return;
    const lv = LEVELS[G.levelIdx];
    const m = G.mons.find(o => idx(o.x, o.y) === i);
    // Corona de laurel: elegir al monstruo
    if (mode === 'laurelPick') {
      if (!m) { say(L('Toca a un monstruo.', 'Tap a monster.')); return; }
      if (!E.useItem(G, 'laurel')) { mode = null; render(); return; }
      E.laurelStart(G, m); mode = null; render();
      say(L(`<b>Corona de laurel.</b> El monstruo tiene <b>${G.laurel.spdLeft}</b> de Mov y <b>${G.laurel.atkLeft}</b> de Atq. Toca una casilla marcada para moverlo o a otro monstruo para atacarlo.`, `<b>Laurel Crown.</b> The monster has <b>${G.laurel.spdLeft}</b> Mov and <b>${G.laurel.atkLeft}</b> Atk. Tap a marked tile to move it or another monster to attack it.`));
      return;
    }
    // Corona de laurel: orden en curso
    if (G.laurel) {
      const me = E.laurelMon(G);
      if (m && m !== me) {
        const info = E.laurelAttackInfo(G, m);
        if (!info.ok) {
          say(info.why === 'range' ? L(`Ese monstruo está a distancia <b>${info.rd}</b> y el que obedece alcanza <b>${E.mStat(G, me, 'rng')}</b>.`, `That monster is at distance <b>${info.rd}</b> and the obedient one reaches <b>${E.mStat(G, me, 'rng')}</b>.`)
            : info.why === 'los' ? L('Sin línea de visión: algo lo tapa.', 'No line of sight: something blocks it.')
            : L(`Le faltan puntos: golpear cuesta <b>${E.mStat(G, m, 'def')}</b> de Atq y le quedan <b>${G.laurel.atkLeft}</b>.`, `Not enough points: a hit costs <b>${E.mStat(G, m, 'def')}</b> Atk and it has <b>${G.laurel.atkLeft}</b> left.`));
          return;
        }
        const dead = E.laurelAttack(G, m);
        sfxStrike(dead);
        floatText(m.x, m.y, dead ? '✕' : '−1', 'good');
        hitFx(m); render();
        if (E.levelCleared(G)) { E.laurelEnd(G); levelClear(); return; }
        say(dead ? L('<b>¡Abatido por su propio compañero!</b>', '<b>Taken down by its own comrade!</b>') : L(`Golpe. Le quedan <b>${m.hp}</b> de Vida.`, `Hit. It has <b>${m.hp}</b> Health left.`));
        return;
      }
      if (m === me || lv.walls[i]) return;
      const path = E.laurelMove(G, i);
      if (!path) { say(L('Esa casilla no vale: está fuera de su Movimiento o no hay camino.', "That tile won't do: it's out of its Move or there's no path.")); return; }
      busy = true;
      const el = tok.mons.get(me.id); if (el) el.dataset.anim = '1';
      render();
      say(L('El monstruo obedece…', 'The monster obeys…'));
      if (el) await glide(el, path, G.laurel ? Math.max(1, E.mStat(G, me, 'spd')) : 1);
      busy = false; render();
      say(L(`Le quedan <b>${G.laurel.spdLeft}</b> de Mov y <b>${G.laurel.atkLeft}</b> de Atq.`, `It has <b>${G.laurel.spdLeft}</b> Mov and <b>${G.laurel.atkLeft}</b> Atk left.`));
      return;
    }
    // Habilidad del Nigromante
    if (mode === 'necro') {
      if (!m) { say(L('Toca a un monstruo.', 'Tap a monster.')); return; }
      const info = E.necroInfo(G, m);
      if (!info.ok) { say(whyMsg(info, 0, 0, L('Ese monstruo', 'That monster'))); return; }
      mode = null;
      const dead = E.necroStrike(G, m);
      sfxStrike(dead); sfxHurt();
      floatText(m.x, m.y, dead ? '✕' : '−1', 'good'); floatText(G.adv.x, G.adv.y, '−1', 'dmg');
      hitFx(m);
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(L(`<b>Sacrificio.</b> Pierdes 1 de Vida y ${dead ? 'el monstruo cae' : `le quedan <b>${m.hp}</b> de Vida`}.`, `<b>Sacrifice.</b> You lose 1 Health and ${dead ? 'the monster falls' : `it has <b>${m.hp}</b> Health left`}.`));
      return;
    }
    // Habilidad del Cazador de demonios
    if (mode === 'demonPick') {
      if (!m) { say(L('Toca a un monstruo.', 'Tap a monster.')); return; }
      mode = { demon: m }; render();
      say(L('Ahora toca la casilla marcada a la que lo mueves (hasta 3 de Mov).', 'Now tap the marked tile to move it to (up to 3 Mov).'));
      return;
    }
    if (mode && mode.demon) {
      const mm = mode.demon;
      if (m && m !== mm) { mode = { demon: m }; render(); say(L('Elige a qué casilla mueves a ese otro monstruo.', 'Choose which tile to move that other monster to.')); return; }
      const path = E.demonMove(G, mm, i);
      if (!path) { say(L('Esa casilla no vale: debe estar libre y a 3 de Mov como máximo del monstruo.', "That tile won't do: it must be empty and at most 3 Mov from the monster.")); return; }
      mode = null; busy = true;
      const el = tok.mons.get(mm.id); if (el) el.dataset.anim = '1';
      render();
      say(L('Mueves al monstruo…', 'You move the monster…'));
      if (el) await glide(el, path, 3);
      busy = false;
      render();
      say(L('<b>Cazador de demonios.</b> El monstruo cambia de sitio.', '<b>Demon Hunter.</b> The monster changes place.'));
      return;
    }
    if (G.chest && !G.chest.open && i === G.chest.at) {
      const info = E.chestInfo(G);
      if (!info.ok) { say(whyMsg(info, G.chest.val, E.atkAvail(G), L('El cofre', 'The chest'))); return; }
      const val = G.chest.val;
      E.openChest(G);
      stat('chests'); Sfx.play('chest');
      floatText(...XY(i), '+' + val, 'good');
      render();
      say(L(`<b>Cofre abierto.</b> Ganas <b>${val}</b> punto${val > 1 ? 's' : ''} de botín para sumar a una habilidad en tus próximas fases de Energía.`, `<b>Chest opened.</b> You get <b>${val}</b> loot point${val > 1 ? 's' : ''} to add to a skill in your next Energy phases.`));
      return;
    }
    if (G.stone && !G.stone.broken && i === G.stone.at) {
      const info = E.stoneInfo(G);
      if (!info.ok) { say(whyMsg(info, G.stone.val, E.atkAvail(G), L('La piedra', 'The stone'))); return; }
      const val = G.stone.val, dmgM = G.fist ? 2 : 1;
      const before = G.mons.map(o => [o.x, o.y]);
      const alive = E.breakStone(G);
      if (G.mons.length < before.length) sfxKill(before.length - G.mons.length); else Sfx.play('atk');
      if (alive) sfxHurt(); else stat('dmgIn');
      for (const [x, y] of before) floatText(x, y, '−' + dmgM, 'good');
      floatText(G.adv.x, G.adv.y, '−1', 'dmg');
      tok.adv.classList.add('hurt'); setTimeout(() => tok.adv.classList.remove('hurt'), 500);
      const rev = G.revived; G.revived = false;
      if (!alive) { G.phase = 'dead'; render(); deathSheet(); return; }
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(L(`<b>La Piedra de la Perdición se rompe</b> (−${val} Atq). Todos los monstruos reciben ${dmgM} de daño y tú 1.${rev ? ' <b>Colgante de alma:</b> vuelves con 1 de Vida.' : ''}`, `<b>The Stone of Doom breaks</b> (−${val} Atk). All monsters take ${dmgM} damage and you take 1.${rev ? ' <b>Soul Pendant:</b> you come back with 1 Health.' : ''}`));
      return;
    }
    if (lv.walls[i]) return;
    if (m) {
      const info = E.attackInfo(G, m);
      if (!info.ok) { say(whyMsg(info, E.mStat(G, m, 'def'), E.atkAvail(G), L('Ese monstruo', 'That monster'))); return; }
      const dead = E.attackMon(G, m);
      sfxStrike(dead);
      floatText(m.x, m.y, dead ? '✕' : '−1', 'good');
      hitFx(m);
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(dead ? L(`<b>${lv.mon.name} abatido.</b>`, `<b>${lv.mon.name} down.</b>`) : L(`Golpe. Le quedan <b>${m.hp}</b> de Vida.`, `Hit. It has <b>${m.hp}</b> Health left.`));
      return;
    }
    if (i === idx(G.adv.x, G.adv.y)) return;
    const R = E.reachFromAdv(G);
    if (R.dist[i] > 0 && (R.free || R.dist[i] <= G.turn.spdLeft) && R.dist[i] < Infinity) {
      const path = [];
      for (let c = i; c !== -1; c = R.prev[c]) path.push(c);
      path.reverse();
      const boarding = !!R.free;
      E.moveAdv(G, i, R.dist[i]);
      busy = true;
      tok.adv.dataset.anim = '1';
      render();
      say(boarding ? L('¡Al abordaje!', 'Board!') : L('Te mueves…', 'You move…'));
      await glide(tok.adv, path, boarding ? 14 : G.turn.spd);
      busy = false;
      render();
      say(`${boarding ? 'Abordaje.' : 'Te mueves.'}${E.blizzPen(G) ? ' <b>Ventisca:</b> −1 a tu Atq y Def mientras estés aquí.' : ''}`);
    } else if (R.dist[i] < Infinity) say(L(`Llegar ahí cuesta <b>${R.dist[i]}</b> de Mov y te quedan <b>${G.turn.spdLeft}</b>.`, `Getting there costs <b>${R.dist[i]}</b> Mov and you have <b>${G.turn.spdLeft}</b> left.`));
    else say(L('No hay camino hasta esa casilla.', "There's no path to that tile."));
  }

  /* ---------- objetos ---------- */
  function itemSheet(id) {
    if (busy || rolling || !G || G.phase === 'monsters') return;
    const it = ITEMS[id], ok = E.itemUsable(G, id);
    const why = id === 'herbs' ? L('Se te ofrecerá sola cuando un ataque te haga daño.', "It'll be offered automatically when an attack would hurt you.")
      : id === 'cloak' ? L('Úsala en la fase de Energía o de movimiento, en un nivel con ventiscas.', 'Use it in the Energy or movement phase, on a level with blizzards.')
      : id === 'sands' ? L('Úsala en la fase de Energía o de movimiento, en un nivel con agua.', 'Use it in the Energy or movement phase, on a level with water.')
      : id === 'holy' ? L('Úsala en la fase de Energía o de movimiento, en un nivel con casillas malditas.', 'Use it in the Energy or movement phase, on a level with cursed tiles.')
      : id === 'fist' ? L('Úsala en tu fase de movimiento, antes de romper la Piedra de la Perdición.', 'Use it in your movement phase, before breaking the Stone of Doom.')
      : id === 'laurel' ? L('Solo en tu fase de movimiento y ataque, con monstruos en el mapa. Al terminar la orden acaba tu turno.', 'Only in your move and attack phase, with monsters on the map. Your turn ends when the order ends.')
      : id === 'pendant' ? L('Se usa sola cuando tu Vida llegaría a 0.', 'It triggers by itself when your Health would reach 0.')
      : id === 'mail' ? L('Se te ofrecerá sola cuando un ataque te haga daño.', "It'll be offered automatically when an attack would hurt you.")
      : id === 'gorgon' ? L('Úsala en la fase de Energía o de movimiento; ese turno los monstruos no se mueven.', "Use it in the Energy or movement phase; that turn monsters don't move.")
      : id === 'flame' || id === 'eye' ? L('Solo en la fase de Energía, con los dados ya tirados.', 'Only in the Energy phase, with the dice already rolled.')
      : id === 'hourglass' ? L('Solo en tu fase de movimiento y ataque, antes de que actúen los monstruos.', 'Only in your move and attack phase, before the monsters act.')
      : L('Solo en tu fase de movimiento y ataque, después de confirmar la Energía.', 'Only in your move and attack phase, after confirming Energy.');
    openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS[id]}</span><h3>${it.name}</h3></div>
      <p class="lead">${it.txt}</p>
      ${ok ? '' : `<p class="fine">${why}</p>`}
      <button type="button" class="btn primary" id="iUse" ${ok ? '' : 'disabled'}>${L('Usar', 'Use')}</button>
      <button type="button" class="btn" id="iNo">${L('Cerrar', 'Close')}</button>`,
      [['#iNo', closeSheet], ['#iUse', () => useItemUI(id)]], true);
  }

  function useItemUI(id) {
    closeSheet();
    if (id === 'flame') { flameSheet(); return; }
    if (id === 'eye') { eyeSheet(); return; }
    if (id === 'laurel') {
      if (!E.itemUsable(G, 'laurel')) return;
      mode = 'laurelPick'; render();
      say(L('<b>Corona de laurel.</b> Toca el monstruo al que das la orden. Se moverá y atacará a otros monstruos con sus propias cifras.', '<b>Laurel Crown.</b> Tap the monster you give the order to. It will move and attack other monsters with its own stats.'));
      return;
    }
    if (!E.useItem(G, id)) return;
    render();
    const t = G.turn;
    if (id === 'cloak') say(L('<b>Capa de cuero.</b> Ignoras las ventiscas hasta el final del nivel.', '<b>Leather Cloak.</b> You ignore blizzards until the end of the level.'));
    else if (id === 'axe') say(L(`<b>Cuerda y piolet.</b> Este turno: Atq <b>${t.atk}</b> (te quedan <b>${E.atkAvail(G)}</b>) y Alcance <b>${t.rng}</b>.`, `<b>Rope and Ice Axe.</b> This turn: Atk <b>${t.atk}</b> (<b>${E.atkAvail(G)}</b> left) and Range <b>${t.rng}</b>.`));
    else if (id === 'wyrm') say(L(`<b>Extracto de Wyrm.</b> Mov +4: te quedan <b>${t.spdLeft}</b>.`, `<b>Wyrm Extract.</b> Mov +4: you have <b>${t.spdLeft}</b> left.`));
    else if (id === 'powder') say(L('<b>Pólvora negra.</b> Tu próximo golpe daña también a todos los demás monstruos.', '<b>Black Powder.</b> Your next hit also damages every other monster.'));
    else if (id === 'sands') say(L('<b>Arenas ocultas.</b> Los monstruos ignoran el agua hasta el final del nivel.', '<b>Hidden Sands.</b> Monsters ignore water until the end of the level.'));
    else if (id === 'gorgon') say(L('<b>Cabeza de Gorgona.</b> Este turno los monstruos no se moverán.', "<b>Gorgon's Head.</b> The monsters won't move this turn."));
    else if (id === 'holy') say(L('<b>Agua bendita.</b> Los monstruos ignoran las casillas malditas hasta el final del nivel.', '<b>Holy Water.</b> Monsters ignore cursed tiles until the end of the level.'));
    else if (id === 'fist') say(L('<b>Puño de hierro.</b> Al romper la Piedra, los monstruos recibirán 2 de daño.', '<b>Iron Fist.</b> When you break the Stone, the monsters will take 2 damage.'));
    else if (id === 'hourglass') say(L('<b>Reloj de arena.</b> Los monstruos no actúan: nueva fase de Energía. Tira los dados.', "<b>Hourglass.</b> The monsters don't act: new Energy phase. Roll the dice."));
  }

  function eyeSheet() {
    const t = G.turn;
    openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.eye}</span><h3>${ITEMS.eye.name}</h3></div>
      <p class="lead">${L('Elige el dado que se convertirá en un D12. Se tira de nuevo y lo asignas como un dado normal.', "Choose the die that becomes a D12. It's rolled again and you assign it like a normal die.")}</p>
      <div class="dice-row pick">${[0, 1, 2].map(i => t.lock === i ? dieHTML(t.dice[i], 'locked', (t.d12 || [])[i])
        : dieHTML(t.dice[i], '', (t.d12 || [])[i]).replace('<span class="die', `<button type="button" data-e="${i}" class="die`).replace('</span>', '</button>')).join('')}</div>
      <button type="button" class="btn" id="eNo">${L('Cancelar', 'Cancel')}</button>`, [['#eNo', closeSheet]], true);
    document.querySelectorAll('#veil [data-e]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.e;
      closeSheet();
      keepSet = new Set([0, 1, 2].filter(x => x !== i));
      if (!E.useEye(G, i)) { keepSet = new Set(); return; }
      animateRoll(L(`<b>Ojo de dragón.</b> Sacas un <b>${G.turn.dice[i]}</b> con el D12. Reparte o revisa tu reparto.`, `<b>Dragon's Eye.</b> You roll a <b>${G.turn.dice[i]}</b> on the D12. Assign or review your dice.`));
    }));
  }

  // Botín del cofre: se pueden gastar todos los puntos o solo una parte (el resto queda para otro turno), siempre en una única habilidad por turno.
  // Por defecto se gastan todos, así que lo habitual es un solo toque en la habilidad.
  function lootSheet(n0) {
    const t = G.turn, n = Math.max(1, Math.min(n0 || (t.loot && t.loot.n) || G.loot, G.loot));
    const pl = x => L(`punto${x > 1 ? 's' : ''}`, `point${x > 1 ? 's' : ''}`);
    openSheet(`<div class="item-head"><span class="ico">${ICON_CHEST}</span><h3>${L('Botín del cofre', 'Chest loot')}</h3></div>
      <p class="lead">${L(`Tienes <b>${G.loot}</b> ${pl(G.loot)}. Toca la habilidad a la que quieres sumarlos${G.loot > 1 ? '. Este turno solo puedes usar una habilidad; los puntos que no gastes quedan para otro turno' : ''}.`, `You have <b>${G.loot}</b> ${pl(G.loot)}. Tap the skill you want to add them to${G.loot > 1 ? ". This turn you can only use one skill; points you don't spend are kept for another turn" : ''}.`)}</p>
      ${G.loot > 1 ? `<div class="stepper"><button type="button" class="btn mini" id="lMinus" ${n <= 1 ? 'disabled' : ''}>−</button><b>${n}</b><span class="stl">${pl(n)} ${L('a gastar', 'to spend')}</span><button type="button" class="btn mini" id="lPlus" ${n >= G.loot ? 'disabled' : ''}>+</button></div>` : ''}
      <div class="choices">${['spd', 'atk', 'def', 'rng'].map(x => `<button type="button" class="choice ${t.loot && t.loot.k === x ? 'chosen' : ''}" data-lk="${x}"><b>${LONG[x]}</b><span>${L('suma', 'adds')} ${n}</span></button>`).join('')}</div>
      ${t.loot && t.loot.k ? `<button type="button" class="btn" id="lClear">${L('Quitar botín', 'Remove loot')}</button>` : `<button type="button" class="btn" id="lNo">${L('Cancelar', 'Cancel')}</button>`}`,
      [['#lMinus', () => lootSheet(n - 1)], ['#lPlus', () => lootSheet(n + 1)], ['#lNo', closeSheet],
       ['#lClear', () => { E.setLoot(G, null, 0); closeSheet(); render(); }]], true);
    document.querySelectorAll('#veil [data-lk]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.lk; E.setLoot(G, k, n); closeSheet(); render(); say(L(`Botín: <b>+${n}</b> a ${LONG[k]}.`, `Loot: <b>+${n}</b> to ${LONG[k]}.`));
    }));
  }

  function flameSheet() {
    const t = G.turn, picks = new Set();
    const open = () => {
      const die = i => t.lock === i
        ? dieHTML(t.dice[i], 'locked', (t.d12 || [])[i])
        : dieHTML(t.dice[i], picks.has(i) ? 'sel' : '', (t.d12 || [])[i]).replace('<span class="die', `<button type="button" data-p="${i}" class="die`).replace('</span>', '</button>');
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.flame}</span><h3>${ITEMS.flame.name}</h3></div>
        <p class="lead">${L('Toca los dados que quieres volver a tirar. Te quedas con la segunda tirada.', 'Tap the dice you want to reroll. You keep the second roll.')}</p>
        <div class="dice-row pick">${[0, 1, 2].map(die).join('')}</div>
        <button type="button" class="btn primary" id="fGo" ${picks.size ? '' : 'disabled'}>${L('Volver a tirar', 'Reroll')}${picks.size ? ' (' + picks.size + ')' : ''}</button>
        <button type="button" class="btn" id="fNo">${L('Cancelar', 'Cancel')}</button>`,
        [['#fNo', closeSheet], ['#fGo', () => {
          const list = [...picks];
          closeSheet();
          keepSet = new Set([0, 1, 2].filter(i => !list.includes(i)));
          if (!E.useFlame(G, list)) { keepSet = new Set(); return; }
          animateRoll(L('<b>Llama del destino.</b> Dados nuevos: reparte o revisa tu reparto.', '<b>Flame of Fate.</b> New dice: assign or review your dice.'));
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
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.herbs}</span><h3>${ITEMS.herbs.name}</h3></div>
        <p class="lead">${L(`Te van a hacer <b>${dmg}</b> de daño. Con las hierbas solo recibirías <b>${Math.ceil(dmg / 2)}</b>. Se gastan al usarlas.`, `You're about to take <b>${dmg}</b> damage. With the herbs you'd only take <b>${Math.ceil(dmg / 2)}</b>. They're used up.`)}</p>
        <button type="button" class="btn primary" id="hUse">${L('Usar hierbas', 'Use herbs')} (−${Math.ceil(dmg / 2)})</button>
        <button type="button" class="btn" id="hNo">${L('Recibir', 'Take')} ${dmg}</button>`,
        [['#hUse', () => { closeSheet(); res(true); }], ['#hNo', () => { closeSheet(); res(false); }]], false);
    });
  }

  function askMail(e) {
    return new Promise(res => {
      const w = Math.floor(e.total / (e.def + 3));
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.mail}</span><h3>${ITEMS.mail.name}</h3></div>
        <p class="lead">${L(`Te van a hacer <b>${e.dmg}</b> de daño. Con la cota tu Defensa sube de <b>${e.def}</b> a <b>${e.def + 3}</b> y recibirías <b>${w}</b>. Se gasta al usarla.`, `You're about to take <b>${e.dmg}</b> damage. With the mail your Defence goes from <b>${e.def}</b> to <b>${e.def + 3}</b> and you'd take <b>${w}</b>. It's used up.`)}</p>
        <button type="button" class="btn primary" id="mUse">${L('Usar la cota', 'Use the mail')} (${w})</button>
        <button type="button" class="btn" id="mNo">${L('Recibir', 'Take')} ${e.dmg}</button>`,
        [['#mUse', () => { closeSheet(); res(true); }], ['#mNo', () => { closeSheet(); res(false); }]], false);
    });
  }

  async function levelClear() {
    busy = true; mode = null;
    G.phase = 'clear';
    noteBest();
    render();
    say(`<b>${LEVELS[G.levelIdx].boss ? L('Jefe derrotado.', 'Boss defeated.') : L('Nivel superado.', 'Level cleared.')}</b>`);
    await sleep(650);
    busy = false;
    nextStep();
  }

  function nextStep() {
    const nx = E.afterClear(G);
    if (nx === 'won') { G.phase = 'won'; render(); winSheet(); }
    else if (nx === 'boss') bossSheet();
    else breakSheet();
  }

  function bossSheet() {
    const nxt = LEVELS[G.levelIdx + 1], m = nxt.mon;
    openSheet(`<div class="item-head"><span class="ico boss">${ICONS[m.key]}</span><h3>${m.name}</h3></div>
      <p class="lead">${L(`Antes de seguir, te espera ${G.game === 'hell' ? 'un jefe del Infierno' : "un comandante de M'Guf-yn"}. Este mapa es una prolongación del nivel: <b>no puedes mejorar ni curarte</b> antes del combate.${G.loot > 0 ? ` Conservas <b>${G.loot}</b> punto${G.loot > 1 ? 's' : ''} del cofre.` : ''}`, `Before going on, ${G.game === 'hell' ? 'a boss of Hell' : "a commander of M'Guf-yn"} awaits. This map is an extension of the level: <b>you can't upgrade or heal</b> before the fight.${G.loot > 0 ? ` You keep <b>${G.loot}</b> chest point${G.loot > 1 ? 's' : ''}.` : ''}`)}</p>
      <div class="stats boss-stats"><div><b>${m.hp}</b><span>${L('Vida', 'Health')}</span></div><div><b>${m.spd}</b><span>${L('Vel', 'Spd')}</span></div><div><b>${m.atk}</b><span>${NAMES.atk}</span></div><div><b>${m.def}</b><span>Def</span></div><div><b>${m.rng}</b><span>${NAMES.rng}</span></div></div>
      <button type="button" class="btn primary" id="bGo">${L('Enfrentarlo', 'Face it')}</button>`, [['#bGo', goBoss]], false);
  }

  async function goBoss() {
    closeSheet();
    busy = true;
    await flipTo(() => { E.nextLevel(G); builtLevel = -1; busy = false; render(); say(L(`<b>${LEVELS[G.levelIdx].mon.name}.</b> Es un jefe: lo representa un dado de 12 caras.`, `<b>${LEVELS[G.levelIdx].mon.name}.</b> It's a boss: it's shown with a 12-sided die.`)); });
  }

  function undo() {
    if (G.phase !== 'move' || busy || !G.undo.length) return;
    E.popUndo(G);
    render();
    say(L('Acción deshecha.', 'Action undone.'));
  }

  async function endTurn() {
    if (G.phase !== 'move' || busy) return;
    busy = true;
    G.phase = 'monsters';
    render();
    renderTiles();
    say(L('Los monstruos se mueven…', 'The monsters move…'));
    await sleep(250);
    const ev = E.playMonsters(G);
    for (const e of ev) {
      if (e.t === 'move') {
        const el = tok.mons.get(e.id);
        if (el) await glide(el, e.path, LEVELS[G.levelIdx].mon.spd);
      } else if (e.t === 'attack') {
        if (e.ids.length) {
          const willBlock = !e.pending && e.dmg === 0;   // se sabe ya que no hará daño: suena el ataque antes del bloqueo
          if (willBlock) Sfx.play('atk');
          for (const id of e.ids) { const el = tok.mons.get(id); if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 500); } }
          await sleep(350);
          let dmg = e.dmg, usedMail = false, usedHerbs = false;
          if (e.pending) {
            if (e.offers.mail) usedMail = await askMail(e);
            const d1 = Math.floor(e.total / (e.def + (usedMail ? 3 : 0)));
            if (d1 > 1 && G.items.includes('herbs')) usedHerbs = await askHerbs(d1);
            dmg = E.resolveAttack(G, usedMail, usedHerbs);
          }
          if (dmg > 0) {
            sfxHurt(dmg);
            floatText(G.adv.x, G.adv.y, '−' + dmg, 'dmg');
            tok.adv.classList.add('hurt'); setTimeout(() => tok.adv.classList.remove('hurt'), 500);
          } else {
            if (!willBlock) { Sfx.play('atk'); await sleep(350); }   // el daño se anuló tras usar cota/hierbas: primero el ataque
            stat('blocks'); Sfx.play('blk');
            floatText(G.adv.x, G.adv.y, 'BLOCK', 'dmg block');
            tok.adv.classList.add('blocked'); setTimeout(() => tok.adv.classList.remove('blocked'), 600);
          }
          renderHP();
          say(L(`Atacan <b>${e.ids.length}</b>: Ataque total <b>${e.total}</b> ÷ Defensa <b>${e.def}</b> = <b>${e.dmg}</b> de daño.${e.dmg ? (dmg < e.dmg ? `${usedMail ? ' Con la cota' : ''}${usedHerbs ? (usedMail ? ' y las hierbas' : ' Con las hierbas') : ''} recibes <b>${dmg}</b>.` : '') : ' <b>¡Bloqueado!</b>'}`, `<b>${e.ids.length}</b> attack: total Attack <b>${e.total}</b> ÷ Defence <b>${e.def}</b> = <b>${e.dmg}</b> damage.${e.dmg ? (dmg < e.dmg ? `${usedMail ? ' With the mail' : ''}${usedHerbs ? (usedMail ? ' and the herbs' : ' With the herbs') : ''} you take <b>${dmg}</b>.` : '') : ' <b>Blocked!</b>'}`));
          await sleep(650);
        } else say(L('Ningún monstruo te alcanza este turno.', 'No monster reaches you this turn.'));
      }
    }
    G.totalTurns++;
    E.endTurnCleanup(G);
    busy = false;
    if (G.phase === 'dead') { render(); deathSheet(); return; }
    render();
    if (G.revived) { G.revived = false; say(L('<b>Colgante de alma.</b> Caes, pero vuelves a la vida con 1 de Vida. Tira los dados.', '<b>Soul Pendant.</b> You fall, but come back to life with 1 Health. Roll the dice.')); }
    else if (!ev.some(e => e.t === 'attack' && e.ids.length)) say(L('Ningún monstruo te alcanza. Tira los dados.', 'No monster reaches you. Roll the dice.'));
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
      else if (b.id === 'btnLaurelNo') { mode = null; render(); say(L('Orden cancelada: conservas la Corona.', 'Order cancelled: you keep the Crown.')); }
      else if (b.id === 'btnLaurelEnd') { E.laurelEnd(G); render(); endTurn(); }
    });
    $('#items').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) itemSheet(b.dataset.item); });
    $('#loot').addEventListener('click', e => { if (e.target.closest('#btnLoot') && G && G.phase === 'energy' && G.turn.dice && !rolling) lootSheet(); });
    $('#btnRules').addEventListener('click', rulesSheet);
    $('#btnPass').addEventListener('click', pauseSheet);
    $('#btnSnd').addEventListener('click', soundSheet); Sfx.paint();
    if (window.ResizeObserver) new ResizeObserver(() => { const w = $('#boxBoard').clientWidth; if (w !== lastW) { lastW = w; fitSoon(); } }).observe($('#boxBoard'));
    window.addEventListener('resize', fitSoon);
    window.addEventListener('orientationchange', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
    if (DESK.addEventListener) DESK.addEventListener('change', fitSoon);
    $('#sysBox').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || !G) return;
      if (b.dataset.act === 'snd') soundSheet(); else if (b.dataset.act === 'rules') rulesSheet(); else if (b.dataset.act === 'pass') pauseSheet(); else if (b.dataset.act === 'menu') goMenu(); else if (b.dataset.act === 'classic') toggleClassic();
    });
    fit();
  }

  // Aviso de versión nueva: si la página quedó abierta (o en caché) con una versión vieja, ofrece actualizar
  const BUILD = (document.querySelector('meta[name="build"]') || {}).content || '';
  let updShown = false;
  function checkUpdate() {
    if (updShown || !BUILD || !window.fetch || location.protocol === 'file:') return;
    fetch(location.pathname + '?v=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(t => {
      const m = t.match(/<meta name="build" content="([^"]+)"/);
      if (!m || m[1] === BUILD || updShown) return;
      updShown = true;
      const bar = document.createElement('div');
      bar.className = 'updbar'; bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>${L('Hay una versión nueva del juego.', "There's a new version of the game.")}</span><button type="button" class="btn mini">${L('Actualizar', 'Update')}</button>`;
      bar.querySelector('button').addEventListener('click', () => location.reload());
      document.body.appendChild(bar);
    }).catch(() => {});
  }
  // textos fijos de la plantilla HTML
  function localizeStatic() {
    if (LANG !== 'en') return;
    const set = (sel, attrs, text) => { const e = $(sel); if (!e) return; for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (text != null) e.textContent = text; };
    set('#btnSnd', { 'aria-label': 'Sound', title: 'Sound' });
    set('#btnRules', { 'aria-label': 'Rules', title: 'Rules' });
    set('#btnPass', { 'aria-label': 'Pause and menu', title: 'Pause' });
    set('#heroBox', { 'aria-label': 'Your adventurer' });
    set('.panel', { 'aria-label': 'Controls' });
    set('[data-act="rules"]', null, 'Rules'); set('[data-act="pass"]', null, 'Pause'); set('[data-act="snd"]', null, 'Sound');
    set('[data-act="classic"]', { title: 'Use the real card as the board, with coloured dice' }, 'Classic'); set('[data-act="menu"]', null, 'Menu');
    set('#sysBox .fine', null, 'Unofficial version of One Card Dungeon, by Barny Skinner. Covers and playmat © Little Rocket Games.');
  }
  function start(data) {
    localizeStatic();
    migrateSaves();
    loadBest();
    checkUpdate();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkUpdate(); Users.syncPending(); } else Users.sync(); });
    Users.syncPending();
    setInterval(checkUpdate, 600000);
    wire();
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => (G ? JSON.parse(JSON.stringify(G)) : null));
    if (data && validState(data)) resume(data); else menuScreen();
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
