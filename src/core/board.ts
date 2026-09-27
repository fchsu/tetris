import { BOARD_COLS, HIDDEN_ROWS, TETROMINO_SHAPES, TOTAL_ROWS } from './constants';
import { BlockCell, ClearRowResult, Point, RotationState, TetrominoType } from './types';

export class Board {
  public grid: (BlockCell | null)[][];

  constructor() {
    this.grid = this.createEmptyGrid();
  }

  public reset(): void {
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): (BlockCell | null)[][] {
    const grid: (BlockCell | null)[][] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      grid.push(new Array(BOARD_COLS).fill(null));
    }
    return grid;
  }

  // 檢查方塊在特定位置與旋轉態是否合法 (無碰撞、不越界)
  public isValidPosition(type: TetrominoType, rotation: RotationState, pos: Point): boolean {
    const blocks = TETROMINO_SHAPES[type][rotation];

    for (const b of blocks) {
      const x = pos.x + b.x;
      const y = pos.y + b.y;

      // 檢查邊界
      if (x < 0 || x >= BOARD_COLS || y >= TOTAL_ROWS) {
        return false;
      }

      // 允許方塊在頂部緩衝區 (y < 0)
      if (y < 0) {
        continue;
      }

      // 檢查是否與已鎖定方塊碰撞
      if (this.grid[y][x] !== null) {
        return false;
      }
    }

    return true;
  }

  // 將方塊鎖定到盤面網格
  public lockPiece(type: TetrominoType, rotation: RotationState, pos: Point, color: number): void {
    const blocks = TETROMINO_SHAPES[type][rotation];
    // 隨機選擇萌眼表情
    const face = Math.floor(Math.random() * 4);

    for (const b of blocks) {
      const x = pos.x + b.x;
      const y = pos.y + b.y;

      if (y >= 0 && y < TOTAL_ROWS && x >= 0 && x < BOARD_COLS) {
        this.grid[y][x] = {
          type,
          color,
          face
        };
      }
    }
  }

  // 計算 Ghost 投影落點位置
  public getGhostPosition(type: TetrominoType, rotation: RotationState, pos: Point): Point {
    let ghostY = pos.y;

    while (this.isValidPosition(type, rotation, { x: pos.x, y: ghostY + 1 })) {
      ghostY++;
    }

    return { x: pos.x, y: ghostY };
  }

  // 檢查並消除滿行
  public checkLineClears(level: number = 1): ClearRowResult {
    const clearedRows: number[] = [];

    // 從最底行往上檢查
    for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
      const isFull = this.grid[r].every(cell => cell !== null);
      if (isFull) {
        clearedRows.push(r);
      }
    }

    if (clearedRows.length === 0) {
      return {
        clearedRows: [],
        linesCount: 0,
        scoreGained: 0,
        isTetris: false
      };
    }

    // 移除消除的行，並在最頂部補充空行
    for (const rowIdx of clearedRows) {
      this.grid.splice(rowIdx, 1);
      this.grid.unshift(new Array(BOARD_COLS).fill(null));
    }

    const linesCount = clearedRows.length;
    let baseScore = 0;
    if (linesCount === 1) baseScore = 100;
    else if (linesCount === 2) baseScore = 300;
    else if (linesCount === 3) baseScore = 500;
    else if (linesCount === 4) baseScore = 800;

    return {
      clearedRows,
      linesCount,
      scoreGained: baseScore * level,
      isTetris: linesCount === 4
    };
  }

  // 檢查是否頂出封頂 (方塊鎖定在隱藏緩衝區內)
  public isTopOut(): boolean {
    // 檢查頂部 HIDDEN_ROWS 區域是否有鎖定方塊
    for (let r = 0; r < HIDDEN_ROWS; r++) {
      if (this.grid[r].some(cell => cell !== null)) {
        return true;
      }
    }
    return false;
  }
}
