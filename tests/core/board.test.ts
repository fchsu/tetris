import { describe, expect, it } from 'vitest';
import { Board } from '../../src/core/board';
import { BOARD_COLS, TOTAL_ROWS, HIDDEN_ROWS } from '../../src/core/constants';

describe('Board Core Mechanics (10x15 Grid)', () => {
  it('應該初始化為正確尺寸的空白盤面 (含隱藏緩衝行)', () => {
    const board = new Board();
    expect(board.grid.length).toBe(TOTAL_ROWS);
    expect(board.grid[0].length).toBe(BOARD_COLS);

    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        expect(board.grid[r][c]).toBeNull();
      }
    }
  });

  it('應該正確判定邊界內外的碰撞狀態', () => {
    const board = new Board();
    // 盤面內有效位置 (O 方塊 blocks 佔據 (x+1, y+0), (x+2, y+0), (x+1, y+1), (x+2, y+1))
    expect(board.isValidPosition('O', 0, { x: 4, y: HIDDEN_ROWS })).toBe(true);

    // 超出左邊界 (x = -2, 則 x+1 = -1 < 0)
    expect(board.isValidPosition('O', 0, { x: -2, y: HIDDEN_ROWS })).toBe(false);

    // 超出右邊界 (x = 8, 則 x+2 = 10 >= 10)
    expect(board.isValidPosition('O', 0, { x: 8, y: HIDDEN_ROWS })).toBe(false);

    // 超出底部 (y = TOTAL_ROWS)
    expect(board.isValidPosition('O', 0, { x: 4, y: TOTAL_ROWS })).toBe(false);
  });

  it('當填滿整行時應觸發消除並加分', () => {
    const board = new Board();
    const targetRow = TOTAL_ROWS - 1;

    // 手動填滿最底下一行
    for (let c = 0; c < BOARD_COLS; c++) {
      board.grid[targetRow][c] = { type: 'I', color: 0x38B6FF, face: 0 };
    }

    const result = board.checkLineClears(1);
    expect(result.linesCount).toBe(1);
    expect(result.clearedRows).toContain(targetRow);
    expect(result.scoreGained).toBe(100);

    // 消除後最底下一行應被上方空白行遞補清空
    for (let c = 0; c < BOARD_COLS; c++) {
      expect(board.grid[targetRow][c]).toBeNull();
    }
  });

  it('同時消除 4 行 (Tetris) 應獲得 800 分基礎分與 isTetris 標記', () => {
    const board = new Board();
    const startRow = TOTAL_ROWS - 4;

    for (let r = startRow; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        board.grid[r][c] = { type: 'I', color: 0x38B6FF, face: 0 };
      }
    }

    const result = board.checkLineClears(2); // level 2
    expect(result.linesCount).toBe(4);
    expect(result.isTetris).toBe(true);
    expect(result.scoreGained).toBe(800 * 2); // 1600 分
  });
});
