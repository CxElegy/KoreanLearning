/* 韩语学习数据：字母、词汇、短语、语法 */

// ---------- 韩文字母（한글） ----------
const CONSONANTS = [
  { ch: 'ㄱ', name: '기역', roman: 'g / k', sound: '가', tip: '词首接近 g，词尾接近 k' },
  { ch: 'ㄴ', name: '니은', roman: 'n', sound: '나', tip: '同汉语拼音 n' },
  { ch: 'ㄷ', name: '디귿', roman: 'd / t', sound: '다', tip: '词首接近 d，词尾接近 t' },
  { ch: 'ㄹ', name: '리을', roman: 'r / l', sound: '라', tip: '元音前像轻弹的 r，词尾像 l' },
  { ch: 'ㅁ', name: '미음', roman: 'm', sound: '마', tip: '同汉语拼音 m' },
  { ch: 'ㅂ', name: '비읍', roman: 'b / p', sound: '바', tip: '词首接近 b，词尾接近 p' },
  { ch: 'ㅅ', name: '시옷', roman: 's', sound: '사', tip: '接近 s，在 ㅣ 前接近 x（시）' },
  { ch: 'ㅇ', name: '이응', roman: '— / ng', sound: '아', tip: '在开头不发音，在收音位置读 ng' },
  { ch: 'ㅈ', name: '지읒', roman: 'j', sound: '자', tip: '接近汉语拼音 z / j' },
  { ch: 'ㅊ', name: '치읓', roman: 'ch', sound: '차', tip: 'ㅈ 的送气音，接近 c / q' },
  { ch: 'ㅋ', name: '키읔', roman: 'k', sound: '카', tip: 'ㄱ 的送气音，同拼音 k' },
  { ch: 'ㅌ', name: '티읕', roman: 't', sound: '타', tip: 'ㄷ 的送气音，同拼音 t' },
  { ch: 'ㅍ', name: '피읖', roman: 'p', sound: '파', tip: 'ㅂ 的送气音，同拼音 p' },
  { ch: 'ㅎ', name: '히읗', roman: 'h', sound: '하', tip: '同汉语拼音 h' },
];

const DOUBLE_CONSONANTS = [
  { ch: 'ㄲ', name: '쌍기역', roman: 'kk', sound: '까', tip: '紧音：喉咙收紧，不送气，像“嘎”' },
  { ch: 'ㄸ', name: '쌍디귿', roman: 'tt', sound: '따', tip: '紧音：像重读的“哒”' },
  { ch: 'ㅃ', name: '쌍비읍', roman: 'pp', sound: '빠', tip: '紧音：像重读的“爸”' },
  { ch: 'ㅆ', name: '쌍시옷', roman: 'ss', sound: '싸', tip: '紧音：更用力的 s' },
  { ch: 'ㅉ', name: '쌍지읒', roman: 'jj', sound: '짜', tip: '紧音：像重读的“咂”' },
];

const VOWELS = [
  { ch: 'ㅏ', roman: 'a', sound: '아', tip: '同拼音 a' },
  { ch: 'ㅑ', roman: 'ya', sound: '야', tip: '同拼音 ya' },
  { ch: 'ㅓ', roman: 'eo', sound: '어', tip: '嘴张开的“哦”，介于 o 与 e 之间' },
  { ch: 'ㅕ', roman: 'yeo', sound: '여', tip: 'y + ㅓ' },
  { ch: 'ㅗ', roman: 'o', sound: '오', tip: '圆唇的 o' },
  { ch: 'ㅛ', roman: 'yo', sound: '요', tip: 'y + ㅗ' },
  { ch: 'ㅜ', roman: 'u', sound: '우', tip: '同拼音 u' },
  { ch: 'ㅠ', roman: 'yu', sound: '유', tip: '接近“优”' },
  { ch: 'ㅡ', roman: 'eu', sound: '으', tip: '嘴角向两边，像拼音 zi 里的 i' },
  { ch: 'ㅣ', roman: 'i', sound: '이', tip: '同拼音 i' },
];

const COMPOUND_VOWELS = [
  { ch: 'ㅐ', roman: 'ae', sound: '애', tip: '接近“哎”的 e 音（现代发音与 ㅔ 几乎相同）' },
  { ch: 'ㅒ', roman: 'yae', sound: '얘', tip: 'y + ㅐ' },
  { ch: 'ㅔ', roman: 'e', sound: '에', tip: '接近拼音 ei 中的 e' },
  { ch: 'ㅖ', roman: 'ye', sound: '예', tip: 'y + ㅔ' },
  { ch: 'ㅘ', roman: 'wa', sound: '와', tip: 'ㅗ + ㅏ = wa' },
  { ch: 'ㅙ', roman: 'wae', sound: '왜', tip: 'ㅗ + ㅐ = wae' },
  { ch: 'ㅚ', roman: 'oe', sound: '외', tip: '现代多读作 we' },
  { ch: 'ㅝ', roman: 'wo', sound: '워', tip: 'ㅜ + ㅓ = wo' },
  { ch: 'ㅞ', roman: 'we', sound: '웨', tip: 'ㅜ + ㅔ = we' },
  { ch: 'ㅟ', roman: 'wi', sound: '위', tip: 'ㅜ + ㅣ = wi' },
  { ch: 'ㅢ', roman: 'ui', sound: '의', tip: 'ㅡ + ㅣ，快速滑过' },
];

// ---------- 音节组合（Unicode 顺序，不可改动） ----------
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const MEDIALS  = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const FINALS   = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const ROMAN_INITIAL = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const ROMAN_MEDIAL  = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
// 收音按代表音读（7 终声规则）
const ROMAN_FINAL   = ['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

// 7 个代表收音
const BATCHIM_RULES = [
  { sound: 'ㄱ [k]', letters: 'ㄱ ㅋ ㄲ', example: '책 (书)、부엌 (厨房)' },
  { sound: 'ㄴ [n]', letters: 'ㄴ', example: '산 (山)' },
  { sound: 'ㄷ [t]', letters: 'ㄷ ㅌ ㅅ ㅆ ㅈ ㅊ ㅎ', example: '옷 (衣服)、낮 (白天)' },
  { sound: 'ㄹ [l]', letters: 'ㄹ', example: '물 (水)' },
  { sound: 'ㅁ [m]', letters: 'ㅁ', example: '밤 (夜晚)' },
  { sound: 'ㅂ [p]', letters: 'ㅂ ㅍ', example: '밥 (饭)、앞 (前面)' },
  { sound: 'ㅇ [ng]', letters: 'ㅇ', example: '방 (房间)' },
];

// ---------- 词汇 ----------
const VOCAB = [
  { id: 'greet', title: '问候', icon: '👋', words: [
    { ko: '안녕하세요', roman: 'annyeonghaseyo', zh: '你好' },
    { ko: '감사합니다', roman: 'gamsahamnida', zh: '谢谢（正式）' },
    { ko: '고마워요', roman: 'gomawoyo', zh: '谢谢（亲切）' },
    { ko: '죄송합니다', roman: 'joesonghamnida', zh: '对不起（正式）' },
    { ko: '미안해요', roman: 'mianhaeyo', zh: '抱歉' },
    { ko: '괜찮아요', roman: 'gwaenchanayo', zh: '没关系 / 还好' },
    { ko: '네', roman: 'ne', zh: '是 / 好的' },
    { ko: '아니요', roman: 'aniyo', zh: '不是 / 不' },
    { ko: '안녕히 가세요', roman: 'annyeonghi gaseyo', zh: '再见（对离开的人）' },
    { ko: '안녕히 계세요', roman: 'annyeonghi gyeseyo', zh: '再见（对留下的人）' },
  ]},
  { id: 'num-sino', title: '汉字词数字', icon: '🔢', words: [
    { ko: '일', roman: 'il', zh: '一' },
    { ko: '이', roman: 'i', zh: '二' },
    { ko: '삼', roman: 'sam', zh: '三' },
    { ko: '사', roman: 'sa', zh: '四' },
    { ko: '오', roman: 'o', zh: '五' },
    { ko: '육', roman: 'yuk', zh: '六' },
    { ko: '칠', roman: 'chil', zh: '七' },
    { ko: '팔', roman: 'pal', zh: '八' },
    { ko: '구', roman: 'gu', zh: '九' },
    { ko: '십', roman: 'sip', zh: '十' },
    { ko: '백', roman: 'baek', zh: '百' },
    { ko: '천', roman: 'cheon', zh: '千' },
    { ko: '만', roman: 'man', zh: '万' },
  ]},
  { id: 'num-native', title: '固有词数字', icon: '✋', words: [
    { ko: '하나', roman: 'hana', zh: '一（个）' },
    { ko: '둘', roman: 'dul', zh: '二' },
    { ko: '셋', roman: 'set', zh: '三' },
    { ko: '넷', roman: 'net', zh: '四' },
    { ko: '다섯', roman: 'daseot', zh: '五' },
    { ko: '여섯', roman: 'yeoseot', zh: '六' },
    { ko: '일곱', roman: 'ilgop', zh: '七' },
    { ko: '여덟', roman: 'yeodeol', zh: '八' },
    { ko: '아홉', roman: 'ahop', zh: '九' },
    { ko: '열', roman: 'yeol', zh: '十' },
  ]},
  { id: 'family', title: '家人与人物', icon: '👨‍👩‍👧', words: [
    { ko: '가족', roman: 'gajok', zh: '家人' },
    { ko: '아버지', roman: 'abeoji', zh: '父亲' },
    { ko: '어머니', roman: 'eomeoni', zh: '母亲' },
    { ko: '아빠', roman: 'appa', zh: '爸爸' },
    { ko: '엄마', roman: 'eomma', zh: '妈妈' },
    { ko: '형', roman: 'hyeong', zh: '哥哥（男生称呼）' },
    { ko: '오빠', roman: 'oppa', zh: '哥哥（女生称呼）' },
    { ko: '누나', roman: 'nuna', zh: '姐姐（男生称呼）' },
    { ko: '언니', roman: 'eonni', zh: '姐姐（女生称呼）' },
    { ko: '동생', roman: 'dongsaeng', zh: '弟弟 / 妹妹' },
    { ko: '할머니', roman: 'halmeoni', zh: '奶奶 / 外婆' },
    { ko: '할아버지', roman: 'harabeoji', zh: '爷爷 / 外公' },
    { ko: '친구', roman: 'chingu', zh: '朋友' },
    { ko: '선생님', roman: 'seonsaengnim', zh: '老师' },
    { ko: '학생', roman: 'haksaeng', zh: '学生' },
  ]},
  { id: 'food', title: '食物饮品', icon: '🍚', words: [
    { ko: '밥', roman: 'bap', zh: '饭' },
    { ko: '물', roman: 'mul', zh: '水' },
    { ko: '김치', roman: 'gimchi', zh: '泡菜' },
    { ko: '고기', roman: 'gogi', zh: '肉' },
    { ko: '빵', roman: 'ppang', zh: '面包' },
    { ko: '라면', roman: 'ramyeon', zh: '拉面 / 方便面' },
    { ko: '사과', roman: 'sagwa', zh: '苹果' },
    { ko: '우유', roman: 'uyu', zh: '牛奶' },
    { ko: '커피', roman: 'keopi', zh: '咖啡' },
    { ko: '차', roman: 'cha', zh: '茶' },
    { ko: '맥주', roman: 'maekju', zh: '啤酒' },
    { ko: '비빔밥', roman: 'bibimbap', zh: '拌饭' },
    { ko: '떡볶이', roman: 'tteokbokki', zh: '炒年糕' },
  ]},
  { id: 'place', title: '地点与日常', icon: '🏙️', words: [
    { ko: '집', roman: 'jip', zh: '家' },
    { ko: '학교', roman: 'hakgyo', zh: '学校' },
    { ko: '회사', roman: 'hoesa', zh: '公司' },
    { ko: '병원', roman: 'byeongwon', zh: '医院' },
    { ko: '식당', roman: 'sikdang', zh: '餐厅' },
    { ko: '화장실', roman: 'hwajangsil', zh: '洗手间' },
    { ko: '지하철', roman: 'jihacheol', zh: '地铁' },
    { ko: '버스', roman: 'beoseu', zh: '公交车' },
    { ko: '돈', roman: 'don', zh: '钱' },
    { ko: '책', roman: 'chaek', zh: '书' },
    { ko: '휴대폰', roman: 'hyudaepon', zh: '手机' },
    { ko: '한국어', roman: 'hangugeo', zh: '韩语' },
  ]},
  { id: 'time', title: '时间', icon: '⏰', words: [
    { ko: '오늘', roman: 'oneul', zh: '今天' },
    { ko: '내일', roman: 'naeil', zh: '明天' },
    { ko: '어제', roman: 'eoje', zh: '昨天' },
    { ko: '지금', roman: 'jigeum', zh: '现在' },
    { ko: '아침', roman: 'achim', zh: '早上 / 早饭' },
    { ko: '점심', roman: 'jeomsim', zh: '中午 / 午饭' },
    { ko: '저녁', roman: 'jeonyeok', zh: '傍晚 / 晚饭' },
    { ko: '시간', roman: 'sigan', zh: '时间 / 小时' },
    { ko: '주말', roman: 'jumal', zh: '周末' },
    { ko: '월요일', roman: 'woryoil', zh: '星期一' },
    { ko: '금요일', roman: 'geumyoil', zh: '星期五' },
  ]},
  { id: 'color', title: '颜色', icon: '🎨', words: [
    { ko: '빨간색', roman: 'ppalgansaek', zh: '红色' },
    { ko: '파란색', roman: 'paransaek', zh: '蓝色' },
    { ko: '노란색', roman: 'noransaek', zh: '黄色' },
    { ko: '초록색', roman: 'choroksaek', zh: '绿色' },
    { ko: '검은색', roman: 'geomeunsaek', zh: '黑色' },
    { ko: '흰색', roman: 'huinsaek', zh: '白色' },
  ]},
  { id: 'verb', title: '常用动词形容词', icon: '🏃', words: [
    { ko: '가다', roman: 'gada', zh: '去' },
    { ko: '오다', roman: 'oda', zh: '来' },
    { ko: '먹다', roman: 'meokda', zh: '吃' },
    { ko: '마시다', roman: 'masida', zh: '喝' },
    { ko: '보다', roman: 'boda', zh: '看' },
    { ko: '하다', roman: 'hada', zh: '做' },
    { ko: '자다', roman: 'jada', zh: '睡觉' },
    { ko: '공부하다', roman: 'gongbuhada', zh: '学习' },
    { ko: '좋아하다', roman: 'joahada', zh: '喜欢' },
    { ko: '있다', roman: 'itda', zh: '有 / 在' },
    { ko: '없다', roman: 'eopda', zh: '没有 / 不在' },
    { ko: '좋다', roman: 'jota', zh: '好' },
    { ko: '크다', roman: 'keuda', zh: '大' },
    { ko: '작다', roman: 'jakda', zh: '小' },
    { ko: '맛있다', roman: 'masitda', zh: '好吃' },
    { ko: '예쁘다', roman: 'yeppeuda', zh: '漂亮' },
  ]},
];

// ---------- 情景短语 ----------
const PHRASES = [
  { scene: '初次见面', items: [
    { ko: '처음 뵙겠습니다.', roman: 'cheoeum boepgetseumnida', zh: '初次见面。' },
    { ko: '만나서 반갑습니다.', roman: 'mannaseo bangapseumnida', zh: '很高兴见到你。' },
    { ko: '이름이 뭐예요?', roman: 'ireumi mwoyeyo?', zh: '你叫什么名字？' },
    { ko: '저는 중국 사람이에요.', roman: 'jeoneun jungguk saramieyo', zh: '我是中国人。' },
    { ko: '잘 부탁드립니다.', roman: 'jal butakdeurimnida', zh: '请多关照。' },
  ]},
  { scene: '购物点餐', items: [
    { ko: '얼마예요?', roman: 'eolmayeyo?', zh: '多少钱？' },
    { ko: '이거 주세요.', roman: 'igeo juseyo', zh: '请给我这个。' },
    { ko: '메뉴판 주세요.', roman: 'menyupan juseyo', zh: '请给我菜单。' },
    { ko: '물 좀 주세요.', roman: 'mul jom juseyo', zh: '请给我点水。' },
    { ko: '계산해 주세요.', roman: 'gyesanhae juseyo', zh: '请结账。' },
    { ko: '카드 돼요?', roman: 'kadeu dwaeyo?', zh: '可以刷卡吗？' },
  ]},
  { scene: '出行问路', items: [
    { ko: '화장실이 어디예요?', roman: 'hwajangsiri eodiyeyo?', zh: '洗手间在哪里？' },
    { ko: '지하철역이 어디예요?', roman: 'jihacheollyeogi eodiyeyo?', zh: '地铁站在哪里？' },
    { ko: '여기서 멀어요?', roman: 'yeogiseo meoreoyo?', zh: '离这里远吗？' },
    { ko: '여기로 가 주세요.', roman: 'yeogiro ga juseyo', zh: '请去这里。（打车）' },
  ]},
  { scene: '沟通求助', items: [
    { ko: '한국어를 조금 해요.', roman: 'hangugeoreul jogeum haeyo', zh: '我会说一点韩语。' },
    { ko: '천천히 말해 주세요.', roman: 'cheoncheonhi malhae juseyo', zh: '请说慢一点。' },
    { ko: '다시 한 번 말해 주세요.', roman: 'dasi han beon malhae juseyo', zh: '请再说一遍。' },
    { ko: '알겠습니다.', roman: 'algetseumnida', zh: '我明白了。' },
    { ko: '잘 모르겠어요.', roman: 'jal moreugesseoyo', zh: '我不太清楚。' },
    { ko: '도와주세요!', roman: 'dowajuseyo!', zh: '请帮帮我！' },
  ]},
  { scene: '日常生活', items: [
    { ko: '잘 먹겠습니다.', roman: 'jal meokgetseumnida', zh: '我开动了。（饭前）' },
    { ko: '잘 먹었습니다.', roman: 'jal meogeotseumnida', zh: '我吃好了。（饭后）' },
    { ko: '수고하셨습니다.', roman: 'sugohasyeotseumnida', zh: '辛苦了。' },
    { ko: '생일 축하해요!', roman: 'saengil chukahaeyo!', zh: '生日快乐！' },
    { ko: '사랑해요.', roman: 'saranghaeyo', zh: '我爱你。' },
    { ko: '화이팅!', roman: 'hwaiting!', zh: '加油！' },
  ]},
];

// ---------- 入门语法 ----------
const GRAMMAR = [
  {
    title: '韩语的语序：主语 + 宾语 + 谓语',
    body: '与汉语“我吃饭”不同，韩语把动词放在句末：“我 饭 吃”。名词后面用助词标明它在句子中的作用。',
    examples: [
      { ko: '저는 밥을 먹어요.', zh: '我吃饭。（我-는 饭-을 吃）' },
      { ko: '친구가 한국어를 공부해요.', zh: '朋友学习韩语。' },
    ],
  },
  {
    title: '主题助词 은 / 는',
    body: '表示“话题”，相当于“……嘛 / 至于……”。前一个字有收音（韵尾辅音）用 은，没有收音用 는。',
    examples: [
      { ko: '저는 학생이에요.', zh: '我是学生。（저 无收音 → 는）' },
      { ko: '선생님은 한국 사람이에요.', zh: '老师是韩国人。（님 有收音 → 은）' },
    ],
  },
  {
    title: '主格助词 이 / 가',
    body: '标记主语，常用于新信息、描述存在或疑问句。有收音用 이，无收音用 가。',
    examples: [
      { ko: '책이 있어요.', zh: '有书。' },
      { ko: '누가 왔어요?', zh: '谁来了？' },
    ],
  },
  {
    title: '宾格助词 을 / 를',
    body: '标记动作的对象（宾语）。有收音用 을，无收音用 를。',
    examples: [
      { ko: '물을 마셔요.', zh: '喝水。' },
      { ko: '커피를 좋아해요.', zh: '喜欢咖啡。' },
    ],
  },
  {
    title: '“是”：이에요 / 예요',
    body: '名词 + 이에요/예요 = “是……”。有收音接 이에요，无收音接 예요。更正式的说法是 입니다。',
    examples: [
      { ko: '이거 물이에요.', zh: '这是水。' },
      { ko: '제 친구예요.', zh: '是我的朋友。' },
    ],
  },
  {
    title: '礼貌现在时：-아요 / -어요',
    body: '去掉词典形的 다。词干最后元音为 ㅏ/ㅗ 接 아요，其他接 어요，하다 变成 해요。这是日常最常用的礼貌语体。',
    examples: [
      { ko: '가다 → 가요', zh: '去（가 + 아요 合并）' },
      { ko: '먹다 → 먹어요', zh: '吃' },
      { ko: '공부하다 → 공부해요', zh: '学习' },
    ],
  },
];
