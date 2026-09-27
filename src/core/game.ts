import { DIFFICULTY_CONFIGS } from './constants';
import { Board } from './board';
import { Randomizer } from './randomizer';
import { Tetromino } from './tetromino';
import { ClearRowResult, Difficulty, GameMode, GameStatus, TetrominoType } from './types';
import { AudioManager } from '../audio/audio-manager';
import { Haptics } from '../platform/haptics';
import { StorageService } from '../platform/storage';

export interface GameEvents {
  onScoreUpdate?: (score: number, level: number, lines: number, stars: number) => void;
  onPieceChange?: () => void;
  onLineClear?: (result: ClearRowResult) => void;
  onLevelComplete?: (level: number, score: number, stars: number) => void;
  onGameOver?: (score: number) => void;
  onNextPieceUpdate?: (nextType: TetrominoType) => void;
}

export class GameEngine {
  public board: Board;
  public randomizer: Randomizer;
  public currentPiece: Tetromino | null = null;
  public nextPieceType: TetrominoType;

  public status: GameStatus = 'idle';
  public mode: GameMode = 'quest';
  public difficulty: Difficulty = 'marshmallow';

  public score = 0;
  public level = 1;
  public linesClearedInLevel = 0;
  public totalLinesCleared = 0;
  public stars = 0;

  private dropTimer: any = null;
  private lockTimer: any = null;
  private isLocking = false;
  private events: GameEvents;

  constructor(events: GameEvents = {}) {
    this.events = events;
    this.board = new Board();
    this.randomizer = new Randomizer();
    this.nextPieceType = this.randomizer.next();
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
  }

  public setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    StorageService.updateSettings({ difficulty: diff });
  }

  // 取得目前下落間隔 (毫秒)
  public getGravityInterval(): number {
    const config = DIFFICULTY_CONFIGS[this.difficulty];
    let interval = config.gravityMs;

    if (this.mode === 'quest') {
      // 關卡模式：每關提速 5%
      interval = Math.max(80, Math.round(config.gravityMs * (1 - (this.level - 1) * 0.05)));
    } else {
      // 無盡模式：每消 10 行提速
      const speedLevel = Math.min(15, Math.floor(this.totalLinesCleared / 10));
      interval = Math.max(70, Math.round(config.gravityMs * Math.pow(0.92, speedLevel)));
    }

    return interval;
  }

  // 取得鎖定緩衝時間 (毫秒)
  public getLockDelay(): number {
    return DIFFICULTY_CONFIGS[this.difficulty].lockDelayMs;
  }

  // 開始遊戲
  public start(level = 1): void {
    this.clearTimers();
    this.board.reset();
    this.randomizer = new Randomizer();
    this.score = 0;
    this.level = level;
    this.linesClearedInLevel = 0;
    this.totalLinesCleared = 0;
    this.stars = 3;
    this.status = 'playing';

    this.nextPieceType = this.randomizer.next();
    this.spawnNextPiece();

    this.notifyScore();
    AudioManager.getInstance().startBgm();
  }

  public pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.clearTimers();
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.scheduleGravity();
    }
  }

  public restart(): void {
    this.start(this.mode === 'quest' ? this.level : 1);
  }

  // 生成下一顆方塊
  private spawnNextPiece(): void {
    this.currentPiece = new Tetromino(this.nextPieceType);
    this.nextPieceType = this.randomizer.next();
    this.isLocking = false;

    // 檢查開局是否即刻頂出 (Game Over)
    if (!this.board.isValidPosition(this.currentPiece.type, this.currentPiece.rotation, this.currentPiece.pos)) {
      this.handleGameOver();
      return;
    }

    this.events.onNextPieceUpdate?.(this.nextPieceType);
    this.events.onPieceChange?.();
    this.scheduleGravity();
  }

  // 重力下落循環排程
  private scheduleGravity(): void {
    this.clearTimers();
    if (this.status !== 'playing') return;

    this.dropTimer = setTimeout(() => {
      this.tick();
    }, this.getGravityInterval());
  }

  private tick(): void {
    if (this.status !== 'playing' || !this.currentPiece) return;

    const moved = this.currentPiece.moveDown(this.board);
    if (moved) {
      this.isLocking = false;
      this.events.onPieceChange?.();
      this.scheduleGravity();
    } else {
      // 無法再往下，進入鎖定倒數 (Lock Delay)
      this.startLockDelay();
    }
  }

  private startLockDelay(): void {
    if (this.lockTimer) return;
    this.isLocking = true;

    this.lockTimer = setTimeout(() => {
      this.lockCurrentPiece();
    }, this.getLockDelay());
  }

  private resetLockDelayIfPossible(): void {
    if (this.isLocking && this.currentPiece) {
      if (this.currentPiece.lockResetCount < this.currentPiece.maxLockResets) {
        this.currentPiece.lockResetCount++;
        clearTimeout(this.lockTimer);
        this.lockTimer = setTimeout(() => {
          this.lockCurrentPiece();
        }, this.getLockDelay());
      }
    }
  }

  // 鎖定當前方塊並進行結算
  private lockCurrentPiece(): void {
    this.clearTimers();
    if (!this.currentPiece || this.status !== 'playing') return;

    // 寫入棋盤
    this.board.lockPiece(
      this.currentPiece.type,
      this.currentPiece.rotation,
      this.currentPiece.pos,
      this.currentPiece.color
    );

    Haptics.medium();

    // 消除行檢查
    const result = this.board.checkLineClears(this.level);
    if (result.linesCount > 0) {
      this.score += result.scoreGained;
      this.linesClearedInLevel += result.linesCount;
      this.totalLinesCleared += result.linesCount;

      if (result.isTetris) {
        AudioManager.getInstance().playTetris();
        Haptics.heavy();
      } else {
        AudioManager.getInstance().playLineClear(result.linesCount);
      }

      this.events.onLineClear?.(result);

      // 關卡模式：滿 10 行過關
      if (this.mode === 'quest' && this.linesClearedInLevel >= 10) {
        this.handleLevelClear();
        return;
      }
    }

    // 頂出判定
    if (this.board.isTopOut()) {
      this.handleGameOver();
      return;
    }

    this.notifyScore();
    this.spawnNextPiece();
  }

  // 玩家控制：向左平移
  public moveLeft(): boolean {
    if (this.status !== 'playing' || !this.currentPiece) return false;
    const moved = this.currentPiece.moveLeft(this.board);
    if (moved) {
      AudioManager.getInstance().playMove();
      Haptics.tap();
      this.resetLockDelayIfPossible();
      this.events.onPieceChange?.();
    }
    return moved;
  }

  // 玩家控制：向右平移
  public moveRight(): boolean {
    if (this.status !== 'playing' || !this.currentPiece) return false;
    const moved = this.currentPiece.moveRight(this.board);
    if (moved) {
      AudioManager.getInstance().playMove();
      Haptics.tap();
      this.resetLockDelayIfPossible();
      this.events.onPieceChange?.();
    }
    return moved;
  }

  // 玩家控制：軟降 (Soft Drop)
  public softDrop(): boolean {
    if (this.status !== 'playing' || !this.currentPiece) return false;
    const moved = this.currentPiece.moveDown(this.board);
    if (moved) {
      this.score += 1; // 軟降每格 1 分
      Haptics.tap();
      this.resetLockDelayIfPossible();
      this.events.onPieceChange?.();
      this.notifyScore();
    } else {
      this.startLockDelay();
    }
    return moved;
  }

  // 玩家控制：順時針旋轉
  public rotate(): boolean {
    if (this.status !== 'playing' || !this.currentPiece) return false;
    const rotated = this.currentPiece.rotate(this.board);
    if (rotated) {
      AudioManager.getInstance().playRotate();
      Haptics.tap();
      this.resetLockDelayIfPossible();
      this.events.onPieceChange?.();
    }
    return rotated;
  }

  // 玩家控制：瞬間硬降 (Hard Drop - 星星按鍵)
  public hardDrop(): void {
    if (this.status !== 'playing' || !this.currentPiece) return;
    const dropDistance = this.currentPiece.hardDrop(this.board);
    this.score += dropDistance * 2; // 硬降每格 2 分

    AudioManager.getInstance().playHardDrop();
    Haptics.heavy();
    this.events.onPieceChange?.();
    this.lockCurrentPiece();
  }

  private handleLevelClear(): void {
    this.status = 'level_cleared';
    this.clearTimers();
    AudioManager.getInstance().playLevelUp();
    Haptics.heavy();

    // 評定星星 (失誤少於一定值拿 3 星)
    this.stars = 3;
    StorageService.recordLevelClear(this.level, this.score, this.stars);

    this.events.onLevelComplete?.(this.level, this.score, this.stars);
  }

  private handleGameOver(): void {
    this.status = 'game_over';
    this.clearTimers();
    AudioManager.getInstance().playGameOver();
    Haptics.heavy();

    if (this.mode === 'endless') {
      StorageService.recordEndlessScore(this.difficulty, this.score);
    }

    this.events.onGameOver?.(this.score);
  }

  private clearTimers(): void {
    if (this.dropTimer) {
      clearTimeout(this.dropTimer);
      this.dropTimer = null;
    }
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  private notifyScore(): void {
    this.events.onScoreUpdate?.(this.score, this.level, this.linesClearedInLevel, this.stars);
  }
}
