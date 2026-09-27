import { CANDY_COLORS, WALL_KICK_DATA } from './constants';
import { Board } from './board';
import { Point, RotationState, TetrominoType } from './types';

export class Tetromino {
  public type: TetrominoType;
  public rotation: RotationState = 0;
  public pos: Point;
  public color: number;
  public lockResetCount = 0;
  public readonly maxLockResets = 15;

  constructor(type: TetrominoType) {
    this.type = type;
    this.color = CANDY_COLORS[type];
    // 初始位置：置於頂部中央
    this.pos = {
      x: type === 'O' ? 4 : 3,
      y: 1 // 位於隱藏緩衝區內 (前3行為緩衝區)
    };
  }

  public moveLeft(board: Board): boolean {
    const newPos = { x: this.pos.x - 1, y: this.pos.y };
    if (board.isValidPosition(this.type, this.rotation, newPos)) {
      this.pos = newPos;
      return true;
    }
    return false;
  }

  public moveRight(board: Board): boolean {
    const newPos = { x: this.pos.x + 1, y: this.pos.y };
    if (board.isValidPosition(this.type, this.rotation, newPos)) {
      this.pos = newPos;
      return true;
    }
    return false;
  }

  public moveDown(board: Board): boolean {
    const newPos = { x: this.pos.x, y: this.pos.y + 1 };
    if (board.isValidPosition(this.type, this.rotation, newPos)) {
      this.pos = newPos;
      return true;
    }
    return false;
  }

  // 順時針旋轉 (含 SRS 踢牆判定)
  public rotate(board: Board): boolean {
    if (this.type === 'O') {
      return true; // O 方塊旋轉無變化
    }

    const nextRotation = ((this.rotation + 1) % 4) as RotationState;
    return this.applyRotationWithKick(board, nextRotation);
  }

  // 逆時針旋轉
  public rotateCounterClockwise(board: Board): boolean {
    if (this.type === 'O') {
      return true;
    }

    const nextRotation = ((this.rotation + 3) % 4) as RotationState;
    return this.applyRotationWithKick(board, nextRotation);
  }

  private applyRotationWithKick(board: Board, nextRotation: RotationState): boolean {
    // 取得踢牆偏移測試清單
    const kickList = this.getKickTests(this.rotation, nextRotation);

    for (const kick of kickList) {
      const testPos = {
        x: this.pos.x + kick.x,
        y: this.pos.y - kick.y // Tetris SRS 規範 y 軸向上為正，網格向下記為 -y
      };

      if (board.isValidPosition(this.type, nextRotation, testPos)) {
        this.pos = testPos;
        this.rotation = nextRotation;
        return true;
      }
    }

    return false;
  }

  private getKickTests(from: RotationState, to: RotationState): Point[] {
    const key = `${from}>${to}`;
    const kickTable = this.type === 'I' ? WALL_KICK_DATA.I : WALL_KICK_DATA.JLSTZ;

    // SRS 8 種狀態轉換對應索引
    const transitionMap: Record<string, number> = {
      '0>1': 0, '1>0': 1,
      '1>2': 2, '2>1': 3,
      '2>3': 4, '3>2': 5,
      '3>0': 6, '0>3': 7
    };

    const idx = transitionMap[key];
    if (idx !== undefined && kickTable[idx]) {
      return kickTable[idx];
    }

    return [{ x: 0, y: 0 }];
  }

  // 瞬間硬降至底
  public hardDrop(board: Board): number {
    const ghost = board.getGhostPosition(this.type, this.rotation, this.pos);
    const dropDistance = ghost.y - this.pos.y;
    this.pos = ghost;
    return dropDistance;
  }
}
