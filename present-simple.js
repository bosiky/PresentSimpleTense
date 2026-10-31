/**
 * 現在簡單式互動學習網頁 - 核心互動邏輯
 * 包含：Web Audio 音效合成器、Web Speech 英語發音、Canvas Confetti 彩帶、
 * 變形機器規則引擎、怪獸吞S互動、四大迷你遊戲、徽章成就系統。
 */

// ==========================================
// 1. 音效合成器 (Web Audio API) & 英語朗讀 (Web Speech API)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  correct() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.1, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.15), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.15), 200); // G5
  }

  wrong() {
    if (!this.enabled) return;
    this.playTone(220, 'triangle', 0.15, 0.2);
    setTimeout(() => this.playTone(180, 'triangle', 0.3, 0.2), 140);
  }

  combo(count = 1) {
    if (!this.enabled) return;
    const baseFreq = 400 + Math.min(count * 40, 500);
    this.playTone(baseFreq, 'sine', 0.12, 0.15);
  }

  chomp() {
    if (!this.enabled) return;
    this.playTone(150, 'sawtooth', 0.08, 0.25);
    setTimeout(() => this.playTone(90, 'triangle', 0.2, 0.3), 80);
  }

  levelUp() {
    if (!this.enabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.2), i * 90);
    });
  }

  click() {
    this.playTone(800, 'sine', 0.04, 0.05);
  }
}

const sfx = new SoundFX();

// 英語發音器
const speech = {
  rate: 0.9,
  voice: null,

  init() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        // 優先挑選英語（美式或英式）
        this.voice = voices.find(v => v.lang.startsWith('en-US')) ||
                     voices.find(v => v.lang.startsWith('en-GB')) ||
                     voices.find(v => v.lang.startsWith('en')) || null;
      };
    }
  },

  speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = this.rate;
    if (this.voice) u.voice = this.voice;
    window.speechSynthesis.speak(u);
  }
};
speech.init();

// ==========================================
// 2. 彩花特效 (Confetti FX)
// ==========================================
function launchConfetti(duration = 2000) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];
  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2 + (Math.random() - 0.5) * 50,
      r: Math.random() * 6 + 4,
      d: Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
      tiltAngle: 0,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 5
    });
  }

  let animationFrame;
  const start = performance.now();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2 + p.vy * 0.2;
      p.x += Math.sin(p.d) * 2 + p.vx * 0.5;
      p.tilt = Math.sin(p.tiltAngle - (p.r / 3)) * 15;
      p.vy += 0.15; // 重力

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx.stroke();
    });

    if (performance.now() - start < duration) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }
  draw();
}

// ==========================================
// 3. 成就與徽章系統 (Local Storage)
// ==========================================
const BADGES = [
  { id: 'first_step', name: '探索啟航', icon: '🌱', desc: '完成了第 1 次觀念判斷題' },
  { id: 'transformer_guru', name: '變形金剛', icon: '⚙️', desc: '在三單機器中測試了 5 個動詞' },
  { id: 'monster_tamer', name: '怪獸馴服師', icon: '👾', desc: '觀察了 S 怪獸的否定與問句變形' },
  { id: 'catcher_combo', name: '連擊神射手', icon: '⚡', desc: '在抓抓樂中達成 5 連擊' },
  { id: 'sorter_master', name: '字尾分類王', icon: '🧺', desc: '在變形敲敲樂中成功分類 8 個動詞' },
  { id: 'sentence_builder', name: '句子工程師', icon: '🧩', desc: '成功拼出 3 個完整句子' },
  { id: 'grand_champion', name: '時態大魔導師', icon: '👑', desc: '在大考驗中獲得 80 分以上' }
];

let userBadges = JSON.parse(localStorage.getItem('ps_badges') || '[]');
let verbTestedCount = parseInt(localStorage.getItem('ps_verbs_tested') || '0', 10);
let sentencesSolved = parseInt(localStorage.getItem('ps_sentences_solved') || '0', 10);

function unlockBadge(id) {
  if (!userBadges.includes(id)) {
    userBadges.push(id);
    localStorage.setItem('ps_badges', JSON.stringify(userBadges));
    const badge = BADGES.find(b => b.id === id);
    if (badge) {
      sfx.levelUp();
      showToast(`🏆 恭喜解鎖徽章：【${badge.name}】！`);
      launchConfetti(2500);
      renderBadgesModal();
    }
  }
}

function showToast(msg) {
  let toast = document.getElementById('psToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'psToast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1e1b4b; color: #fff; padding: 12px 24px; border-radius: 999px;
      font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 9999;
      display: flex; align-items: center; gap: 8px; font-size: 1rem;
      animation: fadeIn 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.display = 'flex';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function renderBadgesModal() {
  const container = document.getElementById('badgeGrid');
  if (!container) return;
  container.innerHTML = BADGES.map(b => {
    const isUnlocked = userBadges.includes(b.id);
    return `
      <div class="badge-item ${isUnlocked ? 'unlocked' : ''}">
        <div class="b-icon">${b.icon}</div>
        <div class="b-name">${b.name}</div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">${b.desc}</div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 4. 動詞三單變形規則核心引擎 (Transformer Engine)
// ==========================================
function transformToThirdPerson(verb) {
  const raw = verb.trim().toLowerCase();
  if (!raw) return null;

  // 特殊不規則
  if (raw === 'have') {
    return {
      word: 'has',
      rule: 'irregular',
      ruleName: '超特殊不規則',
      explanation: 'have 遇到第三人稱單數，直接變身為「has」！',
      rhyme: 'have 自己變形記，直接換成 has！'
    };
  }
  if (raw === 'be') {
    return {
      word: 'is',
      rule: 'irregular',
      ruleName: 'be 動詞特殊形態',
      explanation: 'be 動詞遇到三單（he/she/it）會變成「is」！',
      rhyme: 'be 動詞有三態：am, is, are！'
    };
  }

  // 特殊：字尾為 s, sh, ch, x, o, z -> 加 -es
  const esEndings = ['sh', 'ch', 'ss', 's', 'x', 'o', 'z'];
  for (const end of esEndings) {
    if (raw.endsWith(end)) {
      return {
        word: raw + 'es',
        rule: 'es',
        ruleName: `字尾是「-${end}」`,
        explanation: `動詞字尾是 ${end}，為了方便發音，後面要加上「-es」！`,
        rhyme: '嘶～去吃個（s, sh, ch, x, o）火鍋加 -es！'
      };
    }
  }

  // 特殊：字尾為「子音 + y」-> 去 y 加 -ies
  if (raw.endsWith('y')) {
    const prevChar = raw.charAt(raw.length - 2);
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (raw.length >= 2 && !vowels.includes(prevChar)) {
      const stem = raw.slice(0, -1);
      return {
        word: stem + 'ies',
        rule: 'ies',
        ruleName: '字尾是「子音 + y」',
        explanation: `字尾 y 前面是子音「${prevChar}」，要把 y 踢掉改成「-ies」！`,
        rhyme: '子音加 y 不合群，踢掉 y 換成 -ies！'
      };
    } else {
      // 母音 + y -> 直接加 s
      return {
        word: raw + 's',
        rule: 'vowel_y',
        ruleName: '字尾是「母音 + y」',
        explanation: `y 前面是母音「${prevChar}」（a, e, i, o, u），直接加「-s」即可（不用改 ies 哦）！`,
        rhyme: '母音加 y 好朋友，直接加 s 就足夠！'
      };
    }
  }

  // 一般情況 -> 直接加 -s
  return {
    word: raw + 's',
    rule: 's',
    ruleName: '一般規則',
    explanation: '大多數英文動詞遇到第三人稱單數，直接在字尾加上「-s」！',
    rhyme: '最常見，加 s 就搞定！'
  };
}

// ==========================================
// 5. 單元一：觀念快問快答題庫
// ==========================================
const CONCEPT_QUIZ_DATA = [
  {
    q: '「Penguins don\'t fly.」（企鵝不會飛。）',
    sub: '這是鳥類的生物客觀事實',
    ans: true,
    feedback: '答對了！🎉 這是「客觀事實與自然真理」，用現在簡單式最適合！'
  },
  {
    q: '「I am eating dinner right now.」（我現在正在吃晚餐。）',
    sub: '正在進行中的動作',
    ans: false,
    feedback: '答對了！👏 這是在描述「此刻正在發生的事」，英文要用現在進行式（am/is/are + V-ing），不是現在簡單式哦！'
  },
  {
    q: '「He plays basketball every Saturday.」（他每週六打籃球。）',
    sub: '規律發生的週末習慣',
    ans: true,
    feedback: '太棒了！🎯 有「every Saturday」表示規律重複的習慣，正是現在簡單式的拿手好戲！'
  },
  {
    q: '「Water boils at 100°C.」（水在攝氏100度沸騰。）',
    sub: '科學界不變的物理定律',
    ans: true,
    feedback: '答得漂亮！💡 科學事實、物理真理，一定要用現在簡單式！'
  },
  {
    q: '「I will visit my grandma tomorrow.」（我明天會去看外婆。）',
    sub: '明天才會發生的事情',
    ans: false,
    feedback: '正確！🌟 明天才會發生的未來動作，要用未來式（will），不是現在簡單式！'
  }
];

let currentConceptIndex = 0;

// ==========================================
// 6. 遊戲一：動詞抓抓樂 (Subject-Verb Catcher)
// ==========================================
const CATCHER_QUESTIONS = [
  { subject: 'He', zh: '他（第三人稱單數）', base: 'play', sForm: 'plays', correct: 'plays' },
  { subject: 'They', zh: '他們（複數）', base: 'like', sForm: 'likes', correct: 'like' },
  { subject: 'My sister', zh: '我妹妹（單數/She）', base: 'watch', sForm: 'watches', correct: 'watches' },
  { subject: 'The birds', zh: '鳥兒們（複數）', base: 'fly', sForm: 'flies', correct: 'fly' },
  { subject: 'Tom and Jerry', zh: '兩個人（複數）', base: 'run', sForm: 'runs', correct: 'run' },
  { subject: 'The teacher', zh: '老師（單數）', base: 'teach', sForm: 'teaches', correct: 'teaches' },
  { subject: 'You', zh: '你 / 你們', base: 'speak', sForm: 'speaks', correct: 'speak' },
  { subject: 'My cat', zh: '我的貓（單數/It）', base: 'sleep', sForm: 'sleeps', correct: 'sleeps' },
  { subject: 'We', zh: '我們（複數）', base: 'study', sForm: 'studies', correct: 'study' },
  { subject: 'The sun', zh: '太陽（單數/It）', base: 'shine', sForm: 'shines', correct: 'shines' },
  { subject: 'Emma', zh: '艾瑪（單數/She）', base: 'have', sForm: 'has', correct: 'has' },
  { subject: 'I', zh: '我（第一人稱）', base: 'eat', sForm: 'eats', correct: 'eat' },
  { subject: 'Dogs', zh: '狗狗們（複數）', base: 'bark', sForm: 'barks', correct: 'bark' },
  { subject: 'My father', zh: '我爸爸（單數/He）', base: 'drive', sForm: 'drives', correct: 'drives' }
];

let catcherTimer = null;
let catcherTimeLeft = 30;
let catcherScore = 0;
let catcherCombo = 0;
let catcherMaxCombo = 0;
let currentCatcherQ = null;

// ==========================================
// 7. 遊戲二：三單變形敲敲樂 (Verb Spelling Sorter)
// ==========================================
const SORTER_VERBS = [
  { word: 'watch', meaning: '看', type: 'es', result: 'watches' },
  { word: 'play', meaning: '玩', type: 's', result: 'plays' },
  { word: 'fly', meaning: '飛', type: 'ies', result: 'flies' },
  { word: 'fix', meaning: '修理', type: 'es', result: 'fixes' },
  { word: 'study', meaning: '研讀', type: 'ies', result: 'studies' },
  { word: 'go', meaning: '去', type: 'es', result: 'goes' },
  { word: 'have', meaning: '有', type: 'has', result: 'has' },
  { word: 'brush', meaning: '刷', type: 'es', result: 'brushes' },
  { word: 'cry', meaning: '哭', type: 'ies', result: 'cries' },
  { word: 'buy', meaning: '買', type: 's', result: 'buys' },
  { word: 'pass', meaning: '經過/通過', type: 'es', result: 'passes' },
  { word: 'do', meaning: '做', type: 'es', result: 'does' },
  { word: 'carry', meaning: '搬運', type: 'ies', result: 'carries' },
  { word: 'read', meaning: '閱讀', type: 's', result: 'reads' }
];

let sorterIndex = 0;
let sorterScore = 0;
let sorterShuffled = [];

// ==========================================
// 8. 遊戲三：句子大拼圖 (Sentence Puzzle)
// ==========================================
const PUZZLE_LEVELS = [
  {
    zh: '他每天早上喝牛奶。',
    target: ['He', 'drinks', 'milk', 'every', 'morning', '.'],
    scramble: ['drinks', 'He', 'every', 'morning', 'milk', '.']
  },
  {
    zh: '她不喜歡洋蔥。',
    target: ['She', "doesn't", 'like', 'onions', '.'],
    scramble: ['like', 'She', 'onions', "doesn't", '.']
  },
  {
    zh: '你每天都自己走路去學校嗎？',
    target: ['Do', 'you', 'walk', 'to', 'school', '?'],
    scramble: ['walk', 'you', 'to', 'Do', 'school', '?']
  },
  {
    zh: '湯姆有一隻黑色的狗狗。',
    target: ['Tom', 'has', 'a', 'black', 'dog', '.'],
    scramble: ['has', 'black', 'a', 'Tom', 'dog', '.']
  },
  {
    zh: '鳥兒們在樹上快樂地唱歌。',
    target: ['Birds', 'sing', 'in', 'the', 'trees', '.'],
    scramble: ['sing', 'the', 'Birds', 'trees', 'in', '.']
  }
];

let currentPuzzleIdx = 0;
let puzzleCurrentWords = [];

// ==========================================
// 9. 遊戲四：魔法學院期末大考驗 (Grand Quest Quiz)
// ==========================================
const GRAND_QUIZ = [
  {
    q: 'The sun ________ in the east every morning.',
    options: ['rise', 'rises', 'rising', 'rose'],
    ans: 1,
    zh: '太陽每天早晨從東方升起。（客觀真理，太陽是單數 It）'
  },
  {
    q: 'My brother ________ like carrots at all.',
    options: ["don't", "doesn't", 'is not', 'not'],
    ans: 1,
    zh: '主詞是 My brother（He），否定句助動詞要用 doesn\'t！'
  },
  {
    q: 'Does your sister ________ English every night?',
    options: ['study', 'studies', 'studying', 'studied'],
    ans: 0,
    zh: '前面已經有助動詞 Does 了，動詞必須打回「原形 study」！'
  },
  {
    q: 'They ________ breakfast at 7:30 every day.',
    options: ['has', 'haves', 'have', 'having'],
    ans: 2,
    zh: '主詞是 They（複數），動詞用原形 have！'
  },
  {
    q: 'He often ________ television after dinner.',
    options: ['watch', 'watchs', 'watches', 'watching'],
    ans: 2,
    zh: 'watch 字尾是 ch，遇到三單 He 要加上 -es！'
  },
  {
    q: '________ you play badminton on weekends?',
    options: ['Do', 'Does', 'Are', 'Is'],
    ans: 0,
    zh: '主詞是 you，一般動詞問句助動詞用 Do！'
  },
  {
    q: 'A bird ________ wings to fly.',
    options: ['have', 'has', 'haves', 'is having'],
    ans: 1,
    zh: 'A bird 是一隻鳥（單數），have 的三單變形是 has！'
  },
  {
    q: 'The little baby ________ loudly when he is hungry.',
    options: ['cry', 'crys', 'cries', 'crying'],
    ans: 2,
    zh: 'cry 是子音 + y，去 y 改成 -ies 變成 cries！'
  },
  {
    q: 'Emma and Lily ________ good friends.',
    options: ['is', 'are', 'am', 'be'],
    ans: 1,
    zh: 'Emma and Lily 是兩個人（複數），be 動詞搭配 are！'
  },
  {
    q: 'Peter doesn\'t ________ a car.',
    options: ['has', 'have', 'haves', 'having'],
    ans: 1,
    zh: '遇到 doesn\'t，動詞恢復原形 have！'
  }
];

let grandQuizIdx = 0;
let grandHearts = 3;
let grandScore = 0;

// ==========================================
// 10. 頁面初始化與事件監聽綁定
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initVoiceSpeed();
  initSoundToggle();
  initConceptQuiz();
  initTransformer();
  initMonsterArena();
  initGameArcade();
  initCheatsheet();
  renderBadgesModal();

  // 快捷發音按鈕委派
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.voice-btn');
    if (btn && btn.dataset.speech) {
      sfx.click();
      speech.speak(btn.dataset.speech);
    }
  });

  // 成就按鈕
  document.getElementById('btnBadges')?.addEventListener('click', () => {
    sfx.click();
    document.getElementById('badgeModal').classList.add('show');
  });
  document.getElementById('closeBadgeModal')?.addEventListener('click', () => {
    document.getElementById('badgeModal').classList.remove('show');
  });
  document.getElementById('badgeModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'badgeModal') {
      document.getElementById('badgeModal').classList.remove('show');
    }
  });
});

// 導覽標籤切換
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.click();
      const target = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
      });
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });
}

// 語音語速控制
function initVoiceSpeed() {
  const btn = document.getElementById('btnVoiceSpeed');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sfx.click();
    if (speech.rate === 0.9) {
      speech.rate = 0.7;
      btn.textContent = '🐢 慢速朗讀 (0.7x)';
      btn.classList.add('active');
    } else {
      speech.rate = 0.9;
      btn.textContent = '🐰 正常語速 (1.0x)';
      btn.classList.remove('active');
    }
  });
}

// 音效開關
function initSoundToggle() {
  const btn = document.getElementById('btnSoundToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    if (sfx.enabled) {
      sfx.click();
      btn.textContent = '🔊 音效：開';
      btn.classList.remove('active');
    } else {
      btn.textContent = '🔇 音效：關';
      btn.classList.add('active');
    }
  });
}

// 觀念快問快答初始化
function initConceptQuiz() {
  renderConceptQuiz();

  document.getElementById('btnConceptYes')?.addEventListener('click', () => handleConceptAnswer(true));
  document.getElementById('btnConceptNo')?.addEventListener('click', () => handleConceptAnswer(false));
  document.getElementById('btnConceptNext')?.addEventListener('click', () => {
    sfx.click();
    currentConceptIndex = (currentConceptIndex + 1) % CONCEPT_QUIZ_DATA.length;
    renderConceptQuiz();
  });
}

function renderConceptQuiz() {
  const item = CONCEPT_QUIZ_DATA[currentConceptIndex];
  document.getElementById('conceptQText').textContent = item.q;
  document.getElementById('conceptQSub').textContent = item.sub;
  const feedback = document.getElementById('conceptFeedback');
  feedback.style.display = 'none';
  feedback.className = 'quiz-feedback';
  document.getElementById('btnConceptYes').disabled = false;
  document.getElementById('btnConceptNo').disabled = false;
  document.getElementById('btnConceptNext').style.display = 'none';
}

function handleConceptAnswer(userChoice) {
  const item = CONCEPT_QUIZ_DATA[currentConceptIndex];
  const feedback = document.getElementById('conceptFeedback');
  document.getElementById('btnConceptYes').disabled = true;
  document.getElementById('btnConceptNo').disabled = true;

  if (userChoice === item.ans) {
    sfx.correct();
    feedback.className = 'quiz-feedback correct';
    feedback.innerHTML = `✅ ${item.feedback}`;
    unlockBadge('first_step');
  } else {
    sfx.wrong();
    feedback.className = 'quiz-feedback wrong';
    feedback.innerHTML = `❌ 哎呀，再想想看！${item.feedback}`;
  }
  feedback.style.display = 'block';
  document.getElementById('btnConceptNext').style.display = 'inline-block';
}

// 三單變形實驗室
function initTransformer() {
  const input = document.getElementById('transformerInput');
  const btnRun = document.getElementById('btnRunTransformer');

  function runTransform(word) {
    if (!word) return;
    sfx.click();
    const result = transformToThirdPerson(word);
    if (!result) return;

    document.getElementById('boxBaseVerb').textContent = word.toLowerCase();
    const boxResult = document.getElementById('boxResultVerb');
    boxResult.textContent = '...';

    setTimeout(() => {
      sfx.combo(2);
      boxResult.textContent = result.word;
      document.getElementById('transformerRuleName').textContent = result.ruleName;
      document.getElementById('transformerExplanation').textContent = result.explanation;
      document.getElementById('transformerRhyme').textContent = result.rhyme;

      // 產生即示例句
      const sample = `He ${result.word} every day.`;
      document.getElementById('transformerSentence').textContent = sample;
      document.getElementById('btnSpeechTransform').dataset.speech = `${word}, ${result.word}. ${sample}`;

      verbTestedCount++;
      localStorage.setItem('ps_verbs_tested', verbTestedCount);
      if (verbTestedCount >= 5) {
        unlockBadge('transformer_guru');
      }
    }, 250);
  }

  btnRun?.addEventListener('click', () => {
    runTransform(input.value.trim());
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTransform(input.value.trim());
  });

  // 預設動詞按鈕
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const verb = btn.dataset.verb;
      input.value = verb;
      runTransform(verb);
    });
  });

  // 預設跑一次 watch
  runTransform('watch');
}

// S 怪獸大反擊模擬器
function initMonsterArena() {
  const sentences = [
    {
      subject: 'Tom',
      verbBase: 'play',
      verbThird: 'plays',
      object: 'soccer every day',
      zh: '湯姆每天踢足球。',
      zhNeg: '湯姆每天沒有踢足球。',
      zhQ: '湯姆每天踢足球嗎？'
    },
    {
      subject: 'She',
      verbBase: 'watch',
      verbThird: 'watches',
      object: 'cartoons on Sundays',
      zh: '她星期天看卡通。',
      zhNeg: '她星期天不看卡通。',
      zhQ: '她星期天看卡通嗎？'
    },
    {
      subject: 'The cat',
      verbBase: 'like',
      verbThird: 'likes',
      object: 'eating fish',
      zh: '這隻貓喜歡吃魚。',
      zhNeg: '這隻貓不喜歡吃魚。',
      zhQ: '這隻貓喜歡吃魚嗎？'
    }
  ];

  let currentIdx = 0;
  let currentMode = 'aff'; // aff, neg, ques

  function updateDisplay() {
    const s = sentences[currentIdx];
    const display = document.getElementById('monsterSentenceDisplay');
    const zhDisplay = document.getElementById('monsterTranslation');
    const exp = document.getElementById('monsterExplanation');
    const monsterChar = document.getElementById('monsterCharacter');

    if (currentMode === 'aff') {
      monsterChar.textContent = '😴';
      display.innerHTML = `
        <span class="word-highlight subj">${s.subject}</span>
        <span class="word-highlight verb">${s.verbThird}</span>
        <span>${s.object}.</span>
      `;
      zhDisplay.textContent = s.zh;
      exp.innerHTML = `
        <strong>💡 肯定句（Affirmative）：</strong> 主詞是 <code>${s.subject}</code>（第三人稱單數），
        怪獸在睡覺，動詞正常戴上變形小帽子，加上了 <code>-s / -es</code>！
      `;
    } else if (currentMode === 'neg') {
      sfx.chomp();
      monsterChar.textContent = '👾';
      display.innerHTML = `
        <span class="word-highlight subj">${s.subject}</span>
        <span class="word-highlight aux">doesn't</span>
        <span class="word-highlight verb">${s.verbBase}</span>
        <span>${s.object}.</span>
      `;
      zhDisplay.textContent = s.zhNeg;
      exp.innerHTML = `
        <strong>💥 嗷嗚！Doesn't 怪獸大口一張！</strong><br>
        大嘴怪獸 <code>doesn't</code> 跳出來，一口把 <code>${s.verbThird}</code> 後面的「s」吃進肚子裡！
        動詞瞬間被打回<strong>原形（Base Verb: ${s.verbBase}）</strong>！
      `;
      unlockBadge('monster_tamer');
    } else if (currentMode === 'ques') {
      sfx.chomp();
      monsterChar.textContent = '🧐';
      display.innerHTML = `
        <span class="word-highlight aux">Does</span>
        <span class="word-highlight subj">${s.subject.toLowerCase()}</span>
        <span class="word-highlight verb">${s.verbBase}</span>
        <span>${s.object}?</span>
      `;
      zhDisplay.textContent = s.zhQ;
      exp.innerHTML = `
        <strong>🔍 疑問句（Question）：</strong><br>
        句首由魔法精靈 <code>Does</code> 帶頭！只要有 Does 領頭，動詞的 s 同樣被收走了，
        必須保持<strong>原形（Base Verb: ${s.verbBase}）</strong>！
      `;
      unlockBadge('monster_tamer');
    }

    const currentSpeechText = display.innerText;
    document.getElementById('btnSpeechMonster').dataset.speech = currentSpeechText;
  }

  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      updateDisplay();
    });
  });

  document.getElementById('btnNextMonsterSentence')?.addEventListener('click', () => {
    sfx.click();
    currentIdx = (currentIdx + 1) % sentences.length;
    updateDisplay();
  });

  updateDisplay();
}

// ==========================================
// 11. 遊戲大廳控制器
// ==========================================
function initGameArcade() {
  const gameButtons = document.querySelectorAll('.game-card-btn');
  gameButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.click();
      gameButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const gameType = btn.dataset.game;
      document.querySelectorAll('.game-view').forEach(v => v.style.display = 'none');
      const activeView = document.getElementById(`view-${gameType}`);
      if (activeView) activeView.style.display = 'block';

      if (gameType === 'catcher') startCatcherGame();
      else if (gameType === 'sorter') startSorterGame();
      else if (gameType === 'puzzle') startPuzzleGame();
      else if (gameType === 'quiz') startGrandQuiz();
    });
  });

  // 預設啟動遊戲 1
  startCatcherGame();

  // 關閉結算彈窗
  document.getElementById('btnCloseResultModal')?.addEventListener('click', () => {
    document.getElementById('gameResultModal').classList.remove('show');
  });
}

function showGameResult(title, score, desc, stars = 3) {
  sfx.levelUp();
  launchConfetti(3000);
  const modal = document.getElementById('gameResultModal');
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultScore').textContent = score;
  document.getElementById('resultDesc').textContent = desc;
  document.getElementById('resultStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  modal.classList.add('show');
}

// ==========================================
// 遊戲一：動詞抓抓樂 (Catcher)
// ==========================================
function startCatcherGame() {
  clearInterval(catcherTimer);
  catcherTimeLeft = 30;
  catcherScore = 0;
  catcherCombo = 0;
  catcherMaxCombo = 0;
  updateCatcherHUD();

  catcherTimer = setInterval(() => {
    catcherTimeLeft--;
    updateCatcherHUD();
    if (catcherTimeLeft <= 0) {
      clearInterval(catcherTimer);
      showGameResult('抓抓樂挑戰完成！', catcherScore, `最高連擊數：${catcherMaxCombo} 次！表現超優秀！`, catcherScore >= 80 ? 3 : catcherScore >= 50 ? 2 : 1);
    }
  }, 1000);

  nextCatcherQuestion();
}

function updateCatcherHUD() {
  const timeEl = document.getElementById('catcherTime');
  const scoreEl = document.getElementById('catcherScore');
  const comboEl = document.getElementById('catcherCombo');
  if (timeEl) timeEl.textContent = catcherTimeLeft;
  if (scoreEl) scoreEl.textContent = catcherScore;
  if (comboEl) comboEl.textContent = catcherCombo;
}

function nextCatcherQuestion() {
  const q = CATCHER_QUESTIONS[Math.floor(Math.random() * CATCHER_QUESTIONS.length)];
  currentCatcherQ = q;

  document.getElementById('catcherSubjText').textContent = q.subject;
  document.getElementById('catcherSubjZh').textContent = q.zh;

  // 隨機左/右
  const isCorrectOnLeft = Math.random() > 0.5;
  const leftOpt = isCorrectOnLeft ? q.correct : (q.correct === q.base ? q.sForm : q.base);
  const rightOpt = isCorrectOnLeft ? (q.correct === q.base ? q.sForm : q.base) : q.correct;

  const btnLeft = document.getElementById('btnCatcherLeft');
  const btnRight = document.getElementById('btnCatcherRight');
  btnLeft.textContent = leftOpt;
  btnRight.textContent = rightOpt;

  btnLeft.onclick = () => handleCatcherChoice(leftOpt);
  btnRight.onclick = () => handleCatcherChoice(rightOpt);
}

function handleCatcherChoice(choice) {
  if (catcherTimeLeft <= 0) return;
  if (choice === currentCatcherQ.correct) {
    catcherCombo++;
    if (catcherCombo > catcherMaxCombo) catcherMaxCombo = catcherCombo;
    catcherScore += 10 + Math.min(catcherCombo * 2, 20);
    sfx.combo(catcherCombo);
    if (catcherCombo >= 5) unlockBadge('catcher_combo');
  } else {
    catcherCombo = 0;
    catcherScore = Math.max(0, catcherScore - 5);
    sfx.wrong();
  }
  updateCatcherHUD();
  nextCatcherQuestion();
}

// ==========================================
// 遊戲二：三單變形敲敲樂 (Sorter)
// ==========================================
function startSorterGame() {
  sorterIndex = 0;
  sorterScore = 0;
  sorterShuffled = [...SORTER_VERBS].sort(() => Math.random() - 0.5);
  renderSorterQuestion();
}

function renderSorterQuestion() {
  if (sorterIndex >= sorterShuffled.length) {
    showGameResult('分類敲敲樂全破！', sorterScore, '太厲害了，所有動詞變形規則都難不倒你！', 3);
    unlockBadge('sorter_master');
    return;
  }

  const v = sorterShuffled[sorterIndex];
  document.getElementById('sorterWord').textContent = v.word;
  document.getElementById('sorterMeaning').textContent = `中文意思是：「${v.meaning}」`;
  document.getElementById('sorterProgress').textContent = `第 ${sorterIndex + 1} / ${sorterShuffled.length} 題`;

  document.querySelectorAll('.basket-btn').forEach(btn => {
    btn.onclick = () => {
      const selectedType = btn.dataset.type;
      if (selectedType === v.type) {
        sfx.correct();
        sorterScore += 10;
        showToast(`🎯 答對了！${v.word} -> ${v.result}`);
        sorterIndex++;
        if (sorterIndex >= 8) unlockBadge('sorter_master');
        renderSorterQuestion();
      } else {
        sfx.wrong();
        showToast(`❌ 哎呀不對哦！${v.word} 應該是 ${v.result}！`);
      }
    };
  });
}

// ==========================================
// 遊戲三：句子大拼圖 (Sentence Builder)
// ==========================================
function startPuzzleGame() {
  currentPuzzleIdx = 0;
  renderPuzzle();
}

function renderPuzzle() {
  const level = PUZZLE_LEVELS[currentPuzzleIdx];
  puzzleCurrentWords = [];
  document.getElementById('puzzleZh').textContent = level.zh;
  document.getElementById('puzzleLevelText').textContent = `第 ${currentPuzzleIdx + 1} / ${PUZZLE_LEVELS.length} 關`;

  const targetBox = document.getElementById('puzzleTarget');
  targetBox.innerHTML = '<span style="color:#94a3b8; font-size:0.95rem;">點擊下方單字組裝句子...</span>';

  const poolBox = document.getElementById('puzzlePool');
  poolBox.innerHTML = '';

  const scrambled = [...level.scramble].sort(() => Math.random() - 0.5);
  scrambled.forEach((word) => {
    const btn = document.createElement('button');
    btn.className = 'puzzle-word-btn';
    btn.textContent = word;
    btn.onclick = () => {
      sfx.click();
      puzzleCurrentWords.push(word);
      btn.remove();
      updatePuzzleTarget();
    };
    poolBox.appendChild(btn);
  });
}

function updatePuzzleTarget() {
  const targetBox = document.getElementById('puzzleTarget');
  const level = PUZZLE_LEVELS[currentPuzzleIdx];
  targetBox.innerHTML = '';

  puzzleCurrentWords.forEach((word, idx) => {
    const chip = document.createElement('span');
    chip.className = 'puzzle-word-btn';
    chip.style.cursor = 'pointer';
    chip.textContent = word;
    chip.title = '點擊退回';
    chip.onclick = () => {
      sfx.click();
      puzzleCurrentWords.splice(idx, 1);
      // 放回下方 pool
      const poolBox = document.getElementById('puzzlePool');
      const btn = document.createElement('button');
      btn.className = 'puzzle-word-btn';
      btn.textContent = word;
      btn.onclick = () => {
        sfx.click();
        puzzleCurrentWords.push(word);
        btn.remove();
        updatePuzzleTarget();
      };
      poolBox.appendChild(btn);
      updatePuzzleTarget();
    };
    targetBox.appendChild(chip);
  });

  // 判斷是否全部放完
  if (puzzleCurrentWords.length === level.target.length) {
    const isCorrect = puzzleCurrentWords.every((w, i) => w === level.target[i]);
    if (isCorrect) {
      sfx.correct();
      launchConfetti(1500);
      sentencesSolved++;
      localStorage.setItem('ps_sentences_solved', sentencesSolved);
      if (sentencesSolved >= 3) unlockBadge('sentence_builder');

      const fullSentence = level.target.join(' ').replace(' .', '.').replace(' ?', '?');
      speech.speak(fullSentence);

      setTimeout(() => {
        currentPuzzleIdx++;
        if (currentPuzzleIdx < PUZZLE_LEVELS.length) {
          renderPuzzle();
        } else {
          showGameResult('拼圖大師完成挑戰！', 100, '恭喜你成功組裝所有句子！語感棒極了！', 3);
        }
      }, 1200);
    } else {
      sfx.wrong();
      showToast('順序好像有點怪怪的，點擊單字可以退回重新排列哦！');
    }
  }
}

document.getElementById('btnResetPuzzle')?.addEventListener('click', () => {
  sfx.click();
  renderPuzzle();
});

// ==========================================
// 遊戲四：期末大考驗 (Grand Quiz)
// ==========================================
function startGrandQuiz() {
  grandQuizIdx = 0;
  grandHearts = 3;
  grandScore = 0;
  renderGrandQuiz();
}

function renderGrandQuiz() {
  const heartsEl = document.getElementById('grandHearts');
  heartsEl.innerHTML = '❤️'.repeat(grandHearts) + '🖤'.repeat(3 - grandHearts);

  if (grandHearts <= 0) {
    showGameResult('愛心用光囉！', grandScore, '沒關係！回去觀念實驗室複習一下，一定能全對！', 1);
    return;
  }
  if (grandQuizIdx >= GRAND_QUIZ.length) {
    if (grandScore >= 80) unlockBadge('grand_champion');
    showGameResult('期末魔法大考驗通過！', grandScore, '獲得現在簡單式榮譽結業證書！🎓', grandScore >= 90 ? 3 : 2);
    return;
  }

  const q = GRAND_QUIZ[grandQuizIdx];
  document.getElementById('grandQuizProgress').textContent = `第 ${grandQuizIdx + 1} / ${GRAND_QUIZ.length} 題`;
  document.getElementById('grandQText').textContent = q.q;
  document.getElementById('grandQZh').textContent = `提示：${q.zh}`;

  const list = document.getElementById('grandOptionsList');
  list.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.innerHTML = `<span><strong>${['A', 'B', 'C', 'D'][idx]}.</strong> ${opt}</span>`;
    btn.onclick = () => {
      const allBtns = list.querySelectorAll('.quiz-opt-btn');
      allBtns.forEach(b => b.disabled = true);

      if (idx === q.ans) {
        btn.classList.add('correct');
        sfx.correct();
        grandScore += 10;
        showToast('🎯 答對了！加 10 分！');
      } else {
        btn.classList.add('wrong');
        allBtns[q.ans].classList.add('correct');
        sfx.wrong();
        grandHearts--;
        showToast('❌ 答錯囉！扣 1 顆愛心！');
      }

      setTimeout(() => {
        grandQuizIdx++;
        renderGrandQuiz();
      }, 1400);
    };
    list.appendChild(btn);
  });
}

// ==========================================
// 12. 秘笈與列印學習單
// ==========================================
function initCheatsheet() {
  // 一鍵列印
  document.getElementById('btnPrintWorksheet')?.addEventListener('click', () => {
    window.print();
  });

  // 解答顯示切換
  document.getElementById('btnToggleAnswers')?.addEventListener('click', () => {
    const answers = document.querySelectorAll('.worksheet-ans');
    const isShowing = answers[0]?.classList.contains('show');
    answers.forEach(a => {
      a.classList.toggle('show', !isShowing);
    });
    document.getElementById('btnToggleAnswers').textContent = isShowing ? '👁️ 顯示參考解答' : '🙈 隱藏參考解答';
  });
}
