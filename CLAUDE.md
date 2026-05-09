# CLAUDE.md — 專案規則

## 技術棧
- 框架：jsPsych 7.x（CDN 載入）
- 部署：Pavlovia（純 HTML/JS 專案）
- 資料儲存：Pavlovia 內建 result data（CSV 格式）

## 專案架構
- `index.html` — 載入 CDN、全域 CSS、執行 experiment.js
- `experiment.js` — 所有實驗邏輯（條件分配、CSV 處理、試驗流程、資料記錄）
- `data/trials.csv` — 圖片與選項資料（由 trials.xlsx 匯出）
- `data/scripts.csv` — 機器人台詞資料（由 scripts.xlsx 匯出）
- `final_stimfile/` — 所有刺激圖片（.jpg）與機器人頭像（avatar_1~4.jpg）

## 開發規則
- 所有實驗邏輯集中在 experiment.js
- 刺激素材放在 final_stimfile/ 資料夾
- 台詞資料放在 data/ 資料夾
- 禁止使用需要 npm build 的框架（Pavlovia 要求純靜態檔案）
- 所有亂數化邏輯需在 experiment.js 最上方集中管理
- 每次重大修改後更新 LOG.md
- CSV 欄位：trials.csv (trialIndex,stimFile,opt1,opt2,opt3,opt4,corrAns,group)
- CSV 欄位：scripts.csv (trialIndex,stimFile,版本,層級一,層級二,層級三,層級四)
- 台詞只使用「答對」版本；按句號（。）切分為 4-5 句
- 刺激圖片路徑：final_stimfile/<stimFile>.jpg
- 機器人頭像路徑：final_stimfile/avatar_<1-4>.jpg

## 條件分配
- 4 種 Latin Square（LATIN_SQUARE[conditionIndex]），程式啟動時隨機選擇
- Avatar 出場順序另外獨立 shuffle
- 每位受試者看到 4 隻機器人，每隻指定唯一語氣層級（0=層級一…3=層級四）
