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
const AVATAR_DIR  = 'stimulus'; // level1.png … level4.png

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

// Full RFC-4180 CSV parser — handles quoted fields with embedded newlines.
function parseCSV(text) {
  // Normalise BOM and line endings
  const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Character-by-character tokeniser
  const records = [];
  let fields = [], cur = '', inQ = false, i = 0;

  while (i < src.length) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i += 2; }   // escaped quote
        else { inQ = false; i++; }                         // closing quote
      } else { cur += ch; i++; }
    } else {
      if (ch === '"') { inQ = true; i++; }
      else if (ch === ',') { fields.push(cur); cur = ''; i++; }
      else if (ch === '\n') {
        fields.push(cur); cur = '';
        if (fields.some(f => f.trim() !== '')) records.push(fields);
        fields = []; i++;
      } else { cur += ch; i++; }
    }
  }
  // flush last field / record
  fields.push(cur);
  if (fields.some(f => f.trim() !== '')) records.push(fields);

  if (records.length === 0) return [];
  const headers = records[0].map(h => h.trim());
  return records.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] !== undefined ? vals[idx].trim() : ''; });
    return obj;
  });
}

// Split script text into chat bubbles on newlines.
// Each non-empty line becomes one bubble.
function splitToBubbles(text) {
  if (!text || !text.trim()) return ['（無內容）'];
  const bubbles = text.split('\n').map(s => s.trim()).filter(s => s !== '');
  return bubbles.length > 0 ? bubbles : [text.trim()];
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
  const pct = Math.round((trialNum / 10) * 100);
  return `
    <div class="progress-wrap">
      <div class="progress-label">第 ${blockNum} 段&emsp;${trialNum} / 10</div>
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

function buildIntroTimeline(jsPsych, practiceInfo, scriptsLookup) {
  const tl = [];
  const practiceStimSrc  = `${STIMULI_DIR}/${practiceInfo.stimFile}.jpg`;
  const practiceChoices  = [practiceInfo.opt1, practiceInfo.opt2, practiceInfo.opt3, practiceInfo.opt4];
  const practiceSentences = (scriptsLookup[practiceInfo.stimFile] &&
    scriptsLookup[practiceInfo.stimFile]['層級一']) || ['（練習用台詞）'];
  const practiceRobot = { avatarFile: 'level1', name: '練習機器人', toneName: '層級一', toneLevel: 0, slot: -1 };
  const ps = { guess1: null, guess2: null }; // practice state

  const INSTR_STYLE = 'max-width:680px;margin:0 auto;padding:30px 20px;line-height:1.9;font-size:15px;';

  // ── Page 1: 歡迎 / 同意書 ────────────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="${INSTR_STYLE}">
        <h2 style="margin-bottom:24px;">歡迎參加本實驗！</h2>
        <p>本實驗旨在了解對地景的判斷，及與機器人共同完成作業的決策歷程。本實驗包含三個部分：<br>
        （一）個人資料填答<br>
        （二）猜測地景拍攝地點的主要實驗<br>
        （三）後測問卷</p>
        <p style="color:#c0392b;">注意，本實驗無回上一頁選項，在實驗各階段，皆請務必確認答案再進入下一頁。</p>
        <p>以上資訊若有問題請來信聯絡實驗聯絡人，若確認了解並同意以上資訊，請勾選同意，並按確認鍵開始填答基本資料。</p>
        <label style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;font-size:15px;cursor:pointer;">
          <input type="checkbox" id="consent-check" style="width:20px;height:20px;cursor:pointer;">
          我同意參與本實驗
        </label>
      </div>`,
    choices: ['確認，開始填答基本資料'],
    data: { data_type: 'consent' },
    on_load() {
      const btn = document.querySelector('.jspsych-btn');
      if (btn) btn.disabled = true;
      document.getElementById('consent-check').addEventListener('change', function () {
        if (btn) btn.disabled = !this.checked;
      });
    },
    on_finish(data) { data.consented = true; },
  });

  // ── Page 2: 個人資料 ─────────────────────────────────────
  const demoCaptured = {};
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="${INSTR_STYLE}">
        <h3 style="font-weight:bold;margin-bottom:24px;">第一部分：個人資料</h3>
        <div style="display:flex;align-items:center;gap:14px;margin:14px 0;">
          <label style="min-width:140px;font-size:15px;"><strong>您的姓名（選填）：</strong></label>
          <input type="text" id="demo-name" placeholder="請輸入"
            style="width:260px;padding:6px 10px;font-size:15px;border:0;border-bottom:1px solid #999;outline:none;background:transparent;">
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin:14px 0;">
          <label style="min-width:140px;font-size:15px;"><strong>性別（必填）：</strong></label>
          <div style="display:flex;gap:20px;">
            <label style="cursor:pointer;white-space:nowrap;"><input type="radio" name="demo-gender" value="生理女"> 生理女</label>
            <label style="cursor:pointer;white-space:nowrap;"><input type="radio" name="demo-gender" value="生理男"> 生理男</label>
            <label style="cursor:pointer;white-space:nowrap;"><input type="radio" name="demo-gender" value="不願透露"> 不願透露</label>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin:14px 0;">
          <label style="min-width:140px;font-size:15px;"><strong>年齡（必填）：</strong></label>
          <input type="number" id="demo-age" min="1" max="120" step="1" placeholder="請輸入"
            style="width:100px;padding:6px 10px;font-size:15px;border:0;border-bottom:1px solid #999;outline:none;background:transparent;">
          <span id="age-error" style="color:#c0392b;font-size:13px;margin-left:8px;display:none;">請輸入正整數</span>
        </div>
      </div>`,
    choices: ['確認'],
    data: { data_type: 'demographics' },
    on_load() {
      const btn = document.querySelector('.jspsych-btn');
      if (btn) btn.disabled = true;
      function checkFilled() {
        const gender = document.querySelector('input[name="demo-gender"]:checked');
        const raw = document.getElementById('demo-age').value;
        const parsed = Number(raw);
        const ageOk = raw !== '' && Number.isInteger(parsed) && parsed >= 1;
        return gender && ageOk;
      }
      document.querySelectorAll('input[name="demo-gender"]').forEach(r => {
        r.addEventListener('change', () => {
          demoCaptured.gender = r.value;
          if (btn) btn.disabled = !checkFilled();
        });
      });
      document.getElementById('demo-age').addEventListener('input', function () {
        const raw = this.value;
        const parsed = Number(raw);
        const isValid = raw !== '' && Number.isInteger(parsed) && parsed >= 1;
        const errEl = document.getElementById('age-error');
        if (errEl) errEl.style.display = (raw !== '' && !isValid) ? '' : 'none';
        demoCaptured.age = isValid ? parsed : null;
        if (btn) btn.disabled = !checkFilled();
      });
      document.getElementById('demo-name').addEventListener('input', function () {
        demoCaptured.name = this.value;
      });
    },
    on_finish(data) {
      data.demo_name   = demoCaptured.name   || '';
      data.demo_gender = demoCaptured.gender || '';
      data.demo_age    = demoCaptured.age    || null;
    },
  });

  // ── Page 3: 第二部分說明 ──────────────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="${INSTR_STYLE}">
        <h3 style="font-weight:bold;margin-bottom:16px;">第二部分：正式實驗</h3>
        <p>在本部分的實驗中，您需要觀看一些地景照片，並從四個選項中選擇您認為正確的拍攝地點，之後選擇您對該猜測的信心程度，確定您的選擇後，請按確認進入下一頁。</p>
        <p>了解以上資訊後，請按確認鍵開始練習以上部分的實驗。</p>
      </div>`,
    choices: ['確認，開始練習'],
    data: { data_type: 'instruction' },
  });

  // ── Practice page 1: 第一次猜測 ───────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="text-align:center;padding-bottom:60px;">
        <img src="${practiceStimSrc}" class="stim-trial" alt="練習圖片">
        <p style="margin-top:14px;">請猜測您認為這張照片最可能拍攝的地點</p>
      </div>`,
    choices: practiceChoices,
    css_classes: ['trial-guess'],
    data: { data_type: 'practice' },
    on_finish(data) { ps.guess1 = practiceChoices[data.response]; },
  });

  // ── Practice page 2: 信心評估 1 ───────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${practiceStimSrc}" class="stim-trial" alt="練習圖片">
          <p style="margin-top:14px;">您剛才選擇的答案是 <strong>${ps.guess1}</strong>，請問您對此選項的信心如何？</p>
          <p style="color:#888;font-size:13px;">（1 分 = 非常沒信心；5 分 = 非常有信心）</p>
        </div>`;
    },
    choices: ['1', '2', '3', '4', '5'],
    css_classes: ['trial-confidence'],
    data: { data_type: 'practice' },
  });

  // ── Page 6: 機器人說明（部分紅字）────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="${INSTR_STYLE}">
        <p>每一題在您完成如先前頁面的選擇後，會展示一段機器人關於本題的作答想法。</p>
        <p style="color:#c0392b;">注意：本機器人訓練時模擬人類回應行為，因此答案未必完全正確，請務必仔細評估內容及答案之後再決定是否採用機器人答案。</p>
        <p>在觀看完機器人的作答想法後，會請您再次猜測本題答案，並評估您對答案的信心程度。</p>
        <p>了解以上資訊後，請按確認鍵開始練習以上部分的實驗。</p>
      </div>`,
    choices: ['確認，繼續練習'],
    data: { data_type: 'instruction' },
  });

  // ── Practice page 3: 機器人聊天室 ─────────────────────────
  tl.push(buildChatroomPage(jsPsych, practiceRobot, practiceStimSrc, practiceSentences, ''));

  // ── Practice page 4: 第二次猜測 ───────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${practiceStimSrc}" class="stim-trial" alt="練習圖片">
          <p style="margin-top:14px;">
            您上次選擇的是 <strong>${ps.guess1}</strong>，
            機器人認為這裡是 <strong>${practiceInfo.corrAns}</strong>，<br>
            請再次猜測您認為這張照片最可能拍攝的地點
          </p>
        </div>`;
    },
    choices: practiceChoices,
    css_classes: ['trial-guess2'],
    data: { data_type: 'practice' },
    on_finish(data) { ps.guess2 = practiceChoices[data.response]; },
  });

  // ── Practice page 5: 信心評估 2 ───────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus() {
      return `
        <div style="text-align:center;padding-bottom:60px;">
          <img src="${practiceStimSrc}" class="stim-trial" alt="練習圖片">
          <p style="margin-top:14px;">您剛才選擇的答案是 <strong>${ps.guess2}</strong>，請問您對此選項的信心如何？</p>
          <p style="color:#888;font-size:13px;">（1 分 = 非常沒信心；5 分 = 非常有信心）</p>
        </div>`;
    },
    choices: ['1', '2', '3', '4', '5'],
    css_classes: ['trial-confidence'],
    data: { data_type: 'practice' },
  });

  // ── Page 10: 正式實驗說明 ─────────────────────────────────
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="${INSTR_STYLE}">
        <p style="color:#c0392b;">本實驗共有四輪，每輪有十五張圖。不同輪次之間，會由不同的機器人提供作答想法。</p>
        <p>每一輪於十五張圖片回答完成後，會請您評估一些關於本輪機器人的看法。</p>
        <p>若以上資訊有問題，可來信詢問實驗者，若無其他疑問，請按確認開始正式實驗。</p>
      </div>`,
    choices: ['確認，開始實驗'],
    data: { data_type: 'instruction' },
  });

  return tl;
}

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
        <img src="${AVATAR_DIR}/${robotConfig.avatarFile}.png"
             class="robot-intro-img" alt="機器人頭像">
        <p style="font-size:14px;color:#888;margin-top:14px;">請等待五秒後，點按下一頁</p>
      </div>`,
    choices: ['開始'],
    data: { data_type: 'robot_intro', robot_avatar: robotConfig.avatarFile },
    on_load() {
      const btn = document.querySelector('.jspsych-btn');
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
            <img src="${AVATAR_DIR}/${robotConfig.avatarFile}.png"
                 style="width:120px;height:120px;object-fit:contain;border-radius:50%;"
                 alt="">
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
    { left: '不喜歡',   right: '喜歡',     name: 'godspeed_5' },
    { left: '不友好的', right: '友好的',   name: 'godspeed_6' },
    { left: '不親切的', right: '親切的',   name: 'godspeed_7' },
    { left: '不愉快的', right: '愉快的',   name: 'godspeed_8' },
    { left: '惡劣的',   right: '良好的',   name: 'godspeed_9' },
  ];
  const ALL_NAMES = [...GODSPEED.map(g => g.name), 'trust'];

  // Capture scale values via closure (DOM cleared before on_finish)
  const captured = {};

  const stimHTML = `
    <div class="scale-wrap">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${AVATAR_DIR}/${robotConfig.avatarFile}.png"
             style="width:80px;height:80px;object-fit:contain;border-radius:50%;"
             alt="">
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
      const submitBtn = document.querySelector('.jspsych-btn');
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

function buildMAIPage(jsPsych, participantId) {
  const MAI_ITEMS = [
    '我會定期問自己是否達到了學習目標。',
    '在回答問題前，我會考慮幾種不同的解決方案。',
    '我會嘗試使用過去曾有效的學習策略。',
    '我在學習時會控制進度，以確保有足夠的時間。',
    '我了解自己在智識上的優勢與弱點。',
    '在開始一項任務之前，我會思考自己真正需要學習什麼。',
    '完成測驗後，我知道自己表現得如何。',
    '在開始任務之前，我會設定具體的目標。',
    '遇到重要資訊時，我會放慢速度仔細閱讀。',
    '我知道什麼樣的資訊是最重要的學習內容。',
    '解題時，我會問自己是否已考慮過所有選項。',
    '我擅長組織資訊。',
    '我會有意識地將注意力集中在重要資訊上。',
    '我使用的每一種策略都有其特定目的。',
    '當我對主題有一定了解時，學習效果最佳。',
    '我知道老師期望我學習什麼。',
    '我擅長記憶資訊。',
    '我會依據不同情境使用不同的學習策略。',
    '完成任務後，我會問自己是否有更簡單的方法。',
    '我能掌控自己的學習成效。',
    '我會定期複習，以幫助自己理解重要的概念關聯。',
    '在開始學習前，我會針對學習材料自我提問。',
    '我會想出幾種解決問題的方法，並選擇最佳方案。',
    '完成學習後，我會總結自己所學的內容。',
    '當我不理解某些內容時，我會向他人尋求幫助。',
    '在需要時，我能夠激勵自己學習。',
    '我清楚自己在學習時使用了哪些策略。',
    '在學習過程中，我會分析所用策略的效用。',
    '我會利用自己的智識優勢來彌補弱點。',
    '我專注於新資訊的意義與重要性。',
    '我會自己創造例子，使資訊更具意義。',
    '我善於評斷自己對某事物的理解程度。',
    '我發現自己會自動使用有效的學習策略。',
    '我發現自己會定期停下來檢查自己的理解情況。',
    '我知道所使用的每種策略在何時最為有效。',
    '完成後，我會問自己目標達成的程度如何。',
    '學習時，我會畫圖或圖表來幫助理解。',
    '解決問題後，我會問自己是否已考慮過所有選項。',
    '我嘗試將新資訊用自己的話表達出來。',
    '當我無法理解時，我會改變策略。',
    '我利用文本的組織結構來幫助學習。',
    '開始任務前，我會仔細閱讀指示。',
    '我會問自己所讀的內容是否與已知知識相關。',
    '當我感到困惑時，我會重新評估自己的假設。',
    '我會合理安排時間，以最佳方式達成目標。',
    '當我對主題感興趣時，我學習效果更好。',
    '我嘗試將學習分解成較小的步驟。',
    '我專注於整體意義，而非細節。',
    '在學習新事物時，我會問自己目前的學習狀況如何。',
    '完成任務後，我會問自己是否已盡可能地充分學習。',
    '遇到不清楚的新資訊時，我會停下來重新閱讀。',
    '當我感到困惑時，我會停下來重新閱讀。',
  ];

  const MAI_LABELS = ['非常不符合', '不符合', '普通', '符合', '非常符合'];
  const COL_W = 74; // px per radio column
  const captured = {};

  const headerHTML = `
    <div style="display:flex;align-items:center;padding:8px 0 6px;border-bottom:2px solid #ccc;
                position:sticky;top:0;background:#fff;z-index:10;">
      <div style="min-width:36px;"></div>
      <div style="flex:1;"></div>
      <div style="display:flex;flex-shrink:0;">
        ${MAI_LABELS.map(lbl =>
          `<div style="width:${COL_W}px;text-align:center;font-size:12px;color:#555;">${lbl}</div>`
        ).join('')}
      </div>
    </div>`;

  const itemsHTML = MAI_ITEMS.map((item, i) => `
    <div style="display:flex;align-items:center;padding:9px 0;
                border-bottom:1px solid #f0f0f0;${i % 2 === 0 ? 'background:#fafafa;' : ''}">
      <div style="min-width:36px;font-size:13px;color:#999;text-align:right;padding-right:8px;">${i + 1}.</div>
      <div style="flex:1;font-size:14px;line-height:1.5;padding-right:12px;">${item}</div>
      <div style="display:flex;flex-shrink:0;">
        ${[1, 2, 3, 4, 5].map(v => `
          <label style="width:${COL_W}px;display:flex;justify-content:center;align-items:center;cursor:pointer;">
            <input type="radio" name="mai_${i}" value="${v}" style="width:17px;height:17px;cursor:pointer;">
          </label>`).join('')}
      </div>
    </div>`).join('');

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="max-width:860px;margin:0 auto;padding:20px 20px 80px;">
        <h3 style="font-weight:bold;margin-bottom:4px;">第三部分：問卷填答</h3>
        <p style="font-size:14px;color:#555;margin-bottom:14px;">
          以下題目包含了一些可能符合或不符合您的敘述，請根據您認為敘述符合您的程度回答問題：
        </p>
        ${headerHTML}
        ${itemsHTML}
        <div id="mai-error" style="color:#c0392b;text-align:center;margin:12px 0 0;display:none;font-size:14px;">
          請回答所有題目後再送出
        </div>
      </div>`,
    choices: ['送出'],
    data: { data_type: 'mai_scale', participant_id: participantId },
    on_load() {
      const btn = document.querySelector('.jspsych-btn');
      if (btn) btn.disabled = true;
      document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
          captured[this.name] = parseInt(this.value);
          const allFilled = MAI_ITEMS.every((_, i) => captured[`mai_${i}`] !== undefined);
          if (btn) btn.disabled = !allFilled;
        });
      });
    },
    on_finish(data) {
      data.data_type      = 'mai_scale';
      data.participant_id = participantId;
      MAI_ITEMS.forEach((_, i) => {
        data[`mai_${i + 1}`] = captured[`mai_${i}`] !== undefined ? captured[`mai_${i}`] : null;
      });
    },
  };
}

// ============================================================
// SECTION 5 — CHAT ANIMATION
// ============================================================

// Scroll the page so that the given element is visible at the bottom.
function scrollToBottom(el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function animateChatSentences(sentences, container, onComplete) {
  const TYPING_MS = 400;       // typing dots duration before each bubble
  const DWELL_MIN = 700;       // ms to wait after bubble appears
  const DWELL_RANGE = 400;     // random extra 0–400 ms  → total 700–1100 ms

  // Reusable typing indicator element
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

  let idx = 0;

  function nextBubble() {
    if (idx >= sentences.length) {
      if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      onComplete();
      return;
    }

    // Show typing indicator
    container.appendChild(typingEl);
    scrollToBottom(typingEl);

    setTimeout(function () {
      if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

      // Show bubble
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = sentences[idx];
      container.appendChild(bubble);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bubble.classList.add('visible');
          scrollToBottom(bubble);
        });
      });
      idx++;

      // Wait dwell, then next bubble
      const dwell = DWELL_MIN + Math.random() * DWELL_RANGE;
      setTimeout(nextBubble, dwell);
    }, TYPING_MS);
  }

  nextBubble();
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

  // ---- Preload avatar images (fire-and-forget, prevents later load lag) ----
  [1, 2, 3, 4].forEach(n => { const img = new Image(); img.src = `${AVATAR_DIR}/level${n}.png`; });

  // ---- Load CSVs ----
  let trialsData, scriptsData;
  try {
    const [trialsText, scriptsText] = await Promise.all([
      loadCSV('data/trials.csv'),
      loadCSV('data/scripts_v2.csv'),
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

  // ---- Build scripts lookup: { stimFile: { toneName: bubbles[] } } ----
  const scriptsLookup = {};
  scriptsData.forEach(row => {
    const key = row['stimFile'];
    if (!key) return;
    scriptsLookup[key] = {};
    TONE_KEYS.forEach(tk => {
      scriptsLookup[key][tk] = splitToBubbles(row[tk]);
    });
  });

  // ---- Pick practice image (fixed, excluded from main pool) ----
  // Use first B-group trial that has scripts; fall back to first B-group trial
  const practiceInfo = trialsData.filter(t => t.group === 'B' && scriptsLookup[t.stimFile])[0]
                    || trialsData.filter(t => t.group === 'B')[0];

  // ---- Assign trials ----
  const groupA = shuffle(trialsData.filter(t => t.group === 'A')).slice(0, 20);
  const groupB = shuffle(trialsData.filter(t => t.group === 'B' && t.stimFile !== practiceInfo.stimFile)).slice(0, 20);
  const all40  = shuffle([...groupA, ...groupB]);

  const trialGroups = [
    all40.slice(0,  10),
    all40.slice(10, 20),
    all40.slice(20, 30),
    all40.slice(30, 40),
  ];

  // ---- Build robot configs ----
  // avatarOrder is shuffled independently from tone level assignment
  const avatarOrder = shuffle([0, 1, 2, 3]);
  const robotConfigs = [0, 1, 2, 3].map(slot => ({
    slot,
    avatarFile:  `level${avatarOrder[slot] + 1}`,
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

  // ---- Intro + practice pages ----
  timeline.push(...buildIntroTimeline(jsPsych, practiceInfo, scriptsLookup));

  let globalTrialNum = 0;

  robotConfigs.forEach((robotConfig, blockIdx) => {
    // Rest page (shown before every block, including block 1)
    timeline.push(buildRestPage(jsPsych, blockIdx + 1));

    // Robot intro page
    timeline.push(buildRobotIntroPage(jsPsych, robotConfig));

    // 10 trials × 5 pages each
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

  // ---- MAI scale (第三部分：問卷填答) ----
  timeline.push(buildMAIPage(jsPsych, participantId));

  if (!local) {
    timeline.push({ type: jsPsychPavlovia, command: 'finish' });
  }

  // ---- Debrief / 結束頁 ----
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="page-wrap" style="max-width:680px;margin:0 auto;padding:40px 20px;line-height:1.9;font-size:15px;text-align:left;">
        <h2 style="text-align:center;margin-bottom:24px;">感謝您完成本研究！</h2>
        <p>您的實驗編號為：</p>
        <p style="font-size:20px;font-weight:bold;text-align:center;letter-spacing:2px;
                  background:#f5f5f5;border-radius:8px;padding:12px 20px;margin:12px 0;">
          ${participantId}
        </p>
        <p>請記下此編號，並將編號填寫於
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSfxpd8Qq0zMBcWx06Zs5Qf2PYDp-VvZYg-h1BkKHBtG0sVIiQ/viewform?usp=header"
             target="_blank" style="color:#2471a3;">時數證明回報表單</a>。
        </p>
        <p style="color:#c0392b;font-size:14px;">
          填答時請務必記下編號，否則將造成無法查證您的作答情形而無法加分，造成不便敬請見諒。<br>
          此編號請勿重複回報或外流給他人，若有兩人以上回報同一編號，因無法確認編號歸屬者，重複使用者皆全部無法獲得加分。
        </p>
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
