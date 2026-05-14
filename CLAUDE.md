# CLAUDE.md — 專案規則

## 技術棧
- 框架：jsPsych 7.x（本地載入，放在 jspsych/ 資料夾）
- 部署：Pavlovia（純 HTML/JS 靜態專案，禁止 npm build）
- 資料儲存：Pavlovia 內建 result data（CSV 格式）

## 專案架構
- `index.html` — 載入 jspsych/、全域 CSS、執行 experiment.js
- `experiment.js` — 所有實驗邏輯（條件分配、CSV 處理、試驗流程、資料記錄）
- `data/trials.csv` — 圖片與選項資料（由 trials.xlsx 匯出）
- `data/scripts.csv` — 機器人台詞資料（由 GeoGuessr_ME_Results_2026-05-12.xlsx 匯出）
- `scale/mai翻譯.xlsx` — MAI 量表翻譯版（52 題，第一欄題目、第二欄向度）
- `final_stimfile/` — 所有刺激圖片（.jpg）與機器人頭像（avatar_1~4.jpg）
- `jspsych/` — jsPsych 本地檔案（jspsych.js、plugin-*.js、jspsych.css）
- `jspsych/plugin-pavlovia.js` — Pavlovia 外掛 stub（本地測試時自動略過）

## CSV 欄位規格
- `trials.csv`：trialIndex, stimFile, opt1, opt2, opt3, opt4, corrAns, group
- `scripts.csv`：stimFile, 正確答案, 層級一, 層級二, 層級三, 層級四
  - 76 列，每張刺激圖一列，無版本分欄
  - 泡泡以換行符（\n）分隔（CSV 引號欄位內含換行）

## 開發規則
- 所有實驗邏輯集中在 experiment.js，index.html 只放 CSS 與載入
- 刺激素材放在 final_stimfile/ 資料夾；台詞資料放在 data/
- 刺激圖片路徑：`final_stimfile/<stimFile>.jpg`
- 機器人頭像路徑：`final_stimfile/avatar_<1-4>.jpg`
- 所有亂數化邏輯在 experiment.js 最上方集中管理
- CSV 解析使用字元逐一解析（RFC-4180），支援引號欄位內含換行
- 台詞以 splitToBubbles() 按 \n 切分，每行為一個聊天泡泡

## 條件分配
- 4 種 Latin Square（LATIN_SQUARE[conditionIndex]），程式啟動時隨機選擇
- Avatar 出場順序另外獨立 shuffle
- 每位受試者看到 4 隻機器人，每隻指定唯一語氣層級（0=層級一…3=層級四）

## 實驗流程
1. 同意書（勾選同意才可繼續）
2. 個人資料（姓名選填、性別/年齡必填）
3. 第二部分說明 → 練習（猜測+信心）→ 機器人說明 → 練習（聊天室+二次猜測+信心）
4. 正式說明 → 4 輪 × 15 題（每題 5 頁）→ 每輪結束後 Godspeed+信任量表
5. MAI 量表（52 題）
6. 結束頁（顯示 participantId 與時數證明表單連結）

## LOG.md 寫入規則
- 格式：`[YYYY-MM-DD] TAG: 說明`
- TAG 使用英文全大寫，例：INIT / UI / DATA / SCRIPTS / PARSER / INTRO / SCALE / DEBRIEF
- 重大修改（新增功能、結構變動、CSV 欄位變更）才需記錄；小型 bug fix 可略
- 每個 TAG 下可用縮排 `  -` 列出細節
- 禁止使用模糊標籤（「後續」、「其他」等）或只寫時間不寫日期
