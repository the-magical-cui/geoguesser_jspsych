# GeoGuesser Metacognition Experiment

jsPsych 7 實驗，探討與不同語氣風格機器人互動時的後設認知表現。
受試者看 Google Street View 截圖猜測地點，並與機器人對話後進行二次判斷。

---

## 專案結構

```
project-root/
├── index.html          # 載入 jsPsych、全域 CSS
├── experiment.js       # 所有實驗邏輯（唯一需要維護的主檔）
├── CLAUDE.md           # AI 輔助開發規則（欄位規格、開發限制）
├── LOG.md              # 版本變更記錄
├── README.md           # 本文件
├── data/
│   ├── trials.csv      # 圖片與選項資料（由 trials.xlsx 匯出）
│   ├── scripts.csv     # 機器人台詞（由 GeoGuessr_ME_Results_*.xlsx 匯出）
│   ├── trials.xlsx     # 原始備份
│   └── mai翻譯.xlsx    # MAI 量表翻譯（參考用）
├── final_stimfile/     # 刺激圖片（.jpg）
├── stimulus/           # 機器人頭像（level1.png ~ level4.png，透明底圓形）
└── jspsych/            # jsPsych 本地套件（勿修改）
    ├── jspsych.js
    ├── plugin-html-button-response.js
    ├── plugin-html-keyboard-response.js
    ├── plugin-pavlovia.js
    └── jspsych.css
```

---

## CSV 欄位規格

**trials.csv**

| 欄位 | 說明 |
|------|------|
| trialIndex | 流水號 |
| stimFile | 圖片檔名（不含副檔名） |
| opt1–opt4 | 四個選項 |
| corrAns | 正確答案（對應 opt1–4 之一） |
| group | A 或 B（B 組含練習圖） |

**scripts.csv**

| 欄位 | 說明 |
|------|------|
| stimFile | 對應圖片檔名 |
| 正確答案 | 該圖片正解（備查用） |
| 層級一 | 客觀描述型台詞 |
| 層級二 | 輕度後設認知台詞 |
| 層級三 | 中度後設認知台詞 |
| 層級四 | 高度後設認知台詞 |

泡泡以換行符（`\n`）分隔，CSV 欄位用引號包住。

---

## 實驗流程

1. **同意書**（必勾才可繼續）
2. **個人資料**（姓名選填；性別、年齡必填）
3. **AIAS**（13 題 AI 態度量表）
4. **說明與練習**（猜測→信心→聊天室→二次猜測→二次信心）
5. **正式實驗**：4 輪 × 5 題
   - 每輪開始：機器人介紹頁（5 秒鎖定）
   - 每題：5 頁流程（同練習）
   - 每輪結束：Godspeed + 信任量表
6. **注意力確認頁**（Q1 頭像注意度 / Q2 對話注意度 / Q3 辨識最後機器人）
7. **後設認知排序頁**（將 4 隻機器人依後設認知豐富程度由低至高排序）
8. **MAI 量表**（52 題）
9. **結束頁**（顯示實驗編號與時數證明連結）

---

## 實驗設計

- **4 種語氣層級**：層級一（客觀）→ 層級四（高度後設認知）
- **Latin Square 條件分配**：4×4，程式啟動時隨機抽選其中一種
- **Avatar 順序**：獨立 shuffle，與語氣層級無對應關係
- **刺激圖片**：group A / B 各抽 10 題，共 20 題混合後平均分配給 4 輪

---

## 資料欄位（輸出 CSV）

每列記錄對應一個試驗頁，以 `data_type` 區分：

| data_type | 主要欄位 |
|-----------|----------|
| `page1` | participant_id, stim_file, guess_1, guess_1_rt, guess_1_confidence, guess_1_confidence_rt |
| `page3` | rt（聊天室停留時間，即 chatroom_rt 的暫存來源） |
| `page5` | guess_2, guess_2_rt, guess_2_confidence, guess_2_confidence_rt, chatroom_rt, condition_index |
| `scale` | godspeed_1–9, trust, robot_index, robot_avatar, robot_style, condition_index |
| `attention_check` | attn_avatar, attn_content, attn_last_robot, attn_last_robot_correct, attn_q3_display_order |
| `metacog_ranking` | metacog_rank_1–4, metacog_display_order, metacog_reason |
| `mai` | mai_1–52 |
| `aias` | aias_1–13 |
| `demographics` | name, gender, age |

---

## 本地測試

```bash
# 在專案根目錄啟動靜態伺服器
python -m http.server 8000
```

開啟瀏覽器前往 `http://localhost:8000`

### Debug skip 參數（localhost 限定，Pavlovia 上自動略過）

| 網址 | 效果 |
|------|------|
| `?skip=ranking` | 跳過正式試驗，直接從注意力確認頁 + 排序頁開始 |
| `?skip=mai` | 跳過排序頁，直接從 MAI 量表開始 |

---

## 需要異動時

- **更換刺激圖片**：替換 `final_stimfile/` 內的 .jpg，並更新 `data/trials.csv`
- **修改台詞**：修改 `data/scripts.csv`（或原始 xlsx 再重新匯出 CSV）
- **調整題數**：修改 `experiment.js` 的 `groupA/groupB slice` 數量及 `progressBarHTML` 的分母
- **機器人頭像**：替換 `stimulus/level1.png ~ level4.png`（800×800 RGBA，圓形外透明）
- **所有邏輯**：集中在 `experiment.js`，`index.html` 只含全域 CSS

修改後記得在 `LOG.md` 補上記錄。
