# LOG.md — 專案變更記錄

[00:11] 建立專案結構，新增 index.html / experiment.js / CLAUDE.md / LOG.md / README.md；匯出 data/trials.csv、data/scripts.csv（來源：trials.xlsx、scripts.xlsx）

[後續] 實作核心實驗邏輯：Latin Square 條件分配、CSV 載入、5 頁試驗流程、聊天室動畫泡泡、Godspeed+信任量表、進度條、Pavlovia 部署支援（plugin-pavlovia.js stub）

[UI] 統一圖片大小（stim-trial 42vh）；聊天室改為左圖右訊息兩欄版面，機器人頭像放大置中；量表頁移除所有粗黑體標題；機器人介紹頁按鈕鎖定 5 秒後才顯示

[DATA] 新增 window._exp.dump() 支援，可在 console 隨時匯出已蒐集資料

[SCRIPTS] 重新匯出 data/scripts.csv（來源：GeoGuessr_ME_Results_2026-05-12.xlsx）：
  - 76 列（每張刺激圖片一列，不再有答對/答錯分版）
  - 欄位：stimFile, 正確答案, 層級一, 層級二, 層級三, 層級四
  - 泡泡以換行符（\n）分隔，而非句號（。）

[PARSER] experiment.js parseCSV 改為字元逐一解析（RFC-4180），支援引號欄位內含換行；移除 csvSplitLine

[BUBBLES] splitToSentences（以。切分）改為 splitToBubbles（以 \n 切分）；scriptsLookup 建置移除「答對」版本過濾（新 CSV 已無此欄位）
