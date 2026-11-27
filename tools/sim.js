const path = require('path');
const base = path.join(__dirname, '..', 'js');
require(path.join(base, 'data', 'teams.js'));
require(path.join(base, 'data', 'acts.js'));
require(path.join(base, 'data', 'cards.js'));
require(path.join(base, 'data', 'reunion.js'));
require(path.join(base, 'data', 'endings.js'));
require(path.join(base, 'engine.js'));
const LM = globalThis.LM;
const E = LM.engine;

function scoreCard(s, c) {
  if (c.req && !E.reqOk(s, c.req)) return -99;
  let v = 0;
  const f = c.fx;
  if (s.su < 40) v += (f.su || 0) * 2;
  else v += (f.su || 0);
  v += (f.S || 0) * (s.S < 55 ? 1.5 : 0.5);
  v += (f.fa || 0) * 0.8 + (f.U || 0) * 0.8 + (f.mo || 0) * 0.6;
  v += (f.D || 0) * 0.5 + (f.mi || 0) * 60;
  if (f.river) v += 25;
  if (f.P) v += f.P * (s.pursuit < 4 ? 3 : 1);
  v += (f.tr || 0) * 1.2;
  if (c.warn) v -= 20;
  return v;
}

function play(teamId, policy) {
  const s = E.newGame(teamId, 'vanguard');
  let guard = 0;
  while (s.phase === 'play' && guard++ < 40) {
    const t = E.beginTurn(s);
    let tempo = 'steady';
    if (policy === 'smart') {
      if (s.pursuit <= 2) tempo = 'rush';
      else if (s.su < 30 && s.pursuit > 3) tempo = 'rest';
      else if (s.mo < 35 && s.pursuit > 3) tempo = 'rest';
      else if (s.mileage < s.team.target * (s.actIdx * 3 + s.turnIdx) / 20) tempo = 'rush';
    } else {
      tempo = ['rush', 'steady', 'rest'][Math.floor(Math.random() * 3)];
    }
    let choice;
    if (t.mode === 'fork') {
      const opt = policy === 'smart' ? t.fork.options.find(o => o.right) : t.fork.options[Math.floor(Math.random() * t.fork.options.length)];
      choice = { mode: 'fork', forkId: t.fork.id, option: opt };
    } else if (t.mode === 'crisis') {
      const avail = t.crisis.options.filter(o => E.reqOk(s, o.req) && !o.wait);
      const pool = avail.length ? avail : t.crisis.options;
      let opt;
      if (policy === 'smart') {
        opt = pool.slice().sort((a, b) => scoreCard(s, { fx: b.fx }) - scoreCard(s, { fx: a.fx }))[0];
      } else opt = pool[Math.floor(Math.random() * pool.length)];
      choice = { mode: 'crisis', crisisId: t.crisis.id, option: opt };
    } else {
      const avail = t.cards.filter(c => E.reqOk(s, c.req));
      const pool = avail.length ? avail : t.cards;
      const card = policy === 'smart'
        ? pool.slice().sort((a, b) => scoreCard(s, b) - scoreCard(s, a))[0]
        : pool[Math.floor(Math.random() * pool.length)];
      choice = { card };
    }
    E.resolve(s, tempo, choice);
  }
  if (s.phase === 'reunion') {
    const allies = LM.REUNION[s.teamId].allies;
    const ids = policy === 'smart' ? allies.slice(0, 2).map(a => a.id) : (Math.random() < 0.8 ? allies.slice(0, 2).map(a => a.id) : []);
    E.doReunion(s, ids);
  }
  return s;
}

const N = parseInt(process.argv[2] || '300', 10);
for (const team of LM.TEAMS) {
  for (const policy of ['smart', 'random']) {
    const counts = {};
    let mileageSum = 0, trSum = 0;
    for (let i = 0; i < N; i++) {
      const s = play(team.id, policy);
      counts[s.ended] = (counts[s.ended] || 0) + 1;
      mileageSum += s.mileage / s.team.target;
      trSum += s.tr;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${(100 * v / N).toFixed(0)}%`).join(' ');
    console.log(`${team.id.padEnd(8)} ${policy.padEnd(6)} avgMi ${(mileageSum / N).toFixed(2)} avgTr ${(trSum / N).toFixed(0)} | ${top}`);
  }
}