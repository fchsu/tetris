import { GameEngine } from '../core/game';

export class InputManager {
  private game: GameEngine;
  private keyStates: Record<string, boolean> = {};
  private dasTimers: Record<string, any> = {};
  private arrIntervals: Record<string, any> = {};

  private readonly DAS_MS = 140; // 首次延遲
  private readonly ARR_MS = 35;  // 連續觸發頻率

  constructor(game: GameEngine) {
    this.game = game;
  }

  public init(): void {
    this.bindKeyboard();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // 避免空白鍵與方向鍵滾動頁面
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) return;
      this.keyStates[e.code] = true;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.game.moveLeft();
          this.startDas('left', () => this.game.moveLeft());
          break;

        case 'ArrowRight':
        case 'KeyD':
          this.game.moveRight();
          this.startDas('right', () => this.game.moveRight());
          break;

        case 'ArrowDown':
        case 'KeyS':
          this.game.softDrop();
          this.startDas('down', () => this.game.softDrop());
          break;

        case 'ArrowUp':
        case 'KeyX':
          this.game.rotate();
          break;

        case 'Space':
          this.game.hardDrop();
          break;

        case 'KeyP':
        case 'Escape':
          if (this.game.status === 'playing') {
            this.game.pause();
          } else if (this.game.status === 'paused') {
            this.game.resume();
          }
          break;

        case 'KeyR':
          this.game.restart();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyStates[e.code] = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.stopDas('left');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.stopDas('right');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.stopDas('down');
    });
  }

  // 競賽級 DAS / ARR 連續長按移動機制
  private startDas(key: string, action: () => void): void {
    this.stopDas(key);
    this.dasTimers[key] = setTimeout(() => {
      this.arrIntervals[key] = setInterval(() => {
        action();
      }, this.ARR_MS);
    }, this.DAS_MS);
  }

  private stopDas(key: string): void {
    if (this.dasTimers[key]) {
      clearTimeout(this.dasTimers[key]);
      delete this.dasTimers[key];
    }
    if (this.arrIntervals[key]) {
      clearInterval(this.arrIntervals[key]);
      delete this.arrIntervals[key];
    }
  }

  // 綁定行動裝置觸控按鍵 (左手：左|軟降|右；右手：硬降|旋轉)
  public bindTouchButtons(elements: {
    btnLeft: HTMLElement;
    btnRight: HTMLElement;
    btnSoftDrop: HTMLElement;
    btnHardDrop: HTMLElement;
    btnRotate: HTMLElement;
  }): void {
    // 1. 左移
    this.attachButtonListener(elements.btnLeft, () => this.game.moveLeft(), true);
    // 2. 右移
    this.attachButtonListener(elements.btnRight, () => this.game.moveRight(), true);
    // 3. 軟降
    this.attachButtonListener(elements.btnSoftDrop, () => this.game.softDrop(), true);
    // 4. 硬降 (星星大鍵)
    this.attachButtonListener(elements.btnHardDrop, () => this.game.hardDrop(), false);
    // 5. 旋轉 (糖果大鍵)
    this.attachButtonListener(elements.btnRotate, () => this.game.rotate(), false);
  }

  private attachButtonListener(el: HTMLElement, action: () => void, allowRepeat: boolean): void {
    let timer: any = null;
    let interval: any = null;

    const start = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      action();

      if (allowRepeat) {
        timer = setTimeout(() => {
          interval = setInterval(() => {
            action();
          }, this.ARR_MS);
        }, this.DAS_MS);
      }
    };

    const stop = (e: Event) => {
      e.preventDefault();
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
      timer = null;
      interval = null;
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', stop);
    el.addEventListener('touchcancel', stop);

    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', stop);
    el.addEventListener('mouseleave', stop);
  }
}
