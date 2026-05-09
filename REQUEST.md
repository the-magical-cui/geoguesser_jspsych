# GeoGuesser Metacognition Experiment — Claude Code Request

## 第一步：建立專案文件

請在專案根目錄建立以下三個文件：

### CLAUDE.md
記錄本專案的開發規則與架構決策，格式如下：

```
# CLAUDE.md — 專案規則

## 技術棧
- 框架：jsPsych 7.x（CDN 載入）
- 部署：Pavlovia（純 HTML/JS 專案）
- 資料儲存：Pavlovia 內建 result data（CSV 格式）

## 專案架構
（開始開發後補充）

## 開發規則
- 所有實驗邏輯集中在 experiment.js
- 刺激素材放在 stimuli/ 資料夾
- 台詞資料放在 data/ 資料夾
- 禁止使用需要 npm build 的框架（Pavlovia 要求純靜態檔案）
- 所有亂數化邏輯需在 experiment.js 最上方集中管理
- 每次重大修改後更新 LOG.md
```

### LOG.md
記錄專案重大變更，格式嚴格遵守如下：

```
# LOG.md — 專案變更記錄

[HH:MM] 建立專案結構，新增 index.html / experiment.js / CLAUDE.md / LOG.md / README.md
```

之後每次變更都在此追加一行，格式：
`[HH:MM] 新增 ooo 檔案 / 修正 ooo 的 ooo 問題 / 調整 ooo 邏輯`

### README.md
說明本地測試方法與 Pavlovia 上線流程，格式如下：

```
# GeoGuesser Metacognition Experiment

## 本地測試
1. 在專案根目錄啟動靜態伺服器：
   python3 -m http.server 8000
   （或使用 VS Code Live Server）
2. 開啟瀏覽器前往 http://localhost:8000
3. 開啟瀏覽器開發者工具 Console 檢查錯誤

## 資料格式確認
本地測試結束後，資料會在 Console 中印出 JSON，
確認欄位齊全後再上傳 Pavlovia。

## Pavlovia 上線步驟
1. 將整個專案資料夾推送至 Pavlovia GitLab
2. 在 Pavlovia Dashboard 將實驗狀態設為 Running
3. 設定 Prolific 或直接分享實驗連結給受試者
4. 實驗結束後至 Dashboard > Data 下載 CSV

## 注意事項
- stimuli/ 資料夾需包含所有 .jpg 圖片才能正常執行
- data/ 資料夾需包含 trials.csv 和 scripts.csv
```

---

## 專案背景

這是一個心理學實驗，研究受試者與不同風格的機器人互動後的態度變化。
實驗任務為 GeoGuesser 變體：受試者看照片猜拍攝地點，猜完後機器人給出評論，受試者可以再猜一次。

---

## 技術規格

### 框架與部署
- **框架**：jsPsych 7.x，透過 CDN 載入，不使用 npm
- **部署目標**：Pavlovia（純靜態 HTML/JS 專案）
- **資料儲存**：jsPsych 的 `jsPsych.data.get()` 搭配 `@jspsych/plugin-pavlovia`

### 專案資料夾結構

```
project-root/
├── index.html
├── experiment.js
├── CLAUDE.md
├── LOG.md
├── README.md
├── stimuli/          # 所有刺激圖片（.jpg）
└── data/
    ├── trials.csv    # 圖片與選項資料
    └── scripts.csv   # 機器人台詞資料
```

---

## 資料檔案格式

### data/trials.csv
欄位：`trialIndex, stimFile, opt1, opt2, opt3, opt4, corrAns, group`

- `stimFile`：圖片檔名（不含副檔名），圖片位於 `stimuli/<stimFile>.jpg`
- `group`：A 或 B，每位受試者從 A 組抽 30 張、B 組抽 30 張
- `opt1~opt4`：選擇題選項（中文國家名）
- `corrAns`：正確答案

### data/scripts.csv
欄位：`trialIndex, stimFile, 版本, 層級一, 層級二, 層級三, 層級四`

- `版本`：「答對」或「答錯」— **本實驗只使用「答對」版本**
- `層級一`：無後設認知（最簡短）
- `層級二`：低後設認知
- `層級三`：中後設認知
- `層級四`：高後設認知（最長，含自我反思）
- 每個層級的文字為一整段，需自動按句號切分為 4-5 句逐句輸出
- 切分規則：以句號（。）為分隔點，以語意不斷裂為優先，若切出超過 5 句則合併最後幾句

---

## 實驗設計

### 受試者條件分配（Latin Square）

- 4 種機器人頭像（avatar_1.jpg ~ avatar_4.jpg）
- 4 種語氣層級（層級一 ~ 層級四）
- 每位受試者看到 4 隻機器人，每隻機器人被指定唯一一種語氣層級（一對一不重複）
- 4! = 24 種配對組合，以 Latin Square 循環分配
- 條件在實驗開始時於 `experiment.js` 內部隨機指定（`Math.floor(Math.random() * 4)`），不需要從 URL 參數傳入。

條件分配邏輯（標準 4×4 Latin Square，確保每種語氣在每個機器人位置各出現一次）：

```javascript
// 4 種 Latin Square 排列（循環位移）
const LATIN_SQUARE = [
  [0, 1, 2, 3],  // 條件0: 機器人0=層級一, 機器人1=層級二, 機器人2=層級三, 機器人3=層級四
  [1, 2, 3, 0],  // 條件1: 機器人0=層級二, 機器人1=層級三, 機器人2=層級四, 機器人3=層級一
  [2, 3, 0, 1],  // 條件2: 機器人0=層級三, 機器人1=層級四, 機器人2=層級一, 機器人3=層級二
  [3, 0, 1, 2],  // 條件3: 機器人0=層級四, 機器人1=層級一, 機器人2=層級二, 機器人3=層級三
];
// LATIN_SQUARE[conditionIndex] = [robot0的語氣, robot1的語氣, robot2的語氣, robot3的語氣]
// 語氣 0=層級一, 1=層級二, 2=層級三, 3=層級四
// 最少 4 位受試者（每個條件各 1 人）即可確保所有配對都發生過
```

### 圖片分組與分配

1. 從 trials.csv 中分別取得 A 組和 B 組圖片
2. 各自 shuffle 後取前 30 張，合併為 60 張
3. 將 60 張隨機分成 4 組，每組 15 張，分別分配給 4 隻機器人
4. 4 隻機器人的出場順序隨機

### 機器人區塊結構（共 4 個區塊，每區塊 15 輪）

每個區塊開始前有兩頁過場：

```
[休息頁] 每個區塊之間的休息（第一個區塊前也出現）
  - 說明目前進度：「第 N / 4 段」
  - 文字：「休息一下，準備好後請按「下一頁」繼續」
  - 一個「下一頁」按鈕

[機器人介紹頁] 緊接在休息頁之後
  - 說明文字：「接下來您將與以下機器人進行對話」
  - 機器人頭像置中顯示（大圖，約 200px）
  - 「開始」按鈕（不顯示機器人名稱）
```

### 進度條（每一輪所有頁面底部皆顯示）

每一輪的 5 個頁面底部固定顯示進度資訊：

```
第 N 輪　Y / 15
[=========>        ]
```

- 文字：「第 N 段　Y / 15」，N = 目前第幾個機器人區塊（1-4），Y = 目前區塊的輪次（1-15）
- 下方搭配視覺進度條，寬度依 Y/15 填滿
- 固定在頁面底部，不隨內容捲動
- 量表頁面不顯示進度條



```
[頁面 1] 看圖 + 第一次猜測
  - 顯示刺激圖片（置中，最大高度 55vh）
  - 提示文字：「請猜測您認為這張照片最可能拍攝的地點」
  - 下方 4 個選項按鈕（2×2 排列）
  - 受試者點選後進入頁面 2

[頁面 2] 第一次猜測信心評估
  - 顯示同一張圖片（較小，最大高度 35vh）
  - 文字：「您剛才選擇的答案是 {答案}，請問您對此選項的信心如何？」
  - 說明：（1 分 = 非常沒信心；5 分 = 非常有信心）
  - 數字按鈕 1-2-3-4-5 橫排
  - 點選後進入頁面 3

[頁面 3] 機器人聊天室
  - 左側：機器人頭像（圓形，直徑 64px）+ 機器人名稱（小字）
  - 聊天泡泡逐句輸出，規則如下：
    - 每句話以淡入方式出現（opacity 0 → 1，transition 0.3s）
    - 每句停留時間：2500ms ± 500ms（每句獨立隨機，uniform distribution）
    - 下一句出現前，先顯示「...」打字動畫（三個點依序亮起循環）
    - 受試者沒有輸入框，純粹觀看
    - 所有句子輸出完畢、最後一句停留結束後，「...」消失，出現「繼續」按鈕
  - 聊天泡泡樣式：靠左、背景 #f0f0f0、圓角 12px、padding 12px 16px

[頁面 4] 第二次猜測
  - 顯示同一張圖片（置中，最大高度 40vh）
  - 提示文字：「您上次選擇的是 {第一次答案}，機器人認為這裡是 {機器人答案}，請再次猜測您認為這張照片最可能拍攝的地點」
  - 下方同樣 4 個選項按鈕（2×2 排列）
  - 點選後進入頁面 5

[頁面 5] 第二次猜測信心評估
  - 顯示同一張圖片（較小，最大高度 35vh）
  - 文字：「您剛才選擇的答案是 {答案}，請問您對此選項的信心如何？」
  - 說明：（1 分 = 非常沒信心；5 分 = 非常有信心）
  - 數字按鈕 1-2-3-4-5 橫排
  - 點選後進入下一輪

[15 輪結束後] 態度量表（Godspeed + 信任度）
  - 提示文字：「以下請根據您和這位機器人互動的整體印象來回答」
  - 機器人頭像 + 名稱顯示在頁面上方
  - Godspeed 量表：10 題語意差異量表（5 點），一頁顯示
    擬人化程度（5題）：
      虛假的 1-2-3-4-5 自然的
      似機械的 1-2-3-4-5 似人類的
      無意識的 1-2-3-4-5 有意識的
      人工的 1-2-3-4-5 逼真的
      動作僵硬 1-2-3-4-5 動作流暢
    好感度（5題）：
      不喜歡 1-2-3-4-5 喜歡
      不友好的 1-2-3-4-5 友好的
      不親切的 1-2-3-4-5 親切的
      不愉快的 1-2-3-4-5 愉快的
      惡劣的 1-2-3-4-5 良好的
  - 信任程度：「整體而言，請問您有多相信本輪機器人所提供的答案？」
    非常不相信 1-2-3-4-5 非常相信
  - 所有題目必填，填完後送出進入下一個區塊的休息頁
```

---

## 資料記錄格式

每一輪結束後記錄以下欄位（透過 jsPsych data）：

```javascript
{
  data_type: "trial",           // 固定值，用於分析時篩選
  participant_id: String,       // Pavlovia 自動生成或 URL 參數
  robot_index: Number,          // 0-3，第幾隻機器人（依出場順序）
  robot_avatar: String,         // "avatar_1" ~ "avatar_4"
  robot_style: Number,          // 0-3，語氣層級（0=層級一）
  trial_number: Number,         // 1-15，在該機器人下的第幾輪
  global_trial_number: Number,  // 1-60，全實驗第幾輪
  stim_file: String,            // 圖片檔名
  correct_answer: String,       // 正確答案
  guess_1: String,              // 第一次猜測
  guess_1_correct: Boolean,     // 第一次是否答對
  guess_1_confidence: Number,   // 第一次猜測信心（1-5）
  guess_2: String,              // 第二次猜測
  guess_2_correct: Boolean,     // 第二次是否答對
  guess_2_confidence: Number,   // 第二次猜測信心（1-5）
  guess_1_rt: Number,           // 第一次反應時間（ms）
  guess_2_rt: Number,           // 第二次反應時間（ms）
}
```

量表資料（每隻機器人結束後記錄）：

```javascript
{
  data_type: "scale",           // 固定值，用於分析時篩選
  participant_id: String,
  robot_avatar: String,
  robot_style: Number,
  godspeed_1 ~ godspeed_10: Number,   // 1-5
  trust: Number,                       // 1-5
}
```

---

## UI 設計要求

- 整體背景白色，字體使用系統預設 sans-serif
- 聊天室介面：
  - 聊天泡泡靠左，背景色 #f0f0f0，圓角 12px，padding 12px 16px
  - 機器人頭像在泡泡左上方
  - 每句話淡入（opacity 0 → 1，transition 0.4s）
  - 句子之間間隔 1.5 秒
  - 「繼續」按鈕在所有句子輸出完畢後才出現
- 圖片頁面：
  - 圖片置中，最大寬度 100%，最大高度 60vh，保持比例
  - 選項按鈕 2×2 排列，寬度一致，hover 時有背景色變化
- 量表頁面：
  - 語意差異量表：左側形容詞 - 數字選項（1-5）- 右側形容詞，三欄對齊
  - 所有題目一頁顯示，捲動頁面
  - 送出前檢查所有題目必填

---

## Pavlovia 整合

```html
<!-- 在 index.html 的 <head> 中載入 -->
<script src="https://unpkg.com/jspsych@7.3.4/jspsych.js"></script>
<script src="https://unpkg.com/@jspsych/plugin-html-button-response@1.1.3/index.js"></script>
<script src="https://unpkg.com/@jspsych/plugin-html-keyboard-response@1.1.3/index.js"></script>
<script src="https://unpkg.com/@jspsych/plugin-survey-likert@1.1.3/index.js"></script>
<script src="https://unpkg.com/@jspsych/plugin-pavlovia@1.0.4/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/jspsych@7.3.4/css/jspsych.css">
```

Pavlovia plugin 的初始化：

```javascript
// 在 timeline 最開頭加入
const pavlovia_init = {
  type: jsPsychPavlovia,
  command: "init",
};

// 在 timeline 最結尾加入
const pavlovia_finish = {
  type: jsPsychPavlovia,
  command: "finish",
};
```

---

## 開發優先順序

請依照以下順序開發，每個階段完成後在 LOG.md 記錄：

1. **建立專案骨架**：index.html、experiment.js 空架構、CLAUDE.md、LOG.md、README.md
2. **CSV 載入與資料處理**：讀取 trials.csv 和 scripts.csv，實作分組邏輯與 Latin Square 分配
3. **基本 Trial 流程**：圖片呈現 + 第一次猜測（先用 html-button-response）
4. **聊天室介面**：逐句輸出、泡泡樣式、淡入動畫（用 html-keyboard-response + 自訂 HTML）
5. **第二次猜測**：複用第一次的邏輯
6. **量表頁面**：Godspeed + 信任度
7. **資料記錄**：確認所有欄位正確寫入
8. **Pavlovia 整合**：加入 pavlovia plugin，測試上傳
9. **完整流程測試**：跑完整一輪（4 隻機器人 × 15 張），確認資料格式

---

## 注意事項

- **不要使用 `alert()`**，所有提示訊息用 jsPsych 的 trial 處理
- **台詞切分**要在資料預處理階段完成，不要在顯示時才切
- **所有亂數種子**不需固定（每次執行都應該是真正隨機）
- **本地測試**時若無 Pavlovia 連線，pavlovia plugin 會報錯，請在 experiment.js 加入偵測邏輯，本地時跳過 pavlovia init/finish，改為在 console 印出最終資料
- **圖片載入**：不需要預載所有圖片，jsPsych 預設會在 trial 開始前載入當前 trial 所需圖片
- **機器人名稱**：可以先用「機器人 A / B / C / D」，之後再換成正式名稱
