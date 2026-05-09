# GeoGuesser Metacognition Experiment

## 本地測試
1. 在專案根目錄啟動靜態伺服器：
   ```
   python3 -m http.server 8000
   ```
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
- `final_stimfile/` 資料夾需包含所有 .jpg 圖片（刺激圖 + avatar_1~4.jpg）才能正常執行
- `data/` 資料夾需包含 trials.csv 和 scripts.csv
- 本地執行時會自動跳過 Pavlovia plugin，並在 Console 印出完整資料

## 檔案結構
```
project-root/
├── index.html
├── experiment.js
├── CLAUDE.md
├── LOG.md
├── README.md
├── final_stimfile/     # 所有刺激圖片與機器人頭像
└── data/
    ├── trials.xlsx     # 原始資料（備份用）
    ├── scripts.xlsx    # 原始資料（備份用）
    ├── trials.csv      # 圖片與選項資料（由 xlsx 匯出）
    └── scripts.csv     # 機器人台詞資料（由 xlsx 匯出）
```
