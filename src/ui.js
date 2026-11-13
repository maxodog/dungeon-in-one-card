/* ===== INTERFAZ ===== */
(function () {
  const $ = s => document.querySelector(s);
  const NO_SKILLS = () => ({ spd: -1, atk: -1, def: -1, rng: -1 });
  const E = { newRun, rollTurn, assignComplete, confirmEnergy, reachFromAdv, attackInfo, moveAdv, attackMon, popUndo, playMonsters, endTurnCleanup, levelCleared, applyBreak, nextLevel,
    rerollDice, useReroll, rollWithKeep, toggleRanger, toggleKnight, useRogue, toggleCorsair, abilityInfo, encodePassword, decodePassword, retryLevel,
    toggleSherpa, itemUsable, useItem, useFlame, useEye, resolveDamage, blizzPen, atkAvail, heroDef, useGame, afterClear, lvOf, mStat, itemPool,
    chestInfo, openChest, setLoot, necroInfo, necroStrike, demonReach, demonMove,
    stoneInfo, breakStone, resolveAttack, laurelStart, laurelMon, laurelReach, laurelMove, laurelAttackInfo, laurelAttack, laurelEnd };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
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
      if (b) { b.classList.toggle('muted', !any); b.title = 'Sonido y música'; }
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
        const node = { tr, kind: 'buf', g: ctx.createGain() }; node.g.gain.value = 0; node.g.connect(out); cur = node;
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
    }
    function next() { const tr = choose(); if (tr) begin(tr); }

    // al entrar a un piso: se mantiene la canción si sirve para este piso y no es un bucle
    function floor(game, boss) {
      if (document.body.classList.contains('menu') || !T.length) return;
      const id = game + ':' + G.levelIdx; if (id === floorId) return;
      floorId = id; want = { game, boss };
      if (!on || !unlocked) return;
      if (cur && !cur.tr.l && inPool(cur.tr, want)) return;
      const tr = choose(); if (tr && !(cur && cur.tr.f === tr.f)) begin(tr);
    }
    function stop() { seq++; fadeOut(cur); cur = null; floorId = null; }
    function unlock() {
      if (!T.length) return;
      if (!unlocked) { unlocked = true; setup(); if (!primed) { primed = true; slots.forEach(s => { try { s.el.src = MUSIC_SILENCE; const p = s.el.play(); if (p && p.then) p.then(() => s.el.pause(), () => {}); } catch (e) {} }); } }
      if (on && want && !cur) next();
    }
    ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (!slots) return;
      if (document.hidden) { slots.forEach(s => { try { s.el.pause(); } catch (e) {} }); if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
      else { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); if (cur && cur.kind === 'el') { try { cur.slot.el.play().catch(() => {}); } catch (e) {} } }
    });
    function setOn(v) { on = !!v; save(); if (!on) { seq++; fadeOut(cur); cur = null; } else if (want) { unlocked = true; setup(); Sfx.unlock(); next(); } Sfx.paint(); }
    function setVol(v) { vol = Math.max(0, Math.min(1, v)); save(); if (out && ctx) out.gain.value = vol; else if (cur && cur.kind === 'el') { try { cur.slot.el.volume = (cur.lvl || 1) * vol; } catch (e) {} } }
    return { floor, stop, setOn, setVol, get on() { return on; }, get vol() { return vol; }, get has() { return T.length > 0; } };
  })();
  const bossFloor = () => {
    const lv = LEVELS[G.levelIdx], k = lv.mon.key;
    return !!lv.boss || (G.game === 'peak' && k === 'sorcerer') || (G.game === 'harbour' && k === 'kraken') || (G.game === 'base' && k === 'demon');
  };
  const musicFloor = () => { if (G && G.game && LEVELS[G.levelIdx]) Music.floor(G.game, bossFloor()); };
  // voz del héroe: según el arte de cada carta (M masculina, F femenina, N sin distinguir)
  const HERO_VOICE = { mage: 'F', ranger: 'F', rogue: 'N', cleric: 'N', necromancer: 'N' };
  const voice = () => HERO_VOICE[G && G.hero] || 'M';
  const sfxHurt = () => Sfx.play({ M: ['hurtM', 'hurtN'], F: ['hurtF', 'hurtN'], N: ['hurtM', 'hurtF', 'hurtN'] }[voice()]);
  const sfxDie = () => Sfx.play({ M: ['dieM'], F: ['dieF'], N: ['dieM', 'dieF'] }[voice()]);
  const KILL_POOL = { spider: 'killS', goblin: 'killS', wolf: 'killS', skeleton: 'killS', crab: 'killS', octopus: 'killS', imp: 'killS',
    orc: 'killB', yeti: 'killB', zombie: 'killB', kraken: 'killB', demon: 'killD', fiend: 'killD', chained: 'killD', maw: 'killD' };
  const sfxKill = () => { const lv = LEVELS[G.levelIdx]; Sfx.play(lv.boss || lv.mon.key === 'sorcerer' ? 'killJ' : (KILL_POOL[lv.mon.key] || 'killS')); };
  // golpe del héroe: si el monstruo cae suena su muerte; si no, el golpe
  const sfxStrike = dead => dead ? sfxKill() : Sfx.play('atk');
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
    paladin: { name: 'Paladín', pack: 'base', txt: 'Una vez por nivel, antes de tirar, conserva el dado que diste a una habilidad el turno anterior y tira solo los otros dos.' },
    barbarian: { name: 'Bárbaro', pack: 'base', txt: 'Con 1 de Vida, puede volver a tirar los tres dados una vez por turno.' },
    ranger: { name: 'Ranger', pack: 'base', txt: 'Una vez por nivel, puede sumar un dado al Alcance en lugar de al Movimiento.' },
    mage: { name: 'Mago', pack: 'base', txt: 'Una vez por nivel, puede volver a tirar los tres dados.' },
    necromancer: { name: 'Nigromante', pack: 'mguf', txt: 'Una vez por nivel, pierde 1 de Vida para hacer 1 de daño a un enemigo a su Alcance.' },
    cleric: { name: 'Clérigo', pack: 'mguf', txt: 'Cuando los tres dados de Energía salen iguales (por ejemplo 3-3-3), cada uno sube 2, hasta un máximo de 6.' },
    knight: { name: 'Caballero', pack: 'mguf', txt: 'Una vez por nivel, puede asignar dos dados de Energía a una misma habilidad (Movimiento, Ataque o Defensa).' },
    rogue: { name: 'Pícaro', pack: 'mguf', txt: 'Una vez por nivel, puede sumar 1 al valor de los tres dados de Energía.' },
    sherpa: { name: 'Sherpa', pack: 'peak', txt: 'Una vez por nivel, puede moverse ignorando los muros, pero no puede terminar sobre uno.' },
    corsair: { name: 'Corsario', pack: 'harbour', txt: 'Una vez por nivel, puede moverse a cualquier casilla libre, sin importar su Movimiento.' },
    demonhunter: { name: 'Cazador de demonios', pack: 'hell', txt: 'Una vez por nivel, en cualquier momento, puede mover a un monstruo hasta 3 puntos de Movimiento.' }
  };
  // Qué héroes trae cada caja y qué nombre lleva
  const PACKS = [
    { key: 'base', name: 'One Card Dungeon' }, { key: 'mguf', name: "M'Guf-yn Returns" }, { key: 'peak', name: 'Montaña Eterna' },
    { key: 'harbour', name: 'Harbour Clash' }, { key: 'hell', name: 'La Puerta del Infierno' }
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
    cloak: { name: 'Capa de cuero', short: 'Capa', txt: 'Durante todo un nivel, ignoras el efecto de las ventiscas.' },
    axe: { name: 'Cuerda y piolet', short: 'Piolet', txt: 'En tu turno, suma +2 a tu Ataque y +2 a tu Alcance.' },
    herbs: { name: 'Hierbas curativas', short: 'Hierbas', txt: 'Al recibir un ataque, reduces el daño a la mitad, redondeando hacia arriba.' },
    wyrm: { name: 'Extracto de Wyrm', short: 'Extracto', txt: 'Suma hasta +4 a tu Movimiento este turno.' },
    flame: { name: 'Llama del destino', short: 'Llama', txt: 'En la fase de Energía, vuelve a tirar uno o más dados y quédate con la segunda tirada.' },
    hourglass: { name: 'Reloj de arena', short: 'Reloj', txt: 'Tras tu fase de aventurero, sáltate las fases de los monstruos y haz una nueva fase de Energía.' },
    eye: { name: 'Ojo de dragón', short: 'Ojo', txt: 'En la fase de Energía, tira un D12 en lugar de un D6 y asígnalo a una habilidad como un dado normal.' },
    powder: { name: 'Pólvora negra', short: 'Pólvora', txt: 'Durante tu ataque, el daño a un monstruo se extiende a todos los demás monstruos, aunque estén fuera de Alcance o de visión.' },
    sands: { name: 'Arenas ocultas', short: 'Arenas', txt: 'Durante todo un nivel, ignora las casillas de agua para las mejoras de los monstruos.' },
    gorgon: { name: 'Cabeza de Gorgona', short: 'Gorgona', txt: 'Durante un turno, todos los monstruos se saltan su fase de Movimiento.' },
    pendant: { name: 'Colgante de alma', short: 'Colgante', txt: 'Vuelves a la vida con 1 de Vida.' },
    holy: { name: 'Agua bendita', short: 'Agua', txt: 'Durante todo un nivel, ignora las casillas malditas para las mejoras de los monstruos.' },
    laurel: { name: 'Corona de laurel', short: 'Corona', txt: 'Tras tu fase de aventurero, ordena a un monstruo que se mueva y ataque a otros monstruos con sus propias cifras. Luego siguen las fases normales de los monstruos.' },
    fist: { name: 'Puño de hierro', short: 'Puño', txt: 'Cuando rompas la Piedra de la Perdición, haces 2 de daño a todos los monstruos y 1 a tu aventurero.' },
    mail: { name: 'Cota de malla', short: 'Cota', txt: 'Cuando te atacan los monstruos, suma 3 a tu Defensa.' }
  };
  const ITEM_PACK = { cloak: 'Montaña Eterna', axe: 'Montaña Eterna', herbs: 'Montaña Eterna', wyrm: 'Montaña Eterna', flame: 'Montaña Eterna',
    hourglass: 'Harbour Clash', eye: 'Harbour Clash', powder: 'Harbour Clash', sands: 'Harbour Clash', gorgon: 'Harbour Clash',
    pendant: 'Puerta del Infierno', holy: 'Puerta del Infierno', laurel: 'Puerta del Infierno', fist: 'Puerta del Infierno', mail: 'Puerta del Infierno' };
  const ICON_STAIR = svg(`<path d="M4 26h7v-6h6v-6h6v-6h5"/>`);

  const NAMES = { spd: 'Mov', atk: 'Atq', def: 'Def', rng: 'Alc' };
  const LONG = { spd: 'Movimiento', atk: 'Ataque', def: 'Defensa', rng: 'Alcance' };
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
  function loadBest() { try { bestLevel = +localStorage.getItem(BEST_KEY) || 0; } catch (e) {} }
  function noteBest() {
    const n = G.levelIdx + 1;
    if (n > bestLevel) { bestLevel = n; try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) {} }
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
      b.setAttribute('aria-label', lv.voids[i] ? 'Hueco' : lv.walls[i] ? 'Muro' : lv.blizz[i] ? `Ventisca, columna ${x + 1}, fila ${y + 1}` : lv.water[i] ? `Agua, columna ${x + 1}, fila ${y + 1}` : lv.stoneAt === i ? 'Piedra de la Perdición' : lv.damned && lv.damned[i] ? `Casilla maldita, columna ${x + 1}, fila ${y + 1}` : `Casilla columna ${x + 1}, fila ${y + 1}`);
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
  function dieHTML(v, extra) {
    if (v > 6) return `<span class="die num ${extra || ''}" aria-label="Dado ${v}"><b>${v}</b><small>D12</small></span>`;
    const on = PIPS[v] || [];
    let s = '';
    for (let i = 0; i < 9; i++) s += `<i class="${on.includes(i) ? 'on' : ''}"></i>`;
    return `<span class="die ${extra || ''}" aria-label="Dado ${v}">${s}</span>`;
  }

  const regularCount = () => LEVELS.filter(l => !l.boss).length;
  const bossCount = () => LEVELS.filter(l => l.boss).length;
  const stageLabel = lv => lv.boss ? `Jefe ${lv.boss}` : `Nivel ${lv.num}`;
  function renderHead() {
    const lv = LEVELS[G.levelIdx];
    $('.lvl-num').innerHTML = lv.boss ? `Jefe <b id="lvlNum">${lv.boss}</b> de <span id="lvlTot">${bossCount()}</span>` : `Nivel <b id="lvlNum">${lv.num}</b> de <span id="lvlTot">${regularCount()}</span>`;
    $('#lvlName').textContent = lv.title;
    $('#dots').innerHTML = LEVELS.map((l, i) => `<i class="${l.boss ? 'boss ' : ''}${i < G.levelIdx ? 'done' : i === G.levelIdx ? 'now' : ''}"></i>`).join('');
    const m = lv.mon, bo = m.bonus;
    const st = (k, v) => `<div><b>${v}</b>${bo && bo[k] ? `<u>+${bo[k]}</u>` : ''}<span>${{ hp: 'Vida', spd: 'Vel', atk: 'Atq', def: 'Def', rng: 'Alc' }[k]}</span></div>`;
    $('#foot').innerHTML = `
      <div class="ico">${ICONS[m.key]}</div>
      <div>
        <div class="nm">${m.plural}<small>${lv.boss ? 'jefe' : `quedan ${G.mons.length} de ${lv.spawns.length}`}</small></div>
        <div class="stats">${['hp', 'spd', 'atk', 'def', 'rng'].map(k => st(k, m[k])).join('')}</div>
        ${bo ? (m.bonusOn === 'hero' ? `<div class="wnote hell ${G.sands ? 'off' : lv.damned[idx(G.adv.x, G.adv.y)] ? 'on' : ''}">${G.sands ? 'Agua bendita: los bonos no cuentan este nivel.' : lv.damned[idx(G.adv.x, G.adv.y)] ? 'Estás en casilla maldita: suman el bono.' : 'Si estás en casilla maldita, suman el bono en rojo.'}</div>` : '<div class="wnote">En casillas de agua suman el bono en azul.</div>') : ''}
      </div>`;
  }

  function renderHP() {
    const hp = G.adv.hp;
    $('#pips').innerHTML = Array.from({ length: START_HP }, (_, i) =>
      `<i class="${i < hp ? 'on' : ''}${i >= hp && i < lastHp ? ' lost' : ''}"></i>`).join('');
    $('#hpnum').textContent = `Vida ${hp} / ${START_HP}`;
    const hb = $('#heroBox');
    if (hb) {
      if (hb.dataset.hero !== G.hero) { hb.dataset.hero = G.hero; hb.innerHTML = `<span class="ico">${HERO_ICONS[G.hero] || ICON_ADV}</span><b>${HEROES[G.hero].name}</b><p>${HEROES[G.hero].txt}</p><div class="hpbar"><div class="pips"></div><span class="hpnum"></span></div>`; }
      hb.querySelector('.pips').innerHTML = $('#pips').innerHTML;
      hb.querySelector('.hpnum').textContent = `Vida ${hp} / ${START_HP}`;
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
      let val = a[k], sub = 'base', cls = 'chip', bar = '';
      const slot = ph === 'energy' && sk.includes(k);
      const lootHere = t.loot && t.loot.k === k ? t.loot.n : 0;
      if (ph === 'energy') {
        if (slot) cls += ' slot';
        if (t.dice) {
          const ds = [t.assign[k], t.assign2 ? t.assign2[k] : -1].filter(i => i >= 0);
          const parts = ds.map(i => dieHTML(t.dice[i], 'mini'));
          if (lootHere) parts.push(`<span class="lootn">+${lootHere}</span>`);
          if (ds.length || lootHere) {
            val = a[k] + ds.reduce((x, i) => x + t.dice[i], 0) + lootHere;
            sub = `${a[k]} + ${parts.join(' + ')}`;
            cls += ' filled' + (t.lock === k ? ' locked' : '');
          } else if (slot) { sub = 'asigna un dado'; if (t.sel >= 0) cls += ' armed'; }
          else sub = 'sin dado';
          if (slot && t.sel >= 0 && ds.length === 1 && t.knight) cls += ' armed';
        } else if (!slot) sub = 'sin dado';
      } else if (ph === 'move' || ph === 'monsters') {
        const pen = E.blizzPen(G);
        if (k === 'spd') { val = t.spdLeft; sub = `de ${t.spd}`; bar = `<span class="bar"><i style="width:${t.spd ? (100 * t.spdLeft / t.spd) : 0}%"></i></span>`; }
        else if (k === 'atk') { val = E.atkAvail(G); sub = pen ? 'ventisca −1' : `de ${t.atk}`; bar = `<span class="bar"><i style="width:${t.atk ? (100 * t.atkLeft / t.atk) : 0}%"></i></span>`; }
        else if (k === 'def') { val = E.heroDef(G); sub = pen ? 'ventisca −1' : 'este turno'; }
        else { val = t.rng || a.rng; sub = t.rng !== a.rng ? 'este turno' : 'fijo'; }
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
      else if (!E.assignComplete(t)) txt = t.knight ? 'Caballero: reparte los tres dados; puedes poner dos en la misma habilidad.' : t.ranger ? 'Toca un dado y luego <em>Alc</em>, <em>Atq</em> o <em>Def</em>.' : 'Toca un dado y luego <em>Mov</em>, <em>Atq</em> o <em>Def</em>.';
      else txt = 'Reparto listo. Confírmalo o toca una habilidad para cambiarlo.';
    } else if (ph === 'move') {
      step = '2';
      txt = mode === 'necro' ? 'Nigromante: toca el monstruo al que quieres hacer <em>1 de daño</em> (cuesta 1 de tu Vida).'
        : mode === 'demonPick' ? 'Cazador: toca el monstruo que quieres <em>mover</em>.'
        : mode && mode.demon ? 'Cazador: toca la casilla marcada a la que lo mueves (hasta 3 de Mov).'
        : mode === 'laurelPick' ? 'Corona de laurel: toca el monstruo al que das la orden.'
        : G.laurel ? 'Corona de laurel: mueve al monstruo o toca a otro monstruo para que lo ataque. Termina la orden cuando quieras.'
        : 'Toca una casilla marcada para <em>moverte</em>, o un monstruo, el cofre o la piedra resaltados para <em>atacar</em>.';
    }
    else if (ph === 'monsters') { step = '3'; txt = 'Turno de los monstruos.'; }
    else if (ph === 'clear') { step = '2'; txt = 'Nivel superado.'; }
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
      const abBtn = ab ? `<button type="button" class="btn abil" id="btnAbil" ${rolling ? 'disabled' : ''}>${ab.label}</button>` : '';
      if (!t.dice) box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnRoll" ${rolling ? 'disabled' : ''}>Tirar dados</button>`;
      else box.innerHTML = abBtn + `<button type="button" class="btn primary" id="btnConfirm" ${E.assignComplete(t) && !rolling ? '' : 'disabled'}>Confirmar</button>`;
    } else if (ph === 'move') {
      if (G.laurel) { box.innerHTML = `<button type="button" class="btn primary" id="btnLaurelEnd" ${busy ? 'disabled' : ''}>Terminar orden</button>`; return; }
      if (mode === 'laurelPick') { box.innerHTML = `<button type="button" class="btn" id="btnLaurelNo">Cancelar</button>`; return; }
      const ab = E.abilityInfo(G);
      const cancel = (ab && ((ab.id === 'necro' && mode === 'necro') || (ab.id === 'demon' && mode))) ? 'Cancelar' : null;
      const abBtn = ab ? `<button type="button" class="btn abil tight ${G.sherpaOn || G.corsairOn || cancel ? 'on' : ''}" id="btnAbil" ${busy ? 'disabled' : ''}>${cancel || ab.label}</button>` : '';
      box.innerHTML = `<button type="button" class="btn small" id="btnUndo" ${G.undo.length && !busy ? '' : 'disabled'}>Deshacer</button>${abBtn}
        <button type="button" class="btn primary ${nothingLeft() ? 'pulse' : ''}" id="btnEnd" ${busy ? 'disabled' : ''}>Fin de turno</button>`;
    } else {
      box.innerHTML = `<button type="button" class="btn" disabled>${ph === 'monsters' ? 'Los monstruos actúan…' : '…'}</button>`;
    }
  }

  function renderItems() {
    const box = $('#items');
    const list = G.items || [];
    const act = [];
    if (G.cloak) act.push(['cloak', 'Capa activa']);
    if (G.sands) act.push(LEVELS[G.levelIdx].damned && LEVELS[G.levelIdx].damned.some(Boolean) ? ['holy', 'Agua bendita activa'] : ['sands', 'Arenas activas']);
    if (G.fist) act.push(['fist', 'Puño listo']);
    if (G.powder) act.push(['powder', 'Pólvora lista']);
    if (G.gorgon) act.push(['gorgon', 'Gorgona activa']);
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
    const set = t.loot && t.loot.k && G.phase === 'energy' ? `+${t.loot.n} a ${NAMES[t.loot.k]}` : '';
    box.innerHTML = `<span class="ico">${ICON_CHEST}</span><span class="txt">Botín del cofre: <b>${G.loot}</b> punto${G.loot > 1 ? 's' : ''}${set ? ' · ' + set : ''}</span>
      ${can ? `<button type="button" class="btn mini" id="btnLoot">${set ? 'Cambiar' : 'Sumar'}</button>` : ''}`;
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
    base: 'Atraviesa 12 niveles. En el último hay que derrotar a los tres demonios.',
    mguf: "Atraviesa 12 niveles. Tras el 3, el 6 y el 9 te espera un comandante, y tras el 12, el mismísimo M'Guf-yn.",
    peak: 'Sube los 10 niveles de la Montaña Eterna. En el último te espera el Hechicero Blanco.',
    harbour: 'Defiende el puerto a lo largo de 8 niveles. Al final despierta el Kraken.',
    hell: 'Desciende 12 niveles por la Puerta del Infierno. Tras el 3, el 6 y el 9 te espera un jefe, y tras el 12, el Señor del Infierno.'
  };

  function soundSheet() {
    openSheet(`<h3>Sonido</h3>
      <label class="opt"><input type="checkbox" id="oSfx" ${Sfx.on ? 'checked' : ''}><span>Efectos de sonido</span></label>
      ${Music.has ? `<label class="opt"><input type="checkbox" id="oMus" ${Music.on ? 'checked' : ''}><span>Música</span></label>
      <label class="opt vol"><span>Volumen de la música</span><input type="range" id="oVol" min="0" max="100" value="${Math.round(Music.vol * 100)}"></label>
      <p class="small">La música se descarga mientras suena (cerca de 1 MB por canción).</p>` : ''}
      <button type="button" class="btn" id="oOk">Listo</button>`, [['#oOk', closeSheet]], true);
    const q = s => document.querySelector('#veil ' + s);
    q('#oSfx').addEventListener('change', e => Sfx.set(e.target.checked));
    if (q('#oMus')) { q('#oMus').addEventListener('change', e => Music.setOn(e.target.checked)); q('#oVol').addEventListener('input', e => Music.setVol(e.target.value / 100)); }
  }

  function rulesSheet() {
    const g = G ? G.game : null;
    const has = k => !g || g === k;
    openSheet(`
      <h3>Cómo se juega</h3>
      <p class="lead">${g ? GAME_LEAD[g] : 'Elige una aventura al empezar: la original, M\'Guf-yn Returns, Montaña Eterna, Harbour Clash o La Puerta del Infierno.'} Si tu Vida llega a 0, caes.</p>
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
      <h4>Objetos (opcional)</h4>
      <p>Puedes jugar con tres objetos, al azar o a tu elección: la Montaña Eterna, Harbour Clash y La Puerta del Infierno los usan siempre; en las demás aventuras es opcional. Cada uno se usa una sola vez y se descarta.</p>
      <ul>${ITEM_KEYS.filter(k => ITEMS[k]).map(k => `<li><b>${ITEMS[k].name}.</b> ${ITEMS[k].txt}${k === 'cloak' ? ' (Solo Montaña Eterna.)' : k === 'sands' ? ' (Solo Harbour Clash.)' : k === 'holy' || k === 'fist' ? ' (Solo La Puerta del Infierno.)' : ''}</li>`).join('')}</ul>
      <h4>Héroes</h4>
      <p>Con cualquier aventura juegas con los héroes de la original y de esa expansión; el botón <b>Héroes de otras expansiones</b> añade los demás.</p>
      <ul>${HERO_KEYS.map(k => `<li><b>${HEROES[k].name}.</b> ${HEROES[k].txt}</li>`).join('')}</ul>
      <h4>Contraseña</h4>
      <p>Cada nivel empieza con una contraseña (botón <b>Contraseña</b>). Anótala: desde el menú, «Continuar con contraseña» te devuelve al inicio de ese nivel con tu héroe, tu Vida, tus mejoras, tus objetos y el botín de ese momento. No guarda el turno en curso. Las de 4 y 5 letras de versiones anteriores siguen valiendo; La Puerta del Infierno usa 8.</p>
      <p class="fine">Versión web no oficial del juego solitario One Card Dungeon y de sus expansiones, de Barny Skinner (Little Rocket Games). Los mapas, las cifras de los monstruos y su aparición por nivel siguen las cartas originales; las ilustraciones del juego y los textos son propios. Las portadas del menú son de Little Rocket Games. Si te gusta, apoya al autor y consigue el juego.</p>
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
    sfxDie(); Music.stop();
    noteBest();
    const lv = LEVELS[G.levelIdx], lab = stageLabel(lv), pw = E.encodePassword(G);
    openSheet(`<h3>Has caído</h3>
      <p class="lead">Llegaste a ${lab.toLowerCase()} (etapa ${G.levelIdx + 1} de ${LEVELS.length}) en ${G.totalTurns} turnos. Tu mejor marca es la etapa ${bestLevel}.</p>
      <p>Puedes reintentar ${lab.toLowerCase()} tal como lo empezaste${pw ? `: contraseña <b>${pw}</b>` : ''}.</p>
      <button type="button" class="btn primary" id="retry">Reintentar ${lab.toLowerCase()}</button>
      <button type="button" class="btn" id="menu">Ir al menú</button>`,
      [['#retry', retry], ['#menu', goMenu]], false);
  }

  const WIN = {
    base: ['Cáliz de Brasas', 'Los tres demonios han caído y el cáliz es tuyo.'],
    mguf: ["M'Guf-yn derrotado", "El señor del inframundo cae y su ejército se desbanda."],
    peak: ['Cima despejada', 'El Hechicero Blanco ha caído y la tormenta se calma.'],
    harbour: ['Puerto a salvo', 'El Kraken vuelve a las profundidades y la marea se retira.'],
    hell: ['Puerta cerrada', 'El Señor del Infierno cae y las llamas se apagan.']
  };
  function winSheet() {
    Music.stop();
    noteBest();
    const w = WIN[G.game] || WIN.base;
    openSheet(`<h3>${w[0]}</h3>
      <p class="lead">${w[1]} Superaste las ${LEVELS.length} etapas como ${HEROES[G.hero].name} en ${G.totalTurns} turnos con ${G.adv.hp} de Vida.</p>
      <button type="button" class="btn primary" id="menu">Ir al menú</button>`, [['#menu', goMenu]], false);
  }

  /* ---------- pantallas de inicio ---------- */
  function showScreen(html, binds) {
    closeSheet(); Music.stop();
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
    const sv = loadSaved();
    showScreen(`<div class="splash">${LOGO}
      <p class="tagline">Una carta, tres dados y una aventura por elegir.</p>
      <div class="menu-btns">
        ${sv ? `<button type="button" class="btn primary menu-main" id="mContinue"><span>Seguir en este dispositivo</span><small>${HEROES[sv.hero].name} · ${GAMES[sv.game].name} · ${stageLabel(GAMES[sv.game].levels[sv.levelIdx]).toLowerCase()} · Vida ${sv.adv.hp}</small></button>` : ''}
        <button type="button" class="btn ${sv ? '' : 'primary'} menu-main" id="mNew"><span>Nueva partida</span></button>
        <button type="button" class="btn menu-main" id="mPass"><span>Continuar con contraseña</span><small>4, 5, 7 u 8 letras o números</small></button>
        <button type="button" class="ghost" id="mRules">Cómo se juega</button>
      </div>
      <p class="fine">Versión no oficial de One Card Dungeon, de Barny Skinner. · versión ${(document.querySelector('meta[name=build]') || {}).content || '?'}</p></div>`,
      [['#mContinue', () => resume(sv)], ['#mNew', adventureScreen], ['#mPass', () => passScreen('')], ['#mRules', rulesSheet]]);
  }

  const ADV_INFO = {
    base: { img: 'img/core.jpg', alt: 'Portada de One Card Dungeon', tag: 'Original', txt: '12 niveles y tres demonios.' },
    mguf: { img: 'img/mguf.jpg', alt: "Portada de One Card Dungeon: M'Guf-yn Returns", tag: 'Expansión', txt: '12 niveles, 4 jefes, cofres y 4 héroes.' },
    peak: { img: 'img/peak.jpg', alt: 'Portada de One Card Dungeon: Eternal Peak', tag: 'Expansión', txt: '10 niveles, ventiscas, Sherpa y objetos.' },
    harbour: { img: 'img/harbour.jpg', alt: 'Portada de One Card Dungeon: Harbour Clash', tag: 'Expansión', txt: '8 niveles, agua, Corsario y objetos.' },
    hell: { img: 'img/hell.jpg', alt: "Portada de One Card Dungeon: Hell's Door", tag: 'Expansión', txt: '12 niveles, 4 jefes, casillas malditas, la Piedra de la Perdición y objetos.' }
  };
  const ADV_ORDER = ['base', 'mguf', 'peak', 'harbour', 'hell'];

  function adventureScreen() {
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Elige la aventura</h2>
      <div class="adv-list">${ADV_ORDER.map(k => `<button type="button" class="adv-card" data-game="${k}">
        <img src="${ADV_INFO[k].img}" alt="${ADV_INFO[k].alt}" width="440" height="614" loading="eager" decoding="async">
        <span class="adv-tag">${ADV_INFO[k].tag}</span><b>${GAMES[k].name}</b><p>${ADV_INFO[k].txt}</p></button>`).join('')}</div>
      <p class="fine">Portadas © Little Rocket Games. One Card Dungeon es de Barny Skinner.</p></div>`,
      [['#back', menuScreen]]);
    sc.querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => heroScreen(b.dataset.game, false)));
  }

  // Héroes de la caja original y de la aventura elegida; un botón añade los de las demás expansiones
  function heroScreen(game, more) {
    const own = ['base', game];
    const card = k => `<button type="button" class="hero-card" data-hero="${k}">
        <span class="ico">${HERO_ICONS[k]}</span><span><b>${HEROES[k].name}</b><p>${HEROES[k].txt}</p></span></button>`;
    const section = pk => { const hs = heroesOf(pk.key); return hs.length ? `<h3 class="pack-h">${pk.name}</h3><div class="hero-list">${hs.map(card).join('')}</div>` : ''; };
    const mine = PACKS.filter(pk => own.includes(pk.key)), others = PACKS.filter(pk => !own.includes(pk.key));
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Elige a tu héroe</h2>
      <p class="lead">${GAMES[game].name}: héroes de la caja original${game === 'base' ? '' : ' y de esta expansión'}.</p>
      ${mine.map(section).join('')}
      ${more ? others.map(section).join('') : ''}
      <button type="button" class="btn ${more ? '' : 'primary'}" id="moreH">${more ? 'Ocultar héroes de otras expansiones' : 'Héroes de otras expansiones'}</button></div>`,
      [['#back', adventureScreen], ['#moreH', () => heroScreen(game, !more)]]);
    sc.querySelectorAll('[data-hero]').forEach(b => b.addEventListener('click', () => itemsScreen(game, b.dataset.hero, null, more)));
    if (more) { const h = sc.querySelector('#moreH'); if (h) h.scrollIntoView({ block: 'start' }); }
  }

  function drawItems(game) {
    const a = E.itemPool(game);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, 3);
  }

  // Peak y Harbour Clash siempre usan tres objetos; en las demás aventuras es opcional (se puede empezar sin ellos)
  function itemsScreen(game, hero, pick, more) {
    const must = game === 'peak' || game === 'harbour' || game === 'hell';
    pick = pick || (must ? drawItems(game) : []);
    const pool = E.itemPool(game);
    const list = () => pool.map(k => `<button type="button" class="hero-card item-card ${pick.includes(k) ? 'chosen' : ''}" data-it="${k}" aria-pressed="${pick.includes(k)}">
        <span class="ico">${ITEM_ICONS[k]}</span><span><b>${ITEMS[k].name}</b><p>${ITEMS[k].txt}</p><small class="pk">${ITEM_PACK[k]}</small></span><i class="tick" aria-hidden="true"></i></button>`).join('');
    const sc = showScreen(`<div class="splash wide">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">${must ? 'Tus tres objetos' : 'Objetos (opcional)'}</h2>
      <p class="lead">${must ? `Se han sorteado tres. Puedes quedártelos o elegir los que prefieras para ${HEROES[hero].name}.` : `Puedes jugar sin objetos o con tres, al azar o a tu elección.`} Cada objeto se usa una sola vez.</p>
      <div class="hero-list" id="itList">${list()}</div>
      <p class="err" id="itMsg" role="status"></p>
      <div class="actions"><button type="button" class="btn mini" id="itRoll">Sortear tres</button>${must ? '' : '<button type="button" class="btn mini" id="itNone">Ninguno</button>'}</div>
      <button type="button" class="btn primary" id="itGo">Empezar</button></div>`,
      [['#back', () => heroScreen(game, !!more)],
       ['#itGo', () => { if (pick.length === 3 || (!must && !pick.length)) startGame(hero, game, pick); }]]);
    const go = sc.querySelector('#itGo'), msg = sc.querySelector('#itMsg');
    const refresh = () => { go.disabled = !(pick.length === 3 || (!must && !pick.length)); go.textContent = !pick.length && !must ? 'Empezar sin objetos' : 'Empezar'; };
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
    // Sortear / Ninguno actualizan la lista en el sitio: la página no vuelve arriba
    const setPick = np => { pick = np; sc.querySelector('#itList').innerHTML = list(); msg.textContent = ''; refresh(); };
    sc.querySelector('#itRoll').addEventListener('click', () => setPick(drawItems(game)));
    const none = sc.querySelector('#itNone'); if (none) none.addEventListener('click', () => setPick([]));
    refresh();
  }

  function passScreen(err) {
    const sc = showScreen(`<div class="splash">
      <button type="button" class="ghost back" id="back">‹ Atrás</button>
      <h2 class="screen-h">Contraseña</h2>
      <p class="lead">Escribe la contraseña que te dio el juego al empezar un nivel: 7 u 8 letras o números ahora (8 en La Puerta del Infierno), o las de 4 o 5 de versiones anteriores.</p>
      <input id="pwIn" class="pw" type="text" maxlength="8" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="••••••••" aria-label="Contraseña de 4, 5, 7 u 8 caracteres">
      <p class="err" id="pwErr" role="alert">${err || ''}</p>
      <button type="button" class="btn primary" id="pwGo" disabled>Continuar</button>
      <p class="fine">Las contraseñas no usan 0, 1, I ni O, para que no se confundan.</p></div>`,
      [['#back', menuScreen], ['#pwGo', submitPass]]);
    const inp = sc.querySelector('#pwIn'), go = sc.querySelector('#pwGo');
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      go.disabled = ![4, 5, 7, 8].includes(inp.value.length);
      $('#pwErr').textContent = '';
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitPass(); });
    if (err) inp.value = '', go.disabled = true;
    setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }

  function submitPass() {
    const inp = $('#pwIn'); if (!inp || ![4, 5, 7, 8].includes(inp.value.length)) return;
    const g = E.decodePassword(inp.value);
    if (!g) { $('#pwErr').textContent = 'Esa contraseña no es válida. Revisa las letras y números.'; return; }
    G = g; G.totalTurns = 0; lastHp = G.adv.hp; builtLevel = -1;
    hideScreen(); render();
    say(`<b>Contraseña aceptada.</b> ${GAMES[G.game].name}: ${HEROES[G.hero].name}, ${stageLabel(LEVELS[G.levelIdx]).toLowerCase()} (${LEVELS[G.levelIdx].title}) con ${G.adv.hp} de Vida${G.items.length ? ' y ' + G.items.length + ' objeto' + (G.items.length > 1 ? 's' : '') : ''}${G.loot ? ` y ${G.loot} de botín` : ''}. Tira los dados.`);
  }

  const START_MSG = {
    base: 'Una carta, doce niveles.',
    mguf: "M'Guf-yn Returns: abre cofres para ganar puntos extra y derrota a los comandantes.",
    peak: 'Montaña Eterna: las casillas de ventisca restan 1 a tu Atq y Def.',
    harbour: 'Harbour Clash: los monstruos en agua se vuelven más fuertes.',
    hell: 'La Puerta del Infierno: si pisas una casilla maldita, los monstruos se fortalecen. La Piedra de la Perdición se rompe a costa de tu Vida.'
  };
  function startGame(hero, game, items) {
    G = E.newRun(hero, game, items); G.totalTurns = 0; lastHp = START_HP; builtLevel = -1;
    hideScreen(); render();
    say(`<b>${HEROES[hero].name}.</b> ${START_MSG[game]} Tira los dados para empezar.`);
  }

  function resume(g) {
    G = g; useGame(G.game || 'base');
    if (G.totalTurns == null) G.totalTurns = 0;
    if (G.phase === 'monsters') G.phase = 'move';
    lastHp = G.adv.hp; builtLevel = -1;
    hideScreen(); render();
    if (G.phase === 'clear') nextStep();
    else say(G.levelIdx === 0 && G.turnNo === 1 && !G.turn.dice ? `Una carta, ${LEVELS.length} etapas. Tira los dados para empezar.` : `${stageLabel(LEVELS[G.levelIdx])}: ${LEVELS[G.levelIdx].title}.`);
  }

  function goMenu() { if (busy) return; closeSheet(); menuScreen(); }

  function retry() {
    const t = G.totalTurns;
    G = E.retryLevel(G); G.totalTurns = t; lastHp = G.adv.hp; builtLevel = -1;
    closeSheet(); render();
    say(`Reintentas ${stageLabel(LEVELS[G.levelIdx]).toLowerCase()}: ${LEVELS[G.levelIdx].title}. Tira los dados.`);
  }

  function passwordSheet() {
    if (busy || rolling || !G) return;
    const pw = E.encodePassword(G) || '----';
    const veil = openSheet(`<h3>Contraseña: ${stageLabel(LEVELS[G.levelIdx]).toLowerCase()}</h3>
      <div class="pwshow" role="img" aria-label="Contraseña ${pw.split('').join(' ')}">${[...pw].map(c => `<span>${c}</span>`).join('')}</div>
      <p class="lead">Anótala o cópiala. En el menú, «Continuar con contraseña» te devuelve al inicio de este nivel como ${HEROES[G.hero].name}, con la Vida, las mejoras, los objetos y el botín que tenías al empezarlo. No guarda el turno en curso.</p>
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
    const msg = c === 'heal' ? 'Te curas hasta 6 de Vida.' : `${LONG[c]} sube a ${G.adv[c]}.`;
    noteBest();
    await flipTo(() => { E.nextLevel(G); builtLevel = -1; busy = false; render(); const pw = E.encodePassword(G); say(`<b>${msg}</b> ${stageLabel(LEVELS[G.levelIdx])}: ${LEVELS[G.levelIdx].title}.${pw ? ` Contraseña: <b>${pw}</b>` : ''}`); });
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

  const rollMsg = base => (G.turn.boosted ? '<b>Clérigo:</b> ¡tres dados iguales! Cada uno sube 2. ' : '') + base;
  async function doRoll() {
    if (rolling || G.phase !== 'energy' || G.turn.dice) return;
    E.rollTurn(G);
    await animateRoll(rollMsg('Reparte los dados entre Mov, Atq y Def.'));
  }

  function onAbility() {
    const ab = E.abilityInfo(G);
    if (!ab || rolling || busy) return;
    if (ab.id === 'keep') keepSheet();
    else if (ab.id === 'reroll') { E.useReroll(G); animateRoll(rollMsg('Vuelves a tirar. Reparte los dados otra vez.')); }
    else if (ab.id === 'sherpa') {
      E.toggleSherpa(G);
      render();
      say(G.sherpaOn ? 'Habilidad del Sherpa: tu próximo traslado <b>ignora los muros</b>, pero no puedes terminar sobre uno. Toca el destino.' : 'Habilidad cancelada.');
    }
    else if (ab.id === 'knight') {
      E.toggleKnight(G);
      render();
      say(G.turn.knight ? 'Habilidad del Caballero: reparte los tres dados y pon <b>dos en la misma habilidad</b>.' : 'Habilidad cancelada: un dado por habilidad.');
    }
    else if (ab.id === 'rogue') {
      E.useRogue(G);
      render();
      say('Habilidad del Pícaro: <b>+1</b> a cada dado (máximo 6).');
    }
    else if (ab.id === 'corsair') {
      E.toggleCorsair(G);
      render();
      say(G.corsairOn ? 'Habilidad del Corsario: toca <b>cualquier casilla libre</b> para abordarla sin gastar Movimiento.' : 'Habilidad cancelada.');
    }
    else if (ab.id === 'necro') {
      mode = mode === 'necro' ? null : 'necro';
      render();
      say(mode ? 'Nigromante: toca el monstruo que quieres dañar. Perderás 1 de Vida.' : 'Habilidad cancelada.');
    }
    else if (ab.id === 'demon') {
      mode = mode ? null : 'demonPick';
      render();
      say(mode ? 'Cazador de demonios: toca el monstruo que quieres mover.' : 'Habilidad cancelada.');
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
    say(nothingLeft() ? 'No puedes hacer nada útil: termina el turno.' : 'Muévete o ataca. Cuando termines, Fin de turno.');
  }

  const hitFx = m => { const el = tok.mons.get(m.id); if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 500); } };
  const whyMsg = (info, need, have, what) => info.why === 'range' ? `${what} está a distancia <b>${info.rd}</b> y tu Alcance es <b>${G.turn.rng || G.adv.rng}</b>. Acércate o mejora Alcance.`
    : info.why === 'los' ? 'Sin línea de visión: un muro, el cofre u otro monstruo lo tapa.'
    : `Te faltan puntos: cada golpe cuesta <b>${need}</b> de Atq y te quedan <b>${have}</b>.`;

  async function onTile(i) {
    if (G.phase !== 'move' || busy) return;
    const lv = LEVELS[G.levelIdx];
    const m = G.mons.find(o => idx(o.x, o.y) === i);
    // Corona de laurel: elegir al monstruo
    if (mode === 'laurelPick') {
      if (!m) { say('Toca a un monstruo.'); return; }
      if (!E.useItem(G, 'laurel')) { mode = null; render(); return; }
      E.laurelStart(G, m); mode = null; render();
      say(`<b>Corona de laurel.</b> El monstruo tiene <b>${G.laurel.spdLeft}</b> de Mov y <b>${G.laurel.atkLeft}</b> de Atq. Toca una casilla marcada para moverlo o a otro monstruo para atacarlo.`);
      return;
    }
    // Corona de laurel: orden en curso
    if (G.laurel) {
      const me = E.laurelMon(G);
      if (m && m !== me) {
        const info = E.laurelAttackInfo(G, m);
        if (!info.ok) {
          say(info.why === 'range' ? `Ese monstruo está a distancia <b>${info.rd}</b> y el que obedece alcanza <b>${E.mStat(G, me, 'rng')}</b>.`
            : info.why === 'los' ? 'Sin línea de visión: algo lo tapa.'
            : `Le faltan puntos: golpear cuesta <b>${E.mStat(G, m, 'def')}</b> de Atq y le quedan <b>${G.laurel.atkLeft}</b>.`);
          return;
        }
        const dead = E.laurelAttack(G, m);
        sfxStrike(dead);
        floatText(m.x, m.y, dead ? '✕' : '−1', 'good');
        hitFx(m); render();
        if (E.levelCleared(G)) { E.laurelEnd(G); levelClear(); return; }
        say(dead ? '<b>¡Abatido por su propio compañero!</b>' : `Golpe. Le quedan <b>${m.hp}</b> de Vida.`);
        return;
      }
      if (m === me || lv.walls[i]) return;
      const path = E.laurelMove(G, i);
      if (!path) { say('Esa casilla no vale: está fuera de su Movimiento o no hay camino.'); return; }
      busy = true;
      const el = tok.mons.get(me.id); if (el) el.dataset.anim = '1';
      render();
      say('El monstruo obedece…');
      if (el) await glide(el, path, G.laurel ? Math.max(1, E.mStat(G, me, 'spd')) : 1);
      busy = false; render();
      say(`Le quedan <b>${G.laurel.spdLeft}</b> de Mov y <b>${G.laurel.atkLeft}</b> de Atq.`);
      return;
    }
    // Habilidad del Nigromante
    if (mode === 'necro') {
      if (!m) { say('Toca a un monstruo.'); return; }
      const info = E.necroInfo(G, m);
      if (!info.ok) { say(whyMsg(info, 0, 0, 'Ese monstruo')); return; }
      mode = null;
      const dead = E.necroStrike(G, m);
      sfxStrike(dead); sfxHurt();
      floatText(m.x, m.y, dead ? '✕' : '−1', 'good'); floatText(G.adv.x, G.adv.y, '−1', 'dmg');
      hitFx(m);
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(`<b>Sacrificio.</b> Pierdes 1 de Vida y ${dead ? 'el monstruo cae' : `le quedan <b>${m.hp}</b> de Vida`}.`);
      return;
    }
    // Habilidad del Cazador de demonios
    if (mode === 'demonPick') {
      if (!m) { say('Toca a un monstruo.'); return; }
      mode = { demon: m }; render();
      say('Ahora toca la casilla marcada a la que lo mueves (hasta 3 de Mov).');
      return;
    }
    if (mode && mode.demon) {
      const mm = mode.demon;
      if (m && m !== mm) { mode = { demon: m }; render(); say('Elige a qué casilla mueves a ese otro monstruo.'); return; }
      const path = E.demonMove(G, mm, i);
      if (!path) { say('Esa casilla no vale: debe estar libre y a 3 de Mov como máximo del monstruo.'); return; }
      mode = null; busy = true;
      const el = tok.mons.get(mm.id); if (el) el.dataset.anim = '1';
      render();
      say('Mueves al monstruo…');
      if (el) await glide(el, path, 3);
      busy = false;
      render();
      say('<b>Cazador de demonios.</b> El monstruo cambia de sitio.');
      return;
    }
    if (G.chest && !G.chest.open && i === G.chest.at) {
      const info = E.chestInfo(G);
      if (!info.ok) { say(whyMsg(info, G.chest.val, E.atkAvail(G), 'El cofre')); return; }
      const val = G.chest.val;
      E.openChest(G);
      Sfx.play('chest');
      floatText(...XY(i), '+' + val, 'good');
      render();
      say(`<b>Cofre abierto.</b> Ganas <b>${val}</b> punto${val > 1 ? 's' : ''} de botín para sumar a una habilidad en tus próximas fases de Energía.`);
      return;
    }
    if (G.stone && !G.stone.broken && i === G.stone.at) {
      const info = E.stoneInfo(G);
      if (!info.ok) { say(whyMsg(info, G.stone.val, E.atkAvail(G), 'La piedra')); return; }
      const val = G.stone.val, dmgM = G.fist ? 2 : 1;
      const before = G.mons.map(o => [o.x, o.y]);
      const alive = E.breakStone(G);
      if (G.mons.length < before.length) sfxKill(); else Sfx.play('atk');
      if (alive) sfxHurt();
      for (const [x, y] of before) floatText(x, y, '−' + dmgM, 'good');
      floatText(G.adv.x, G.adv.y, '−1', 'dmg');
      tok.adv.classList.add('hurt'); setTimeout(() => tok.adv.classList.remove('hurt'), 500);
      const rev = G.revived; G.revived = false;
      if (!alive) { G.phase = 'dead'; render(); deathSheet(); return; }
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(`<b>La Piedra de la Perdición se rompe</b> (−${val} Atq). Todos los monstruos reciben ${dmgM} de daño y tú 1.${rev ? ' <b>Colgante de alma:</b> vuelves con 1 de Vida.' : ''}`);
      return;
    }
    if (lv.walls[i]) return;
    if (m) {
      const info = E.attackInfo(G, m);
      if (!info.ok) { say(whyMsg(info, E.mStat(G, m, 'def'), E.atkAvail(G), 'Ese monstruo')); return; }
      const dead = E.attackMon(G, m);
      sfxStrike(dead);
      floatText(m.x, m.y, dead ? '✕' : '−1', 'good');
      hitFx(m);
      render();
      if (E.levelCleared(G)) { levelClear(); return; }
      say(dead ? `<b>${lv.mon.name} abatido.</b>` : `Golpe. Le quedan <b>${m.hp}</b> de Vida.`);
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
      say(boarding ? '¡Al abordaje!' : 'Te mueves…');
      await glide(tok.adv, path, boarding ? 14 : G.turn.spd);
      busy = false;
      render();
      say(`${boarding ? 'Abordaje.' : 'Te mueves.'}${E.blizzPen(G) ? ' <b>Ventisca:</b> −1 a tu Atq y Def mientras estés aquí.' : ''}`);
    } else if (R.dist[i] < Infinity) say(`Llegar ahí cuesta <b>${R.dist[i]}</b> de Mov y te quedan <b>${G.turn.spdLeft}</b>.`);
    else say('No hay camino hasta esa casilla.');
  }

  /* ---------- objetos ---------- */
  function itemSheet(id) {
    if (busy || rolling || !G || G.phase === 'monsters') return;
    const it = ITEMS[id], ok = E.itemUsable(G, id);
    const why = id === 'herbs' ? 'Se te ofrecerá sola cuando un ataque te haga daño.'
      : id === 'cloak' ? 'Úsala en la fase de Energía o de movimiento, en un nivel con ventiscas.'
      : id === 'sands' ? 'Úsala en la fase de Energía o de movimiento, en un nivel con agua.'
      : id === 'holy' ? 'Úsala en la fase de Energía o de movimiento, en un nivel con casillas malditas.'
      : id === 'fist' ? 'Úsala en tu fase de movimiento, antes de romper la Piedra de la Perdición.'
      : id === 'laurel' ? 'Solo en tu fase de movimiento y ataque, con monstruos en el mapa. Al terminar la orden acaba tu turno.'
      : id === 'pendant' ? 'Se usa sola cuando tu Vida llegaría a 0.'
      : id === 'mail' ? 'Se te ofrecerá sola cuando un ataque te haga daño.'
      : id === 'gorgon' ? 'Úsala en la fase de Energía o de movimiento; ese turno los monstruos no se mueven.'
      : id === 'flame' || id === 'eye' ? 'Solo en la fase de Energía, con los dados ya tirados.'
      : id === 'hourglass' ? 'Solo en tu fase de movimiento y ataque, antes de que actúen los monstruos.'
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
    if (id === 'eye') { eyeSheet(); return; }
    if (id === 'laurel') {
      if (!E.itemUsable(G, 'laurel')) return;
      mode = 'laurelPick'; render();
      say('<b>Corona de laurel.</b> Toca el monstruo al que das la orden. Se moverá y atacará a otros monstruos con sus propias cifras.');
      return;
    }
    if (!E.useItem(G, id)) return;
    render();
    const t = G.turn;
    if (id === 'cloak') say('<b>Capa de cuero.</b> Ignoras las ventiscas hasta el final del nivel.');
    else if (id === 'axe') say(`<b>Cuerda y piolet.</b> Este turno: Atq <b>${t.atk}</b> (te quedan <b>${E.atkAvail(G)}</b>) y Alcance <b>${t.rng}</b>.`);
    else if (id === 'wyrm') say(`<b>Extracto de Wyrm.</b> Mov +4: te quedan <b>${t.spdLeft}</b>.`);
    else if (id === 'powder') say('<b>Pólvora negra.</b> Tu próximo golpe daña también a todos los demás monstruos.');
    else if (id === 'sands') say('<b>Arenas ocultas.</b> Los monstruos ignoran el agua hasta el final del nivel.');
    else if (id === 'gorgon') say('<b>Cabeza de Gorgona.</b> Este turno los monstruos no se moverán.');
    else if (id === 'holy') say('<b>Agua bendita.</b> Los monstruos ignoran las casillas malditas hasta el final del nivel.');
    else if (id === 'fist') say('<b>Puño de hierro.</b> Al romper la Piedra, los monstruos recibirán 2 de daño.');
    else if (id === 'hourglass') say('<b>Reloj de arena.</b> Los monstruos no actúan: nueva fase de Energía. Tira los dados.');
  }

  function eyeSheet() {
    const t = G.turn;
    openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.eye}</span><h3>Ojo de dragón</h3></div>
      <p class="lead">Elige el dado que se convertirá en un D12. Se tira de nuevo y lo asignas como un dado normal.</p>
      <div class="dice-row pick">${[0, 1, 2].map(i => t.lock === i ? dieHTML(t.dice[i], 'locked')
        : dieHTML(t.dice[i], '').replace('<span class="die', `<button type="button" data-e="${i}" class="die`).replace('</span>', '</button>')).join('')}</div>
      <button type="button" class="btn" id="eNo">Cancelar</button>`, [['#eNo', closeSheet]], true);
    document.querySelectorAll('#veil [data-e]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.e;
      closeSheet();
      keepSet = new Set([0, 1, 2].filter(x => x !== i));
      if (!E.useEye(G, i)) { keepSet = new Set(); return; }
      animateRoll(`<b>Ojo de dragón.</b> Sacas un <b>${G.turn.dice[i]}</b> con el D12. Reparte o revisa tu reparto.`);
    }));
  }

  // Botín del cofre: cuántos puntos y a qué habilidad suman este turno
  function lootSheet(k0, n0) {
    const t = G.turn;
    let k = k0 || (t.loot && t.loot.k) || null, n = n0 || (t.loot && t.loot.n) || 1;
    n = Math.max(1, Math.min(n, G.loot));
    openSheet(`<div class="item-head"><span class="ico">${ICON_CHEST}</span><h3>Botín del cofre</h3></div>
      <p class="lead">Tienes <b>${G.loot}</b> punto${G.loot > 1 ? 's' : ''}. Este turno solo puedes sumarlos a <b>una</b> habilidad; lo que no gastes se queda para otro turno.</p>
      <div class="choices">${['spd', 'atk', 'def', 'rng'].map(x => `<button type="button" class="choice ${k === x ? 'chosen' : ''}" data-lk="${x}"><b>${LONG[x]}</b><span>${x === 'rng' && !t.ranger ? 'Alcance' : 'suma ' + n}</span></button>`).join('')}</div>
      <div class="stepper"><button type="button" class="btn mini" id="lMinus" ${n <= 1 ? 'disabled' : ''}>−</button><b>${n}</b><button type="button" class="btn mini" id="lPlus" ${n >= G.loot ? 'disabled' : ''}>+</button></div>
      <button type="button" class="btn primary" id="lOk" ${k ? '' : 'disabled'}>Sumar ${n} a ${k ? LONG[k] : '…'}</button>
      <button type="button" class="btn" id="lClear">Quitar botín</button>`,
      [['#lMinus', () => lootSheet(k, n - 1)], ['#lPlus', () => lootSheet(k, n + 1)],
       ['#lOk', () => { E.setLoot(G, k, n); closeSheet(); render(); say(`Botín: <b>+${n}</b> a ${LONG[k]}.`); }],
       ['#lClear', () => { E.setLoot(G, null, 0); closeSheet(); render(); }]], true);
    document.querySelectorAll('#veil [data-lk]').forEach(b => b.addEventListener('click', () => lootSheet(b.dataset.lk, n)));
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

  function askMail(e) {
    return new Promise(res => {
      const w = Math.floor(e.total / (e.def + 3));
      openSheet(`<div class="item-head"><span class="ico">${ITEM_ICONS.mail}</span><h3>Cota de malla</h3></div>
        <p class="lead">Te van a hacer <b>${e.dmg}</b> de daño. Con la cota tu Defensa sube de <b>${e.def}</b> a <b>${e.def + 3}</b> y recibirías <b>${w}</b>. Se gasta al usarla.</p>
        <button type="button" class="btn primary" id="mUse">Usar la cota (${w})</button>
        <button type="button" class="btn" id="mNo">Recibir ${e.dmg}</button>`,
        [['#mUse', () => { closeSheet(); res(true); }], ['#mNo', () => { closeSheet(); res(false); }]], false);
    });
  }

  async function levelClear() {
    busy = true; mode = null;
    G.phase = 'clear';
    noteBest();
    render();
    say(`<b>${LEVELS[G.levelIdx].boss ? 'Jefe derrotado.' : 'Nivel superado.'}</b>`);
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
      <p class="lead">Antes de seguir, te espera ${G.game === 'hell' ? 'un jefe del Infierno' : "un comandante de M'Guf-yn"}. Este mapa es una prolongación del nivel: <b>no puedes mejorar ni curarte</b> antes del combate.${G.loot > 0 ? ` Conservas <b>${G.loot}</b> punto${G.loot > 1 ? 's' : ''} del cofre.` : ''}</p>
      <div class="stats boss-stats"><div><b>${m.hp}</b><span>Vida</span></div><div><b>${m.spd}</b><span>Vel</span></div><div><b>${m.atk}</b><span>Atq</span></div><div><b>${m.def}</b><span>Def</span></div><div><b>${m.rng}</b><span>Alc</span></div></div>
      <button type="button" class="btn primary" id="bGo">Enfrentarlo</button>`, [['#bGo', goBoss]], false);
  }

  async function goBoss() {
    closeSheet();
    busy = true;
    await flipTo(() => { E.nextLevel(G); builtLevel = -1; busy = false; render(); say(`<b>${LEVELS[G.levelIdx].mon.name}.</b> Es un jefe: lo representa un dado de 12 caras.`); });
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
            sfxHurt();
            floatText(G.adv.x, G.adv.y, '−' + dmg, 'dmg');
            tok.adv.classList.add('hurt'); setTimeout(() => tok.adv.classList.remove('hurt'), 500);
          } else {
            if (!willBlock) { Sfx.play('atk'); await sleep(350); }   // el daño se anuló tras usar cota/hierbas: primero el ataque
            Sfx.play('blk');
            floatText(G.adv.x, G.adv.y, 'BLOCK', 'dmg block');
            tok.adv.classList.add('blocked'); setTimeout(() => tok.adv.classList.remove('blocked'), 600);
          }
          renderHP();
          say(`Atacan <b>${e.ids.length}</b>: Ataque total <b>${e.total}</b> ÷ Defensa <b>${e.def}</b> = <b>${e.dmg}</b> de daño.${e.dmg ? (dmg < e.dmg ? `${usedMail ? ' Con la cota' : ''}${usedHerbs ? (usedMail ? ' y las hierbas' : ' Con las hierbas') : ''} recibes <b>${dmg}</b>.` : '') : ' <b>¡Bloqueado!</b>'}`);
          await sleep(650);
        } else say('Ningún monstruo te alcanza este turno.');
      }
    }
    G.totalTurns++;
    E.endTurnCleanup(G);
    busy = false;
    if (G.phase === 'dead') { render(); deathSheet(); return; }
    render();
    if (G.revived) { G.revived = false; say('<b>Colgante de alma.</b> Caes, pero vuelves a la vida con 1 de Vida. Tira los dados.'); }
    else if (!ev.some(e => e.t === 'attack' && e.ids.length)) say('Ningún monstruo te alcanza. Tira los dados.');
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
      else if (b.id === 'btnLaurelNo') { mode = null; render(); say('Orden cancelada: conservas la Corona.'); }
      else if (b.id === 'btnLaurelEnd') { E.laurelEnd(G); render(); endTurn(); }
    });
    $('#items').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) itemSheet(b.dataset.item); });
    $('#loot').addEventListener('click', e => { if (e.target.closest('#btnLoot') && G && G.phase === 'energy' && G.turn.dice && !rolling) lootSheet(); });
    $('#btnRules').addEventListener('click', rulesSheet);
    $('#btnPass').addEventListener('click', passwordSheet);
    $('#btnSnd').addEventListener('click', soundSheet); Sfx.paint();
    if (window.ResizeObserver) new ResizeObserver(() => { const w = $('#boxBoard').clientWidth; if (w !== lastW) { lastW = w; fitSoon(); } }).observe($('#boxBoard'));
    window.addEventListener('resize', fitSoon);
    window.addEventListener('orientationchange', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
    if (DESK.addEventListener) DESK.addEventListener('change', fitSoon);
    $('#sysBox').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || !G) return;
      if (b.dataset.act === 'snd') soundSheet(); else if (b.dataset.act === 'rules') rulesSheet(); else if (b.dataset.act === 'pass') passwordSheet(); else if (b.dataset.act === 'menu') goMenu();
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
      bar.innerHTML = '<span>Hay una versión nueva del juego.</span><button type="button" class="btn mini">Actualizar</button>';
      bar.querySelector('button').addEventListener('click', () => location.reload());
      document.body.appendChild(bar);
    }).catch(() => {});
  }
  function start(data) {
    loadBest();
    checkUpdate();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
    setInterval(checkUpdate, 600000);
    wire();
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => (G ? JSON.parse(JSON.stringify(G)) : null));
    if (data && validState(data)) resume(data); else menuScreen();
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
