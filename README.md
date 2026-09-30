# 🍬 糖果俄羅斯方塊 - Tetris Jr.

專為國小學童與全年齡初學者量身打造的現代化網頁與行動端（PWA）俄羅斯方塊遊戲。採用晶瑩立體的「糖果果凍風」視覺美學、物理建模即時音效與無認知負擔的操作設計。

[![GitHub Pages Deployment](https://github.com/fchsu/tetris/actions/workflows/deploy.yml/badge.svg)](https://github.com/fchsu/tetris/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 🎮 線上即玩 (GitHub Pages)

本專案已透過 GitHub Actions 自動佈署至 GitHub Pages，可直接使用任何現代瀏覽器開啟：

👉 **[立即開始甜點冒險！(https://fchsu.github.io/tetris/)](https://fchsu.github.io/tetris/)**

> 📱 **PWA 安裝提示**：支援安裝至手機主畫面。在 Chrome / Safari 點擊「新增至主畫面」或「安裝應用程式」，即可獲得與原生 App 完全一致的全螢幕無邊框離線遊玩體驗。

---

## ✨ 遊戲特色

### 1. 🍭 專為兒童量身打造的 10x15 友善盤面
- **加大方塊視野**：捨棄傳統 10x20 的細碎視野，改採 **10 欄 × 15 列 (10x15)** 規格，方塊尺寸放大 33%，主盤面佔據畫面 75% 以上，更適合學童手眼協調。
- **無負擔心智模型**：完全移除複雜且容易造成兒童認知過載的「HOLD 暫存」機制，專注於下落預判與空間拼圖樂趣。

### 2. 🍮 晶瑩果凍美學與生動萌眼表情
- **WebGL 2.0 GPU 硬體加速**：基於 Pixi.js v8 幾何網格渲染，呈現圓角高光與深色厚度陰影。
- **4 種動態表情**：每個鎖定方塊隨機擁有水汪汪大眼、眨眼、超開心瞇瞇眼或開朗張嘴笑臉。
- **沉浸式童趣氛圍**：深紫曜石高對比網格盤面，搭配背景晴朗天空、微笑太陽、彩虹弧線與糖果山丘。

### 3. 🕹️ 雙手果凍懸浮觸控
- **左手操控區**：`[ ◀ 左移 ]`、`[ ▼ 軟降 ]`、`[ ▶ 右移 ]`，搭載街機標準 DAS（140ms 初始延遲）與 ARR（35ms 高速連發）滑動手感。
- **右手動作區**：`[ ⭐ 硬降 (星形大鍵) ]`、`[ 🔄 旋轉 (糖果大鍵) ]`。
- **鎖定延遲緩衝 (Lock Delay)**：方塊觸底後具備著地緩衝時間，最多允許 15 次平移或旋轉微調，失誤隨時能救回。

### 4. 🏆 雙遊戲模式 × 4 種甜點難度
- **🎮 關卡闖關模式 (Level Quest)**：共 20 個精緻關卡，每關滿 10 行過關，並依據消除效率給予 1~3 顆星級評等。
- **🏆 經典無盡模式 (Endless)**：不限行數挑戰最高分數，4 種難度分別具備獨立高分榜。
- **4 種特色難度**：
  - 🍮 **布丁級（簡單）**：下落極慢（1000ms），鎖定緩衝 1000ms，幼兒園/低年級零門檻首選。
  - 🍡 **棉花糖級（普通）**：舒適流暢（600ms 下落 / 750ms 鎖定），中高年級推薦手感。
  - 🍬 **跳跳糖級（困難）**：節奏俐落緊湊（300ms 下落 / 500ms 鎖定），考驗預判。
  - ⚡ **超酸軟糖級（超困難）**：極速下墜（120ms 下落 / 300ms 鎖定），挑戰極限手速。

### 5. 🎵 物理建模即時手遊音效
- **零外部音訊檔案**：100% 透過 Web Audio API 與立體聲空間迴響（Convolution Reverb）即時物理運算合成。
- **樂器編制**：包含 Karplus-Strong 撥弦烏克麗麗、木琴敲擊泛音、Cajon 箱鼓節奏與立體聲木質低音。
- **本機狀態同步**：背景音樂、音效開關、觸覺震動回饋與遊戲進度皆自動保存於 `localStorage`。

---

## ⌨️ 鍵盤控制鍵位

在桌面瀏覽器中，亦可使用鍵盤進行操作：

| 動作 | 鍵盤按鍵 | 備註 |
| :--- | :--- | :--- |
| **向左移動** | `←` 或 `A` | 支援長按連續位移 |
| **向右移動** | `→` 或 `D` | 支援長按連續位移 |
| **軟降 (加速下落)** | `↓` 或 `S` | 加速方塊垂直下落 |
| **硬降 (瞬間鎖定)** | `Space` 空白鍵 | 瞬間著地並鎖定 |
| **旋轉方塊** | `↑` 或 `W` | SRS (Super Rotation System) 順時針旋轉 |
| **暫停遊戲** | `P` 或 `Esc` | 打開選單或設定時亦自動暫停 |

---

## 🛠️ 本機開發環境設定

本專案使用現代前端工具鏈：**TypeScript + Vite + Pixi.js + pnpm**。

### 1. 系統需求
- [Node.js](https://nodejs.org/) `>= 20.0.0`
- [pnpm](https://pnpm.io/) `>= 10.0.0`

### 2. 下載專案與安裝依賴
```bash
# 複製儲存庫
git clone https://github.com/fchsu/tetris.git
cd tetris

# 安裝相依套件
pnpm install
```

### 3. 啟動本機開發伺服器
```bash
pnpm run dev
```
啟動後終端機將顯示本機網址：
- **Local 本機訪問**：`http://localhost:5173/`
- **Network 區網測試**：同 WiFi 網域下的手機平板可直接透過顯示之 IP 訪問（例如 `http://192.168.1.xxx:5173/`），即時測試行動裝置觸控回饋。

### 4. 執行行為測試 (Vitest)
專案內建完整的核心行為測試（SRS 旋轉、10x15 網格邊界碰撞、行消除結算、7-Bag 洗牌演算法）：
```bash
# 單次執行所有測試案例
pnpm test

# 進入監聽熱重載模式 (檔案修改時自動重測)
pnpm run test:watch
```

### 5. 建置生產環境版本 (Production Build)
```bash
# 編譯 TypeScript 並打包靜態資源至 dist/
pnpm run build

# 本機預覽建置後的生產版本
pnpm run preview
```

---

## 📂 專案結構

```text
tetris/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自動化佈署至 GitHub Pages
├── public/
│   ├── favicon.svg             # 網站圖示
│   ├── pwa-192x192.svg         # PWA 應用程式圖示 (192x192)
│   └── pwa-512x512.svg         # PWA 應用程式圖示 (512x512)
├── src/
│   ├── audio/
│   │   └── audio-manager.ts    # Web Audio 物理建模合成引擎 (烏克麗麗/木琴/殘響)
│   ├── core/
│   │   ├── board.ts            # 10x15 棋盤狀態、邊界檢測、消行結算
│   │   ├── constants.ts        # SRS 踢牆表、難度參數、方塊形狀座標
│   │   ├── game.ts             # 遊戲主迴圈、重力計時、Lock Delay 著地緩衝
│   │   ├── randomizer.ts       # 標準 7-Bag 洗牌演算法產生器
│   │   ├── tetromino.ts        # 方塊旋轉、平移、投影計算
│   │   └── types.ts            # 核心 TypeScript 型別定義
│   ├── input/
│   │   └── input-manager.ts    # 鍵盤與雙手果凍按鈕多點觸控 (DAS/ARR)
│   ├── platform/
│   │   ├── haptics.ts          # 行動裝置觸覺震動抽象層
│   │   └── storage.ts          # localStorage 本機存檔 (星級/最高分/設定)
│   ├── render/
│   │   └── pixi-renderer.ts    # Pixi.js (v8) GPU 畫布渲染器 (果凍方塊/萌臉表情)
│   ├── main.ts                 # 應用程式啟動入口、DOM HUD 與彈窗事件綁定
│   └── style.css               # 100dvh 自適應樣式、天空背景、果凍按鈕樣式
├── tests/
│   └── core/
│       ├── board.test.ts       # 盤面邊界判定與消除行單元測試
│       └── randomizer.test.ts  # 7-Bag 分佈均勻度單元測試
├── index.html                  # 遊戲主頁面與 DOM HUD/選單結構
├── package.json                # 專案腳本與相依套件宣告
├── tsconfig.json               # TypeScript 編譯設定
└── vite.config.ts              # Vite、PWA 外掛與 Vitest 測試配置
```

---

## 📄 授權條款

本專案採用 [ISC License](LICENSE) 條款開放開源使用。
