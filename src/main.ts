import { DIFFICULTY_CONFIGS } from './core/constants';
import { GameEngine } from './core/game';
import { Difficulty } from './core/types';
import { AudioManager } from './audio/audio-manager';
import { InputManager } from './input/input-manager';
import { PixiRenderer } from './render/pixi-renderer';
import { StorageService } from './platform/storage';

async function bootstrap() {
  const container = document.getElementById('gameCanvasContainer') as HTMLElement;
  const storageData = StorageService.load();

  // 1. 建立遊戲核心引擎
  const game = new GameEngine({
    onScoreUpdate: (score, level, lines, _stars) => {
      document.getElementById('hudScore')!.textContent = score.toLocaleString();
      if (game.mode === 'quest') {
        document.getElementById('hudLevelLabel')!.textContent = 'LEVEL';
        document.getElementById('hudLevelVal')!.textContent = `${level} (${lines}/10)`;
      } else {
        document.getElementById('hudLevelLabel')!.textContent = 'LINES';
        document.getElementById('hudLevelVal')!.textContent = `${game.totalLinesCleared}`;
      }
    },
    onPieceChange: () => {
      renderer.render();
    },
    onLineClear: (result) => {
      renderer.emitLineClearParticles(result.clearedRows);
      renderer.render();
    },
    onLevelComplete: (level, score, stars) => {
      showLevelClearModal(level, score, stars);
    },
    onGameOver: (score) => {
      showGameOverModal(score);
    },
    onNextPieceUpdate: (nextType) => {
      renderer.renderNextPiece(nextType);
    }
  });

  // 初始載入玩家偏好難度
  game.setDifficulty(storageData.settings.difficulty);

  // 2. 初始化 Pixi.js 渲染器
  const renderer = new PixiRenderer(game);
  await renderer.init(container);

  // 3. 初始化輸入控制系統 (鍵盤 + 雙手觸控按鈕)
  const inputManager = new InputManager(game);
  inputManager.init();

  inputManager.bindTouchButtons({
    btnLeft: document.getElementById('btnLeft')!,
    btnRight: document.getElementById('btnRight')!,
    btnSoftDrop: document.getElementById('btnSoftDrop')!,
    btnHardDrop: document.getElementById('btnHardDrop')!,
    btnRotate: document.getElementById('btnRotate')!
  });

  // 4. UI 元件綁定與事件處理
  setupUI(game, renderer);

  // 自動開啟選單供玩家確認模式與難度，或直接開局
  updateHudBadges(game);
  document.getElementById('modalMenu')!.classList.remove('hidden');
}

function updateHudBadges(game: GameEngine): void {
  const config = DIFFICULTY_CONFIGS[game.difficulty];
  document.getElementById('hudDifficultyEmoji')!.textContent = config.emoji;
  document.getElementById('hudDifficultyName')!.textContent = config.name;
  document.getElementById('hudModeName')!.textContent = game.mode === 'quest' ? '闖關' : '無盡';
}

function setupUI(game: GameEngine, renderer: PixiRenderer): void {
  const modalMenu = document.getElementById('modalMenu')!;
  const modalLevelClear = document.getElementById('modalLevelClear')!;
  const modalGameOver = document.getElementById('modalGameOver')!;
  const modalSettings = document.getElementById('modalSettings')!;

  const btnOpenMenu = document.getElementById('btnOpenMenu')!;
  const btnStartGame = document.getElementById('btnStartGame')!;
  const btnNextLevel = document.getElementById('btnNextLevel')!;
  const btnRestart = document.getElementById('btnRestart')!;
  const btnBackToMenu = document.getElementById('btnBackToMenu')!;
  const btnToggleBgm = document.getElementById('btnToggleBgm')!;
  const btnOpenSettings = document.getElementById('btnOpenSettings')!;
  const btnCloseSettings = document.getElementById('btnCloseSettings')!;
  const btnSaveSettings = document.getElementById('btnSaveSettings')!;

  const tabModeQuest = document.getElementById('tabModeQuest')!;
  const tabModeEndless = document.getElementById('tabModeEndless')!;

  // 模式切換
  tabModeQuest.addEventListener('click', () => {
    game.setMode('quest');
    tabModeQuest.classList.add('bg-white', 'text-[#FF5277]');
    tabModeQuest.classList.remove('text-[#A67C52]');
    tabModeEndless.classList.remove('bg-white', 'text-[#FF5277]');
    tabModeEndless.classList.add('text-[#A67C52]');
    updateHudBadges(game);
  });

  tabModeEndless.addEventListener('click', () => {
    game.setMode('endless');
    tabModeEndless.classList.add('bg-white', 'text-[#FF5277]');
    tabModeEndless.classList.remove('text-[#A67C52]');
    tabModeQuest.classList.remove('bg-white', 'text-[#FF5277]');
    tabModeQuest.classList.add('text-[#A67C52]');
    updateHudBadges(game);
  });

  // 難度選擇卡片點擊
  const diffCards = document.querySelectorAll('.diff-card');
  diffCards.forEach((card) => {
    const diff = card.getAttribute('data-diff') as Difficulty;
    if (diff === game.difficulty) {
      card.classList.add('selected');
    }

    card.addEventListener('click', () => {
      diffCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      game.setDifficulty(diff);
      updateHudBadges(game);
    });
  });

  // 開啟主選單
  btnOpenMenu.addEventListener('click', () => {
    game.pause();
    modalMenu.classList.remove('hidden');
  });

  // 開始遊戲
  btnStartGame.addEventListener('click', () => {
    modalMenu.classList.add('hidden');
    game.restart();
    renderer.render();
  });

  // 下一關
  btnNextLevel.addEventListener('click', () => {
    modalLevelClear.classList.add('hidden');
    game.start(game.level + 1);
    renderer.render();
  });

  // 重新開始
  btnRestart.addEventListener('click', () => {
    modalGameOver.classList.add('hidden');
    game.restart();
    renderer.render();
  });

  btnBackToMenu.addEventListener('click', () => {
    modalGameOver.classList.add('hidden');
    modalMenu.classList.remove('hidden');
  });

  // 音樂切換按鈕
  btnToggleBgm.addEventListener('click', () => {
    const isPlaying = AudioManager.getInstance().toggleBgm();
    btnToggleBgm.textContent = isPlaying ? '🎵' : '🔇';
  });

  // 設定彈窗
  btnOpenSettings.addEventListener('click', () => {
    const s = StorageService.load().settings;
    (document.getElementById('chkSettingBgm') as HTMLInputElement).checked = s.bgmVolume > 0;
    (document.getElementById('chkSettingSfx') as HTMLInputElement).checked = s.soundVolume > 0;
    (document.getElementById('chkSettingHaptics') as HTMLInputElement).checked = s.hapticsEnabled;
    modalSettings.classList.remove('hidden');
  });

  const closeSettings = () => {
    const bgmOn = (document.getElementById('chkSettingBgm') as HTMLInputElement).checked;
    const sfxOn = (document.getElementById('chkSettingSfx') as HTMLInputElement).checked;
    const hapticsOn = (document.getElementById('chkSettingHaptics') as HTMLInputElement).checked;

    StorageService.updateSettings({
      bgmVolume: bgmOn ? 0.5 : 0,
      soundVolume: sfxOn ? 0.8 : 0,
      hapticsEnabled: hapticsOn
    });

    if (!bgmOn) {
      AudioManager.getInstance().stopBgm();
      btnToggleBgm.textContent = '🔇';
    } else {
      btnToggleBgm.textContent = '🎵';
    }

    modalSettings.classList.add('hidden');
  };

  btnCloseSettings.addEventListener('click', closeSettings);
  btnSaveSettings.addEventListener('click', closeSettings);
}

function showLevelClearModal(level: number, score: number, stars: number): void {
  const modal = document.getElementById('modalLevelClear')!;
  document.getElementById('clearLevelSubTitle')!.textContent = `恭喜順利通過第 ${level} 關！`;
  document.getElementById('clearScoreVal')!.textContent = score.toLocaleString();

  const starContainer = document.getElementById('clearStarsContainer')!;
  starContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = i < stars ? '⭐' : '☆';
    starContainer.appendChild(s);
  }

  modal.classList.remove('hidden');
}

function showGameOverModal(score: number): void {
  const modal = document.getElementById('modalGameOver')!;
  document.getElementById('overScoreVal')!.textContent = score.toLocaleString();

  const save = StorageService.load();
  const currentDiff = save.settings.difficulty;
  const record = save.endlessHighScores[currentDiff] || 0;
  document.getElementById('overHighText')!.textContent = `${DIFFICULTY_CONFIGS[currentDiff].name}最高紀錄：${Math.max(record, score).toLocaleString()}`;

  modal.classList.remove('hidden');
}

bootstrap();
