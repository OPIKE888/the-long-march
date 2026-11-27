(function (root) {
  const LM = (root.LM = root.LM || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TEMPOS = [
    { id: 'rush', name: '急行军', miMul: 1.6, suExtra: 4, trExtra: 1.5, mo: -3, p: 1, desc: '里程×1.6 · 给养−4 · 减员+2% · 甩开追兵' },
    { id: 'steady', name: '稳进', miMul: 1.0, suExtra: 0, trExtra: 0, mo: 0, p: 0, desc: '基准行军 · 无额外代价' },
    { id: 'rest', name: '休整', miMul: 0.3, suExtra: 0, trExtra: -0.5, mo: 5, p: -1, desc: '里程×0.3 · 给养减半 · 士气+5 · 追兵逼近' }
  ];

  function newGame(teamId, formationId) {
    const team = LM.TEAMS.find(t => t.id === teamId);
    const formation = LM.FORMATIONS.find(f => f.id === formationId);
    return {
      teamId, formationId, team, formation,
      actIdx: 0, turnIdx: 0,
      tr: 100, su: 75, mo: 65, fa: 70, S: 35, D: 30, U: 40,
      mileage: 0, pursuit: 4, freeTurns: 0,
      flags: {}, tags: [], log: [],
      phase: 'play', ended: null, reunionAccepted: false, allies: [],
      stats: { battles: 0, rivers: 0, rests: 0, cards: 0, crises: 0 }
    };
  }

  const act = s => LM.ACTS[s.teamId][Math.min(s.actIdx, 5)];
  const capOf = s => s.team.troopCap || (s.flags.south && s.teamId === '4th' ? 50 : 100);
  const theme = s => act(s).themes[s.turnIdx];
  const pressure = s => {
    if (s.freeTurns > 0) return 0;
    let p = act(s).pressure;
    if (s.teamId === '25' && s.actIdx === 3) p = 3;
    return p;
  };

  function reqOk(s, req) {
    if (!req) return true;
    return Object.keys(req).every(k => s[k] >= req[k]);
  }

  function drawCards(s) {
    const pool = LM.ACTIONS.filter(c =>
      (c.teams.includes('all') || c.teams.includes(s.teamId)) &&
      c.acts.includes(s.actIdx + 1) &&
      !(c.id === 'baizhang' && !s.flags.south)
    );
    const weighted = [];
    pool.forEach(c => {
      let w = c.teams.includes('all') ? 1 : 2;
      if (c.req && !reqOk(s, c.req)) w = 0.35;
      for (let i = 0; i < w * 2; i++) weighted.push(c);
    });
    const hand = [];
    let guard = 0;
    while (hand.length < 3 && guard++ < 200) {
      const c = weighted[Math.floor(Math.random() * weighted.length)];
      if (c && !hand.includes(c)) hand.push(c);
    }
    return hand;
  }

  function randomCrisis(s) {
    const t = theme(s);
    const map = { marsh: 'caodi', snow: 'gaoyuan', river: 'jinsha' };
    const id = map[t];
    if (!id) return null;
    if (id === 'jinsha' && s.actIdx !== 2) return null;
    let chance = 0.28 + (s.su < 35 ? 0.15 : 0) + (s.mo < 35 ? 0.1 : 0);
    if (Math.random() < chance) return LM.CRISES[id];
    return null;
  }

  function beginTurn(s) {
    if (s.phase !== 'play') return { mode: s.phase };
    const a = act(s);
    const forcedId = a.forced && a.forced[s.turnIdx];
    if (forcedId) {
      if (forcedId === 'dadu' && s.flags.bridge) { /* resolved */ }
      else if ((forcedId === 'baizhang' || forcedId === 'nanxia') && !s.flags.south) { /* skipped */ }
      else if (forcedId === 'nanxia' && s.flags.corrected) { /* skipped */ }
      else return { mode: 'crisis', crisis: LM.CRISES[forcedId], forced: true };
    }
    if (s.pursuit <= 1) return { mode: 'crisis', crisis: LM.CRISES.rearguard, forced: true };
    if (a.fork && s.turnIdx === a.fork.turn && !s.flags['fork_' + a.fork.id]) {
      return { mode: 'fork', fork: a.fork };
    }
    const rc = randomCrisis(s);
    if (rc) return { mode: 'crisis', crisis: rc, forced: false };
    return { mode: 'cards', cards: drawCards(s) };
  }

  function applyFx(s, fx, ev, srcTag) {
    if (!fx) return;
    const battleMul = (s.team.battleLossMul || 1) * (s.formationId === 'main' ? 0.7 : 1);
    const combat = srcTag === '突围' || srcTag === '突击';
    let tr = fx.tr || 0;
    if (tr < 0) {
      if (combat) tr *= battleMul * (s.formationId === 'mass' ? 1.5 : 1);
      else tr *= battleMul;
      if (s.formationId === 'vanguard' && srcTag === 'rearguard') tr *= 0.5;
    }
    if (fx.permD) s.D += fx.permD;
    s.tr = clamp(s.tr + tr, 0, capOf(s));
    s.su = clamp(s.su + (fx.su || 0), 0, s.team.supplyCap || 100);
    s.mo = clamp(s.mo + (fx.mo || 0), 0, 100);
    s.fa = clamp(s.fa + (fx.fa || 0), 0, 100);
    s.S = clamp(s.S + (fx.S || 0) * (s.teamId === '25' && (fx.S || 0) > 0 ? 1.5 : 1), 0, 100);
    s.D = clamp(s.D + (fx.D || 0), 0, 100);
    s.U = clamp(s.U + (fx.U || 0), 0, 100);
    if (fx.mi) s.mileage += fx.mi * s.team.target;
    if (fx.river) { s.pursuit = 6; s.freeTurns = 2; s.stats.rivers++; ev.river = true; }
    if (fx.bridge) s.flags.bridge = true;
    if (fx.correct) s.flags.corrected = true;
    if (fx.P) s.pursuit = clamp(s.pursuit + fx.P * (srcTag === 'feint' ? (s.team.feintMul || 1) : 1), 0, 9);
  }

  function resolve(s, tempoId, choice) {
    const ev = { logs: [], battle: false, river: false, actEnd: false, ended: null, phase: 'play' };
    const tempo = TEMPOS.find(t => t.id === tempoId) || TEMPOS[1];
    const a = act(s);
    s.stats.cards++;
    if (tempo.id === 'rest') s.stats.rests++;

    let fx = {}, tag = null, flavor = '', anchor = '';
    if (choice && choice.mode === 'fork') {
      const opt = choice.option;
      fx = opt.fx; tag = '决策'; flavor = opt.label + '——' + (opt.right ? '方向定了。' : '歧路由此开始。');
      s.flags['fork_' + choice.forkId] = true;
      if (opt.flag) s.flags[opt.flag] = true;
      ev.fork = opt.right ? 'right' : 'wrong';
    } else if (choice && choice.mode === 'crisis') {
      fx = choice.option.fx; tag = 'crisis';
      const wk = 'waited_' + choice.crisisId;
      flavor = choice.option.wait && s.flags[wk] ? '局势未变，又熬过一回合。' : choice.option.flavor;
      if (choice.option.wait) s.flags[wk] = true;
      s.stats.crises++;
      if (choice.option.wait) ev.wait = true;
      if (choice.crisisId === 'rearguard') tag = 'rearguard';
    } else if (choice && choice.card) {
      fx = choice.card.fx; tag = choice.card.tag; flavor = choice.card.flavor; anchor = choice.card.anchor;
      s.tags.push(tag);
      if (choice.card.feint) tag = 'feint';
      if (choice.card.warn && s.formationId === 'mass') { fx = Object.assign({}, fx, { S: 0, fa: 0 }); }
    }

    const envHard = a.themes[s.turnIdx] === 'marsh' || a.themes[s.turnIdx] === 'snow';
    let suCost = 4.2 * (s.team.supplyMul || 1);
    if (envHard) suCost *= 1.5;
    if (s.flags.south && s.teamId === '4th' && s.actIdx === 4) suCost *= 2;
    if (s.formationId === 'vanguard' && envHard) suCost += 2;
    if (tempo.id === 'rest') suCost *= 0.5;
    suCost += tempo.suExtra;

    let attr = 0.9 + tempo.trExtra;
    if (envHard) attr += 2.0;
    if (s.teamId === '2-6' && s.actIdx === 3) attr += 2.2;
    if (s.su < 30) attr += 2;

    s.mileage += (s.team.target / 20) * tempo.miMul;
    s.su = clamp(s.su - suCost, 0, s.team.supplyCap || 100);
    s.tr = clamp(s.tr - attr, 0, capOf(s));
    s.mo = clamp(s.mo - 0.5 + tempo.mo + (s.S >= 60 ? 0.5 : 0), 0, 100);
    if (s.S >= 60) s.su = clamp(s.su + 2, 0, s.team.supplyCap || 100);
    s.fa = clamp(s.fa + (s.team.faithRegen || 0), 0, 100);
    if (s.teamId === '4th' && s.actIdx === 3) s.U = clamp(s.U - 4, 0, 100);

    applyFx(s, fx, ev, tag);

    s.pursuit = clamp(s.pursuit + tempo.p - pressure(s), 0, 9);
    if (s.freeTurns > 0) s.freeTurns--;
    if (s.pursuit <= 0) {
      const loss = 8 * (s.team.battleLossMul || 1);
      s.tr = clamp(s.tr - loss, 0, 100);
      s.mo = clamp(s.mo - 6, 0, 100);
      s.pursuit = 2;
      s.stats.battles++;
      ev.battle = true;
      ev.logs.push({ kind: 'battle', text: '追兵咬住了队伍——恶战一场，兵力折损，且战且走。' });
    }

    ev.logs.push({ kind: 'note', text: flavor || '队伍继续向前。', anchor });

    for (const k of ['tr', 'su', 'mo', 'fa']) {
      if (s[k] <= 0) {
        s.ended = LM.COLLAPSE[k];
        s.phase = 'ended';
        ev.ended = s.ended;
        ev.phase = 'ended';
        return ev;
      }
    }

    s.turnIdx++;
    if (s.turnIdx >= 3) {
      s.turnIdx = 0;
      s.actIdx++;
      ev.actEnd = true;
      if (s.actIdx >= 6) {
        s.phase = 'reunion';
        ev.phase = 'reunion';
      }
    }
    return ev;
  }

  function doReunion(s, ids) {
    const ev = { logs: [] };
    if (!ids || !ids.length) {
      s.reunionAccepted = false;
      s.U = clamp(s.U - 10, 0, 100);
      ev.logs.push({ kind: 'note', text: '你们拒绝了会师电报。孤立线的代价，从这一刻开始计息。' });
    } else {
      s.reunionAccepted = true;
      s.allies = ids;
      const table = LM.REUNION[s.teamId].allies;
      ids.forEach(id => {
        const ally = table.find(x => x.id === id);
        if (ally) { applyFx(s, ally.fx, ev, '会师'); ev.logs.push({ kind: 'note', text: ally.line }); }
      });
      s.U = clamp(s.U + 8, 0, 100);
    }
    return finish(s, ev);
  }

  function dominant(s) {
    const count = {};
    s.tags.forEach(t => { count[t] = (count[t] || 0) + 1; });
    let best = '机动', n = -1;
    Object.keys(count).forEach(t => { if (count[t] > n) { n = count[t]; best = t; } });
    return best;
  }

  function finish(s, ev) {
    s.dominant = dominant(s);
    const e = LM.ENDINGS.find(x => x.test(s)) || LM.ENDINGS.find(x => x.id === 'pianshi');
    s.ended = e.id;
    s.phase = 'ended';
    ev.ended = e.id;
    ev.phase = 'ended';
    return ev;
  }

  LM.engine = { TEMPOS, newGame, beginTurn, resolve, doReunion, finish, act, theme, pressure, reqOk, dominant };
  if (typeof module !== 'undefined') module.exports = LM;
})(typeof window !== 'undefined' ? window : globalThis);