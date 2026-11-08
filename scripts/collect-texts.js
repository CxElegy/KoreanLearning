// 收集网站中所有需要朗读的韩语文本，输出 JSON 数组
// 用法：node scripts/collect-texts.js > texts.json
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/ja.js']) {
  // 把顶层 const 暴露到上下文
  const code = fs.readFileSync(path.join(root, f), 'utf8').replace(/^const /gm, 'var ');
  vm.runInContext(code, ctx);
}
const D = ctx;
const set = new Set();
const add = (t) => { if (t && /[가-힣]/.test(t)) set.add(t.trim()); };
const compose = (l, v, t) => String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t);

// 字母：发音、名称、组合示例（与 app.js 中 showLetter 一致）
for (const l of [...D.CONSONANTS, ...D.DOUBLE_CONSONANTS]) {
  add(l.sound); add(l.name);
  const idx = D.INITIALS.indexOf(l.ch);
  [0, 4, 8, 13, 20].forEach((v) => add(compose(idx, v, 0)));
}
for (const l of [...D.VOWELS, ...D.COMPOUND_VOWELS]) {
  add(l.sound);
  const idx = D.MEDIALS.indexOf(l.ch);
  [11, 0, 2, 6, 9, 15].forEach((c) => add(compose(c, idx, 0)));
}
// 拼读器：所有不带收音的音节（19 × 21）
for (let l = 0; l < 19; l++) for (let v = 0; v < 21; v++) add(compose(l, v, 0));

D.VOCAB.forEach((c) => c.words.forEach((w) => add(w.ko)));
D.PHRASES.forEach((g) => g.items.forEach((p) => add(p.ko)));
D.GRAMMAR.forEach((g) => g.examples.forEach((x) => add(x.ko.split('→').pop())));
D.CONSONANT_TRIADS.forEach((g) => g.cells.forEach((c) => { add(c.syl); add(c.word); }));
D.VOWEL_PAIRS.forEach((p) => p.words.forEach((w) => add(w.ko)));
D.BATCHIM_HOW.forEach((b) => add(b.syl));
D.SOUND_RULES.forEach((r) => r.examples.forEach((x) => add(x.ko)));
D.PARTICLES.forEach((p) => add(p[3]));
D.JA_SINO_RULES.forEach((r) => r.examples.forEach((x) => add(x[0])));
D.JA_SAME_WORDS.forEach((w) => add(w[0]));
D.JA_FALSE_FRIENDS.forEach((w) => add(w[0]));
D.JA_HONORIFIC_WORDS.forEach((w) => add(w[0].split('→').pop()));
// 声音设置的试听句、切换提示音、拆字器默认文本
['안녕하세요. 만나서 반갑습니다.', '안녕하세요'].forEach(add);

process.stdout.write(JSON.stringify([...set], null, 0));
