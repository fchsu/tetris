export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type RotationState = 0 | 1 | 2 | 3; // 0: 0°, 1: 90°, 2: 180°, 3: 270°

export interface Point {
  x: number;
  y: number;
}

export type Difficulty = 'pudding' | 'marshmallow' | 'poprocks' | 'sourgummy';

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  subName: string;
  emoji: string;
  description: string;
  targetAudience: string;
  gravityMs: number; // 每個方塊下落一格的毫秒數
  lockDelayMs: number; // 著地後可調整的緩衝毫秒數
}

export type GameMode = 'quest' | 'endless';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'level_cleared' | 'game_over';

export interface BlockCell {
  type: TetrominoType;
  color: number; // Pixi.js 16進制色彩 (如 0xFF5D73)
  face: number;  // 表情索引
}

export interface ClearRowResult {
  clearedRows: number[];
  linesCount: number;
  scoreGained: number;
  isTetris: boolean;
}

export interface GameSaveData {
  unlockedLevel: number; // 已解鎖關卡 (1~20)
  levelRecords: {
    [level: number]: {
      highScore: number;
      stars: number; // 1~3 顆星
      cleared: boolean;
    };
  };
  endlessHighScores: {
    pudding: number;
    marshmallow: number;
    poprocks: number;
    sourgummy: number;
  };
  totalLinesCleared: number;
  settings: {
    difficulty: Difficulty;
    soundVolume: number;
    bgmVolume: number;
    hapticsEnabled: boolean;
  };
}
