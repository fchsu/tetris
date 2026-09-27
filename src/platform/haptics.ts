import { StorageService } from './storage';

export class Haptics {
  private static isVibrationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  private static canVibrate(): boolean {
    if (!this.isVibrationSupported()) return false;
    const settings = StorageService.load().settings;
    return settings.hapticsEnabled;
  }

  // 輕微點擊 (方塊平移、旋轉)
  public static tap(): void {
    if (this.canVibrate()) {
      navigator.vibrate(10);
    }
  }

  // 中度打擊 (單行消除、軟降著地)
  public static medium(): void {
    if (this.canVibrate()) {
      navigator.vibrate(25);
    }
  }

  // 重度打擊 (硬降、4行 Tetris、過關)
  public static heavy(): void {
    if (this.canVibrate()) {
      navigator.vibrate([40, 30, 40]);
    }
  }
}
