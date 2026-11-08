/* 韩语学堂 / 韓国語学堂：单页应用逻辑（中文 / 日本語 双语界面） */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const ALL_WORDS = VOCAB.flatMap((c) => c.words.map((w) => ({ ...w, cat: c.id })));
  const ALL_LETTERS = [...CONSONANTS, ...DOUBLE_CONSONANTS, ...VOWELS, ...COMPOUND_VOWELS];
  const J = JA_I18N;

  // ---------- 界面语言 ----------
  const LANG_KEY = 'kl-lang-v1';
  let LANG = 'zh';
  try { LANG = localStorage.getItem(LANG_KEY) === 'ja' ? 'ja' : 'zh'; } catch (e) { /* 忽略 */ }
  const isJa = () => LANG === 'ja';
  const L = (zh, ja) => (isJa() ? ja : zh);

  // 日语文字（用日文字形显示汉字）
  const jt = (t) => `<span class="jp" lang="ja">${esc(t)}</span>`;
  // 主语言文字：日语界面时加上日文字形
  const mt = (t) => (isJa() ? jt(t) : esc(t));

  // 内容的语言切换
  const mean = (w) => (isJa() ? JA_VOCAB[w.ko][0] : w.zh);
  const phraseMean = (p) => (isJa() ? JA_PHRASES[p.ko] || p.zh : p.zh);
  const catTitle = (c) => (isJa() ? J.cats[c.id] || c.title : c.title);
  const letterTip = (l) => (isJa() ? J.letters[l.ch][0] : l.tip);
  const letterHow = (l) => (isJa() ? J.letters[l.ch][1] : HOW_TO[l.ch] || '');

  // ---------- 本地进度 ----------
  const STORE_KEY = 'kl-progress-v1';
  const dayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY));
      if (p && typeof p === 'object') return { known: {}, quiz: { answered: 0, correct: 0, best: 0 }, days: [], ...p };
    } catch (e) { /* 无痕模式等情况下可能不可用 */ }
    return { known: {}, quiz: { answered: 0, correct: 0, best: 0 }, days: [] };
  }
  const progress = loadProgress();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* 忽略 */ }
  }
  (function markVisit() {
    const t = dayStr(new Date());
    if (!progress.days.includes(t)) {
      progress.days.push(t);
      progress.days = progress.days.slice(-400);
      save();
    }
  })();
  function streak() {
    const set = new Set(progress.days);
    let n = 0;
    const d = new Date();
    while (set.has(dayStr(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const knownCount = () => ALL_WORDS.filter((w) => progress.known[w.ko]).length;

  // ---------- 提示 ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- 语音朗读（男声 / 女声） ----------
  const FEMALE_RE = /female|woman|여성|여자|sunhi|heami|yuna|sora|jimin|seohyeon|soonbok|yujin|suhyun|narae|yuri|google/i;
  const MALE_RE = /\bmale\b|\bman\b|남성|남자|injoon|bongjin|gookmin|hyunsu|minsu|jinho/i;
  const genderLabel = (g) => (g === 'male' ? L('男声', '男性') : L('女声', '女性'));
  const VOICE_KEY = 'kl-voice-v1';
  const voicePrefs = (() => {
    const d = { gender: 'female', female: '', male: '', rate: 0.85 };
    try { return { ...d, ...JSON.parse(localStorage.getItem(VOICE_KEY) || '{}') }; } catch (e) { return d; }
  })();
  const saveVoicePrefs = () => { try { localStorage.setItem(VOICE_KEY, JSON.stringify(voicePrefs)); } catch (e) { /* 忽略 */ } };

  let koVoices = [];
  let warnedNoVoice = false;
  const hasTTS = 'speechSynthesis' in window;
  const classifyVoice = (v) => (FEMALE_RE.test(v.name) ? 'female' : MALE_RE.test(v.name) ? 'male' : 'unknown');
  function loadVoices() {
    if (!hasTTS) return;
    koVoices = speechSynthesis.getVoices().filter((v) => /^ko(-|_|$)/i.test(v.lang));
    const score = (v) => (/natural|online|premium|enhanced|neural/i.test(v.name) ? 0 : 1);
    koVoices.sort((a, b) => score(a) - score(b));
    document.dispatchEvent(new Event('kl-voices'));
  }
  if (hasTTS) {
    loadVoices();
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  }

  // 为指定性别挑选设备语音；没有对应性别时用同一语音调整音高来模拟
  function resolveVoice(gender) {
    const manual = koVoices.find((v) => v.name === voicePrefs[gender]);
    if (manual) return { voice: manual, pitch: 1, simulated: false };
    const match = koVoices.find((v) => classifyVoice(v) === gender);
    if (match) return { voice: match, pitch: 1, simulated: false };
    const other = gender === 'female' ? 'male' : 'female';
    const unknown = koVoices.filter((v) => classifyVoice(v) === 'unknown');
    if (gender === 'female' && unknown[0]) return { voice: unknown[0], pitch: 1, simulated: false };
    if (gender === 'male' && unknown.length > 1) return { voice: unknown[1], pitch: 1, simulated: false };
    const base = koVoices.find((v) => classifyVoice(v) === other) || unknown[0] || koVoices[0] || null;
    return { voice: base, pitch: gender === 'male' ? 0.6 : 1.35, simulated: true };
  }

  // 预先生成的专业音频（微软神经语音：女声 SunHi / 男声 InJoon），见 scripts/gen_audio.py
  const AUDIO = window.AUDIO_MANIFEST || {};
  const AUDIO_BASE_RATE = 0.9; // 生成时语速为 -10%
  let currentAudio = null;
  function stopAudio() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  }
  function playRecorded(text, rate, gender) {
    const id = AUDIO[String(text).trim()];
    if (!id) return false;
    stopAudio();
    if (hasTTS) speechSynthesis.cancel();
    const a = new Audio(`audio/${gender === 'male' ? 'm' : 'f'}/${id}.mp3`);
    a.playbackRate = Math.min(2, Math.max(0.5, (rate || voicePrefs.rate) / AUDIO_BASE_RATE));
    currentAudio = a;
    a.play().catch(() => { if (currentAudio === a) { currentAudio = null; speakTTS(text, rate, gender); } });
    return true;
  }
  function speak(text, rate, gender) {
    gender = gender || voicePrefs.gender;
    if (playRecorded(text, rate, gender)) return;
    speakTTS(text, rate, gender);
  }
  // 没有预生成音频的文本（如拼读器里带收音的任意音节）用浏览器语音朗读
  function speakTTS(text, rate, gender) {
    stopAudio();
    if (!hasTTS) {
      toast(L('当前浏览器不支持语音朗读，建议使用 Chrome / Edge / Safari', 'このブラウザは音声読み上げに対応していません。Chrome / Edge / Safari をお使いください'));
      return;
    }
    gender = gender || voicePrefs.gender;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = rate || voicePrefs.rate;
    const r = resolveVoice(gender);
    if (r.voice) u.voice = r.voice;
    u.pitch = r.pitch;
    if (!r.voice && !warnedNoVoice && speechSynthesis.getVoices().length) {
      warnedNoVoice = true;
      toast(L('未检测到韩语语音包，这段内容的发音可能不准确。', '韓国語の音声が見つからないため、この部分の発音は正確でない場合があります。'));
    }
    speechSynthesis.speak(u);
  }
  const slowRate = () => Math.max(0.5, voicePrefs.rate - 0.15);

  // 单个朗读按钮（使用当前选择的声音）
  const speakBtn = (text) =>
    `<button class="speak" data-speak="${esc(text)}" aria-label="${L('朗读', '再生')}：${esc(text)}" title="${L('朗读', '再生')}">🔊</button>`;
  // 女声 / 男声 一对按钮，方便对比
  const dualBtns = (text, small = false) => `
    <span class="dual${small ? ' dual-sm' : ''}">
      <button class="speak-g female" data-speak="${esc(text)}" data-gender="female" aria-label="${genderLabel('female')}：${esc(text)}" title="${genderLabel('female')}">👩<span>${genderLabel('female')}</span></button>
      <button class="speak-g male" data-speak="${esc(text)}" data-gender="male" aria-label="${genderLabel('male')}：${esc(text)}" title="${genderLabel('male')}">👨<span>${genderLabel('male')}</span></button>
    </span>`;

  function setGender(g) {
    voicePrefs.gender = g;
    saveVoicePrefs();
    $$('[data-gender-set]').forEach((b) => {
      const on = b.dataset.genderSet === g;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  // ---------- 日语辅助（中文界面时可开关；日语界面时日语就是主语言） ----------
  const JA_KEY = 'kl-ja-v1';
  let jaOn = true;
  try { jaOn = localStorage.getItem(JA_KEY) !== 'off'; } catch (e) { /* 忽略 */ }
  function applyJa() {
    document.body.classList.toggle('ja-off', !jaOn && !isJa());
    $$('[data-ja-toggle]').forEach((b) => {
      b.classList.toggle('active', jaOn);
      b.setAttribute('aria-pressed', String(jaOn));
    });
  }
  // 中文界面下，单词的日语对照行
  function jaWordLine(ko, withNote = false) {
    const j = JA_VOCAB[ko];
    if (!j || isJa()) return '';
    const [ja, kanji, note] = j;
    return `<div class="ja ja-line"><span class="ja-tag">日</span>${jt(ja)}${kanji ? `<span class="kanji-badge">汉字词 ${jt(kanji)}</span>` : ''}${withNote && note ? `<div class="ja-note">${esc(note)}</div>` : ''}</div>`;
  }
  // 日语界面下，单词的汉字与注释
  function kanjiLine(ko, withNote = false) {
    const j = JA_VOCAB[ko];
    if (!j || !isJa()) return '';
    const [, kanji] = j;
    const note = J.vocabNotes[ko];
    if (!kanji && !(withNote && note)) return '';
    return `<div class="ja-line">${kanji ? `<span class="kanji-badge" style="margin-left:0">漢字語 ${jt(kanji)}</span>` : ''}${withNote && note ? `<div class="ja-note">${jt(note)}</div>` : ''}</div>`;
  }

  // ---------- 韩文音节工具 ----------
  const SBASE = 0xac00, SCOUNT = 11172;
  const compose = (l, v, t) => String.fromCharCode(SBASE + (l * 21 + v) * 28 + t);
  function decompose(ch) {
    const code = ch.charCodeAt(0) - SBASE;
    if (code < 0 || code >= SCOUNT) return null;
    return { l: Math.floor(code / 588), v: Math.floor((code % 588) / 28), t: code % 28 };
  }
  const romanOf = (l, v, t) => ROMAN_INITIAL[l] + ROMAN_MEDIAL[v] + ROMAN_FINAL[t];

  // ---------- 页面：首页 ----------
  function viewHome() {
    const total = ALL_WORDS.length;
    const known = knownCount();
    const q = progress.quiz;
    const acc = q.answered ? Math.round((q.correct / q.answered) * 100) : 0;
    const daily = ALL_WORDS[Math.floor(Date.now() / 86400000) % ALL_WORDS.length];
    const steps = [
      ['alphabet', L('认识韩文字母', 'ハングルを覚える'), L('14 个基本辅音、10 个基本元音，以及双辅音和复合元音。', '基本子音 14 個、基本母音 10 個と、濃音・複合母音。')],
      ['pronounce', L('发音讲解', '発音のしくみ'), L('松音·送气音·紧音、元音口型、收音和音变，男声女声对比听。', '平音・激音・濃音、母音の口の形、パッチム、音の変化。男性・女性の声で聞き比べ。')],
      ['builder', L('学会拼读音节', '文字を組み立てる'), L('像搭积木一样把辅音和元音组合成字，理解收音规则。', '子音と母音をブロックのように組み合わせて文字を作る。')],
      ['words', L('积累核心词汇', '基本単語'), L(`${total} 个高频词，翻卡记忆并标记掌握情况。`, `よく使う ${total} 語をフラッシュカードで覚える。`)],
      ['phrases', L('情景短语', '場面別フレーズ'), L('见面、点餐、问路、求助……开口就能用。', 'あいさつ、注文、道案内……すぐに使える表現。')],
      ['grammar', L('入门语法', '入門文法'), L('语序、助词、“是”和礼貌体，一次讲清。', '語順、助詞、「です」、丁寧形をまとめて理解。')],
      ['quiz', L('测验巩固', 'テストで確認'), L('字母、词义、听力多种题型，检验学习效果。', '文字・意味・聞き取りなど、さまざまな問題で確認。')],
      ['japanese', L('日韩对照', '日韓対照'), L('会日语？借助助词、汉字词读音规律和敬语对照，学得更快。', '助詞・漢字語の読みの規則・敬語を日本語と比べて、効率よく学ぶ。')],
    ];
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>${L('从零开始，<br><span class="accent">轻松学韩语</span>', 'ゼロから始める<br><span class="accent">やさしい韓国語</span>')}</h1>
          <p>${L('专为中文母语者设计的韩语入门站。韩文字母只需几小时就能掌握——跟着下面的路线一步步来吧。', '日本語話者のための韓国語入門サイト。語順も助詞も日本語とそっくりなので、ハングルさえ覚えればぐんぐん進めます。下のルートに沿って始めましょう。')}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/alphabet">${L('开始学字母 →', 'ハングルから始める →')}</a>
            <a class="btn" href="#/quiz">${L('直接测一测', 'すぐにテストする')}</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <span class="big">한글</span>
          <span class="cap">Hangeul · ${L('韩文', 'ハングル')}</span>
        </div>
      </section>

      <div class="stats">
        <div class="card stat"><div class="num">${known}<small style="font-size:14px;color:var(--ink-soft)"> / ${total}</small></div><div class="label">${L('已掌握词汇', '覚えた単語')}</div><div class="bar"><span style="width:${(known / total) * 100}%"></span></div></div>
        <div class="card stat"><div class="num">${streak()}</div><div class="label">${L('连续学习天数', '連続学習日数')}</div></div>
        <div class="card stat"><div class="num">${q.answered}</div><div class="label">${L('累计答题', '解いた問題数')}</div></div>
        <div class="card stat"><div class="num">${acc}%</div><div class="label">${L('答题正确率', '正答率')}</div></div>
      </div>

      ${isJa() ? `
      <a class="card ja-banner" href="#/japanese">
        <span class="ja-big jp" lang="ja">日</span>
        <div><b>日本語ができる人は有利！</b><p>韓国語と日本語は語順が同じで、助詞もほぼ一対一で対応し、漢字語の読みも規則的に対応しています。日韓対照ページでまとめて確認できます。</p></div>
        <span class="go">日韓対照 →</span>
      </a>` : `
      <a class="card ja ja-banner" href="#/japanese">
        <span class="ja-big jp" lang="ja">あ</span>
        <div><b>已开启日语辅助</b><p>韩语和日语语序相同、助词几乎一一对应、汉字词读音成套对应。全站会在合适的地方显示日语对照，可随时用右上角的「あ」按钮关闭。</p></div>
        <span class="go">日韩对照 →</span>
      </a>`}

      <h2 class="section-title">${L('今日一词', '今日の単語')}</h2>
      <div class="card daily">
        <span class="word">${esc(daily.ko)}</span>
        ${dualBtns(daily.ko)}
        <div class="meta"><div style="color:var(--red);font-weight:700">${esc(daily.roman)}</div><div>${mt(mean(daily))}</div>${jaWordLine(daily.ko)}${kanjiLine(daily.ko)}</div>
      </div>

      <h2 class="section-title">${L('学习路线', '学習ルート')}</h2>
      <div class="path">
        ${steps.map(([r, t, d], i) => `
          <a class="card path-item" href="#/${r}">
            <span class="step">${i + 1}</span>
            <div><h3>${t}</h3><p>${d}</p></div>
          </a>`).join('')}
      </div>`;
  }

  // ---------- 页面：字母 ----------
  function viewAlphabet() {
    const group = (title, sub, list, type) => `
      <h2 class="section-title">${title} <small>${sub}</small></h2>
      <div class="letters">
        ${list.map((l) => `
          <button class="letter" data-letter="${esc(l.ch)}" data-type="${type}">
            <div class="glyph">${l.ch}</div>
            <div class="roman">${esc(l.roman)}</div>
            <div class="name">${esc(l.name || l.sound)}</div>
            ${JA_LETTER[l.ch] ? `<div class="${isJa() ? '' : 'ja '}kana jp" lang="ja">${esc(JA_LETTER[l.ch][0])}</div>` : ''}
          </button>`).join('')}
      </div>`;
    const n = (k) => L(`${k} 个`, `${k} 個`);
    app.innerHTML = `
      <h1 class="page-title">${L('韩文字母 한글', 'ハングル 한글')}</h1>
      <p class="page-sub">${L('韩文是表音文字，由辅音和元音组合成方块字。点击任意字母查看详情并收听发音。', 'ハングルは表音文字で、子音と母音を組み合わせて四角い文字を作ります。文字をクリックすると詳しい説明と発音を確認できます。各文字の下の仮名は近い音の目安です。')}</p>
      <div class="card detail" id="letterDetail">
        <div class="glyph-xl">ㄱ</div>
        <div></div>
      </div>
      ${group(L('基本辅音', '基本子音'), n(14), CONSONANTS, 'c')}
      ${group(L('双辅音（紧音）', '濃音（双子音）'), n(5), DOUBLE_CONSONANTS, 'c')}
      ${group(L('基本元音', '基本母音'), n(10), VOWELS, 'v')}
      ${group(L('复合元音', '複合母音'), n(11), COMPOUND_VOWELS, 'v')}
      <h2 class="section-title">${L('收音（받침）的 7 个代表音 <small>写在字下方的辅音只读这 7 种音</small>', 'パッチム（받침）の 7 つの代表音 <small>下につく子音は、この 7 つの音のどれかで読む</small>')}</h2>
      <div class="card table-wrap">
        <table class="rule-table">
          <thead><tr><th>${L('实际读音', '実際の音')}</th><th>${L('对应字母', '該当する文字')}</th><th>${L('例词', '例')}</th></tr></thead>
          <tbody>${BATCHIM_RULES.map((r, i) => `<tr><td><b>${esc(r.sound)}</b></td><td>${esc(r.letters)}</td><td class="ko">${isJa() ? jt(J.batchimRuleEx[i]) : esc(r.example)}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;

    const showLetter = (ch, type, play) => {
      const l = ALL_LETTERS.find((x) => x.ch === ch);
      const idx = type === 'c' ? INITIALS.indexOf(ch) : MEDIALS.indexOf(ch);
      // 组合示例：辅音 + 若干元音 / ㅇ + 元音 + 若干辅音
      const samples = type === 'c'
        ? [0, 4, 8, 13, 20].map((v) => compose(idx, v, 0))
        : [11, 0, 2, 6, 9, 15].map((c) => compose(c, idx, 0));
      $('#letterDetail').innerHTML = `
        <div class="glyph-xl">${l.ch}</div>
        <div>
          <h3>${l.ch} ${l.name ? `<span class="ko">（${esc(l.name)}）</span>` : ''} · <span style="color:var(--red)">${esc(l.roman)}</span>${isJa() && JA_LETTER[l.ch] ? ` · ${jt(JA_LETTER[l.ch][0])}` : ''}</h3>
          <p class="tip">${mt(letterTip(l))}</p>
          <div class="how"><b>${L('发音方法：', '発音のしかた：')}</b>${mt(letterHow(l))}</div>
          ${!isJa() && JA_LETTER[l.ch] ? `<div class="how ja ja-how"><b>日语提示：</b>${jt(JA_LETTER[l.ch][0])} — ${esc(JA_LETTER[l.ch][1])}</div>` : ''}
          <div class="listen-row">
            <span class="listen-label ko">${esc(l.sound)}</span>${dualBtns(l.sound)}
            ${l.name ? `<span class="listen-label">${L('名称', '名前')} <span class="ko">${esc(l.name)}</span></span>${dualBtns(l.name)}` : ''}
          </div>
          <div class="examples">
            <span class="ex-label">${L('组合练习：', '組み合わせ練習：')}</span>
            ${[...new Set(samples)].map((s) => `<button class="btn btn-sm btn-ghost ko" data-speak="${s}">${s}</button>`).join('')}
          </div>
        </div>`;
      $$('.letter').forEach((b) => b.classList.toggle('playing', b.dataset.letter === ch));
      if (play) speak(l.sound);
    };
    showLetter('ㄱ', 'c', false);
    const onLetterClick = (e) => {
      const b = e.target.closest('.letter');
      if (!b) return;
      showLetter(b.dataset.letter, b.dataset.type, true);
      $('#letterDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    app.addEventListener('click', onLetterClick);
    return () => app.removeEventListener('click', onLetterClick);
  }

  // ---------- 页面：发音讲解 ----------
  function viewPronounce() {
    const toc = isJa()
      ? [['p-voice', '音声の設定'], ['p-keys', '発音の特徴'], ['p-triad', '平音・激音・濃音'], ['p-vowel', '紛らわしい母音'],
        ['p-batchim', 'パッチム'], ['p-rules', '音の変化'], ['p-ja', '日本語話者のコツ'], ['p-mistakes', 'よくある間違い']]
      : [['p-voice', '声音设置'], ['p-keys', '发音特点'], ['p-triad', '松音·送气音·紧音'], ['p-vowel', '易混元音'],
        ['p-batchim', '收音'], ['p-rules', '音变规则'], ['p-mistakes', '常见误区'], ['p-ja', '日语学习者捷径', 'ja']];
    const keys = isJa() ? PRON_KEYS.map((k, i) => ({ ...k, ...J.pronKeys[i] })) : PRON_KEYS;
    const types = isJa() ? J.triadTypes : TRIAD_TYPES;
    const jaTips = isJa() ? J.pronTips : JA_PRON_TIPS;
    const mistakes = isJa() ? J.mistakes : COMMON_MISTAKES;

    const jaTipsSection = `
      <section class="${isJa() ? '' : 'ja'}">
        <h2 class="section-title" id="p-ja">${L('<span class="ja-tag">日</span> 会日语的发音捷径 <small>很多难点你其实已经会了</small>', '日本語話者のための発音のコツ <small>実はもうできている音がたくさんある</small>')}</h2>
        <div class="ja-tips">
          ${jaTips.map((t) => `<div class="card ja-tip"><h3>${mt(t.title)}</h3><p>${mt(t.text)}</p></div>`).join('')}
        </div>
      </section>`;
    const mistakesSection = `
      <h2 class="section-title" id="p-mistakes">${L('中国学习者常见误区', '日本語話者によくある間違い')}</h2>
      <div class="card mistakes-list">
        ${mistakes.map((m) => `
          <div class="mk">
            <div class="mk-wrong">✗ ${mt(m.wrong)}</div>
            <div class="mk-right">✓ ${mt(m.right)}</div>
          </div>`).join('')}
      </div>`;

    app.innerHTML = `
      <h1 class="page-title">${L('发音讲解', '発音のしくみ')}</h1>
      <p class="page-sub">${L('每个例子都可以分别用 👩 女声 和 👨 男声 收听（专业神经语音录制），对比着练效果更好。建议跟读时录下自己的声音再对比。', 'すべての例を 👩 女性 と 👨 男性 の声（ニューラル音声）で聞けます。聞き比べながら練習し、自分の声を録音して比べるのがおすすめです。')}</p>
      <nav class="toc chips" aria-label="${L('本页目录', 'このページの目次')}">
        ${toc.map(([id, t, cls]) => `<a class="chip ${cls || ''}" href="#/pronounce" data-jump="${id}">${t}</a>`).join('')}
      </nav>

      <h2 class="section-title" id="p-voice">🔈 ${L('声音设置', '音声の設定')}</h2>
      <div class="card voice-panel" id="voicePanel"></div>

      <h2 class="section-title" id="p-keys">${L('韩语发音的 4 个特点', '韓国語の発音 4 つの特徴')}</h2>
      <div class="key-grid">
        ${keys.map((k) => `<div class="card key"><div class="ic">${k.icon}</div><h3>${mt(k.title)}</h3><p>${mt(k.text)}</p></div>`).join('')}
      </div>

      <h2 class="section-title" id="p-triad">${L('松音 · 送气音 · 紧音 <small>韩语辅音最重要的区别</small>', '平音 · 激音 · 濃音 <small>韓国語の子音でいちばん大事な区別</small>')}</h2>
      <div class="card triad-legend">
        ${['lax', 'asp', 'tense'].map((k, i) => `<div class="legend t${i}"><b>${mt(types[k].name)}</b><p>${mt(types[k].desc)}</p></div>`).join('')}
        <p class="paper-test">🧻 <b>${L('纸片测试：', '紙テスト：')}</b>${L('拿一张薄纸放在嘴前 3 厘米处。读送气音时纸片明显飘动，读紧音时纸片几乎不动，读松音时轻微晃动。', jt(J.paperTest))}</p>
      </div>
      <div class="triads">
        ${CONSONANT_TRIADS.map((g) => `
          <div class="card triad">
            <div class="triad-head ko">${esc(g.group)}</div>
            <div class="triad-cells">
              ${g.cells.map((c) => `
                <div class="triad-cell ${c.type}">
                  <div class="tt">${mt(types[c.type].name.split(' ')[0])}</div>
                  <div class="syl ko">${esc(c.syl)}</div>
                  ${dualBtns(c.syl, true)}
                  <div class="tw"><span class="ko">${esc(c.word)}</span> ${mt(isJa() ? J.triadMeanings[c.word] : c.zh)}</div>
                  ${dualBtns(c.word, true)}
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-vowel">${L('易混元音 <small>注意嘴唇的形状</small>', '紛らわしい母音 <small>唇の形に注意</small>')}</h2>
      <div class="pair-grid">
        ${VOWEL_PAIRS.map((v, i) => {
          const jv = J.vowelPairs[i];
          return `
          <div class="card pair">
            <h3 class="ko">${isJa() ? jt(jv.pair) : esc(v.pair)}</h3>
            <p>${mt(isJa() ? jv.tip : v.tip)}</p>
            ${v.words.map((w, k) => `<div class="pair-word"><span class="ko k">${esc(w.ko)}</span><span class="z">${mt(isJa() ? jv.words[k] : w.zh)}</span>${dualBtns(w.ko, true)}</div>`).join('')}
          </div>`;
        }).join('')}
      </div>

      <h2 class="section-title" id="p-batchim">${L('收音的发音方法 <small>只做口型、不放气</small>', 'パッチムの発音 <small>口の形を作るだけで、息は出さない</small>')}</h2>
      <div class="batchim-grid">
        ${BATCHIM_HOW.map((b, i) => `
          <div class="card batchim">
            <div class="b-top"><span class="b-syl ko">${esc(b.syl)}</span><span class="b-ch ko">${L('收音', 'パッチム')} ${esc(b.ch)}</span></div>
            <p>${mt(isJa() ? J.batchimHow[i] : b.how)}</p>
            ${dualBtns(b.syl, true)}
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-rules">${L('音变规则 <small>写法 → [实际读音]</small>', '音の変化 <small>つづり → [実際の発音]</small>')}</h2>
      <div class="rules">
        ${SOUND_RULES.map((r, i) => {
          const jr = J.soundRules[i];
          return `
          <div class="card rule">
            <h3><span class="n">${i + 1}</span>${mt(isJa() ? jr.name : r.name)} <span class="ko rule-ko">${esc(r.ko)}</span></h3>
            <p>${mt(isJa() ? jr.rule : r.rule)}</p>
            ${!isJa() && JA_RULE_NOTES[r.name] ? `<div class="how ja ja-how"><b>日语联想：</b>${esc(JA_RULE_NOTES[r.name])}</div>` : ''}
            <div class="rule-examples">
              ${r.examples.map((x, k) => `
                <div class="rule-ex">
                  <div class="rx-text"><span class="ko k">${esc(x.ko)}</span><span class="arrow">→</span><span class="ko pron">[${esc(x.pron)}]</span><span class="z">${mt(isJa() ? jr.ex[k] : x.zh)}</span></div>
                  ${dualBtns(x.ko, true)}
                </div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${isJa() ? jaTipsSection + mistakesSection : mistakesSection + jaTipsSection}`;

    // 声音设置面板
    const renderVoicePanel = () => {
      const panel = $('#voicePanel');
      if (!panel) return;
      const opts = (g) => `
        <option value="">${L('自动选择', '自動')}</option>
        ${koVoices.map((v) => `<option value="${esc(v.name)}" ${voicePrefs[g] === v.name ? 'selected' : ''}>${esc(v.name)}${classifyVoice(v) !== 'unknown' ? `（${genderLabel(classifyVoice(v))}）` : ''}</option>`).join('')}`;
      const status = (g) => {
        const r = resolveVoice(g);
        if (!r.voice) return `<span class="vs warn">${L('未找到韩语语音', '韓国語の音声が見つかりません')}</span>`;
        return r.simulated
          ? `<span class="vs warn">${L(`本设备没有韩语${genderLabel(g)}，已用 ${esc(r.voice.name)} 调整音高模拟`, `この端末には韓国語の${genderLabel(g)}の声がないため、${esc(r.voice.name)} の高さを変えて代用しています`)}</span>`
          : `<span class="vs ok">${L('使用：', '使用中：')}${esc(r.voice.name)}</span>`;
      };
      const females = koVoices.filter((v) => classifyVoice(v) === 'female').length;
      const males = koVoices.filter((v) => classifyVoice(v) === 'male').length;
      const nRec = Object.keys(AUDIO).length;
      const demo = '안녕하세요. 만나서 반갑습니다.';
      panel.innerHTML = `
        ${nRec ? `
          <div class="pro-note">
            <b>✅ ${L('全站使用预先生成的专业神经语音音频', 'サイト全体であらかじめ生成したニューラル音声を使用')}</b>
            <p>${L(`👩 女声 SunHi、👨 男声 InJoon（微软神经语音，首尔标准音），共 ${nRec} 条 × 2，任何设备听到的效果都一样。`, `👩 女性 SunHi・👨 男性 InJoon（Microsoft のニューラル音声、ソウル標準語）、${nRec} 件 × 2。どの端末でも同じ音声で聞けます。`)}</p>
            <div class="dual-demo">
              <button class="btn btn-sm" data-speak="${demo}" data-gender="female">👩 ${L('试听女声', '女性の声を聞く')}</button>
              <button class="btn btn-sm" data-speak="${demo}" data-gender="male">👨 ${L('试听男声', '男性の声を聞く')}</button>
            </div>
          </div>` : ''}
        <div class="voice-extra">
          <label>${L('默认声音：', '既定の声：')}
            <span class="toggle">
              <button data-gender-set="female" class="${voicePrefs.gender === 'female' ? 'active' : ''}">👩 ${genderLabel('female')}</button>
              <button data-gender-set="male" class="${voicePrefs.gender === 'male' ? 'active' : ''}">👨 ${genderLabel('male')}</button>
            </span>
          </label>
          <label>${L('语速：', '速さ：')}<input type="range" id="rateRange" min="0.5" max="1.2" step="0.05" value="${voicePrefs.rate}"> <span id="rateVal">${voicePrefs.rate.toFixed(2)}×</span></label>
        </div>
        <details class="device-voices">
          <summary>${L('设备语音（仅用于拼读器里带收音的音节、拆字器等少数没有预生成音频的内容）', '端末の音声（文字の組み立てでパッチム付きの音節など、音声ファイルがない一部の内容だけに使用）')}</summary>
          ${!hasTTS ? `<p>${L('当前浏览器不支持语音朗读。', 'このブラウザは音声読み上げに対応していません。')}</p>` : `
          <div class="voice-rows">
            ${['female', 'male'].map((g) => `
              <div class="voice-row">
                <div class="vr-head">
                  <b>${g === 'female' ? '👩' : '👨'} ${genderLabel(g)}</b>
                  <button class="btn btn-sm" data-tts-test="${g}">${L('试听', '試聴')}</button>
                </div>
                <select class="voice-select" data-voice-for="${g}" aria-label="${genderLabel(g)}">${opts(g)}</select>
                ${status(g)}
              </div>`).join('')}
          </div>
          <p class="voice-summary">${L(`本设备检测到 ${koVoices.length} 个韩语语音（女声 ${females} 个，男声 ${males} 个）。`, `この端末の韓国語音声：${koVoices.length} 件（女性 ${females}・男性 ${males}）。`)}</p>`}
        </details>`;
    };
    const onChange = (e) => {
      const sel = e.target.closest('[data-voice-for]');
      if (sel) {
        voicePrefs[sel.dataset.voiceFor] = sel.value;
        saveVoicePrefs();
        renderVoicePanel();
        speakTTS('안녕하세요', null, sel.dataset.voiceFor);
      }
    };
    const onInput = (e) => {
      if (e.target.id === 'rateRange') {
        voicePrefs.rate = Number(e.target.value);
        saveVoicePrefs();
        $('#rateVal').textContent = voicePrefs.rate.toFixed(2) + '×';
      }
    };
    const onClick = (e) => {
      const tt = e.target.closest('[data-tts-test]');
      if (tt) return speakTTS('안녕하세요. 만나서 반갑습니다.', null, tt.dataset.ttsTest);
      const j = e.target.closest('[data-jump]');
      if (j) {
        e.preventDefault();
        const t = document.getElementById(j.dataset.jump);
        if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
      }
    };
    app.addEventListener('change', onChange);
    app.addEventListener('input', onInput);
    app.addEventListener('click', onClick);
    document.addEventListener('kl-voices', renderVoicePanel);
    renderVoicePanel();
    return () => {
      app.removeEventListener('change', onChange);
      app.removeEventListener('input', onInput);
      app.removeEventListener('click', onClick);
      document.removeEventListener('kl-voices', renderVoicePanel);
    };
  }

  // ---------- 页面：拼读 ----------
  function viewBuilder() {
    const state = { l: 0, v: 0, t: 0 };
    const jamoBtns = (list, key) => list.map((j, i) =>
      `<button class="jamo${j ? '' : ' none'}" data-k="${key}" data-i="${i}">${j || L('无', 'なし')}</button>`).join('');
    app.innerHTML = `
      <h1 class="page-title">${L('音节拼读', '文字の組み立て')}</h1>
      <p class="page-sub">${L('每个韩文字 = 初声（辅音）+ 中声（元音）+ 可选的终声（收音）。选一选，看看能拼出什么字。', 'ハングル 1 文字 ＝ 初声（子音）＋ 中声（母音）＋ 終声（パッチム、なくてもよい）。選んで組み合わせてみましょう。')}</p>
      <div class="builder">
        <div class="card picker">
          <h3>① ${L('初声 · 辅音', '初声 · 子音')}</h3><div class="jamo-grid">${jamoBtns(INITIALS, 'l')}</div>
          <h3>② ${L('中声 · 元音', '中声 · 母音')}</h3><div class="jamo-grid">${jamoBtns(MEDIALS, 'v')}</div>
          <h3>③ ${L('终声 · 收音（可选）', '終声 · パッチム（任意）')}</h3><div class="jamo-grid">${jamoBtns(FINALS, 't')}</div>
        </div>
        <div class="card result">
          <div class="syllable" id="syl"></div>
          <div class="formula" id="formula"></div>
          <div class="rr" id="rr"></div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="playSyl">🔊 ${L('听发音', '発音を聞く')}</button>
            <button class="btn" id="randSyl">🎲 ${L('随机', 'ランダム')}</button>
          </div>
        </div>
      </div>

      <h2 class="section-title">${L('拆字器 <small>输入任意韩文，看看它由哪些字母组成</small>', '文字の分解 <small>ハングルを入力すると、どの字母でできているかがわかる</small>')}</h2>
      <div class="card">
        <div class="decompose">
          <input id="dcInput" class="ko" value="안녕하세요" aria-label="${L('输入韩文', 'ハングルを入力')}" placeholder="${L('例如：', '例：')}사랑해요">
          <button class="btn" id="dcPlay">🔊 ${L('朗读', '読み上げ')}</button>
        </div>
        <div class="decompose-out" id="dcOut"></div>
        <p style="color:var(--ink-soft);font-size:13px;margin:12px 0 0">${L('注：罗马音按单字逐个标注，实际连读时会有连音、鼻音化等音变。', '※ ローマ字は 1 文字ずつの表記です。実際には連音化・鼻音化などで発音が変わります。')}</p>
      </div>`;

    const update = () => {
      $('#syl').textContent = compose(state.l, state.v, state.t);
      $('#formula').textContent = `${INITIALS[state.l]} + ${MEDIALS[state.v]}${state.t ? ' + ' + FINALS[state.t] : ''}`;
      $('#rr').textContent = romanOf(state.l, state.v, state.t) || '—';
      $$('.jamo').forEach((b) => b.classList.toggle('active', Number(b.dataset.i) === state[b.dataset.k]));
    };
    const renderDc = () => {
      const text = $('#dcInput').value;
      $('#dcOut').innerHTML = Array.from(text).map((ch) => {
        const d = decompose(ch);
        if (!d) return ch.trim() ? `<div class="dc-item"><div class="s">${esc(ch)}</div></div>` : '';
        const parts = [INITIALS[d.l], MEDIALS[d.v], FINALS[d.t]].filter(Boolean).join(' ');
        return `<div class="dc-item"><div class="s">${ch}</div><div class="p">${parts}</div><div class="r">${romanOf(d.l, d.v, d.t)}</div></div>`;
      }).join('') || `<span style="color:var(--ink-soft)">${L('请输入韩文', 'ハングルを入力してください')}</span>`;
    };
    const onClick = (e) => {
      const b = e.target.closest('.jamo');
      if (b) {
        state[b.dataset.k] = Number(b.dataset.i);
        update();
        speak(compose(state.l, state.v, state.t), slowRate());
        return;
      }
      if (e.target.closest('#playSyl')) speak($('#syl').textContent, slowRate());
      if (e.target.closest('#randSyl')) {
        state.l = Math.floor(Math.random() * INITIALS.length);
        state.v = Math.floor(Math.random() * MEDIALS.length);
        state.t = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * FINALS.length);
        update();
        speak($('#syl').textContent, slowRate());
      }
      if (e.target.closest('#dcPlay')) {
        const t = $('#dcInput').value.trim();
        if (t) speak(t);
      }
    };
    app.addEventListener('click', onClick);
    $('#dcInput').addEventListener('input', renderDc);
    update();
    renderDc();
    return () => app.removeEventListener('click', onClick);
  }

  // ---------- 页面：词汇 ----------
  const wordsState = { cat: 'greet', mode: 'card', onlyNew: false, idx: 0, order: null };
  function viewWords() {
    const s = wordsState;
    const cats = [{ id: 'all', title: L('全部', 'すべて'), icon: '📚' }, ...VOCAB];
    const baseList = () => (s.cat === 'all' ? ALL_WORDS : VOCAB.find((c) => c.id === s.cat).words);
    const pool = () => (s.onlyNew ? baseList().filter((w) => !progress.known[w.ko]) : baseList());

    app.innerHTML = `
      <h1 class="page-title">${L('核心词汇', '基本単語')}</h1>
      <p class="page-sub">${L('翻卡记忆：先看韩语想意思，点击卡片翻面核对，再标记“认识”或“不认识”。', 'フラッシュカード：韓国語を見て意味を思い浮かべ、カードをめくって確認し、「わかった」「わからない」を選びます。')}</p>
      <div class="chips" id="cats">
        ${cats.map((c) => `<button class="chip" data-cat="${c.id}">${c.icon} ${c.id === 'all' ? c.title : catTitle(c)}</button>`).join('')}
      </div>
      <div class="words-toolbar">
        <div class="toggle" role="group" aria-label="${L('显示方式', '表示方法')}">
          <button data-mode="card">${L('卡片', 'カード')}</button>
          <button data-mode="list">${L('列表', '一覧')}</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="font-size:14px;color:var(--ink-soft);display:flex;gap:6px;align-items:center;cursor:pointer">
            <input type="checkbox" id="onlyNew" ${s.onlyNew ? 'checked' : ''}> ${L('只看未掌握', '未習得のみ')}
          </label>
          <button class="btn btn-sm" id="shuffleBtn">🔀 ${L('打乱', 'シャッフル')}</button>
        </div>
      </div>
      <div id="wordsBody"></div>`;

    const current = () => {
      let list = pool();
      if (s.order) list = s.order.map((ko) => list.find((w) => w.ko === ko)).filter(Boolean);
      return { list, w: list[s.idx] };
    };
    const renderBody = () => {
      $$('#cats .chip').forEach((b) => b.classList.toggle('active', b.dataset.cat === s.cat));
      $$('.toggle button').forEach((b) => b.classList.toggle('active', b.dataset.mode === s.mode));
      const { list } = current();
      const body = $('#wordsBody');
      if (!list.length) {
        body.innerHTML = `<div class="card" style="text-align:center;padding:40px">🎉 ${L('这一组的词你都掌握了！', 'このグループの単語はすべて覚えました！')}<br><br><button class="btn" id="resetCat">${L('重新学习这一组', 'もう一度学習する')}</button></div>`;
        return;
      }
      if (s.mode === 'list') {
        body.innerHTML = `<div class="word-list">${list.map((w) => `
          <div class="card word-row${progress.known[w.ko] ? ' known' : ''}">
            <div class="w"><div class="k">${esc(w.ko)}</div><div class="r">${esc(w.roman)}</div><div class="z">${mt(mean(w))}</div>${jaWordLine(w.ko)}${kanjiLine(w.ko)}</div>
            ${progress.known[w.ko] ? `<span class="tick" title="${L('已掌握', '習得済み')}">✓</span>` : ''}
            ${speakBtn(w.ko)}
          </div>`).join('')}</div>`;
        return;
      }
      if (s.idx >= list.length) s.idx = 0;
      const w = list[s.idx];
      body.innerHTML = `
        <div class="flash-wrap">
          <div class="flash" id="flash" tabindex="0" role="button" aria-label="${L('点击翻面', 'クリックでめくる')}">
            <div class="flash-inner">
              <div class="flash-face front">
                ${progress.known[w.ko] ? `<span class="known-badge">${L('已掌握', '習得済み')}</span>` : ''}
                <div class="ko-big">${esc(w.ko)}</div>
                <div class="roman">${esc(w.roman)}</div>
                <span class="hint">${L('点击卡片或按空格翻面', 'クリックかスペースキーでめくる')}</span>
              </div>
              <div class="flash-face back">
                <div class="zh-big${isJa() ? ' ja-mean' : ''}">${mt(mean(w))}</div>
                <div class="ko" style="font-size:20px">${esc(w.ko)}</div>
                ${jaWordLine(w.ko, true)}${kanjiLine(w.ko, true)}
                <span class="hint">${L('← → 切换卡片', '← → で次のカード')}</span>
              </div>
            </div>
          </div>
          <div class="flash-controls">
            <button class="btn btn-sm" id="prevW">← ${L('上一张', '前へ')}</button>
            <span class="count">${s.idx + 1} / ${list.length}</span>
            <button class="btn btn-sm" id="nextW">${L('下一张', '次へ')} →</button>
          </div>
          <div class="flash-listen">${dualBtns(w.ko)}</div>
          <div class="flash-grade">
            <button class="btn btn-dont" id="dontW">✗ ${L('不认识', 'わからない')}</button>
            <button class="btn btn-know" id="knowW">✓ ${L('认识', 'わかった')}</button>
          </div>
        </div>`;
    };
    const step = (d) => {
      const { list } = current();
      if (!list.length) return;
      s.idx = (s.idx + d + list.length) % list.length;
      renderBody();
    };
    const grade = (know) => {
      const { w } = current();
      if (!w) return;
      if (know) progress.known[w.ko] = true; else delete progress.known[w.ko];
      save();
      // 只看未掌握时，标记“认识”后该词会从列表移除，索引不需前进
      if (!(know && s.onlyNew)) s.idx += 1;
      const { list } = current();
      if (s.idx >= list.length && list.length) { s.idx = 0; toast(L('本组已过完一轮 👏', 'このグループを一周しました 👏')); }
      renderBody();
    };
    const onClick = (e) => {
      const t = e.target;
      const cat = t.closest('[data-cat]');
      if (cat) { s.cat = cat.dataset.cat; s.idx = 0; s.order = null; return renderBody(); }
      const mode = t.closest('[data-mode]');
      if (mode) { s.mode = mode.dataset.mode; return renderBody(); }
      if (t.closest('[data-speak]')) return;
      if (t.closest('#flash')) return $('#flash').classList.toggle('flipped');
      if (t.closest('#prevW')) return step(-1);
      if (t.closest('#nextW')) return step(1);
      if (t.closest('#knowW')) return grade(true);
      if (t.closest('#dontW')) return grade(false);
      if (t.closest('#shuffleBtn')) { s.order = shuffle(pool().map((w) => w.ko)); s.idx = 0; return renderBody(); }
      if (t.closest('#resetCat')) {
        baseList().forEach((w) => delete progress.known[w.ko]);
        save(); s.idx = 0; return renderBody();
      }
    };
    const onKey = (e) => {
      if (s.mode !== 'card' || e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === ' ' && $('#flash')) { e.preventDefault(); $('#flash').classList.toggle('flipped'); }
    };
    app.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    $('#onlyNew').addEventListener('change', (e) => { s.onlyNew = e.target.checked; s.idx = 0; renderBody(); });
    renderBody();
    return () => { app.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }

  // ---------- 页面：短语 ----------
  function viewPhrases() {
    const gloss = (p) => (JA_GLOSS[p.ko]
      ? `<div class="${isJa() ? '' : 'ja '}gloss">${JA_GLOSS[p.ko].map(([k, j]) => `<span class="gl"><span class="ko">${esc(k)}</span>${jt(j)}</span>`).join('')}</div>`
      : '');
    app.innerHTML = `
      <h1 class="page-title">${L('情景短语', '場面別フレーズ')}</h1>
      <p class="page-sub">${L('按场景整理的实用句子，点击 👩 / 👨 跟读，模仿语调。<span class="ja">带色块的句子展示了韩语和日语逐词对应的关系。</span>', '場面ごとの実用的な表現です。👩 / 👨 で聞いてまねしてみましょう。色付きのブロックは、韓国語と日本語が語順どおりに対応している様子を示しています。')}</p>
      ${PHRASES.map((g, gi) => `
        <div class="phrase-group">
          <h2 class="section-title">${isJa() ? jt(J.scenes[gi]) : esc(g.scene)}</h2>
          ${g.items.map((p) => `
            <div class="card phrase">
              <div class="w"><div class="k">${esc(p.ko)}</div><div class="r">${esc(p.roman)}</div><div class="z">${mt(phraseMean(p))}</div>
                ${!isJa() && JA_PHRASES[p.ko] ? `<div class="ja ja-line"><span class="ja-tag">日</span>${jt(JA_PHRASES[p.ko])}</div>` : ''}
                ${gloss(p)}
              </div>
              ${dualBtns(p.ko)}
            </div>`).join('')}
        </div>`).join('')}`;
  }

  // ---------- 页面：语法 ----------
  function viewGrammar() {
    app.innerHTML = `
      <h1 class="page-title">${L('入门语法', '入門文法')}</h1>
      <p class="page-sub">${L('掌握这几条，你就能看懂并造出简单的韩语句子。', 'この 6 つを押さえれば、簡単な韓国語の文が読めて作れるようになります。')}</p>
      <div class="grammar">
        ${GRAMMAR.map((g, i) => {
          const jg = J.grammar[i];
          return `
          <div class="card">
            <h3><span class="n">${i + 1}</span>${isJa() ? jt(jg.title) : esc(g.title)}</h3>
            <p>${isJa() ? jt(jg.body) : esc(g.body)}</p>
            ${!isJa() && JA_GRAMMAR[i] ? `<div class="how ja ja-how"><b>日语对照：</b>${esc(JA_GRAMMAR[i].note)}</div>` : ''}
            ${g.examples.map((x, k) => {
              const say = x.ko.split('→').pop().trim();
              const jaEx = JA_GRAMMAR[i] && JA_GRAMMAR[i].ex[k];
              const meaning = isJa() ? jt(jg.ex[k]) : esc(x.zh);
              return `<div class="ex">${speakBtn(say)}<div><div class="k">${esc(x.ko)}</div><div class="z">${meaning}</div>${!isJa() && jaEx ? `<div class="ja ja-ex"><span class="ja-tag">日</span>${jt(jaEx)}</div>` : ''}</div></div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>

      <h2 class="section-title">${L('常用助词一览 <small><span class="ja">与日语助词对照</span></small>', 'よく使う助詞 <small>日本語の助詞との対応</small>')}</h2>
      <div class="card table-wrap">
        <table class="rule-table particle-table">
          <thead><tr><th>${L('韩语', '韓国語')}</th><th class="${isJa() ? '' : 'ja'}">${L('日语', '日本語')}</th><th>${L('意思', '用法')}</th><th>${L('例句', '例文')}</th></tr></thead>
          <tbody>${PARTICLES.map(([ko, zh, ja, exKo, exJa], i) => `
            <tr>
              <td class="ko"><b>${esc(ko)}</b></td>
              <td class="${isJa() ? '' : 'ja'} pt-jp">${jt(ja)}</td>
              <td>${isJa() ? jt(J.particleUse[i]) : esc(zh)}</td>
              <td><div class="pt-ex"><span class="ko">${esc(exKo)}</span>${speakBtn(exKo)}</div><div class="${isJa() ? '' : 'ja'} pt-ja">${jt(exJa)}</div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  // ---------- 页面：日韩对照 ----------
  function viewJapanese() {
    const P = J.jaPage;
    app.innerHTML = `
      <h1 class="page-title">${L('日韩对照', '日韓対照')} <span class="ko" style="color:var(--ink-soft);font-weight:500">한국어와 일본어</span></h1>
      <p class="page-sub">${L('如果你会日语，学韩语会快很多：语序相同、助词几乎一一对应、大量汉字词读音成套对应、敬语体系也很相似。', '日本語ができると、韓国語の上達はずっと早くなります。語順が同じで、助詞がほぼ一対一で対応し、漢字語の読みが規則的に対応し、敬語のしくみも似ています。')}</p>
      ${!isJa() && !jaOn ? '<div class="card" style="margin-bottom:16px">💡 日语辅助目前已关闭，其他页面不会显示日语对照。点击右上角的「あ」可以重新开启。</div>' : ''}

      <div class="key-grid">
        <div class="card key"><div class="ic">🧩</div><h3>${L('语序相同', '語順が同じ')}</h3><p><span class="ko">저는 밥을 먹어요</span><br>${jt('私は ご飯を 食べます')}</p></div>
        <div class="card key"><div class="ic">🔗</div><h3>${L('助词对应', '助詞が対応')}</h3><p>는 = ${jt('は')}${L('，', '、')}가 = ${jt('が')}${L('，', '、')}를 = ${jt('を')}${L('，', '、')}에 = ${jt('に')}${L('，', '、')}도 = ${jt('も')}</p></div>
        <div class="card key"><div class="ic">🈶</div><h3>${L('汉字词', '漢字語')}</h3><p>학교 = ${jt('学校')}${L('，', '、')}시간 = ${jt('時間')}${L('，', '、')}가족 = ${jt('家族')}</p></div>
        <div class="card key"><div class="ic">🙇</div><h3>${L('敬语体系', '敬語のしくみ')}</h3><p>해요体 ≈ ${jt('です・ます')}${L('，', '、')}반말 ≈ ${jt('タメ口')}</p></div>
      </div>

      <h2 class="section-title">${L('汉字词读音对应规律 <small>从日语音读推出韩语读音</small>', '漢字語の読みの対応規則 <small>日本語の音読みから韓国語の読みを推測する</small>')}</h2>
      <p class="page-sub" style="margin-bottom:14px">${isJa() ? jt(P.sinoNote) : esc(JA_SINO_NOTE)}</p>
      <div class="sino-rules">
        ${JA_SINO_RULES.map((r, i) => `
          <div class="card sino-rule">
            <h3>${isJa() ? jt(P.sinoTitles[i]) : esc(r.title)}</h3>
            ${r.examples.map(([ko, kanji, yomi]) => `
              <div class="sino-ex">
                <span class="ko k">${esc(ko)}</span>
                <span class="eq">=</span>
                ${jt(kanji)}
                <span class="yomi">${jt(yomi)}</span>
                ${speakBtn(ko)}
              </div>`).join('')}
          </div>`).join('')}
      </div>

      <h2 class="section-title">${L('日韩同形汉字词 <small>写法相同、意思相同，直接拿来用</small>', '日韓で共通の漢字語 <small>漢字も意味も同じ。そのまま使える</small>')}</h2>
      <div class="word-list">
        ${JA_SAME_WORDS.map(([ko, kanji, yomi, zh]) => `
          <div class="card word-row">
            <div class="w"><div class="k">${esc(ko)}</div><div class="ja-same">${jt(kanji)} <span class="yomi">${jt(yomi)}</span></div>${isJa() ? '' : `<div class="z">${esc(zh)}</div>`}</div>
            ${speakBtn(ko)}
          </div>`).join('')}
      </div>

      <h2 class="section-title">⚠️ ${L('易混同形词 <small>汉字一样，意思不一样</small>', '意味が違う同じ漢字の語 <small>漢字は同じでも意味が違う</small>')}</h2>
      <div class="card table-wrap">
        <table class="rule-table ff-table">
          <thead><tr><th>${L('韩语', '韓国語')}</th><th>${L('汉字', '漢字')}</th><th>${L('韩语意思', '韓国語の意味')}</th><th>${L('日语意思', '日本語の意味')}</th><th>${L('中文意思', '中国語の意味')}</th></tr></thead>
          <tbody>${JA_FALSE_FRIENDS.map(([ko, kanji, mko, mja, mzh], i) => {
            const [jko, jja, jzh] = P.falseFriends[i];
            return `
            <tr>
              <td><div class="pt-ex"><span class="ko"><b>${esc(ko)}</b></span>${speakBtn(ko)}</div></td>
              <td>${jt(kanji)}</td>
              <td><b style="color:var(--green)">${mt(isJa() ? jko : mko)}</b></td>
              <td>${mt(isJa() ? jja : mja)}</td>
              <td style="color:var(--ink-soft)">${mt(isJa() ? jzh : mzh)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>

      <h2 class="section-title">${L('语体与敬语 <small>和日语的「丁寧語・尊敬語・謙譲語」很像</small>', '文体と敬語 <small>日本語の丁寧語・尊敬語・謙譲語とよく似ている</small>')}</h2>
      <div class="card table-wrap">
        <table class="rule-table">
          <thead><tr><th>${L('韩语', '韓国語')}</th><th>${L('说明', '説明')}</th><th>${L('日语', '日本語')}</th></tr></thead>
          <tbody>${JA_SPEECH_LEVELS.map(([ko, zh, ja], i) => `<tr><td class="ko"><b>${isJa() ? jt(P.speechLevels[i][0]) : esc(ko)}</b></td><td>${mt(isJa() ? P.speechLevels[i][1] : zh)}</td><td>${jt(ja)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <h3 style="font-size:16px;margin:20px 0 10px">${L('特殊敬语词', '特別な敬語の単語')}</h3>
      <div class="card table-wrap">
        <table class="rule-table">
          <thead><tr><th>${L('韩语（普通 → 敬语）', '韓国語（普通 → 敬語）')}</th><th>${L('意思', '意味')}</th><th>${L('日语', '日本語')}</th></tr></thead>
          <tbody>${JA_HONORIFIC_WORDS.map(([ko, zh, ja], i) => `<tr><td><div class="pt-ex"><span class="ko"><b>${esc(ko)}</b></span>${speakBtn(ko.split('→').pop().trim())}</div></td><td>${mt(isJa() ? P.honorificMeanings[i] : zh)}</td><td>${jt(ja)}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <p style="margin-top:24px"><a class="btn" href="#/grammar">${L('查看助词对照表 →', '助詞の対応表を見る →')}</a> <a class="btn" href="#/quiz">${L('做「日语 → 韩语」测验 →', '「日本語 → 韓国語」テスト →')}</a></p>`;
  }

  // ---------- 页面：测验 ----------
  const QUIZ_LEN = 10;
  const quizModes = () => (isJa()
    ? [
      { id: 'letter', icon: '🔤', title: '文字 → ローマ字', desc: 'ハングルを見て、正しい読み方を選ぶ' },
      { id: 'ko2m', icon: '🇰🇷', title: '韓国語 → 日本語', desc: '韓国語の単語を見て、意味を選ぶ' },
      { id: 'm2ko', icon: '🇯🇵', title: '日本語 → 韓国語', desc: '日本語を見て、韓国語を選ぶ' },
      { id: 'listen', icon: '🎧', title: '聞き取り', desc: '音声を聞いて、聞こえた単語を選ぶ' },
    ]
    : [
      { id: 'letter', icon: '🔤', title: '字母 → 罗马音', desc: '看韩文字母，选出正确读音' },
      { id: 'ko2m', icon: '🇰🇷', title: '韩语 → 中文', desc: '看韩语单词，选出中文意思' },
      { id: 'm2ko', icon: '🇨🇳', title: '中文 → 韩语', desc: '看中文，选出对应的韩语' },
      { id: 'listen', icon: '🎧', title: '听音选词', desc: '听发音，选出听到的单词' },
      { id: 'ja2ko', icon: 'あ', title: '日语 → 韩语', desc: '看日语，选出对应的韩语', cls: 'ja' },
    ]);

  function buildQuestions(mode) {
    if (mode === 'letter') {
      return shuffle(ALL_LETTERS).slice(0, QUIZ_LEN).map((l) => {
        const wrong = shuffle(ALL_LETTERS.filter((x) => x.roman !== l.roman)).slice(0, 3).map((x) => x.roman);
        return { prompt: l.ch, promptKo: true, answer: l.roman, options: shuffle([l.roman, ...wrong]), speak: l.sound };
      });
    }
    return shuffle(ALL_WORDS).slice(0, QUIZ_LEN).map((w) => {
      // 干扰项：与正确答案的韩语和意思都不同，且彼此不重复
      const others = shuffle(ALL_WORDS.filter((x) => x.ko !== w.ko && mean(x) !== mean(w)));
      const pick = (f) => [...new Set(others.map(f))].slice(0, 3);
      if (mode === 'ko2m') {
        return { prompt: w.ko, promptKo: true, answer: mean(w), options: shuffle([mean(w), ...pick(mean)]), optJa: isJa(), speak: w.ko, word: w };
      }
      const koOpts = shuffle([w.ko, ...pick((x) => x.ko)]);
      if (mode === 'ja2ko') return { prompt: JA_VOCAB[w.ko][0], promptJa: true, answer: w.ko, options: koOpts, optKo: true, speak: w.ko, word: w };
      if (mode === 'listen') return { prompt: '🔊', listen: true, answer: w.ko, options: koOpts, optKo: true, speak: w.ko, word: w };
      return { prompt: mean(w), promptJa: isJa(), answer: w.ko, options: koOpts, optKo: true, speak: w.ko, word: w };
    });
  }

  function viewQuiz() {
    let qs = [], i = 0, score = 0, mistakes = [], answered = false, mode = null;
    const setup = () => {
      app.innerHTML = `
        <h1 class="page-title">${L('测验', 'テスト')}</h1>
        <p class="page-sub">${L(`每轮 ${QUIZ_LEN} 题。历史最佳：<b>${progress.quiz.best}</b> / ${QUIZ_LEN}`, `1 回 ${QUIZ_LEN} 問。最高記録：<b>${progress.quiz.best}</b> / ${QUIZ_LEN}`)}</p>
        <div class="quiz-setup">
          ${quizModes().map((m) => `
            <button class="card mode ${m.cls || ''}" data-qmode="${m.id}">
              <div class="ic">${m.icon}</div><h3>${mt(m.title)}</h3><p>${mt(m.desc)}</p>
            </button>`).join('')}
        </div>`;
    };
    const renderQ = () => {
      const q = qs[i];
      answered = false;
      app.innerHTML = `
        <div class="quiz-card">
          <div class="quiz-head"><span>${L(`第 ${i + 1} / ${qs.length} 题`, `第 ${i + 1} 問 / ${qs.length}`)}</span><span>${L('得分', '得点')} ${score}</span></div>
          <div class="bar"><span style="width:${(i / qs.length) * 100}%;background:var(--blue)"></span></div>
          <div class="card quiz-q" style="margin-top:16px">
            <div class="prompt-label">${q.listen ? L('听一听，选出你听到的词', '聞こえた単語を選んでください') : L('选出正确答案', '正しい答えを選んでください')}</div>
            ${q.listen
              ? `<button class="btn btn-primary" style="font-size:22px;padding:16px 28px;margin:14px 0 8px" data-speak="${esc(q.speak)}">🔊 ${L('播放', '再生')}</button>
                 <div class="listen-alt">${L('换个声音听：', '別の声で聞く：')}${dualBtns(q.speak, true)}</div>`
              : q.promptJa
                ? `<div class="prompt prompt-ja jp" lang="ja">${esc(q.prompt)}</div>`
                : `<div class="prompt ${q.promptKo ? 'ko' : ''}">${esc(q.prompt)}</div>`}
            <div class="options">
              ${q.options.map((o) => `<button class="option ${q.optKo ? 'ko' : ''} ${q.optJa ? 'jp' : ''}" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}
            </div>
            <div class="quiz-feedback" id="fb"></div>
            <div class="quiz-next" id="nextWrap"></div>
          </div>
        </div>`;
      if (q.listen) setTimeout(() => speak(q.speak), 250);
    };
    const choose = (btn) => {
      if (answered) return;
      answered = true;
      const q = qs[i];
      const ok = btn.dataset.opt === q.answer;
      $$('.option').forEach((b) => {
        b.disabled = true;
        if (b.dataset.opt === q.answer) b.classList.add('correct');
      });
      progress.quiz.answered += 1;
      if (ok) {
        score++;
        progress.quiz.correct += 1;
        $('#fb').innerHTML = `<span style="color:var(--green)">✓ ${L('正确！', '正解！')}</span>`;
      } else {
        btn.classList.add('wrong');
        mistakes.push(q);
        const extra = q.word ? `${esc(q.word.ko)}（${esc(q.word.roman)}）= ${mt(mean(q.word))}` : `${esc(q.prompt)} = ${esc(q.answer)}`;
        $('#fb').innerHTML = `<span style="color:var(--red)">✗ ${L('正确答案：', '正解：')}</span>${extra}`;
      }
      save();
      speak(q.speak);
      $('#nextWrap').innerHTML = `<button class="btn btn-primary" id="nextQ">${i + 1 < qs.length ? L('下一题 →', '次の問題 →') : L('查看结果', '結果を見る')}</button>`;
      $('#nextQ').focus();
    };
    const finish = () => {
      const isBest = score > progress.quiz.best;
      if (isBest) { progress.quiz.best = score; save(); }
      const msg = score === QUIZ_LEN ? L('满分！太厉害了 🎉', '満点！すばらしい 🎉') : score >= 7 ? L('很不错，继续保持！', 'よくできました！この調子で！') : L('多练几次就会越来越熟练 💪', '繰り返せば必ず上達します 💪');
      app.innerHTML = `
        <div class="quiz-card">
          <div class="card" style="text-align:center;padding:36px 20px">
            <div class="score-big">${score}<span style="font-size:28px;color:var(--ink-soft)"> / ${qs.length}</span></div>
            <p style="font-size:18px;margin:14px 0 4px">${msg}</p>
            ${isBest ? `<p style="color:var(--green);margin:0">🏆 ${L('新纪录！', '新記録！')}</p>` : ''}
            ${mistakes.length ? `
              <div class="mistakes"><h3 style="font-size:16px">${L('需要复习', '復習しよう')}</h3><ul>
                ${mistakes.map((q) => `<li><span class="ko">${q.word ? esc(q.word.ko) : esc(q.prompt)}</span> — ${q.word ? mt(mean(q.word)) : esc(q.answer)}</li>`).join('')}
              </ul></div>` : ''}
            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
              <button class="btn btn-primary" id="again">${L('再来一轮', 'もう一度')}</button>
              <button class="btn" id="backModes">${L('换个题型', '問題の種類を変える')}</button>
            </div>
          </div>
        </div>`;
    };
    const start = (m) => { mode = m; qs = buildQuestions(m); i = 0; score = 0; mistakes = []; renderQ(); };
    const onClick = (e) => {
      const t = e.target;
      const m = t.closest('[data-qmode]');
      if (m) return start(m.dataset.qmode);
      const opt = t.closest('.option');
      if (opt) return choose(opt);
      if (t.closest('#nextQ')) { i++; return i < qs.length ? renderQ() : finish(); }
      if (t.closest('#again')) return start(mode);
      if (t.closest('#backModes')) return setup();
    };
    const onKey = (e) => {
      if (!qs.length || !$('.option')) return;
      if (!answered && /^[1-4]$/.test(e.key)) { const b = $$('.option')[Number(e.key) - 1]; if (b) choose(b); }
    };
    app.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    setup();
    return () => { app.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }

  // ---------- 页头、页脚的语言 ----------
  const NAV_TEXT = {
    home: ['首页', 'ホーム'], alphabet: ['字母', '文字'], pronounce: ['发音', '発音'], builder: ['拼读', '組み立て'],
    words: ['词汇', '単語'], phrases: ['短语', 'フレーズ'], grammar: ['语法', '文法'], quiz: ['测验', 'テスト'], japanese: ['日韩', '日韓'],
  };
  function applyLang() {
    document.documentElement.lang = L('zh-CN', 'ja');
    document.body.classList.toggle('lang-ja', isJa());
    document.title = L('韩语学堂 · 한국어 배우기', '韓国語学堂 · 한국어 배우기');
    $('.brand-text').textContent = L('韩语学堂', '韓国語学堂');
    $$('.nav a').forEach((a) => { const t = NAV_TEXT[a.dataset.route]; if (t) a.textContent = L(t[0], t[1]); });
    $$('[data-gender-set]').forEach((b) => {
      const span = b.querySelector('span');
      if (span) span.textContent = genderLabel(b.dataset.genderSet);
    });
    $('.footer p').textContent = L(
      '点击 🔊 / 👩 / 👨 可听发音（神经语音音频：女声 SunHi / 男声 InJoon，右上角可切换默认声音）。学习进度仅保存在本机浏览器中。',
      '🔊 / 👩 / 👨 で発音を再生（ニューラル音声：女性 SunHi／男性 InJoon、右上で既定の声を切り替え）。学習の記録はこのブラウザにだけ保存されます。'
    );
    $$('[data-lang-set]').forEach((b) => {
      const on = b.dataset.langSet === LANG;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    applyJa();
  }

  // ---------- 路由 ----------
  const ROUTES = {
    home: viewHome, alphabet: viewAlphabet, pronounce: viewPronounce, builder: viewBuilder, words: viewWords,
    phrases: viewPhrases, grammar: viewGrammar, quiz: viewQuiz, japanese: viewJapanese,
  };
  let cleanup = null;
  function render(keepScroll) {
    const route = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
    const view = ROUTES[route] || viewHome;
    if (cleanup) { cleanup(); cleanup = null; }
    if (hasTTS) speechSynthesis.cancel();
    stopAudio();
    cleanup = view() || null;
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (ROUTES[route] ? route : 'home')));
    $('#nav').classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    if (!keepScroll) window.scrollTo(0, 0);
  }

  // 全局点击：朗读、切换声音、日语辅助、界面语言
  document.addEventListener('click', (e) => {
    const lang = e.target.closest('[data-lang-set]');
    if (lang) {
      if (lang.dataset.langSet === LANG) return;
      LANG = lang.dataset.langSet;
      try { localStorage.setItem(LANG_KEY, LANG); } catch (err) { /* 忽略 */ }
      applyLang();
      render(true);
      toast(L('已切换为中文界面', '日本語表示に切り替えました'));
      return;
    }
    const g = e.target.closest('[data-gender-set]');
    if (g) {
      setGender(g.dataset.genderSet);
      speak('안녕하세요');
      toast(L(`已切换为${genderLabel(g.dataset.genderSet)}`, `${genderLabel(g.dataset.genderSet)}の声に切り替えました`));
      return;
    }
    if (e.target.closest('[data-ja-toggle]')) {
      jaOn = !jaOn;
      try { localStorage.setItem(JA_KEY, jaOn ? 'on' : 'off'); } catch (err) { /* 忽略 */ }
      applyJa();
      toast(jaOn ? '已开启日语辅助' : '已关闭日语辅助');
      return;
    }
    const b = e.target.closest('[data-speak]');
    if (b) speak(b.dataset.speak, null, b.dataset.gender);
  });
  $('#menuBtn').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  setGender(voicePrefs.gender);
  applyLang();
  window.addEventListener('hashchange', () => render());
  render();
})();
