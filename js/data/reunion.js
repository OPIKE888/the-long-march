(function (root) {
  const LM = (root.LM = root.LM || {});

  LM.REUNION = {
    central: {
      place: '会宁 · 将台堡',
      date: '1936.10',
      allies: [
        { id: '25', name: '红二十五军（红十五军团）', give: '陕北落脚点 + 兵员补充', fx: { tr: 8, su: 12, S: 6 }, cost: '接受统一指挥', line: '他们先到一步，把窑洞和粮都备好了。' },
        { id: '4th', name: '红四方面军', give: '兵员与山地作战经验', fx: { tr: 10, D: 6 }, cost: '推动其坚持北上方针', line: '三过草地的队伍，终于走到会宁城下。' },
        { id: '2-6', name: '红二、六军团（红二方面军）', give: '长途机动战术与后勤组织', fx: { D: 10, su: 8 }, cost: '掩护其侧翼', line: '乌蒙山里走出来的队伍，把机动教给了大家。' }
      ]
    },
    '25': {
      place: '永坪 · 会宁',
      date: '1935.9–1936.10',
      allies: [
        { id: 'shaanbei', name: '陕北红二十六、二十七军', give: '根据地与扩红', fx: { tr: 15, S: 15 }, cost: '合编红十五军团', line: '陕北的旗，先一步把落脚点踩实。' },
        { id: 'central', name: '中央红军', give: '正确路线与干部骨干', fx: { fa: 12, U: 10 }, cost: '接受统一指挥', line: '你们接应的队伍，终于到了吴起镇。' }
      ]
    },
    '4th': {
      place: '甘孜 · 会宁',
      date: '1936.7–10',
      allies: [
        { id: '2-6', name: '红二、六军团（甘孜）', give: '团结与补给', fx: { U: 15, su: 10 }, cost: '共同北上', line: '甘孜会师，南下的路走到头了。' },
        { id: 'central', name: '中央红军（会宁）', give: '路线与名分', fx: { fa: 12, U: 10 }, cost: '接受统一指挥', line: '会宁的城墙，等这三面旗等了很久。' }
      ]
    },
    '2-6': {
      place: '甘孜 · 将台堡',
      date: '1936.7–10',
      allies: [
        { id: '4th', name: '红四方面军（甘孜）', give: '山地经验与补给', fx: { su: 10, tr: 6 }, cost: '共同北上', line: '高原的短板，被友军补成了长板。' },
        { id: 'central', name: '中央红军（将台堡）', give: '路线与落脚点', fx: { fa: 12, mi: 0.04 }, cost: '接受统一指挥', line: '1936.10.22，将台堡，长征走完。' }
      ]
    }
  };

  if (typeof module !== 'undefined') module.exports = LM;
})(typeof window !== 'undefined' ? window : globalThis);