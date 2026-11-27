# 资源与许可

## 字体
- `assets/fonts/fusion-pixel-12px-proportional.woff2`
  缝合像素字体（Fusion Pixel Font），作者 TakWolf。
  来源：https://github.com/TakWolf/fusion-pixel-font
  许可：SIL Open Font License 1.1，全文见 `assets/fonts/OFL.txt`。
  用法：24px / 48px 两档，随舞台整台等比缩放（含分数倍）；字形像素格 = 场景美术像素格（2 舞台像素）。

## 图像
- `assets/web/title-key-art-v2.jpg`（及 `assets/ui/title-key-art-v2.png`、`assets/_raw/title-converging-paths-night-base.png`）
  由 AI 图像生成工具按本项目提示词原创生成（夜路·四路汇聚·马灯路标），不含任何真实人物肖像与第三方素材。
  生成图右下角的平台水印位于场景裁切区与面板遮挡区之外，游戏内不可见。
- `assets/web/bg-{depart,xiang,town,river,bridge,snow,marsh,loess,camp}.jpg`（960×540）
  九张场景背景均由 AI 图像生成工具按本项目提示词原创生成（横版像素画风格），
  原始生成图保留于 `vibe_images/`，经 sips 缩放导出；运行时以最近邻降采样到 480×270 美术格再按主题裁切显示。
- `assets/web/spr-{walk-a,walk-b,flag,stand,rest-1,rest-2,rest,rest-b,enemy,enemy-b}.png`
  人物/旗帜/追兵为 AI 生成的品红底抠图源（原始图见 `vibe_images/`：走路为「跨步接触 / 抬腿过渡」两单帧离线拼 sheet，
  另含休息序列五帧 sheet 与追兵两帧 sheet），
  由 `tools/sprites.js` 离线色键抠图并最近邻缩放到美术格，输出透明 PNG；运行时仅 drawImage，不做像素读取。
- 场景内唯一的代码绘制层为天气粒子（雨、雪、雾、火星、尘土），叠于生成背景之上。

## 音频
- 全部环境音与音效由 WebAudio 实时合成（噪声滤波 + 振荡器），无采样素材、无外部音频文件。

## 史实
- 四路红军（中央、红二十五、红四方面、红二六）行程节点取自公开党史记述；
  游戏遵循「大事不虚、小事不拘」：不虚构具体人物对话与肖像，苦难段落不做娱乐化处理。