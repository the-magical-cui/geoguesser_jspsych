'use strict';

// ============================================================
// SECTION 1 — RANDOMIZATION (all random assignments here)
// ============================================================

const LATIN_SQUARE = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
];

const CONDITION_INDEX = Math.floor(Math.random() * 4);
// TONE_ASSIGNMENT[slotIndex] = toneLevel (0=層級一 … 3=層級四)
const TONE_ASSIGNMENT = LATIN_SQUARE[CONDITION_INDEX];

const TONE_KEYS   = ['層級一', '層級二', '層級三', '層級四'];
const ROBOT_NAMES = ['機器人 A', '機器人 B', '機器人 C', '機器人 D'];
const STIMULI_DIR = 'final_stimfile';

// ============================================================
// SECTION 2 — PURE UTILITIES
// ============================================================

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseCSV(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines  = clean.split('\n');
  const headers = csvSplitLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = csvSplitLine(lines[i]);
    if (vals.every(v => v.trim() === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function csvSplitLine(line) {
  const vals = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      vals.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  vals.push(cur);
  return vals;
}

// Split script text into 4–5 sentences on 。
function splitToSentences(text) {
  if (!text || !text.trim()) return ['（無內容）'];
  const raw = text.split('。').map(s => s.trim()).filter(s => s !== '');
  if (raw.length === 0) return [text.trim()];
  const sents = raw.map((s, i) => (i < raw.length - 1 ? s + '。' : s));
  if (sents.length <= 5) return sents;
  // merge tail into sentence 5
  const result = sents.slice(0, 4);
  result.push(sents.slice(4).join(''));
  return result;
}

function isLocalRun() {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
  );
}

function generateParticipantId() {
  return 'P' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function loadCSV(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`無法載入 ${url}（HTTP ${resp.status}）`);
  return resp.text();
}

// ============================================================
// SECTION 3 — UI HELPERS
// ============================================================

function progressBarHTML(blockNum, trialNum) {
  const pct = Math.round((trialNum / 15) * 100);
  return `
    <div class="progress-wrap">
      <div class="progress-label">第 ${blockNum} 段&emsp;${trialNum} / 15</div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function makeScaleRowHTML(leftLabel, rightLabel, name) {
  const radios = [1, 2, 3, 4, 5].map(v => `
    <label>
      <input type="radio" name="${name}" value="${v}">
      <span>${v}</span>
    </label>`).join('');
  return `
    <div class="scale-row">
      <span class="scale-lbl left">${leftLabel}</span>
      <div class="scale-radios">${radios}</div>
      <span class="scale-lbl right">${rightLabel}</span>
    </div>`;
}

// ============================================================
// SECTION 4 — PAGE BUILDERS
// ============================================================

function buildRestPage(jsPsych, blockNum) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="page-wrap">
        <h2>第 ${blockNum} / 4 段</h2>
        <p style="font-size:18px;color:#555;">休息一下，準備好後請按「下一頁」繼續</p>
      </div>`,
    choices: ['下一頁'],
    data: { data_type: 'rest' },
  };
}

function buildRobotIntroPage(jsPsych, robotConfig) {
  const LOCK_MS = 5000;
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="page-wrap">
        <p style="font-size:18px;">接下來您將與以下機器人進行對話</p>
        <img src="${STIMULI_DIR}/${robotConfig.avatarFile}.jpg"
             class="robot-intro-img" alt="機器人頭像"
             onerror="this.style.background='#ccc'">
      </div>`,
    choices: ['開始'],
    data: { data_type: 'robot_intro', robot_avatar: robotConfig.avatarFile },
    on_load() {
      const btn = document.querySelector('.jspsych-html-button-response-btngroup button');
      if (!btn) return;
      btn.style.display = 'none';
      setTimeout(() => { btn.style.display = ''; }, LOCK_MS);
    },
  };
}

function buildTrialTimeline(
  jsPsych, robotConfig, trialInfo, scriptsLookup,
  blockNum, trialInBlock, globalTrialNum, participantId
) {
  // Accumulated state shared across 5 pages via closure
  const state = {
    guess1: null, guess1Correct: null, guess1Confidence: null, guess1RT: null,
    guess2: null, guess2Correct: null, guess2Confidence: null, guess2RT: null,
  };

  const choices  = [trialInfo.opt1, trialInfo.opt2, trialInfo.opt3, trialInfo.opt4];
  const corrAns  = trialInfo.corrAns;
  const stimFile = trialInfo.stimFile;
  const stimSrc  = `${STIMULI_DIR}/${stimFile}.jpg`;
  const pb       = progressBarHTML(blockNum, trialInBlock);

  // Resolve sentences for this trial (scriptsLookup already stores split arrays)
  const scriptEntry = scriptsLookup[stimFile];
  let sentences = ['機器人暫時沒有評論。'];
  if (scriptEntry && scriptEntry[robotConfig.toneName]) {
    sentences = scriptEntry[robotConfig.toneName];
  }

  // Page 1: image + first guess
  const page1 = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="text-align:center;padding-bottom:60px;">
        <img src="${stimSrc}" class="stim-trial" alt="刺激圖片">
        <p style="margin-top:14px;">請猜測您認為這張照片最可能拍攝的地點</p>
      </div>${pb}`,
    choices: choices,
    css_classes: ['trial-guess'],
    data: { data_type: 'page1' },
    on_finish(data) {
      state.guess1        = choices[data.response];
      state.guess1Correct = (choices[data.response] === corrAns);
      state.guess1RT      = data.rt;
    },
  };

  // Page 2: confidence 1
  const page2 = {
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${stimSrc}" class="stim-trial" alt="刺激圖片">
          <p style="margin-top:14px;">您剛才選擇的答案是 <strong>${state.guess1}</strong>，請問您對此選項的信心如何？</p>
          <p style="color:#888;font-size:13px;">（1 分 = 非常沒信心；5 分 = 非常有信心）</p>
        </div>${pb}`;
    },
    choices: ['1', '2', '3', '4', '5'],
    css_classes: ['trial-confidence'],
    data: { data_type: 'page2' },
    on_finish(data) {
      state.guess1Confidence = data.response + 1; // 0-indexed → 1–5
    },
  };

  // Page 3: chatroom
  const page3 = buildChatroomPage(jsPsych, robotConfig, stimSrc, sentences, pb);

  // Page 4: second guess
  const page4 = {
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${stimSrc}" class="stim-trial" alt="刺激圖片">
          <p style="margin-top:14px;">
            您上次選擇的是 <strong>${state.guess1}</strong>，
            機器人認為這裡是 <strong>${corrAns}</strong>，<br>
            請再次猜測您認為這張照片最可能拍攝的地點
          </p>
        </div>${pb}`;
    },
    choices: choices,
    css_classes: ['trial-guess2'],
    data: { data_type: 'page4' },
    on_finish(data) {
      state.guess2        = choices[data.response];
      state.guess2Correct = (choices[data.response] === corrAns);
      state.guess2RT      = data.rt;
    },
  };

  // Page 5: confidence 2 + record full trial data
  const page5 = {
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${stimSrc}" class="stim-trial" alt="刺激圖片">
          <p style="margin-top:14px;">您剛才選擇的答案是 <strong>${state.guess2}</strong>，請問您對此選項的信心如何？</p>
          <p style="color:#888;font-size:13px;">（1 分 = 非常沒信心；5 分 = 非常有信心）</p>
        </div>${pb}`;
    },
    choices: ['1', '2', '3', '4', '5'],
    css_classes: ['trial-confidence'],
    data: { data_type: 'page5' },
    on_finish(data) {
      state.guess2Confidence = data.response + 1;
      state.guess2RT         = data.rt;

      // Write complete trial record onto this trial's data row
      Object.assign(data, {
        data_type:           'trial',
        participant_id:      participantId,
        robot_index:         robotConfig.slot,
        robot_avatar:        robotConfig.avatarFile,
        robot_style:         robotConfig.toneLevel,
        trial_number:        trialInBlock,
        global_trial_number: globalTrialNum,
        stim_file:           stimFile,
        correct_answer:      corrAns,
        guess_1:             state.guess1,
        guess_1_correct:     state.guess1Correct,
        guess_1_confidence:  state.guess1Confidence,
        guess_2:             state.guess2,
        guess_2_correct:     state.guess2Correct,
        guess_2_confidence:  state.guess2Confidence,
        guess_1_rt:          state.guess1RT,
        guess_2_rt:          state.guess2RT,
      });
    },
  };

  return [page1, page2, page3, page4, page5];
}

function buildChatroomPage(jsPsych, robotConfig, stimSrc, sentences, pb) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="display:flex;height:calc(100vh - 130px);min-height:400px;">

        <!-- ── Left 50 %: stimulus image ── -->
        <div style="flex:0 0 50%;display:flex;align-items:center;justify-content:center;padding:28px 16px 28px 28px;">
          <img src="${stimSrc}"
               style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;"
               alt="刺激圖片">
        </div>

        <!-- ── Right 50 %: top (avatar) + bottom (chat) ── -->
        <div style="flex:1;display:flex;flex-direction:column;padding:16px 28px 16px 16px;min-width:0;">

          <!-- Top 40 %: robot avatar, centred -->
          <div style="flex:0 0 40%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
            <img src="${STIMULI_DIR}/${robotConfig.avatarFile}.jpg"
                 style="width:120px;height:120px;border-radius:50%;object-fit:cover;background:#ddd;box-shadow:0 2px 8px rgba(0,0,0,.12);"
                 onerror="this.style.background='#bbb'" alt="">
            <span style="font-size:14px;color:#555;">${robotConfig.name}</span>
          </div>

          <!-- Bottom 60 %: chat messages -->
          <div style="flex:1;overflow-y:auto;padding-top:6px;">
            <div class="chat-messages" id="chat-msg-area"></div>
          </div>

        </div>
      </div>${pb}`,
    choices: ['繼續'],
    // hide the button until animation completes
    button_html: '<button class="jspsych-btn" id="chat-continue-btn" style="display:none">%choice%</button>',
    data: { data_type: 'page3' },
    on_load() {
      const container = document.getElementById('chat-msg-area');
      if (!container) return;
      animateChatSentences(sentences, container, function () {
        const btn = document.getElementById('chat-continue-btn');
        if (btn) {
          btn.style.display = 'inline-block';
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    },
  };
}

function buildScalePage(jsPsych, robotConfig, participantId) {
  const GODSPEED = [
    { left: '虛假的',   right: '自然的',   name: 'godspeed_1' },
    { left: '似機械的', right: '似人類的', name: 'godspeed_2' },
    { left: '無意識的', right: '有意識的', name: 'godspeed_3' },
    { left: '人工的',   right: '逼真的',   name: 'godspeed_4' },
    { left: '動作僵硬', right: '動作流暢', name: 'godspeed_5' },
    { left: '不喜歡',   right: '喜歡',     name: 'godspeed_6' },
    { left: '不友好的', right: '友好的',   name: 'godspeed_7' },
    { left: '不親切的', right: '親切的',   name: 'godspeed_8' },
    { left: '不愉快的', right: '愉快的',   name: 'godspeed_9' },
    { left: '惡劣的',   right: '良好的',   name: 'godspeed_10' },
  ];
  const ALL_NAMES = [...GODSPEED.map(g => g.name), 'trust'];

  // Capture scale values via closure (DOM cleared before on_finish)
  const captured = {};

  const stimHTML = `
    <div class="scale-wrap">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${STIMULI_DIR}/${robotConfig.avatarFile}.jpg"
             style="width:80px;height:80px;border-radius:50%;object-fit:cover;background:#ddd"
             onerror="this.style.background='#bbb'" alt="">
        <p style="margin-top:10px;font-size:15px;">以下請根據您和這位機器人互動的整體印象來回答</p>
      </div>

      ${GODSPEED.slice(0, 5).map(g => makeScaleRowHTML(g.left, g.right, g.name)).join('')}

      <div style="border-top:1px solid #ddd;margin:14px 0;"></div>

      ${GODSPEED.slice(5).map(g => makeScaleRowHTML(g.left, g.right, g.name)).join('')}

      <div style="border-top:1px solid #ddd;margin:14px 0;"></div>

      <p style="font-size:14px;color:#555;margin:6px 0 10px;">
        整體而言，請問您有多相信本輪機器人所提供的答案？
      </p>
      ${makeScaleRowHTML('非常不相信', '非常相信', 'trust')}

      <div id="scale-error">請回答所有題目後再送出</div>
    </div>`;

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: stimHTML,
    choices: ['送出'],
    data: { data_type: 'scale_page' },
    on_load() {
      const submitBtn = document.querySelector('.jspsych-html-button-response-btngroup button');
      if (submitBtn) submitBtn.disabled = true;

      function allFilled() {
        return ALL_NAMES.every(n => captured[n] !== undefined);
      }

      document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
          captured[this.name] = parseInt(this.value, 10);
          if (submitBtn) submitBtn.disabled = !allFilled();
        });
      });
    },
    on_finish(data) {
      Object.assign(data, {
        data_type:    'scale',
        participant_id: participantId,
        robot_avatar: robotConfig.avatarFile,
        robot_style:  robotConfig.toneLevel,
      });
      ALL_NAMES.forEach(n => { data[n] = captured[n] !== undefined ? captured[n] : null; });
    },
  };
}

// ============================================================
// SECTION 5 — CHAT ANIMATION
// ============================================================

function animateChatSentences(sentences, container, onComplete) {
  const DWELL_MIN   = 2000; // ms
  const DWELL_RANGE = 1000; // ±500 centred on 2500
  const TYPING_MS   = 750;  // how long to show typing dots before each sentence

  // Reusable typing indicator element
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

  let idx = 0;

  function next() {
    if (idx >= sentences.length) {
      if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      onComplete();
      return;
    }

    // Show typing indicator
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;

    setTimeout(function () {
      // Remove typing indicator, show sentence bubble
      if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = sentences[idx];
      container.appendChild(bubble);
      container.scrollTop = container.scrollHeight;

      // Trigger CSS fade-in (needs two rAF frames for transition to fire)
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bubble.classList.add('visible');
        });
      });

      idx++;
      const dwell = DWELL_MIN + Math.random() * DWELL_RANGE;
      setTimeout(next, dwell);
    }, TYPING_MS);
  }

  next();
}

// ============================================================
// SECTION 6 — MAIN
// ============================================================

async function main() {
  // ---- Init jsPsych ----
  const jsPsych = initJsPsych({
    show_progress_bar: false,
    on_finish() {
      if (isLocalRun()) {
        console.log('=== 實驗結束 ===');
        const allData = jsPsych.data.get();
        console.log('[trial rows]',
          allData.filter({ data_type: 'trial' }).values());
        console.log('[scale rows]',
          allData.filter({ data_type: 'scale' }).values());
        console.log('[CSV]\n', allData.csv());
      }
    },
  });

  // Expose for mid-experiment debugging: window._exp.dump() in console
  window._exp = {
    dump() {
      const d = jsPsych.data.get();
      console.log('[trial rows]', d.filter({ data_type: 'trial' }).values());
      console.log('[scale rows]', d.filter({ data_type: 'scale' }).values());
      console.log('[CSV]\n', d.csv());
    },
    csv()  { return jsPsych.data.get().csv(); },
    json() { return jsPsych.data.get().json(); },
  };
  // Ctrl+Shift+D also triggers a dump
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') { window._exp.dump(); }
  });

  const local = isLocalRun();
  const participantId = local
    ? generateParticipantId()
    : (jsPsych.data.getURLVariable('participant') || generateParticipantId());

  jsPsych.data.addProperties({ participant_id: participantId });

  // ---- Load CSVs ----
  let trialsData, scriptsData;
  try {
    const [trialsText, scriptsText] = await Promise.all([
      loadCSV('data/trials.csv'),
      loadCSV('data/scripts.csv'),
    ]);
    trialsData  = parseCSV(trialsText);
    scriptsData = parseCSV(scriptsText);
  } catch (e) {
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;color:#c0392b;">
        <h2>無法載入資料</h2>
        <p>${e.message}</p>
        <p>請確認 data/trials.csv 和 data/scripts.csv 存在，並透過靜態伺服器開啟（不要直接雙擊 index.html）。</p>
      </div>`;
    return;
  }

  // ---- Build scripts lookup: { stimFile: { toneName: sentences[] } } ----
  // Only the "答對" version is used
  const scriptsLookup = {};
  scriptsData.forEach(row => {
    if (row['版本'] !== '答對') return;
    const key = row['stimFile'];
    if (!key) return;
    scriptsLookup[key] = {};
    TONE_KEYS.forEach(tk => {
      scriptsLookup[key][tk] = splitToSentences(row[tk]);
    });
  });

  // ---- Assign trials ----
  const groupA = shuffle(trialsData.filter(t => t.group === 'A')).slice(0, 30);
  const groupB = shuffle(trialsData.filter(t => t.group === 'B')).slice(0, 30);
  const all60  = shuffle([...groupA, ...groupB]);

  const trialGroups = [
    all60.slice(0,  15),
    all60.slice(15, 30),
    all60.slice(30, 45),
    all60.slice(45, 60),
  ];

  // ---- Build robot configs ----
  // avatarOrder[slot] = which avatar (0-3) this slot uses
  const avatarOrder = shuffle([0, 1, 2, 3]);
  const robotConfigs = [0, 1, 2, 3].map(slot => ({
    slot,
    avatarFile:  `avatar_${avatarOrder[slot] + 1}`,
    toneLevel:   TONE_ASSIGNMENT[slot],
    toneName:    TONE_KEYS[TONE_ASSIGNMENT[slot]],
    name:        ROBOT_NAMES[slot],
    trials:      trialGroups[slot],
  }));

  // ---- Build timeline ----
  const timeline = [];

  if (!local) {
    timeline.push({ type: jsPsychPavlovia, command: 'init' });
  }

  let globalTrialNum = 0;

  robotConfigs.forEach((robotConfig, blockIdx) => {
    // Rest page (shown before every block, including block 1)
    timeline.push(buildRestPage(jsPsych, blockIdx + 1));

    // Robot intro page
    timeline.push(buildRobotIntroPage(jsPsych, robotConfig));

    // 15 trials × 5 pages each
    robotConfig.trials.forEach((trialInfo, trialInBlock) => {
      globalTrialNum++;
      const pages = buildTrialTimeline(
        jsPsych, robotConfig, trialInfo, scriptsLookup,
        blockIdx + 1, trialInBlock + 1, globalTrialNum, participantId
      );
      timeline.push(...pages);
    });

    // Attitude scale (Godspeed + trust)
    timeline.push(buildScalePage(jsPsych, robotConfig, participantId));
  });

  if (!local) {
    timeline.push({ type: jsPsychPavlovia, command: 'finish' });
  }

  // Debrief
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="page-wrap">
        <h2>實驗結束</h2>
        <p style="font-size:16px;">感謝您的參與！您的回答已成功記錄。</p>
      </div>`,
    choices: ['結束'],
    data: { data_type: 'debrief' },
  });

  await jsPsych.run(timeline);
}

// ============================================================
// SECTION 7 — ENTRY POINT
// ============================================================

window.addEventListener('DOMContentLoaded', function () {
  main().catch(function (e) {
    console.error('Experiment error:', e);
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;color:#c0392b;">
        <h2>實驗載入失敗</h2><p>${e.message}</p>
      </div>`;
  });
});
