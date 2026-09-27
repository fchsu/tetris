import { Difficulty, GameSaveData } from '../core/types';

const STORAGE_KEY = 'tetris_jr_save_data_v1';

const DEFAULT_SAVE_DATA: GameSaveData = {
  unlockedLevel: 1,
  levelRecords: {},
  endlessHighScores: {
    pudding: 0,
    marshmallow: 0,
    poprocks: 0,
    sourgummy: 0
  },
  totalLinesCleared: 0,
  settings: {
    difficulty: 'marshmallow',
    soundVolume: 0.8,
    bgmVolume: 0.5,
    hapticsEnabled: true
  }
};

export class StorageService {
  private static cachedData: GameSaveData | null = null;

  public static load(): GameSaveData {
    if (this.cachedData) {
      return this.cachedData;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cachedData = {
          ...DEFAULT_SAVE_DATA,
          ...parsed,
          settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
          endlessHighScores: { ...DEFAULT_SAVE_DATA.endlessHighScores, ...(parsed.endlessHighScores || {}) }
        };
        return this.cachedData!;
      }
    } catch (e) {
      console.warn('載入存檔失敗，使用預設值', e);
    }

    this.cachedData = { ...DEFAULT_SAVE_DATA };
    return this.cachedData;
  }

  public static save(data: GameSaveData): void {
    this.cachedData = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('寫入本機存檔失敗', e);
    }
  }

  public static recordLevelClear(level: number, score: number, stars: number): void {
    const data = this.load();
    const existing = data.levelRecords[level];

    const newHighScore = existing ? Math.max(existing.highScore, score) : score;
    const newStars = existing ? Math.max(existing.stars, stars) : stars;

    data.levelRecords[level] = {
      highScore: newHighScore,
      stars: newStars,
      cleared: true
    };

    if (level >= data.unlockedLevel && level < 20) {
      data.unlockedLevel = level + 1;
    }

    this.save(data);
  }

  public static recordEndlessScore(difficulty: Difficulty, score: number): boolean {
    const data = this.load();
    const currentHigh = data.endlessHighScores[difficulty] || 0;

    if (score > currentHigh) {
      data.endlessHighScores[difficulty] = score;
      this.save(data);
      return true; // 新紀錄
    }

    return false;
  }

  public static updateSettings(settings: Partial<GameSaveData['settings']>): void {
    const data = this.load();
    data.settings = { ...data.settings, ...settings };
    this.save(data);
  }
}
