(function () {
  const LM = window.LM;
  const E = LM.engine;
  const $ = id => document.getElementById(id);
  const cv = $('scene'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let state = null;
  let view = 'title';
  let tempoSel = 'steady';
  let hand = null;
  let titleImg = null;
  let wmColor = null;
  let typeTimer = null;
  let galleryReturn = 'title';

  const img = new Image();
  img.onload = () => { titleImg = img; };
  img.src = 'assets/web/title-key-art-v2.jpg';

  /* ---------- audio ---------- */
  let AC = null, master = null, ambGain = null, drone = null, muted = LM.save.mute();
  function audio() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(AC.destination);
      const len = AC.sampleRate * 2;
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      ambGain = AC.createGain(); ambGain.gain.value = 0.035;
      src.connect(lp); lp.connect(ambGain); ambGain.connect(master);
      src.start();
      drone = AC.createOscillator(); drone.type = 'sine'; drone.frequency.value = 98;
      const dg = AC.createGain(); dg.gain.value = 0.02;
      drone.connect(dg); dg.connect(master); drone.start();
    } catch (e) { AC = null; }
  }
  function tone(freq, dur, type, vol, when) {
    if (!AC) return;
    const t0 = AC.currentTime + (when || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noiseBurst(dur, freq, vol) {
    if (!AC) return;
    const len = AC.sampleRate * dur;
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = AC.createBufferSource(); s.buffer = buf;
    const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = AC.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const SFX = {
    click() { tone(660, 0.06, 'square', 0.05); },
    crisis() { tone(82, 0.3, 'sine', 0.22); tone(60, 0.4, 'sine', 0.15, 0.05); },
    battle() { noiseBurst(0.3, 200, 0.25); tone(55, 0.4, 'sine', 0.25); },
    river() { noiseBurst(0.5, 900, 0.18); },
    fork() { tone(330, 0.12, 'triangle', 0.1); tone(220, 0.2, 'triangle', 0.1, 0.12); },
    bugle() { [392, 494, 587].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.18)); },
    sad() { tone(55, 1.0, 'sine', 0.2); tone(41, 1.2, 'sine', 0.15, 0.2); }
  };
  function setMute(v) {
    muted = v; LM.save.setMute(v);
    if (master) master.gain.value = v ? 0 : 1;
    $('mutebtn').textContent = v ? '灯·灭' : '灯·亮';
  }
  $('mutebtn').textContent = muted ? '灯·灭' : '灯·亮';
  $('mutebtn').onclick = () => { audio(); setMute(!muted); SFX.click(); };
  document.addEventListener('pointerdown', () => { audio(); if (AC && AC.state === 'suspended') AC.resume(); }, { once: false });

  /* ---------- scene renderer (generated backgrounds + cutout sprites) ---------- */
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);
  const RAIN = Array.from({ length: 46 }, () => [rnd() * 960, rnd() * 288, 8 + rnd() * 10]);
  const SNOW = Array.from({ length: 60 }, () => [rnd() * 960, rnd() * 288, 2 + rnd() * 4]);
  const FOG = Array.from({ length: 14 }, () => [rnd() * 960, 100 + rnd() * 150, 60 + rnd() * 120]);
  const DUST = Array.from({ length: 18 }, () => [rnd() * 960, 200 + rnd() * 80]);

  const VH = 288;
  const BGCFG = {
    title: { y0: 105 }, depart: { y0: 66 }, xiang: { y0: 60 }, town: { y0: 66 },
    river: { y0: 60 }, bridge: { y0: 40, bridge: true }, snow: { y0: 45 },
    marsh: { y0: 56 }, loess: { y0: 56 }, camp: { y0: 56 }
  };
  const bgCache = {}, spr = {};
  function loadBG(name, src) {
    const im = new Image();
    im.onload = () => {
      const oc = document.createElement('canvas');
      oc.width = 480; oc.height = 270;
      const c = oc.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(im, 0, 0, 480, 270);
      bgCache[name] = oc;
    };
    im.src = src;
  }
  loadBG('title', 'assets/web/title-key-art-v2.jpg');
  ['depart', 'xiang', 'town', 'river', 'bridge', 'snow', 'marsh', 'loess', 'camp']
    .forEach(t => loadBG(t, 'assets/web/bg-' + t + '.jpg'));
  ['walk-a', 'walk-b', 'flag', 'rest', 'rest-b', 'rest-1', 'rest-2', 'stand', 'enemy', 'enemy-b'].forEach(n => {
    const im = new Image();
    im.onload = () => {
      spr[n] = im;
      if (n === 'enemy' || n === 'enemy-b') {
        const oc = document.createElement('canvas');
        oc.width = im.width; oc.height = im.height;
        const c = oc.getContext('2d');
        c.drawImage(im, 0, 0);
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = 'rgba(16,22,32,.82)';
        c.fillRect(0, 0, oc.width, oc.height);
        spr[n === 'enemy' ? 'enemyDark' : 'enemyDarkB'] = oc;
      }
    };
    im.src = 'assets/web/spr-' + n + '.png';
  });

  let t = 0, prevT = 0, marchD = 0, stepN = 0, stepAcc = 0, eN = 0, eAcc = 0, restProg = 0, endSince = null;
  function tick(dt) {
    const resting = tempoSel === 'rest' && view === 'play';
    const rate = dt / 0.5;
    restProg += Math.max(-rate, Math.min(rate, (resting ? 1 : 0) - restProg));
    if (!resting && restProg === 0) {
      let iv = tempoSel === 'rush' ? 0.16 : 0.26;
      const th = state ? E.theme(state) : 'title';
      if (th === 'snow') iv /= 0.6;
      if (th === 'marsh') iv /= 0.55;
      if (BGCFG[th] && BGCFG[th].bridge) iv /= 0.8;
      stepAcc += dt / iv;
      while (stepAcc >= 1) { stepAcc -= 1; marchD += 3; stepN++; }
    }
    eAcc += dt / 0.3;
    while (eAcc >= 1) { eAcc -= 1; eN++; }
  }
  function groundArt(theme, x) {
    const cfg = BGCFG[theme] || BGCFG.title;
    if (cfg.bridge) {
      const u = Math.min(1, Math.max(0, (x - 110) / 260));
      return 167 + Math.sin(u * Math.PI) * 12 - u * u * 19;
    }
    return cfg.y0 + 134;
  }
  function drawSprite(img, xArt, feetArt, y0, alpha) {
    if (!img) return;
    const y = (feetArt - y0) * 2;
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(xArt * 2), Math.round(y - img.height * 2), img.width * 2, img.height * 2);
    if (alpha != null) ctx.globalAlpha = 1;
  }
  function column(theme, cfg) {
    const n = state ? Math.max(5, Math.min(12, 5 + Math.round(state.tr / 12))) : 9;
    const seq = [spr.stand, spr['rest-1'], spr['rest-2'], spr.rest];
    for (let i = 0; i < n; i++) {
      const x = cfg.bridge
        ? 112 + ((marchD + i * 22) % 250)
        : ((marchD + i * 26) % 520) - 20;
      const g = Math.round(groundArt(theme, x));
      if (i === 0) { drawSprite(spr.flag, x, g, cfg.y0); continue; }
      const p = Math.max(0, Math.min(1, restProg * 1.25 - i * 0.05));
      if (p <= 0) drawSprite(spr[(stepN + i) % 2 ? 'walk-a' : 'walk-b'], x, g, cfg.y0);
      else if (p < 1) drawSprite(seq[Math.min(3, (p * 4) | 0)], x, g, cfg.y0);
      else drawSprite((t * 1.2 | 0) % 2 ? spr.rest : spr['rest-b'], x, g, cfg.y0);
    }
  }
  function pursuitGhosts(theme, cfg) {
    if (!state || state.pursuit > 2 || view !== 'play') return;
    const n = 3 - state.pursuit;
    for (let i = 0; i < n; i++) {
      const x = 6 + i * 18 + (eN % 2);
      drawSprite((eN + i) % 2 ? spr.enemyDark : spr.enemyDarkB, x, Math.round(groundArt(theme, x)), cfg.y0, 0.65);
    }
  }
  function drawScene(theme) {
    const cfg = BGCFG[theme] || BGCFG.title;
    const bg = bgCache[theme] || bgCache.title;
    P(0, 0, 960, VH, '#1a2230');
    if (bg) ctx.drawImage(bg, 0, cfg.y0, 480, 144, 0, 0, 960, VH);
    if (theme === 'xiang') {
      RAIN.forEach(([x, y, s], i) => { const yy = (y + t * 260 + i * 13) % VH; P((x + yy * 0.3) % 960, yy, 2, s, 'rgba(120,140,170,.55)'); });
      for (let i = 0; i < 8; i++) P(700 + i * 22, 120 - ((t * 30 + i * 9) % 40), 4, 6, i % 2 ? 'rgba(224,138,60,.8)' : 'rgba(192,57,43,.8)');
    } else if (theme === 'snow') {
      SNOW.forEach(([x, y, s], i) => { const yy = (y + t * (40 + s * 20) + i * 9) % VH; P((x + Math.sin(t + i) * 16 + 960) % 960, yy, s > 3 ? 4 : 2, s > 3 ? 4 : 2, 'rgba(240,238,230,.9)'); });
    } else if (theme === 'marsh' || theme === 'town') {
      FOG.forEach(([x, y, w], i) => P((x + t * 10 + i * 30) % 1080 - 120, y, w, 4, 'rgba(190,200,205,.08)'));
    } else if (theme === 'camp') {
      for (let i = 0; i < 10; i++) P(180 + i * 60 + Math.sin(t * 2 + i) * 6, 200 - ((t * 24 + i * 11) % 60), 3, 3, 'rgba(224,138,60,.7)');
    } else if (theme === 'loess') {
      DUST.forEach(([x, y], i) => P((x + t * 24 + i * 40) % 960, y, 4, 2, 'rgba(217,176,113,.4)'));
    } else if (theme === 'depart' || theme === 'title') {
      if ((t * 3 | 0) % 2) P(theme === 'title' ? 210 : 268, theme === 'title' ? 110 : 176, 4, 4, 'rgba(240,192,96,.5)');
    } else if (theme === 'river') {
      for (let i = 0; i < 12; i++) P((i * 83 + t * 40) % 960, 150 + (i % 3) * 24, 6, 2, 'rgba(200,220,235,.5)');
    }
    if (theme === 'title') return;
    if (view === 'end') {
      if (endSince === null) endSince = t;
      const e = t - endSince;
      if (endGrade === 'A' && spr.flag) {
        [120, 240, 360].forEach((x, i) => { if (e > i * 0.25) drawSprite(spr.flag, x, Math.round(groundArt(theme, x)), cfg.y0); });
      } else {
        const seq = [spr.stand, spr['rest-1'], spr['rest-2'], spr.rest];
        [160, 260, 340].forEach((x, i) => {
          const p = Math.max(0, Math.min(1, (e - i * 0.12) / 0.6));
          const img = p <= 0 ? spr.stand : p < 1 ? seq[Math.min(3, (p * 4) | 0)] : ((t * 1.2 | 0) % 2 ? spr.rest : spr['rest-b']);
          drawSprite(img, x, Math.round(groundArt(theme, x)), cfg.y0);
        });
      }
      return;
    }
    if (state) column(theme, cfg);
    pursuitGhosts(theme, cfg);
  }

  let endGrade = null;
  let endTheme = null;
  function loop(ts) {
    t = ts / 1000;
    const dt = Math.min(0.1, Math.max(0, t - prevT));
    prevT = t;
    tick(dt);
    ctx.clearRect(0, 0, 960, VH);
    if (view === 'title' || view === 'select' || view === 'form' || view === 'gallery') drawScene('title');
    else if (view === 'end') drawScene(endTheme || 'loess');
    else if (state) drawScene(E.theme(state));
    else drawScene('title');
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- scaling ---------- */
  let veilDismissed = false;
  function fit() {
    const W = window.innerWidth, H = window.innerHeight;
    let k = Math.max(0.34, Math.min((W - 16) / 960, (H - 16) / 540));
    const box = $('stagebox');
    box.style.width = 960 * k + 'px';
    box.style.height = 540 * k + 'px';
    $('stage').style.transform = `scale(${k})`;
    const wide = W >= 1280 && W - 960 * k >= 2 * 284 + 32;
    ['sideleft', 'sideright'].forEach(id => {
      const el = $(id);
      el.style.display = wide ? 'flex' : 'none';
      el.style.maxHeight = Math.min(540 * k, H - 48) + 'px';
    });
    if (wide) {
      const cx = W / 2;
      $('sideleft').style.left = Math.max(8, cx - 480 * k - 284) + 'px';
      $('sideright').style.right = Math.max(8, cx - 480 * k - 284) + 'px';
    }
    const portrait = W < 700 && H > W;
    $('rotateveil').classList.toggle('show', portrait && !veilDismissed);
  }
  $('rotateanyway').onclick = () => { veilDismissed = true; SFX.click(); fit(); };
  window.addEventListener('resize', fit);
  fit();

  /* ---------- screens ---------- */
  const SCREENS = ['title-screen', 'select-screen', 'form-screen', 'cut-screen', 'fork-screen', 'reunion-screen', 'end-screen', 'gallery-screen'];
  function show(id) {
    SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id));
    view = id ? id.replace('-screen', '') : 'play';
    if (id === 'title-screen') view = 'title';
    if (!id) view = state && state.phase === 'ended' ? 'end' : 'play';
    if (view !== 'end') endSince = null;
    const chrome = view === 'play' || view === 'cut' || view === 'fork' || view === 'reunion' || view === 'end';
    ['hud', 'controls', 'newsline', 'logline', 'eventbox'].forEach(x => { $(x).style.visibility = chrome ? '' : 'hidden'; });
    document.querySelectorAll('.side').forEach(el => { el.style.visibility = chrome ? '' : 'hidden'; });
  }
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 1400);
  }
  function flash() {
    const el = $('flash');
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }

  /* ---------- HUD ---------- */
  const fmt = n => Math.round(n).toLocaleString('en-US');
  function hud() {
    if (!state) return;
    const a = E.act(state);
    $('actlabel').textContent = `幕${'一二三四五六'[state.actIdx]} · ${a.title}`;
    $('turnlabel').textContent = a.turns[state.turnIdx];
    const pct = Math.min(100, state.mileage / state.team.target * 100);
    $('mibar').style.width = pct + '%';
    $('milabel').textContent = `${fmt(Math.min(state.mileage, state.team.target))} / ${fmt(state.team.target)} 里`;
    const stars = $('mistars');
    if (!stars.childElementCount) for (let i = 1; i <= 10; i++) { const s = document.createElement('i'); s.style.left = (i * 9.09) + '%'; stars.appendChild(s); }
    [...stars.children].forEach((s, i) => { s.style.opacity = pct >= (i + 1) * 9.09 ? 1 : 0.15; });
    $('pfill').style.width = (state.pursuit / 9 * 100) + '%';
    $('plabel').textContent = state.pursuit + '日';
    $('pursuit').classList.toggle('hot', state.pursuit <= 2);
    const trAbs = Math.round(state.team.initial * state.tr / 100);
    $('trv').textContent = Math.round(state.tr) + '%';
    $('trstat').title = `约 ${fmt(trAbs)} 人`;
    $('suv').textContent = Math.round(state.su);
    $('mov').textContent = Math.round(state.mo);
    $('fav').textContent = Math.round(state.fa);
    $('trbar').firstElementChild.style.width = Math.min(100, state.tr) + '%';
    $('subar').firstElementChild.style.width = state.su + '%';
    $('mobar').firstElementChild.style.width = state.mo + '%';
    $('fabar').firstElementChild.style.width = state.fa + '%';
    $('trstat').classList.toggle('low', state.tr < 25);
    $('sustat').classList.toggle('low', state.su < 25);
    $('mostat').classList.toggle('low', state.mo < 25);
    $('fastat').classList.toggle('low', state.fa < 25);
    $('newsline').textContent = a.news;
    dossier();
  }
  function dossier() {
    if (!state) return;
    const s = state, tm = s.team;
    const metaphor = (v, lo, mid, hi) => v >= 60 ? hi : v >= 35 ? mid : lo;
    $('dossier').innerHTML = `
      <p><span class="dk">${tm.numeral} · ${tm.name}</span>（${tm.alias}）</p>
      <p>${tm.from} · ${tm.date} 出发</p>
      <p>初始 ${fmt(tm.initial)} 人 · 目标 ${fmt(tm.target)} 里</p>
      <p class="dv">${tm.dossier}</p>
      <p><span class="dk">长板</span> ${tm.strength}</p>
      <p><span class="dk">瓶颈一</span> ${tm.bottlenecks[0]}</p>
      <p><span class="dk">瓶颈二</span> ${tm.bottlenecks[1]}</p>
      <p><span class="dk">群众</span> ${metaphor(s.S, '老乡的门关着。', '老乡愿意借粮。', '老乡把船都抬出来了。')}</p>
      <p><span class="dk">机动</span> ${metaphor(s.D, '队伍走得沉重。', '队伍走得开了。', '敌人被调成了陀螺。')}</p>
      <p><span class="dk">团结</span> ${metaphor(s.U, '内部有杂音。', '方向大体一致。', '几股绳拧成一股。')}</p>
      <p><span class="dk">纪实名言</span> 大事不虚，小事不拘。</p>`;
  }
  function chronicle(entry, stamp) {
    const el = document.createElement('div');
    el.className = 'logentry ' + entry.kind;
    el.innerHTML = `<span class="lt">[${stamp}]</span> ${entry.text}` + (entry.anchor ? ` <span class="anchor">——${entry.anchor}</span>` : '');
    $('chronicle').appendChild(el);
    $('chronicle').scrollTop = $('chronicle').scrollHeight;
  }
  function typewrite(text) {
    clearInterval(typeTimer);
    const el = $('logline');
    el.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 24);
  }

  /* ---------- cards & tempo ---------- */
  const FXNAME = { tr: '兵力', su: '给养', mo: '士气', fa: '信念', S: '群众', D: '机动', U: '团结', P: '追兵' };
  const FXSHORT = { tr: '兵', su: '粮', mo: '士', fa: '信', S: '众', D: '机', U: '团', P: '追' };
  function fxLines(fx) {
    const out = [];
    Object.keys(FXSHORT).forEach(k => {
      if (fx[k]) out.push(`<span class="${fx[k] < 0 ? 'neg' : ''}">${FXSHORT[k]}${fx[k] > 0 ? '+' : ''}${fx[k]}${k === 'tr' ? '%' : ''}</span>`);
      if (k === 'fa' && fx.mi) out.push(`程+${fmt(fx.mi * (state ? state.team.target : 25000))}`);
    });
    if (fx.river) out.push('甩追');
    if (fx.bridge) out.push('夺桥');
    if (fx.correct) out.push('纠偏');
    if (fx.permD) out.push(`机永+${fx.permD}`);
    return out.join('·');
  }
  function renderTempo() {
    const box = $('tempo');
    box.innerHTML = '';
    E.TEMPOS.forEach(tp => {
      const b = document.createElement('button');
      b.className = 'tempo' + (tempoSel === tp.id ? ' on' : '');
      b.textContent = tp.name;
      b.title = tp.desc;
      b.onclick = () => { tempoSel = tp.id; SFX.click(); renderTempo(); };
      box.appendChild(b);
    });
    const cur = E.TEMPOS.find(x => x.id === tempoSel);
    $('tempohint').textContent = `本回合走法：${cur.name} —— ${cur.desc}`;
  }
  function cardButton(opts) {
    const b = document.createElement('button');
    b.className = 'card' + (opts.warn ? ' warn' : '');
    const disabled = opts.req && !E.reqOk(state, opts.req);
    b.disabled = disabled;
    b.title = `${opts.name}　${Object.keys(opts.fx || {}).map(k => (FXNAME[k] || k) + (opts.fx[k] > 0 ? '+' : '') + opts.fx[k]).join(' ')}　${opts.anchor || ''}`;
    b.innerHTML = `<span class="cname">${opts.name}</span><span class="ctag">${opts.tag || ''}</span>
      <span class="cfx">${fxLines(opts.fx)}</span>
      ${disabled ? `<span class="creq">需 ${Object.keys(opts.req).map(k => FXNAME[k] + '≥' + opts.req[k]).join(' ')}</span>` : ''}
      <span class="canchor">${opts.anchor || ''}</span>`;
    b.onclick = opts.onclick;
    return b;
  }
  function renderHand() {
    const box = $('cards');
    box.innerHTML = '';
    const eb = $('eventbox');
    eb.className = '';
    eb.style.display = 'none';
    if (!hand) return;
    if (hand.mode === 'cards') {
      $('eventtitle').textContent = '【行军间隙】';
      $('eventtext').textContent = '选一张行动卡。节奏决定下回合的走法。';
      hand.cards.forEach((c, i) => {
        box.appendChild(cardButton({
          name: c.name, tag: c.tag, fx: c.fx, anchor: c.anchor, req: c.req, warn: c.warn,
          onclick: () => choose({ card: c })
        }));
      });
    } else if (hand.mode === 'crisis') {
      eb.className = 'crisis';
      eb.style.display = 'block';
      $('eventtitle').textContent = `【危机】${hand.crisis.title}`;
      $('eventtext').textContent = hand.crisis.text;
      hand.crisis.options.forEach(o => {
        box.appendChild(cardButton({
          name: o.label, tag: '应对', fx: o.fx, anchor: o.anchor, req: o.req,
          onclick: () => choose({ mode: 'crisis', crisisId: hand.crisis.id, option: o })
        }));
      });
      SFX.crisis();
    }
  }

  /* ---------- flow ---------- */
  function beginTurnUI() {
    hand = E.beginTurn(state);
    if (hand.mode === 'fork') {
      $('forkprompt').textContent = hand.fork.prompt;
      const box = $('forkopts');
      box.innerHTML = '';
      hand.fork.options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'forkopt';
        b.innerHTML = `${o.label}<div class="fd">${o.desc}</div>`;
        b.onclick = () => { SFX.fork(); choose({ mode: 'fork', forkId: hand.fork.id, option: o }); };
        box.appendChild(b);
      });
      show('fork-screen');
      return;
    }
    show(null);
    renderTempo();
    renderHand();
    hud();
  }
  function choose(choice) {
    if (!state || state.phase !== 'play') return;
    SFX.click();
    const stamp = `${E.act(state).turns[state.turnIdx]}`;
    const ev = E.resolve(state, tempoSel, choice);
    ev.logs.forEach(l => chronicle(l, stamp));
    const last = ev.logs.find(l => l.kind === 'note');
    if (last) typewrite(last.text);
    if (ev.battle) { SFX.battle(); flash(); toast('追兵咬住了队伍——恶战！'); }
    if (ev.river) { SFX.river(); toast('渡河成功——追兵被甩开了！'); }
    if (ev.fork === 'wrong') { flash(); toast('歧路由此开始。'); }
    LM.save.saveRun(state);
    hud();
    if (ev.ended) { showEnd(ev.ended); return; }
    if (ev.phase === 'reunion') { showReunion(); return; }
    if (ev.actEnd) { showCut(state.actIdx); return; }
    beginTurnUI();
  }
  function showCut(idx) {
    const a = LM.ACTS[state.teamId][idx];
    $('cuttitle').textContent = `幕${'一二三四五六'[idx]} · ${a.title}`;
    $('cutspan').textContent = a.span;
    const body = $('cutbody');
    body.innerHTML = '';
    a.intro.forEach(line => {
      const p = document.createElement('p');
      p.className = 'cutline'; p.textContent = line;
      body.appendChild(p);
    });
    const note = document.createElement('div');
    note.className = 'cutnote'; note.textContent = '纪实按语：' + a.note;
    body.appendChild(note);
    chronicle({ kind: 'note', text: `—— 幕${'一二三四五六'[idx]} · ${a.title} ——` }, a.span);
    if (drone) drone.frequency.value = [98, 87, 110, 82, 73, 110][idx];
    show('cut-screen');
  }
  $('cutbtn').onclick = () => { SFX.click(); beginTurnUI(); };

  function showReunion() {
    const r = LM.REUNION[state.teamId];
    $('telegram').innerHTML = `【会师电报 · ${r.place} · ${r.date}】<br>你的队伍已抵达西北，但与兄弟部队的联系尚未完全建立。<br><span class="warn">警告：若各路红军不能会合，力量将被逐个击破，长征的胜利无法最终确立。</span><br>是否与友军会合？（选 ${Math.min(2, r.allies.length)} 路）`;
    const box = $('allylist');
    box.innerHTML = '';
    const picked = new Set();
    r.allies.forEach(a => {
      const b = document.createElement('button');
      b.className = 'ally';
      b.innerHTML = `<span class="box"></span><span><span class="dv">${a.name}</span><div class="ad">${a.give} · 代价：${a.cost}</div><div class="ad">${a.line}</div></span>`;
      b.onclick = () => {
        SFX.click();
        if (picked.has(a.id)) picked.delete(a.id);
        else if (picked.size < Math.min(2, r.allies.length)) picked.add(a.id);
        b.classList.toggle('on', picked.has(a.id));
        $('reunionbtn').disabled = picked.size !== Math.min(2, r.allies.length);
      };
      box.appendChild(b);
    });
    $('reunionbtn').disabled = true;
    $('reunionbtn').onclick = () => { SFX.bugle(); finishReunion([...picked]); };
    $('refusebtn').onclick = () => { SFX.sad(); finishReunion(null); };
    show('reunion-screen');
  }
  function finishReunion(ids) {
    const ev = E.doReunion(state, ids);
    ev.logs.forEach(l => chronicle(l, '会师'));
    LM.save.clearRun();
    showEnd(ev.ended);
  }

  function showEnd(id) {
    const e = LM.ENDINGS.find(x => x.id === id);
    endGrade = e.grade; endTheme = e.theme;
    LM.save.unlock(id);
    LM.save.clearRun();
    $('endgrade').textContent = e.grade === 'X' ? '崩盘' : e.grade + ' 级';
    $('endgrade').className = 'endgrade ' + e.grade;
    $('endname').textContent = e.name;
    $('endtext').textContent = e.text;
    $('endanchor').textContent = '史实锚点：' + e.anchor;
    $('endstats').textContent = `里程 ${fmt(Math.min(state.mileage, state.team.target))} / ${fmt(state.team.target)} 里 · 兵力余 ${Math.round(state.tr)}%（约 ${fmt(state.team.initial * state.tr / 100)} 人） · 恶战 ${state.stats.battles} 次 · 渡河 ${state.stats.rivers} 次 · 休整 ${state.stats.rests} 回合`;
    const ul = $('reveal');
    ul.innerHTML = '';
    LM.REVEAL[state.teamId].forEach(line => {
      const li = document.createElement('li'); li.textContent = line; ul.appendChild(li);
    });
    if (e.grade === 'A') SFX.bugle(); else if (e.grade === 'X') SFX.sad(); else SFX.fork();
    show('end-screen');
    hud();
  }

  function showGallery(from) {
    galleryReturn = from;
    const g = LM.save.gallery();
    const got = Object.keys(g).length;
    $('gallerysub').textContent = `已解锁 ${got} / ${LM.ENDINGS.length} · 每一格都是一段走法。`;
    const grid = $('gallerygrid');
    grid.innerHTML = '';
    LM.ENDINGS.forEach(e => {
      const d = document.createElement('div');
      const has = !!g[e.id];
      d.className = 'gslot' + (has ? ' got' : ' locked');
      d.innerHTML = has
        ? `<div class="gn">${e.name}</div><div class="gg">${e.grade === 'X' ? '崩盘' : e.grade + ' 级'} · 达成 ${g[e.id]} 次</div>`
        : `<div class="gn">？？？</div><div class="gg">${e.grade === 'X' ? '崩盘' : e.grade + ' 级'} · 未解锁</div>`;
      grid.appendChild(d);
    });
    show('gallery-screen');
  }
  $('galleryback').onclick = () => {
    SFX.click();
    if (galleryReturn === 'end') show('end-screen');
    else { show('title-screen'); refreshTitle(); }
  };

  /* ---------- title / select ---------- */
  function refreshTitle() {
    $('continuebtn').style.display = LM.save.loadRun() ? '' : 'none';
  }
  $('startbtn').onclick = () => {
    audio(); SFX.click();
    const grid = $('teamgrid');
    grid.innerHTML = '';
    LM.TEAMS.forEach(tm => {
      const b = document.createElement('button');
      b.className = 'teamcard';
      b.innerHTML = `<span class="tn"><span class="tflag"></span>${tm.numeral} · ${tm.name}</span>
        <span class="td">${tm.from} · ${tm.date}</span>
        <span class="td">${fmt(tm.initial)} 人 · ${fmt(tm.target)} 里</span>
        <span class="tb">${tm.strength}</span>
        <span class="tb">${tm.bottlenecks[0]}</span>`;
      b.onclick = () => { SFX.click(); pickTeam(tm); };
      grid.appendChild(b);
    });
    show('select-screen');
  };
  let pendingTeam = null;
  function pickTeam(tm) {
    pendingTeam = tm;
    $('formsub').textContent = `${tm.name} · ${tm.intro}`;
    const list = $('formlist');
    list.innerHTML = '';
    LM.FORMATIONS.forEach(f => {
      const b = document.createElement('button');
      b.className = 'formcard';
      const fit = f.fit.includes(tm.id);
      b.innerHTML = `<span class="dv">${f.name}</span> ${fit ? '<span class="fd">· 适配本队</span>' : ''}
        <div class="fd">${f.desc}</div><div class="fp">错配代价：${f.penalty}</div>`;
      b.onclick = () => { SFX.click(); startRun(tm.id, f.id); };
      list.appendChild(b);
    });
    show('form-screen');
  }
  $('selectback').onclick = () => { SFX.click(); show('title-screen'); refreshTitle(); };
  $('formback').onclick = () => { SFX.click(); show('select-screen'); };
  function startRun(teamId, formId) {
    state = E.newGame(teamId, formId);
    tempoSel = 'steady';
    $('chronicle').innerHTML = '';
    chronicle({ kind: 'note', text: `${state.team.name} 从 ${state.team.from} 出发。${state.team.intro}` }, state.team.date);
    LM.save.saveRun(state);
    hud();
    showCut(0);
  }
  $('continuebtn').onclick = () => {
    const p = LM.save.loadRun();
    if (!p) return;
    SFX.click();
    state = p;
    tempoSel = 'steady';
    hud();
    beginTurnUI();
  };
  $('gallerybtn').onclick = () => { SFX.click(); showGallery('title'); };
  $('homebtn').onclick = () => {
    SFX.click();
    if (state && state.phase === 'play') LM.save.saveRun(state);
    state = null; hand = null;
    show('title-screen'); refreshTitle();
  };
  $('againbtn').onclick = () => { SFX.click(); state = null; show('select-screen'); $('startbtn').onclick(); };
  $('endgallerybtn').onclick = () => { SFX.click(); showGallery('end'); };
  $('endhomebtn').onclick = () => { SFX.click(); state = null; show('title-screen'); refreshTitle(); };

  document.addEventListener('keydown', ev => {
    if (ev.key >= '1' && ev.key <= '3') {
      const all = $('cards').querySelectorAll('button');
      const idx = +ev.key - 1;
      if (all[idx] && !all[idx].disabled) all[idx].click();
    }
    if (ev.key === 'q') tempoSel = 'rush', renderTempo();
    if (ev.key === 'w') tempoSel = 'steady', renderTempo();
    if (ev.key === 'e') tempoSel = 'rest', renderTempo();
    if (ev.key === ' ' && !$('cut-screen').classList.contains('hidden')) { ev.preventDefault(); $('cutbtn').click(); }
  });

  refreshTitle();
  show('title-screen');
})();