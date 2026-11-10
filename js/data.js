// 우리말 수련기 - 게임 자료: 적, 도구, 장비, 기술, 지역, 레벨
'use strict';

var DATA = {};

// 적: hp, atk, exp, gold. lines: 등장 대사, moves: 공격 이름들
DATA.enemies = {
  // 고유어 숲
  acorn: { name: '도토리 도깨비', sprite: 'acorn', hp: 16, atk: 5, exp: 6, gold: 6,
    intro: '데굴데굴~ 내 이름 맞혀 보면 깜짝 놀랄걸!',
    moves: ['도토리 박치기', '데굴데굴 구르기'], special: '도토리 비 내리기' },
  mushroom: { name: '버섯 꼬마', sprite: 'mushroom', hp: 20, atk: 5, exp: 7, gold: 7,
    intro: '뽀록! 비 온 뒤엔 내가 제일 쑥쑥 자라지!',
    moves: ['포자 퐁퐁', '갓 흔들기'], special: '어질어질 버섯 춤' },
  tanuki: { name: '덤불 너구리', sprite: 'tanuki', hp: 26, atk: 6, exp: 9, gold: 9,
    intro: '너스레 떨기라면 내가 숲에서 일등이야~',
    moves: ['꼬리 휘두르기', '덤불 숨기 기습'], special: '너스레 폭탄' },
  bossTree: { name: '숲지기 고목 「우듬지」', sprite: 'bossTree', hp: 80, atk: 7, exp: 30, gold: 40, boss: true,
    intro: '시나브로 자란 지 삼백 년… 내 숲의 낱말을 아느냐?',
    moves: ['뿌리 채찍', '나뭇잎 회오리'], charge: '아름드리 가지에 힘을 모은다!', strong: '아름드리 내려치기', strongMul: 2.3 },

  // 한자어 서원
  inktoad: { name: '먹물 두꺼비', sprite: 'inktoad', hp: 34, atk: 8, exp: 14, gold: 12,
    intro: '개굴! 내 먹물에 맞으면 글씨가 번진다구!',
    moves: ['먹물 찍찍', '혓바닥 낚아채기'], special: '먹물 폭포' },
  weasel: { name: '붓끝 족제비', sprite: 'weasel', hp: 32, atk: 9, exp: 15, gold: 13,
    intro: '내 꼬리 붓으로 네 이름을 지워 주마!',
    moves: ['꼬리 붓질', '재빠른 할퀴기'], special: '일필휘지 베기' },
  bookworm: { name: '책벌레', sprite: 'bookworm', hp: 40, atk: 8, exp: 17, gold: 14,
    intro: '어려운 낱말? 냠냠, 책째로 다 먹어 버렸지!',
    moves: ['책장 넘기기', '안경 반짝 광선'], special: '두꺼운 사전 떨어뜨리기' },
  bossTurtle: { name: '벼루 거북 「묵향 대감」', sprite: 'bossTurtle', hp: 150, atk: 11, exp: 60, gold: 80, boss: true,
    intro: '에헴. 한자어의 뜻을 모르고 서원을 지나갈 수는 없느니라.',
    moves: ['벼루 등껍질 박치기', '먹 갈기 공격'], charge: '등껍질 벼루에 먹을 진하게 간다!', strong: '천 근 먹물 해일', strongMul: 2.3 },

  // 신조어 저잣거리
  sparrow: { name: '줄임말 참새', sprite: 'sparrow', hp: 46, atk: 11, exp: 24, gold: 18,
    intro: '짹짹! ㅇㅈ? ㅇㅇㅈ! …무슨 말인지 모르겠지?',
    moves: ['부리 콕콕', '줄임말 폭격'], special: '짹짹 메아리' },
  bell: { name: '알림 요정 「띵동」', sprite: 'bell', hp: 52, atk: 12, exp: 26, gold: 20,
    intro: '띵동! 읽지 않은 메시지가 999개 있어요!',
    moves: ['띵동 울리기', '알림 폭탄'], special: '무한 진동 모드' },
  memecat: { name: '짤 고양이', sprite: 'memecat', hp: 60, atk: 12, exp: 28, gold: 22,
    intro: '킹받지? 이 선글라스는 꾸안꾸 패션이라냥.',
    moves: ['냥냥 펀치', '꼬리 휙'], special: '움짤 분신술' },
  bossPigeon: { name: '줄임말 대왕 「구구절절」', sprite: 'bossPigeon', hp: 210, atk: 13, exp: 100, gold: 120, boss: true,
    intro: '구구! 이름은 구구절절이지만 말은 전부 줄여 버리지! 별다줄!',
    moves: ['날개 퍼덕이기', '모이 쪼기 연타'], charge: '목 깃털이 무지갯빛으로 부풀어 오른다!', strong: '초압축 줄임말 광선', strongMul: 2.2 },

  // 우리말 겨루기 대회
  hedgehog: { name: '고슴도치 「도담」', sprite: 'hedgehog', hp: 150, atk: 14, exp: 70, gold: 60, boss: true, rival: true,
    intro: '반가워, 가람! 가시처럼 콕콕 정확하게 맞혀 주지!',
    moves: ['가시 굴리기', '도담도담 박치기'], charge: '가시를 바짝 곤두세운다!', strong: '밤송이 대폭주', strongMul: 2.1 },
  fox: { name: '여우 「여울」', sprite: 'fox', hp: 190, atk: 16, exp: 90, gold: 80, boss: true, rival: true,
    intro: '후후, 내 부채 바람 앞에서도 낱말 뜻이 떠오를까?',
    moves: ['부채 바람', '꼬리 여울치기'], charge: '부채를 활짝 펼쳐 바람을 모은다!', strong: '여울목 돌개바람', strongMul: 2.2 },
  bossOwl: { name: '장원 부엉이 「솔빛」', sprite: 'bossOwl', hp: 290, atk: 18, exp: 150, gold: 200, boss: true, rival: true,
    intro: '부엉. 지난 대회 장원, 솔빛이다. 고유어, 한자어, 신조어… 모두 덤벼 보거라!',
    moves: ['날개 바람', '부리 일격'], charge: '두 눈이 보름달처럼 빛나기 시작한다!', strong: '달빛 지혜 폭풍', strongMul: 2.2 }
};

DATA.areas = [
  { id: 'goyu', cat: 'goyu', name: '고유어 숲', bg: 'forest', enemies: ['acorn', 'mushroom', 'tanuki'], boss: 'bossTree', need: 3,
    desc: '예부터 우리말로 이름 붙은 나무와 풀이 가득한 숲.',
    hello: '숲 입구에 「시나브로 자라는 숲」이라는 팻말이 서 있다. 바스락… 무언가 움직인다!' },
  { id: 'hanja', cat: 'hanja', name: '한자어 서원', bg: 'seowon', enemies: ['inktoad', 'weasel', 'bookworm'], boss: 'bossTurtle', need: 3,
    desc: '먹 냄새가 은은한 오래된 서원. 한자어를 공부하던 곳이다.',
    hello: '서원 마당에 먹물 발자국이 찍혀 있다. 어디선가 「에헴」 하는 소리가 들린다.' },
  { id: 'sinjo', cat: 'sinjo', name: '신조어 저잣거리', bg: 'market', enemies: ['sparrow', 'bell', 'memecat'], boss: 'bossPigeon', need: 3,
    desc: '새로 생긴 말들이 시끌벅적 오가는 밤 장터.',
    hello: '등불 아래 장터가 북적인다. 여기저기서 알 수 없는 줄임말이 들려온다!' }
];

DATA.tournament = [
  { round: '1회전', enemy: 'hedgehog' },
  { round: '2회전', enemy: 'fox' },
  { round: '결승전', enemy: 'bossOwl' }
];

DATA.items = {
  herb: { name: '약초', price: 8, desc: 'HP를 40 회복한다.', heal: 40 },
  rice: { name: '꿀떡', price: 10, desc: '기력(MP)을 10 회복한다.', mp: 10 },
  charm: { name: '힌트 부적', price: 15, desc: '한 문제에서 틀린 보기 2개를 지워 준다.' }
};

DATA.equips = {
  brush0: { name: '나뭇가지 붓', slot: 'weapon', atk: 0, price: 0, desc: '처음부터 들고 있던 붓.' },
  brush1: { name: '참나무 붓', slot: 'weapon', atk: 3, price: 35, desc: '공격력 +3. 단단한 참나무로 만든 붓.' },
  brush2: { name: '은빛 깃털 붓', slot: 'weapon', atk: 7, price: 110, desc: '공격력 +7. 반짝이는 깃털로 만든 붓.' },
  robe0: { name: '헌 무명옷', slot: 'armor', def: 0, hp: 0, price: 0, desc: '수련생의 낡은 옷.' },
  robe1: { name: '무명 두루마기', slot: 'armor', def: 2, hp: 12, price: 45, desc: '방어 +2, 최대 HP +12.' },
  robe2: { name: '비단 두루마기', slot: 'armor', def: 4, hp: 24, price: 120, desc: '방어 +4, 최대 HP +24.' }
};
DATA.shopList = ['herb', 'rice', 'charm', 'brush1', 'robe1', 'brush2', 'robe2'];

DATA.skills = [
  { id: 'feather', name: '깃털 회오리', lv: 2, mp: 4, mul: 2.2, desc: '10초 안에 맞히면 큰 피해(×2.2)' },
  { id: 'song', name: '까치 노래', lv: 4, mp: 6, mul: 1.0, heal: 0.5, desc: '10초 안에 맞히면 HP 절반 회복 + 공격' },
  { id: 'thunder', name: '우리말 벼락', lv: 6, mp: 9, mul: 3.4, desc: '10초 안에 맞히면 엄청난 피해(×3.4)' }
];

DATA.maxLv = 12;
DATA.expNext = function (lv) { return 10 + lv * lv * 3; };
DATA.heroBase = function (lv) {
  return {
    maxHp: 36 + (lv - 1) * 9,
    maxMp: 8 + (lv - 1) * 3,
    atk: 7 + (lv - 1) * 2,
    def: Math.floor((lv - 1) / 2)
  };
};

// 마을 사람들 대사
DATA.npcTalk = {
  cat: [
    '나비: 냐옹. 숲에 사는 도토리 도깨비는 말이 많아. 「너스레」가 뭔지 알아?',
    '나비: 오답 수첩을 자주 보면 별(★)이 금방 늘어난대. 냥.',
    '나비: 힌트 부적은 정말 모르겠을 때만 쓰는 거야. 아껴 둬!'
  ],
  duck: [
    '오리 할아버지: 꽥! 나 젊을 땐 「갓생」이란 말이 없었지. 그냥 부지런하다고 했어.',
    '오리 할아버지: 「안간힘」을 쓰면 못 할 게 없단다, 얘야.',
    '오리 할아버지: 여관에서 푹 쉬면 몸도 마음도 가뿐해지지. 꽥꽥!'
  ]
};
