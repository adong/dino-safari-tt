/* 中文 for TT Dino Safari: every word on the page, the ride's messages, the dino book and the ? panel (Kit.lang, from
   kit/lang.js). Page text translates by itself; js/game.js and js/art.js ask Kit.lang.t() for the words they build into
   messages and draw on the signs. Stays in English on purpose: the game's name (Alan names his games), the names
   (TEDDY, TOMMY, FOXY, FROGGY) and key labels. Words Alan asked for: 恐龙, 拍照, 图鉴. */
(function () {
  'use strict';
  const L = Kit.lang, D = window.DINO;
  const NAMES = ['TEDDY', 'TOMMY', 'FOXY', 'FROGGY'];
  L.keep([D.TITLE, D.TITLE.toUpperCase(), 'Claude Code', ...NAMES, 'Teddy', 'Tommy', 'T', 'P1', 'P2', '🐸 FROGGY', '🔍 ×2', 'Space', 'Enter', 'Esc', 'W', 'A', 'S', 'D', 'Q']);

  // the dinosaurs
  const DINOZH = {
    COMPSOGNATHUS: '美颌龙', COMPY: '美颌龙', TRICERATOPS: '三角龙', VELOCIRAPTOR: '伶盗龙', RAPTOR: '伶盗龙',
    BRACHIOSAURUS: '腕龙', STEGOSAURUS: '剑龙', PACHYCEPHALOSAURUS: '肿头龙', PACHY: '肿头龙', SPINOSAURUS: '棘龙',
    PARASAUROLOPHUS: '副栉龙', PARA: '副栉龙', ANKYLOSAURUS: '甲龙', MAIASAURA: '慈母龙', PTERANODON: '无齿翼龙',
    'TYRANNOSAURUS REX': '霸王龙', 'T. REX': '霸王龙',
  };
  const ACTZH = {
    'PEEKABOO!': '躲猫猫！', 'MUNCH!': '大口吃！', 'LEAP!': '跳起来！', 'TREETOP SNACK!': '吃树顶的叶子！', 'TAIL SWING!': '甩尾巴！',
    'BONK!': '咚！撞头！', 'SPLASH!': '扑通！', 'HONK!': '嘟嘟叫！', 'CLUB SWING!': '甩尾锤！', 'BABY HELLO!': '宝宝你好！', 'SWOOP!': '俯冲！', 'ROAR!': '吼——！',
  };
  const FACTS = {
    'Compsognathus was tiny, about as big as a chicken!': '美颌龙很小很小，只有一只鸡那么大！',
    'Triceratops means "three-horned face". It ate plants.': '三角龙的名字意思是"长着三只角的脸"。它吃植物。',
    'Velociraptor had feathers and was only about as big as a turkey!': '伶盗龙身上长着羽毛，只有一只火鸡那么大！',
    'Brachiosaurus was as tall as a 4-storey building! It ate leaves from the treetops.': '腕龙有四层楼那么高！它吃树顶上的叶子。',
    'Stegosaurus had big plates on its back and four spikes on its tail.': '剑龙背上有大大的骨板，尾巴上有四根尖刺。',
    'Pachycephalosaurus had a thick, hard dome on its head, like a helmet!': '肿头龙的头顶又厚又硬，就像戴了一顶头盔！',
    'Spinosaurus had a big sail on its back and loved to catch fish.': '棘龙背上有一面大帆，最喜欢抓鱼吃。',
    'Parasaurolophus could honk like a trumpet through the long crest on its head.': '副栉龙头上有长长的冠，可以像喇叭一样嘟嘟叫。',
    'Ankylosaurus had armour like a tank and a club on the end of its tail.': '甲龙身上的盔甲像坦克一样，尾巴末端还有一个大锤子。',
    'Maiasaura means "good mother lizard". It looked after its babies in a nest.': '慈母龙的名字意思是"好妈妈蜥蜴"。它会在窝里照顾宝宝。',
    'Pteranodon was a flying reptile, not a dinosaur! Its wings were wider than a car is long.': '无齿翼龙是会飞的爬行动物，不是恐龙哦！它的翅膀张开比一辆汽车还长。',
    'T. rex teeth were as long as bananas!': '霸王龙的牙齿有香蕉那么长！',
  };
  const HINTS = {
    'hides in the tall grass, look closely': '躲在高高的草丛里，仔细找找',
    'eats ferns on the grassy plains': '在青草平原上吃蕨类植物',
    'plays chase in a fast little pack': '一小群在一起追来追去，跑得飞快',
    'stretches its long neck in the tall trees': '在大树林里伸长脖子',
    'walks between the trees with plates on its back': '背着骨板在树林里散步',
    'two of them bump heads in a clearing': '两只在空地上撞头玩',
    'goes fishing in the big blue lake': '在蓝色的大湖里抓鱼',
    'drinks at the little pond and honks': '在小池塘边喝水，还会嘟嘟叫',
    'stomps around the rocky hills in its armour': '穿着盔甲在石头山上走来走去',
    'looks after her babies in a nest': '在窝里照顾宝宝',
    'flies in circles near the volcano': '在火山附近绕圈飞',
    'the king of the dinosaurs waits at the end of the road': '恐龙之王在路的尽头等着你',
  };
  const ZONES = { 'GRASSY PLAINS': '青草平原', 'TALL TREES': '大树林', 'BLUE LAKE': '蓝湖', 'ROCKY HILLS': '石头山', 'VOLCANO VIEW': '火山边', 'BIG ROCKS': '大石头' };
  L.add(DINOZH);
  L.add(ACTZH);
  L.add(FACTS);
  L.add(ZONES);
  const dz = (n) => DINOZH[n] || n;
  L.add({
    // title
    'Ride the jeep, snap the dinosaurs, fill your dino book!': '坐上吉普车，给恐龙拍照，集满你的恐龙图鉴！',
    '📸 SAFARI': '📸 探险拍照', 'take photos with Froggy': '和 Froggy 一起拍照',
    '👫 2 PLAYERS': '👫 双人', 'Teddy and Tommy in the jeep': 'Teddy 和 Tommy 同坐一辆吉普车',
    '📖 DINO BOOK': '📖 恐龙图鉴', LEVEL: '难度', Difficulty: '难度',
    'big frame · it helps you aim · all the photos you want': '大取景框 · 帮你瞄准 · 想拍多少张都行',
    'faster jeep · 30 photos · get them big and in the middle': '吉普车更快 · 只有 30 张 · 要拍得大、拍在正中间',
    'PLAYER 1': '玩家 1', 'PLAYER 2': '玩家 2', 'move the frame': '移动取景框', 'or mouse': '或鼠标', 'snap a photo': '拍照',
    'or click': '或点击', zoom: '放大', 'call your brother': '叫兄弟来',
    "Tap a dinosaur to take its photo (or slide your finger to move the frame and let go to snap). 🔍 zooms in. Tap your brother's face to call him!":
      '点一下恐龙就能给它拍照（也可以用手指拖动取景框，松开就拍）。🔍 可以放大。点兄弟的头像叫他来！',
    'LOADING…': '加载中…', '↻ Turn sideways to see more of the valley!': '↻ 横过来，能看到更多山谷！',
    // pick
    'WHO IS TAKING PHOTOS?': '谁来拍照？', 'WHO IS PLAYER 1?': '谁是玩家 1？', Photographers: '摄影师',
    'boxing and hoops': '拳击和篮球', 'peace and love': '和平与爱', '◀ BACK': '◀ 返回', 'GO! 🚙': '出发！🚙',
    '← → pick · Enter: go · Esc: back': '← → 选择 · 回车：出发 · Esc：返回',
    // the ride
    CALL: '叫', 'HIGH FIVE': '击掌', Zoom: '放大', 'Move the frame onto a dinosaur, then snap!': '把取景框对准恐龙，然后拍照！',
    Pause: '暂停', 'Pause (P)': '暂停（P）', 'Sound (M)': '声音（M）', 'Sound on or off': '声音开关', 'Sound on / off (M)': '声音开关（M）',
    "LET'S GO!": '出发啦！', 'snap every dinosaur you see': '看到恐龙就拍下来', 'here I come!': '我来啦！',
    'NO DINO! 🙈': '没有恐龙！🙈', 'NO DINO!': '没有恐龙！', 'put the frame on a dinosaur': '把取景框对准恐龙',
    'TOO FAR!': '太远啦！', 'zoom in with 🔍, or wait till it is closer': '用 🔍 放大，或者等它近一点',
    "IT'S HIDING!": '它躲起来啦！', 'wait for it to peek out': '等它探出头来',
    'A TREE IS IN THE WAY!': '被树挡住啦！', 'wait for a clear look': '等能看清楚再拍',
    'ALMOST!': '差一点！', 'put it in the middle of the frame': '把它放在取景框正中间',
    '✋ HIGH FIVE!': '✋ 击掌！', 'great team!': '好搭档！', 'get ready to snap': '准备好拍照', '🐸 📸 OOPS!': '🐸 📸 哎呀！',
    'READY?': '准备好了吗？',
    // pause, results
    PAUSED: '暂停中', '▶ RESUME': '▶ 继续', '↻ RESTART': '↻ 重来', MENU: '菜单',
    'P · Esc to resume · Q for the menu · M sound': 'P · Esc 继续 · Q 回菜单 · M 声音',
    'A TIE! HIGH FIVE!': '平局！击个掌！', 'WELL DONE!': '真棒！', PHOTOGRAPHER: '摄影师', POINTS: '分数', DINOSAURS: '恐龙', STARS: '星星',
    '↻ PLAY AGAIN': '↻ 再玩一次', 'Enter: play again · B: dino book · Esc: menu': '回车：再玩一次 · B：恐龙图鉴 · Esc：菜单',
    // the dino book
    'Esc or B: back': 'Esc 或 B：返回', 'Read it to me': '读给我听',
    // the ? panel
    'W A S D or mouse': 'W A S D 或鼠标', 'Space or click': '空格或点击', 'zoom in · out': '放大 · 缩小',
    'call your brother (2 players: high five)': '叫兄弟来（双人：击掌）', 'title: safari · 2 players · dino book · easy': '标题：探险拍照 · 双人 · 恐龙图鉴 · 简单',
    mouse: '鼠标',
    'In 1 player both sets of keys work. Snap a dinosaur big and in the middle of the frame, facing you, for 3 stars; snap it while it does its special move (✨) for a bonus. T calls your brother as often as you like: a treat, then he points the camera at a dinosaur for you.':
      '单人时两套按键都能用。把恐龙拍得大大的、放在取景框正中间、脸朝着你，就能得 3 颗星；在它做拿手动作（✨）的时候拍，还有加分。T 随时叫兄弟来，想叫几次都行：他先送零食，再帮你把相机对准一只恐龙。',
    "Tap a dinosaur to take its photo, or slide your finger to move the frame and let go to snap. 🔍 zooms in. Tap your brother's face to call him. Two players: the left half of the screen is player 1's, the right half player 2's.":
      '点一下恐龙就能拍照，也可以用手指拖动取景框，松开就拍。🔍 可以放大。点兄弟的头像叫他来。双人时，屏幕左半边是玩家 1 的，右半边是玩家 2 的。',
  });
  // words built with names, numbers or dinosaurs in them
  const WHO = '(TEDDY|TOMMY|FOXY|FROGGY)';
  L.rule(new RegExp(`^${WHO}!$`), '$1！');
  L.rule(new RegExp(`^${WHO} WINS!$`), '$1 赢啦！');
  L.rule(new RegExp(`^${WHO} SAYS: SNAP IT NOW!$`), '$1 说：快拍！');
  L.rule(new RegExp(`^${WHO} SAYS: ONE IS COMING!$`), '$1 说：恐龙要来啦！');
  L.rule(new RegExp(`^${WHO} SAYS: WE GOT THEM ALL!$`), '$1 说：全都拍到啦！');
  L.rule(/^the frame is on the (.+)$/, (m, n) => `取景框对准了${dz(n)}`);
  L.rule(new RegExp(`^(TEDDY|TOMMY): (.+)$`), (m, w, rest) => `${w}：${L.t(rest)}`);
  L.rule(/^NEW! (.+)$/, (m, n) => `新发现！${dz(n)}`);
  L.rule(/^([⭐☆]+) BETTER PHOTO!$/, '$1 拍得更好啦！');
  L.rule(/^([⭐☆]+) (.+)$/, (m, s, n) => `${s} ${dz(n)}`);
  L.rule(/^\+ (.+)$/, (m, a) => `+ ${ACTZH[a] || a}`);
  L.rule(/^(.+) · (.+!)$/, (m, n, a) => `${dz(n)} · ${ACTZH[a] || a}`);
  L.rule(/^🐸 📸 (.+) ([⭐☆]+)$/, (m, n, s) => `🐸 📸 ${dz(n)} ${s}`);
  L.rule(/^(\S+) YUM!$/, '$1 好吃！');
  L.rule(/^(\d+) of (\d+) dinosaurs$/, '$1 / $2 种恐龙');
  L.rule(/^Where to look: (.+)\.$/, (m, h) => `去哪里找：${HINTS[h] || h}。`);
  L.rule(/^📸 (\S+) · (\d+) POINTS$/, '📸 $1 · $2 分');
  L.rule(/^🏆 NEW BEST: (\d+)$/, '🏆 新纪录：$1');
  L.rule(/^🏆 BEST: (\d+)$/, '🏆 最高分：$1');
  L.rule(/^📖 (\d+) NEW IN THE DINO BOOK · 📖 (\d+) \/ (\d+)$/, '📖 图鉴里新添了 $1 种 · 📖 $2 / $3');
  L.rule(/^📖 (\d+) \/ (\d+)$/, '📖 $1 / $2');
  L.rule(/^(\S+) (GRASSY PLAINS|TALL TREES|BLUE LAKE|ROCKY HILLS|VOLCANO VIEW|BIG ROCKS)$/, (m, e, z) => `${e} ${ZONES[z]}`);
  // speaking a fact aloud: "TRICERATOPS! Triceratops means..." is built from pieces that are already translated
})();
