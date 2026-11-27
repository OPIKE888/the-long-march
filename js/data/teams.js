(function (root) {
  const LM = (root.LM = root.LM || {});

  LM.TEAMS = [
    {
      id: 'central',
      numeral: '一',
      name: '中央红军',
      alias: '红一方面军',
      from: '江西瑞金等地',
      date: '1934.10.10',
      initial: 86000,
      target: 25000,
      palette: { ground: '#7a8c5a', earth: '#c4a06a', flag: '#a8322a', sky: '#2c3a4e' },
      strength: '遵义决议后指挥最优，机动 +2/回合',
      bottlenecks: ['湘江血战：一幕固定大幅减员', '路程最长：给养消耗 ×1.3'],
      bias: ['机动', '决策', '群众'],
      supplyMul: 1.3,
      intro: '八万六千人离开瑞金。没有人知道要走多远，只知道身后是根据地，前面是封锁线。',
      dossier: '行程二万五千里，跨 11 省，渡 24 条江河，翻 18 座大山。'
    },
    {
      id: '25',
      numeral: '二',
      name: '红二十五军',
      alias: '先遣之师',
      from: '河南罗山何家冲',
      date: '1934.11.16',
      initial: 2980,
      target: 10000,
      palette: { ground: '#5f7a52', earth: '#b89363', flag: '#a8322a', sky: '#26364a' },
      strength: '纪律严明，群众工作收益 ×1.5，信念 +1/回合',
      bottlenecks: ['兵力天花板：上限锁初始的 130%', '孤军远征：四幕追兵压力 ×1.5'],
      bias: ['群众', '纪律', '先遣'],
      troopCap: 130,
      faithRegen: 0.5,
      intro: '两千九百八十人，平均年龄不到十八岁。他们是最小的一路，也是最先到达的一路。',
      dossier: '行程近万里，唯一一路人数变多的队伍——出发时 2980 人，到达时更多。'
    },
    {
      id: '4th',
      numeral: '三',
      name: '红四方面军',
      alias: '川陕之师',
      from: '川陕苏区',
      date: '1935.3',
      initial: 80000,
      target: 10000,
      palette: { ground: '#6b7f7a', earth: '#a8895f', flag: '#a8322a', sky: '#2b3a44' },
      strength: '兵力最厚，战斗减员 −30%',
      bottlenecks: ['路线分歧：四幕团结周期性流失', '南下代价：选南下则五幕给养翻倍、兵力上限锁 50%'],
      bias: ['坚守', '山地', '团结'],
      battleLossMul: 0.7,
      intro: '八万人西渡嘉陵江。兵最厚的一路，也将走最曲折的路——三过草地，一回歧途。',
      dossier: '行程一万余里，三过草地。南下受挫折损过半，最终仍走到会宁。'
    },
    {
      id: '2-6',
      numeral: '四',
      name: '红二、六军团',
      alias: '红二方面军',
      from: '湖南桑植刘家坪',
      date: '1935.11.19',
      initial: 17000,
      target: 20000,
      palette: { ground: '#4f7a66', earth: '#9c8557', flag: '#a8322a', sky: '#2a3040' },
      strength: '长途机动，佯动卡效果 ×1.5',
      bottlenecks: ['补给线断：给养上限锁 60', '高原适应差：四幕减员 ×2'],
      bias: ['机动', '回旋', '团结'],
      supplyCap: 60,
      feintMul: 1.5,
      intro: '一万七千人从桑植出发，出发最晚。他们把乌蒙山走成了迷宫，把追兵走成了累赘。',
      dossier: '行程近二万里，乌蒙回旋、石鼓渡江，1936.10.22 将台堡会师。'
    }
  ];

  LM.FORMATIONS = [
    { id: 'vanguard', name: '轻装先遣', desc: '机动 +3，伏击减员减半', fit: ['central', '2-6', '25'], penalty: '雪山草地幕给养 −2/回合' },
    { id: 'main', name: '稳扎主力', desc: '战斗减员 −30%，信念 +1/回合', fit: ['4th'], penalty: '佯动 / 急行类卡效果 −50%' },
    { id: 'mass', name: '群众工作队', desc: '每幕群众基础 +8，筹粮不伤纪律', fit: ['25', 'central'], penalty: '战斗卡兵力损失 ×1.5' }
  ];

  if (typeof module !== 'undefined') module.exports = LM;
})(typeof window !== 'undefined' ? window : globalThis);