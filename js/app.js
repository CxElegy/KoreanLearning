/* 韩语学堂：单页应用逻辑 */
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

  // ---------- 本地进度 ----------
  const STORE_KEY = 'kl-progress-v1';
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
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
    const t = todayStr();
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
    for (;;) {
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!set.has(s)) break;
      n++;
      d.setDate(d.getDate() - 1);
    }
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
  // 浏览器自带语音的名称里通常含有性别线索；识别不出时可在“发音”页手动指定。
  const FEMALE_RE = /female|woman|여성|여자|sunhi|heami|yuna|sora|jimin|seohyeon|soonbok|yujin|suhyun|narae|yuri|google/i;
  const MALE_RE = /\bmale\b|\bman\b|남성|남자|injoon|bongjin|gookmin|hyunsu|minsu|jinho/i;
  const GENDER_LABEL = { female: '女声', male: '男声' };
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
    // 优先使用高质量的“Natural / Online / Premium”语音
    const score = (v) => (/natural|online|premium|enhanced|neural/i.test(v.name) ? 0 : 1);
    koVoices.sort((a, b) => score(a) - score(b));
    document.dispatchEvent(new Event('kl-voices'));
  }
  if (hasTTS) {
    loadVoices();
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  }

  // 为指定性别挑选语音；没有对应性别的语音时，用同一语音调整音高来模拟
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

  function speak(text, rate, gender) {
    if (!hasTTS) {
      toast('当前浏览器不支持语音朗读，建议使用 Chrome / Edge / Safari');
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
      toast('未检测到韩语语音包，发音可能不准确。请到“发音”页查看安装方法。');
    }
    speechSynthesis.speak(u);
  }
  const slowRate = () => Math.max(0.5, voicePrefs.rate - 0.15);

  // 单个朗读按钮（使用当前选择的声音）
  const speakBtn = (text, label = '朗读') =>
    `<button class="speak" data-speak="${esc(text)}" aria-label="${esc(label)}：${esc(text)}" title="朗读">🔊</button>`;
  // 女声 / 男声 一对按钮，方便对比
  const dualBtns = (text, small = false) => `
    <span class="dual${small ? ' dual-sm' : ''}">
      <button class="speak-g female" data-speak="${esc(text)}" data-gender="female" aria-label="女声朗读：${esc(text)}" title="女声朗读">👩<span>女声</span></button>
      <button class="speak-g male" data-speak="${esc(text)}" data-gender="male" aria-label="男声朗读：${esc(text)}" title="男声朗读">👨<span>男声</span></button>
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
    const dayIndex = Math.floor(Date.now() / 86400000);
    const daily = ALL_WORDS[dayIndex % ALL_WORDS.length];
    const steps = [
      ['alphabet', '认识韩文字母', '14 个基本辅音、10 个基本元音，以及双辅音和复合元音。'],
      ['pronounce', '发音讲解', '松音·送气音·紧音、元音口型、收音和音变，男声女声对比听。'],
      ['builder', '学会拼读音节', '像搭积木一样把辅音和元音组合成字，理解收音规则。'],
      ['words', '积累核心词汇', `${total} 个高频词，翻卡记忆并标记掌握情况。`],
      ['phrases', '情景短语', '见面、点餐、问路、求助……开口就能用。'],
      ['grammar', '入门语法', '语序、助词、“是”和礼貌体，一次讲清。'],
      ['quiz', '测验巩固', '字母、词义、听力多种题型，检验学习效果。'],
    ];
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>从零开始，<br><span class="accent">轻松学韩语</span></h1>
          <p>专为中文母语者设计的韩语入门站。韩文字母只需几小时就能掌握——跟着下面的路线一步步来吧。</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/alphabet">开始学字母 →</a>
            <a class="btn" href="#/quiz">直接测一测</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <span class="big">한글</span>
          <span class="cap">Hangeul · 韩文</span>
        </div>
      </section>

      <div class="stats">
        <div class="card stat"><div class="num">${known}<small style="font-size:14px;color:var(--ink-soft)"> / ${total}</small></div><div class="label">已掌握词汇</div><div class="bar"><span style="width:${(known / total) * 100}%"></span></div></div>
        <div class="card stat"><div class="num">${streak()}</div><div class="label">连续学习天数</div></div>
        <div class="card stat"><div class="num">${q.answered}</div><div class="label">累计答题</div></div>
        <div class="card stat"><div class="num">${acc}%</div><div class="label">答题正确率</div></div>
      </div>

      <h2 class="section-title">今日一词</h2>
      <div class="card daily">
        <span class="word">${esc(daily.ko)}</span>
        ${dualBtns(daily.ko)}
        <div class="meta"><div style="color:var(--red);font-weight:700">${esc(daily.roman)}</div><div>${esc(daily.zh)}</div></div>
      </div>

      <h2 class="section-title">学习路线</h2>
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
            ${l.name ? `<div class="name">${esc(l.name)}</div>` : `<div class="name">${esc(l.sound)}</div>`}
          </button>`).join('')}
      </div>`;
    app.innerHTML = `
      <h1 class="page-title">韩文字母 한글</h1>
      <p class="page-sub">韩文是表音文字，由辅音和元音组合成方块字。点击任意字母查看详情并收听发音。</p>
      <div class="card detail" id="letterDetail">
        <div class="glyph-xl">ㄱ</div>
        <div></div>
      </div>
      ${group('基本辅音', '14 个', CONSONANTS, 'c')}
      ${group('双辅音（紧音）', '5 个', DOUBLE_CONSONANTS, 'c')}
      ${group('基本元音', '10 个', VOWELS, 'v')}
      ${group('复合元音', '11 个', COMPOUND_VOWELS, 'v')}
      <h2 class="section-title">收音（받침）的 7 个代表音 <small>写在字下方的辅音只读这 7 种音</small></h2>
      <div class="card table-wrap">
        <table class="rule-table">
          <thead><tr><th>实际读音</th><th>对应字母</th><th>例词</th></tr></thead>
          <tbody>${BATCHIM_RULES.map((r) => `<tr><td><b>${esc(r.sound)}</b></td><td>${esc(r.letters)}</td><td class="ko">${esc(r.example)}</td></tr>`).join('')}</tbody>
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
          <h3>${l.ch} ${l.name ? `<span class="ko">（${esc(l.name)}）</span>` : ''} · <span style="color:var(--red)">${esc(l.roman)}</span></h3>
          <p class="tip">${esc(l.tip)}</p>
          <div class="how"><b>发音方法：</b>${esc(HOW_TO[l.ch] || '')}</div>
          <div class="listen-row">
            <span class="listen-label ko">${esc(l.sound)}</span>${dualBtns(l.sound)}
            ${l.name ? `<span class="listen-label">名称 <span class="ko">${esc(l.name)}</span></span>${dualBtns(l.name)}` : ''}
          </div>
          <div class="examples">
            <span class="ex-label">组合练习：</span>
            ${[...new Set(samples)].map((s) => `<button class="btn btn-sm btn-ghost ko" data-speak="${s}">${s}</button>`).join('')}
          </div>
        </div>`;
      $$('.letter').forEach((b) => b.classList.toggle('playing', b.dataset.letter === ch));
      if (play) speak(l.sound);
    };
    showLetter('ㄱ', 'c', false);
    app.addEventListener('click', onLetterClick);
    function onLetterClick(e) {
      const b = e.target.closest('.letter');
      if (!b) return;
      showLetter(b.dataset.letter, b.dataset.type, true);
      $('#letterDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return () => app.removeEventListener('click', onLetterClick);
  }

  // ---------- 页面：发音讲解 ----------
  function viewPronounce() {
    const toc = [
      ['p-voice', '声音设置'], ['p-keys', '发音特点'], ['p-triad', '松音·送气音·紧音'],
      ['p-vowel', '易混元音'], ['p-batchim', '收音'], ['p-rules', '音变规则'], ['p-mistakes', '常见误区'],
    ];
    app.innerHTML = `
      <h1 class="page-title">发音讲解</h1>
      <p class="page-sub">每个例子都可以分别用 👩 女声 和 👨 男声 收听，对比着练效果更好。建议跟读时录下自己的声音再对比。</p>
      <nav class="toc chips" aria-label="本页目录">
        ${toc.map(([id, t]) => `<a class="chip" href="#/pronounce" data-jump="${id}">${t}</a>`).join('')}
      </nav>

      <h2 class="section-title" id="p-voice">🔈 声音设置 <small>选择男声 / 女声使用的语音</small></h2>
      <div class="card voice-panel" id="voicePanel"></div>

      <h2 class="section-title" id="p-keys">韩语发音的 4 个特点</h2>
      <div class="key-grid">
        ${PRON_KEYS.map((k) => `<div class="card key"><div class="ic">${k.icon}</div><h3>${esc(k.title)}</h3><p>${esc(k.text)}</p></div>`).join('')}
      </div>

      <h2 class="section-title" id="p-triad">松音 · 送气音 · 紧音 <small>韩语辅音最重要的区别</small></h2>
      <div class="card triad-legend">
        ${Object.values(TRIAD_TYPES).map((t, i) => `<div class="legend t${i}"><b>${esc(t.name)}</b><p>${esc(t.desc)}</p></div>`).join('')}
        <p class="paper-test">🧻 <b>纸片测试：</b>拿一张薄纸放在嘴前 3 厘米处。读送气音时纸片明显飘动，读紧音时纸片几乎不动，读松音时轻微晃动。</p>
      </div>
      <div class="triads">
        ${CONSONANT_TRIADS.map((g) => `
          <div class="card triad">
            <div class="triad-head ko">${esc(g.group)}</div>
            <div class="triad-cells">
              ${g.cells.map((c) => `
                <div class="triad-cell ${c.type}">
                  <div class="tt">${esc(TRIAD_TYPES[c.type].name.split(' ')[0])}</div>
                  <div class="syl ko">${esc(c.syl)}</div>
                  ${dualBtns(c.syl, true)}
                  <div class="tw"><span class="ko">${esc(c.word)}</span> ${esc(c.zh)}</div>
                  ${dualBtns(c.word, true)}
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-vowel">易混元音 <small>注意嘴唇的形状</small></h2>
      <div class="pair-grid">
        ${VOWEL_PAIRS.map((v) => `
          <div class="card pair">
            <h3 class="ko">${esc(v.pair)}</h3>
            <p>${esc(v.tip)}</p>
            ${v.words.map((w) => `<div class="pair-word"><span class="ko k">${esc(w.ko)}</span><span class="z">${esc(w.zh)}</span>${dualBtns(w.ko, true)}</div>`).join('')}
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-batchim">收音的发音方法 <small>只做口型、不放气</small></h2>
      <div class="batchim-grid">
        ${BATCHIM_HOW.map((b) => `
          <div class="card batchim">
            <div class="b-top"><span class="b-syl ko">${esc(b.syl)}</span><span class="b-ch ko">收音 ${esc(b.ch)}</span></div>
            <p>${esc(b.how)}</p>
            ${dualBtns(b.syl, true)}
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-rules">音变规则 <small>写法 → [实际读音]</small></h2>
      <div class="rules">
        ${SOUND_RULES.map((r, i) => `
          <div class="card rule">
            <h3><span class="n">${i + 1}</span>${esc(r.name)} <span class="ko rule-ko">${esc(r.ko)}</span></h3>
            <p>${esc(r.rule)}</p>
            <div class="rule-examples">
              ${r.examples.map((x) => `
                <div class="rule-ex">
                  <div class="rx-text"><span class="ko k">${esc(x.ko)}</span><span class="arrow">→</span><span class="ko pron">[${esc(x.pron)}]</span><span class="z">${esc(x.zh)}</span></div>
                  ${dualBtns(x.ko, true)}
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <h2 class="section-title" id="p-mistakes">中国学习者常见误区</h2>
      <div class="card mistakes-list">
        ${COMMON_MISTAKES.map((m) => `
          <div class="mk">
            <div class="mk-wrong">✗ ${esc(m.wrong)}</div>
            <div class="mk-right">✓ ${esc(m.right)}</div>
          </div>`).join('')}
      </div>`;

    // 声音设置面板
    const renderVoicePanel = () => {
      const panel = $('#voicePanel');
      if (!panel) return;
      if (!hasTTS) {
        panel.innerHTML = '<p>当前浏览器不支持语音朗读，请使用最新版 Chrome、Edge 或 Safari。</p>';
        return;
      }
      const opts = (g) => `
        <option value="">自动选择</option>
        ${koVoices.map((v) => `<option value="${esc(v.name)}" ${voicePrefs[g] === v.name ? 'selected' : ''}>${esc(v.name)}${classifyVoice(v) !== 'unknown' ? `（${GENDER_LABEL[classifyVoice(v)]}）` : ''}</option>`).join('')}`;
      const status = (g) => {
        const r = resolveVoice(g);
        if (!r.voice) return '<span class="vs warn">未找到韩语语音</span>';
        return r.simulated
          ? `<span class="vs warn">本设备没有韩语${GENDER_LABEL[g]}，已用 ${esc(r.voice.name)} 调整音高模拟</span>`
          : `<span class="vs ok">使用：${esc(r.voice.name)}</span>`;
      };
      const females = koVoices.filter((v) => classifyVoice(v) === 'female').length;
      const males = koVoices.filter((v) => classifyVoice(v) === 'male').length;
      panel.innerHTML = `
        <div class="voice-rows">
          ${['female', 'male'].map((g) => `
            <div class="voice-row">
              <div class="vr-head">
                <b>${g === 'female' ? '👩' : '👨'} ${GENDER_LABEL[g]}</b>
                <button class="btn btn-sm" data-speak="안녕하세요. 만나서 반갑습니다." data-gender="${g}">试听</button>
              </div>
              <select class="voice-select" data-voice-for="${g}" aria-label="${GENDER_LABEL[g]}使用的语音">${opts(g)}</select>
              ${status(g)}
            </div>`).join('')}
        </div>
        <div class="voice-extra">
          <label>默认声音：
            <span class="toggle">
              <button data-gender-set="female" class="${voicePrefs.gender === 'female' ? 'active' : ''}">👩 女声</button>
              <button data-gender-set="male" class="${voicePrefs.gender === 'male' ? 'active' : ''}">👨 男声</button>
            </span>
          </label>
          <label>语速：<input type="range" id="rateRange" min="0.5" max="1.2" step="0.05" value="${voicePrefs.rate}"> <span id="rateVal">${voicePrefs.rate.toFixed(2)}×</span></label>
        </div>
        <p class="voice-summary">检测到 ${koVoices.length} 个韩语语音（女声 ${females} 个，男声 ${males} 个${koVoices.length - females - males ? `，未识别性别 ${koVoices.length - females - males} 个` : ''}）。</p>
        ${(!males || !females) ? `
          <details class="voice-help" ${koVoices.length ? '' : 'open'}>
            <summary>想要更自然的男声 / 女声？</summary>
            <ul>
              <li><b>电脑（推荐）：</b>使用 <b>Microsoft Edge</b> 浏览器打开本站，自带高质量韩语男声 InJoon 和女声 SunHi。</li>
              <li><b>Windows：</b>设置 → 时间和语言 → 语音 → 添加语音 → 韩语。</li>
              <li><b>Mac：</b>系统设置 → 辅助功能 → 朗读内容 → 系统声音 → 管理声音 → 韩语，下载需要的声音。</li>
              <li><b>iPhone / iPad：</b>设置 → 辅助功能 → 朗读内容 → 声音 → 韩语，下载声音后在 Safari 中使用。</li>
              <li><b>安卓：</b>设置 → 文字转语音 → 首选引擎（Google 或三星）→ 安装韩语语音数据，可选择不同声音。</li>
            </ul>
            <p>安装后刷新本页即可，在上方下拉框中为男声 / 女声分别选择语音。</p>
          </details>` : ''}`;
    };
    const onChange = (e) => {
      const sel = e.target.closest('[data-voice-for]');
      if (sel) {
        voicePrefs[sel.dataset.voiceFor] = sel.value;
        saveVoicePrefs();
        renderVoicePanel();
        speak('안녕하세요', null, sel.dataset.voiceFor);
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
      `<button class="jamo${j ? '' : ' none'}" data-k="${key}" data-i="${i}">${j || '无'}</button>`).join('');
    app.innerHTML = `
      <h1 class="page-title">音节拼读</h1>
      <p class="page-sub">每个韩文字 = 初声（辅音）+ 中声（元音）+ 可选的终声（收音）。选一选，看看能拼出什么字。</p>
      <div class="builder">
        <div class="card picker">
          <h3>① 初声 · 辅音</h3><div class="jamo-grid">${jamoBtns(INITIALS, 'l')}</div>
          <h3>② 中声 · 元音</h3><div class="jamo-grid">${jamoBtns(MEDIALS, 'v')}</div>
          <h3>③ 终声 · 收音（可选）</h3><div class="jamo-grid">${jamoBtns(FINALS, 't')}</div>
        </div>
        <div class="card result">
          <div class="syllable" id="syl"></div>
          <div class="formula" id="formula"></div>
          <div class="rr" id="rr"></div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="playSyl">🔊 听发音</button>
            <button class="btn" id="randSyl">🎲 随机</button>
          </div>
        </div>
      </div>

      <h2 class="section-title">拆字器 <small>输入任意韩文，看看它由哪些字母组成</small></h2>
      <div class="card">
        <div class="decompose">
          <input id="dcInput" class="ko" value="안녕하세요" aria-label="输入韩文" placeholder="例如：사랑해요">
          <button class="btn" id="dcPlay">🔊 朗读</button>
        </div>
        <div class="decompose-out" id="dcOut"></div>
        <p style="color:var(--ink-soft);font-size:13px;margin:12px 0 0">注：罗马音按单字逐个标注，实际连读时会有连音、鼻音化等音变。</p>
      </div>`;

    const update = () => {
      const s = compose(state.l, state.v, state.t);
      $('#syl').textContent = s;
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
      }).join('') || '<span style="color:var(--ink-soft)">请输入韩文</span>';
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
    const cats = [{ id: 'all', title: '全部', icon: '📚' }, ...VOCAB];
    const pool = () => {
      const base = s.cat === 'all' ? ALL_WORDS : VOCAB.find((c) => c.id === s.cat).words;
      return s.onlyNew ? base.filter((w) => !progress.known[w.ko]) : base;
    };

    app.innerHTML = `
      <h1 class="page-title">核心词汇</h1>
      <p class="page-sub">翻卡记忆：先看韩语想意思，点击卡片翻面核对，再标记“认识”或“不认识”。</p>
      <div class="chips" id="cats">
        ${cats.map((c) => `<button class="chip" data-cat="${c.id}">${c.icon} ${c.title}</button>`).join('')}
      </div>
      <div class="words-toolbar">
        <div class="toggle" role="group" aria-label="显示方式">
          <button data-mode="card">卡片</button>
          <button data-mode="list">列表</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="font-size:14px;color:var(--ink-soft);display:flex;gap:6px;align-items:center;cursor:pointer">
            <input type="checkbox" id="onlyNew" ${s.onlyNew ? 'checked' : ''}> 只看未掌握
          </label>
          <button class="btn btn-sm" id="shuffleBtn">🔀 打乱</button>
        </div>
      </div>
      <div id="wordsBody"></div>`;

    const renderBody = () => {
      $$('#cats .chip').forEach((b) => b.classList.toggle('active', b.dataset.cat === s.cat));
      $$('.toggle button').forEach((b) => b.classList.toggle('active', b.dataset.mode === s.mode));
      let list = pool();
      if (s.order) list = s.order.map((ko) => list.find((w) => w.ko === ko)).filter(Boolean);
      const body = $('#wordsBody');

      if (!list.length) {
        body.innerHTML = `<div class="card" style="text-align:center;padding:40px">🎉 这一组的词你都掌握了！<br><br><button class="btn" id="resetCat">重新学习这一组</button></div>`;
        return;
      }
      if (s.mode === 'list') {
        body.innerHTML = `<div class="word-list">${list.map((w) => `
          <div class="card word-row${progress.known[w.ko] ? ' known' : ''}">
            <div class="w"><div class="k">${esc(w.ko)}</div><div class="r">${esc(w.roman)}</div><div class="z">${esc(w.zh)}</div></div>
            ${progress.known[w.ko] ? '<span class="tick" title="已掌握">✓</span>' : ''}
            ${speakBtn(w.ko)}
          </div>`).join('')}</div>`;
        return;
      }
      if (s.idx >= list.length) s.idx = 0;
      const w = list[s.idx];
      body.innerHTML = `
        <div class="flash-wrap">
          <div class="flash" id="flash" tabindex="0" role="button" aria-label="点击翻面">
            <div class="flash-inner">
              <div class="flash-face front">
                ${progress.known[w.ko] ? '<span class="known-badge">已掌握</span>' : ''}
                <div class="ko-big">${esc(w.ko)}</div>
                <div class="roman">${esc(w.roman)}</div>
                <span class="hint">点击卡片或按空格翻面</span>
              </div>
              <div class="flash-face back">
                <div class="zh-big">${esc(w.zh)}</div>
                <div class="ko" style="font-size:20px">${esc(w.ko)}</div>
                <span class="hint">← → 切换卡片</span>
              </div>
            </div>
          </div>
          <div class="flash-controls">
            <button class="btn btn-sm" id="prevW" aria-label="上一张">← 上一张</button>
            <span class="count">${s.idx + 1} / ${list.length}</span>
            <button class="btn btn-sm" id="nextW" aria-label="下一张">下一张 →</button>
          </div>
          <div class="flash-listen">${dualBtns(w.ko)}</div>
          <div class="flash-grade">
            <button class="btn btn-dont" id="dontW">✗ 不认识</button>
            <button class="btn btn-know" id="knowW">✓ 认识</button>
          </div>
        </div>`;
    };

    const current = () => {
      let list = pool();
      if (s.order) list = s.order.map((ko) => list.find((w) => w.ko === ko)).filter(Boolean);
      return { list, w: list[s.idx] };
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
      if (s.idx >= list.length && list.length) { s.idx = 0; toast('本组已过完一轮 👏'); }
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
        const base = s.cat === 'all' ? ALL_WORDS : VOCAB.find((c) => c.id === s.cat).words;
        base.forEach((w) => delete progress.known[w.ko]);
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
    app.innerHTML = `
      <h1 class="page-title">情景短语</h1>
      <p class="page-sub">按场景整理的实用句子，点击 🔊 跟读，模仿语调。</p>
      ${PHRASES.map((g) => `
        <div class="phrase-group">
          <h2 class="section-title">${esc(g.scene)}</h2>
          ${g.items.map((p) => `
            <div class="card phrase">
              <div class="w"><div class="k">${esc(p.ko)}</div><div class="r">${esc(p.roman)}</div><div class="z">${esc(p.zh)}</div></div>
              ${dualBtns(p.ko)}
            </div>`).join('')}
        </div>`).join('')}`;
  }

  // ---------- 页面：语法 ----------
  function viewGrammar() {
    app.innerHTML = `
      <h1 class="page-title">入门语法</h1>
      <p class="page-sub">掌握这几条，你就能看懂并造出简单的韩语句子。</p>
      <div class="grammar">
        ${GRAMMAR.map((g, i) => `
          <div class="card">
            <h3><span class="n">${i + 1}</span>${esc(g.title)}</h3>
            <p>${esc(g.body)}</p>
            ${g.examples.map((x) => {
              const say = x.ko.split('→').pop().trim();
              return `<div class="ex">${speakBtn(say)}<div><div class="k">${esc(x.ko)}</div><div class="z">${esc(x.zh)}</div></div></div>`;
            }).join('')}
          </div>`).join('')}
      </div>`;
  }

  // ---------- 页面：测验 ----------
  const QUIZ_MODES = [
    { id: 'letter', icon: '🔤', title: '字母 → 罗马音', desc: '看韩文字母，选出正确读音' },
    { id: 'ko2zh', icon: '🇰🇷', title: '韩语 → 中文', desc: '看韩语单词，选出中文意思' },
    { id: 'zh2ko', icon: '🇨🇳', title: '中文 → 韩语', desc: '看中文，选出对应的韩语' },
    { id: 'listen', icon: '🎧', title: '听音选词', desc: '听发音，选出听到的单词' },
  ];
  const QUIZ_LEN = 10;

  function buildQuestions(mode) {
    if (mode === 'letter') {
      const pool = ALL_LETTERS;
      return shuffle(pool).slice(0, QUIZ_LEN).map((l) => {
        const wrong = shuffle(pool.filter((x) => x.roman !== l.roman)).slice(0, 3).map((x) => x.roman);
        return { prompt: l.ch, promptKo: true, answer: l.roman, options: shuffle([l.roman, ...wrong]), speak: l.sound, optKo: false };
      });
    }
    return shuffle(ALL_WORDS).slice(0, QUIZ_LEN).map((w) => {
      // 干扰项：与正确答案的韩语和中文都不同，且彼此不重复
      const others = shuffle(ALL_WORDS.filter((x) => x.ko !== w.ko && x.zh !== w.zh));
      const pick = (key) => [...new Set(others.map((x) => x[key]))].slice(0, 3);
      if (mode === 'ko2zh') {
        return { prompt: w.ko, promptKo: true, answer: w.zh, options: shuffle([w.zh, ...pick('zh')]), speak: w.ko, optKo: false, word: w };
      }
      return {
        prompt: mode === 'listen' ? '🔊' : w.zh, promptKo: false, listen: mode === 'listen',
        answer: w.ko, options: shuffle([w.ko, ...pick('ko')]), speak: w.ko, optKo: true, word: w,
      };
    });
  }

  function viewQuiz() {
    let qs = [], i = 0, score = 0, mistakes = [], answered = false, mode = null;

    const setup = () => {
      app.innerHTML = `
        <h1 class="page-title">测验</h1>
        <p class="page-sub">每轮 ${QUIZ_LEN} 题。历史最佳：<b>${progress.quiz.best}</b> / ${QUIZ_LEN}</p>
        <div class="quiz-setup">
          ${QUIZ_MODES.map((m) => `
            <button class="card mode" data-qmode="${m.id}">
              <div class="ic">${m.icon}</div><h3>${m.title}</h3><p>${m.desc}</p>
            </button>`).join('')}
        </div>`;
    };
    const renderQ = () => {
      const q = qs[i];
      answered = false;
      app.innerHTML = `
        <div class="quiz-card">
          <div class="quiz-head"><span>第 ${i + 1} / ${qs.length} 题</span><span>得分 ${score}</span></div>
          <div class="bar"><span style="width:${(i / qs.length) * 100}%;background:var(--blue)"></span></div>
          <div class="card quiz-q" style="margin-top:16px">
            <div class="prompt-label">${q.listen ? '听一听，选出你听到的词' : '选出正确答案'}</div>
            ${q.listen
              ? `<button class="btn btn-primary" style="font-size:22px;padding:16px 28px;margin:14px 0 8px" data-speak="${esc(q.speak)}">🔊 播放</button>
                 <div class="listen-alt">换个声音听：${dualBtns(q.speak, true)}</div>`
              : `<div class="prompt ${q.promptKo ? 'ko' : ''}">${esc(q.prompt)}</div>`}
            <div class="options">
              ${q.options.map((o) => `<button class="option ${q.optKo ? 'ko' : ''}" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}
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
        $('#fb').innerHTML = '<span style="color:var(--green)">✓ 正确！</span>';
      } else {
        btn.classList.add('wrong');
        mistakes.push(q);
        const extra = q.word ? `${esc(q.word.ko)}（${esc(q.word.roman)}）= ${esc(q.word.zh)}` : `${esc(q.prompt)} = ${esc(q.answer)}`;
        $('#fb').innerHTML = `<span style="color:var(--red)">✗ 正确答案：</span>${extra}`;
      }
      save();
      speak(q.speak);
      $('#nextWrap').innerHTML = `<button class="btn btn-primary" id="nextQ">${i + 1 < qs.length ? '下一题 →' : '查看结果'}</button>`;
      $('#nextQ').focus();
    };
    const finish = () => {
      const isBest = score > progress.quiz.best;
      if (isBest) { progress.quiz.best = score; save(); }
      const msg = score === QUIZ_LEN ? '满分！太厉害了 🎉' : score >= 7 ? '很不错，继续保持！' : '多练几次就会越来越熟练 💪';
      app.innerHTML = `
        <div class="quiz-card">
          <div class="card" style="text-align:center;padding:36px 20px">
            <div class="score-big">${score}<span style="font-size:28px;color:var(--ink-soft)"> / ${qs.length}</span></div>
            <p style="font-size:18px;margin:14px 0 4px">${msg}</p>
            ${isBest ? '<p style="color:var(--green);margin:0">🏆 新纪录！</p>' : ''}
            ${mistakes.length ? `
              <div class="mistakes"><h3 style="font-size:16px">需要复习</h3><ul>
                ${mistakes.map((q) => `<li><span class="ko">${q.word ? esc(q.word.ko) : esc(q.prompt)}</span> — ${q.word ? esc(q.word.zh) : esc(q.answer)}</li>`).join('')}
              </ul></div>` : ''}
            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
              <button class="btn btn-primary" id="again">再来一轮</button>
              <button class="btn" id="backModes">换个题型</button>
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

  // ---------- 路由 ----------
  const ROUTES = {
    home: viewHome, alphabet: viewAlphabet, pronounce: viewPronounce, builder: viewBuilder, words: viewWords,
    phrases: viewPhrases, grammar: viewGrammar, quiz: viewQuiz,
  };
  let cleanup = null;
  function render() {
    const route = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
    const view = ROUTES[route] || viewHome;
    if (cleanup) { cleanup(); cleanup = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    cleanup = view() || null;
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (ROUTES[route] ? route : 'home')));
    $('#nav').classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }

  // 全局：朗读按钮
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-gender-set]');
    if (g) {
      setGender(g.dataset.genderSet);
      speak('안녕하세요');
      toast(`已切换为${GENDER_LABEL[g.dataset.genderSet]}`);
      return;
    }
    const b = e.target.closest('[data-speak]');
    if (b) speak(b.dataset.speak, null, b.dataset.gender);
  });
  setGender(voicePrefs.gender);
  $('#menuBtn').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('hashchange', render);
  render();
})();
