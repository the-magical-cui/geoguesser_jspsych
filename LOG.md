# LOG.md — 專案變更記錄
# 格式：[YYYY-MM-DD] TAG: 說明

[初始] INIT: 建立專案結構，新增 index.html / experiment.js / CLAUDE.md / LOG.md；
  匯出 data/trials.csv、data/scripts.csv（來源：trials.xlsx、scripts.xlsx）

[初始] CORE: 實作核心實驗邏輯
  - Latin Square 條件分配（4×4）
  - CSV 載入與 scriptsLookup 建置
  - 5 頁試驗流程（猜測/信心/聊天室/二次猜測/二次信心）
  - 聊天室動畫泡泡（typing indicator + fade-in）
  - Godspeed + 信任量表（每輪結束後）
  - 固定底部進度條
  - Pavlovia 部署支援（plugin-pavlovia.js stub）

[初始] UI: 介面調整
  - 統一圖片大小（stim-trial 42vh，各頁一致）
  - 聊天室改為左圖右訊息兩欄版面，機器人頭像放大置中
  - 量表頁移除所有粗黑體標題
  - 機器人介紹頁按鈕鎖定 5 秒後才顯示

[初始] DATA: 新增 window._exp.dump() 支援，可在 DevTools console 隨時匯出目前資料

[2026-05-15] SCRIPTS: 重新匯出 data/scripts.csv（來源：GeoGuessr_ME_Results_2026-05-12.xlsx）
  - 76 列（每張刺激圖片一列，廢除答對/答錯分版）
  - 欄位：stimFile, 正確答案, 層級一, 層級二, 層級三, 層級四
  - 泡泡以換行符（\n）分隔（原為句號。）

[2026-05-15] PARSER: parseCSV 改為字元逐一 RFC-4180 解析，支援引號欄位內含換行；移除 csvSplitLine

[2026-05-15] PARSER: splitToSentences 改為 splitToBubbles（以 \n 切分）；scriptsLookup 建置移除「答對」版本過濾

[2026-05-15] UI: 聊天泡泡間隔調整為 750ms typing + 1000–1500ms dwell

[2026-05-15] UI: 聊天室新泡泡出現時自動 scrollIntoView（smooth）

[2026-05-15] INTRO: buildIntroTimeline 依指導語.docx 大幅更新（10 頁）
  - Page 1: 同意書更新文案，加「我同意」勾選框（必勾才可繼續）
  - Page 2（新增）: 個人資料（姓名選填、性別/年齡必填，未完成 disabled）
  - Page 3（新增）: 第二部分說明（只說明 guess/信心流程）
  - Page 6: 機器人說明更新文案
  - Page 10: 正式實驗說明，四輪/紅字說明移至此頁

[2026-05-15] SCALE: 新增 buildMAIPage，52 題 MAI 量表，五點 Likert（非常不符合→非常符合）
  - 全部作答完才可送出（送出按鈕 disabled）
  - 放在四輪結束後、Pavlovia finish 前
  - 資料欄位：mai_1 … mai_52

[2026-05-15] DEBRIEF: 結束頁更新
  - 顯示 participantId 作為實驗編號
  - 時數證明回報表單做成可點擊超連結
  - 加分說明（紅字）
