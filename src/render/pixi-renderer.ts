import { Application, Container, Graphics } from 'pixi.js';
import { BOARD_COLS, BOARD_ROWS, CANDY_COLORS, HIDDEN_ROWS, TETROMINO_SHAPES } from '../core/constants';
import { GameEngine } from '../core/game';
import { TetrominoType } from '../core/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: number;
  size: number;
  alpha: number;
  isStar: boolean;
}

export class PixiRenderer {
  public app: Application;
  private game: GameEngine;

  // 容器架構
  private stageContainer: Container;
  private boardBgGraphics: Graphics;
  private gridGraphics: Graphics;
  private ghostGraphics: Graphics;
  private boardBlocksGraphics: Graphics;
  private activePieceGraphics: Graphics;
  private particleGraphics: Graphics;
  private nextPreviewGraphics: Graphics;

  private particles: Particle[] = [];
  public cellSize = 30;
  public boardX = 0;
  public boardY = 0;

  constructor(game: GameEngine) {
    this.game = game;
    this.app = new Application();
    this.stageContainer = new Container();
    this.boardBgGraphics = new Graphics();
    this.gridGraphics = new Graphics();
    this.ghostGraphics = new Graphics();
    this.boardBlocksGraphics = new Graphics();
    this.activePieceGraphics = new Graphics();
    this.particleGraphics = new Graphics();
    this.nextPreviewGraphics = new Graphics();
  }

  public async init(containerElement: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: containerElement,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0
    });

    containerElement.appendChild(this.app.canvas);

    this.app.stage.addChild(this.stageContainer);
    this.stageContainer.addChild(this.boardBgGraphics);
    this.stageContainer.addChild(this.gridGraphics);
    this.stageContainer.addChild(this.ghostGraphics);
    this.stageContainer.addChild(this.boardBlocksGraphics);
    this.stageContainer.addChild(this.activePieceGraphics);
    this.stageContainer.addChild(this.nextPreviewGraphics);
    this.stageContainer.addChild(this.particleGraphics);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 啟動 Pixi Ticker 動畫迴圈 (粒子與微彈跳)
    this.app.ticker.add((ticker) => {
      this.updateParticles(ticker.deltaTime);
    });
  }

  // 響應式佈局計算 (75%+ 盤面佔比)
  public resize(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // 讓 10x15 盤面在直向手機上最大化佔據 73%~76% 高度
    const maxBoardHeight = height * 0.74;
    const maxBoardWidth = width * 0.94;

    const cellByHeight = maxBoardHeight / BOARD_ROWS;
    const cellByWidth = maxBoardWidth / BOARD_COLS;

    this.cellSize = Math.floor(Math.min(cellByHeight, cellByWidth));

    const boardWidth = this.cellSize * BOARD_COLS;
    const boardHeight = this.cellSize * BOARD_ROWS;

    this.boardX = Math.round((width - boardWidth) / 2);
    // 頂部留出 55px 給極簡膠囊分數與 Next，其餘全部給盤面
    this.boardY = Math.max(55, Math.round((height - boardHeight) * 0.3));

    this.drawBoardBackground(boardWidth, boardHeight);
    this.render();
  }

  // 繪製盤面底板與淡雅網格
  private drawBoardBackground(boardWidth: number, boardHeight: number): void {
    const g = this.boardBgGraphics;
    g.clear();

    const padding = 6;
    const radius = 22;

    // 外層果凍發光投影底板
    g.roundRect(
      this.boardX - padding,
      this.boardY - padding,
      boardWidth + padding * 2,
      boardHeight + padding * 2,
      radius
    ).fill({ color: 0xFFFFFF, alpha: 0.75 });

    g.roundRect(
      this.boardX - padding,
      this.boardY - padding,
      boardWidth + padding * 2,
      boardHeight + padding * 2,
      radius
    ).stroke({ width: 3, color: 0xFAD2E1, alpha: 0.9 });

    // 棋盤網格背景底色
    g.roundRect(
      this.boardX,
      this.boardY,
      boardWidth,
      boardHeight,
      16
    ).fill({ color: 0xFAF3F0, alpha: 0.65 });

    // 繪製微弱內部網格線
    const grid = this.gridGraphics;
    grid.clear();
    for (let c = 1; c < BOARD_COLS; c++) {
      const x = this.boardX + c * this.cellSize;
      grid.moveTo(x, this.boardY);
      grid.lineTo(x, this.boardY + boardHeight);
      grid.stroke({ width: 1, color: 0xEADCD7, alpha: 0.5 });
    }
    for (let r = 1; r < BOARD_ROWS; r++) {
      const y = this.boardY + r * this.cellSize;
      grid.moveTo(this.boardX, y);
      grid.lineTo(this.boardX + boardWidth, y);
      grid.stroke({ width: 1, color: 0xEADCD7, alpha: 0.5 });
    }
  }

  // 繪製一顆生動的糖果果凍方塊 (含高光、倒角與笑臉)
  private drawJellyBlock(
    g: Graphics,
    pixelX: number,
    pixelY: number,
    color: number,
    alpha: number = 1.0,
    faceIndex: number = 0,
    isGhost: boolean = false
  ): void {
    const size = this.cellSize - 2;
    const radius = Math.round(size * 0.3);
    const x = pixelX + 1;
    const y = pixelY + 1;

    if (isGhost) {
      // 虛影：半透明圓角外框
      g.roundRect(x + 1, y + 1, size - 2, size - 2, radius)
        .stroke({ width: 2, color: color, alpha: 0.45 });
      return;
    }

    // 1. 本體果凍方塊
    g.roundRect(x, y, size, size, radius).fill({ color, alpha });

    // 2. 底部微陰影內凹感
    g.roundRect(x + 2, y + size - 6, size - 4, 4, radius * 0.5)
      .fill({ color: 0x000000, alpha: 0.12 * alpha });

    // 3. 頂部高光反光 (Glossy Jelly Shine)
    g.ellipse(x + size * 0.32, y + size * 0.25, size * 0.22, size * 0.12)
      .fill({ color: 0xFFFFFF, alpha: 0.55 * alpha });

    // 4. 萌眼表情
    if (!isGhost && size >= 22) {
      this.drawCuteFace(g, x, y, size, faceIndex, alpha);
    }
  }

  // 繪製萌眼表情
  private drawCuteFace(
    g: Graphics,
    x: number,
    y: number,
    size: number,
    faceIndex: number,
    alpha: number
  ): void {
    const eyeY = y + size * 0.52;
    const leftEyeX = x + size * 0.34;
    const rightEyeX = x + size * 0.66;
    const eyeRadius = Math.max(1.5, size * 0.065);
    const eyeColor = 0x362020;

    if (faceIndex === 0) {
      // 圓滾滾微笑雙眼
      g.circle(leftEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.85 * alpha });
      g.circle(rightEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.85 * alpha });
      // 腮紅
      g.circle(leftEyeX - 2, eyeY + 4, eyeRadius * 1.2).fill({ color: 0xFF6B8B, alpha: 0.4 * alpha });
      g.circle(rightEyeX + 2, eyeY + 4, eyeRadius * 1.2).fill({ color: 0xFF6B8B, alpha: 0.4 * alpha });
    } else if (faceIndex === 1) {
      // 眨眼表情 (^_<)
      g.circle(leftEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.85 * alpha });
      // 瞇眼右弧線
      g.moveTo(rightEyeX - 3, eyeY + 1);
      g.lineTo(rightEyeX, eyeY - 2);
      g.lineTo(rightEyeX + 3, eyeY + 1);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });
    } else if (faceIndex === 2) {
      // 開心笑眼 (^^)
      g.moveTo(leftEyeX - 3, eyeY + 1);
      g.lineTo(leftEyeX, eyeY - 2);
      g.lineTo(leftEyeX + 3, eyeY + 1);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });

      g.moveTo(rightEyeX - 3, eyeY + 1);
      g.lineTo(rightEyeX, eyeY - 2);
      g.lineTo(rightEyeX + 3, eyeY + 1);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });
    }
  }

  // 核心渲染方法
  public render(): void {
    this.renderBoardBlocks();
    this.renderGhostPiece();
    this.renderActivePiece();
    this.renderNextPiece(this.game.nextPieceType);
  }

  // 繪製盤面已鎖定方塊
  private renderBoardBlocks(): void {
    const g = this.boardBlocksGraphics;
    g.clear();

    const grid = this.game.board.grid;
    for (let r = HIDDEN_ROWS; r < grid.length; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          const visibleRow = r - HIDDEN_ROWS;
          const px = this.boardX + c * this.cellSize;
          const py = this.boardY + visibleRow * this.cellSize;
          this.drawJellyBlock(g, px, py, cell.color, 1.0, cell.face, false);
        }
      }
    }
  }

  // 繪製 Ghost 落地投影虛影
  private renderGhostPiece(): void {
    const g = this.ghostGraphics;
    g.clear();

    const piece = this.game.currentPiece;
    if (!piece || this.game.status !== 'playing') return;

    const ghostPos = this.game.board.getGhostPosition(piece.type, piece.rotation, piece.pos);
    const blocks = TETROMINO_SHAPES[piece.type][piece.rotation];

    for (const b of blocks) {
      const row = ghostPos.y + b.y;
      const col = ghostPos.x + b.x;

      if (row >= HIDDEN_ROWS) {
        const visibleRow = row - HIDDEN_ROWS;
        const px = this.boardX + col * this.cellSize;
        const py = this.boardY + visibleRow * this.cellSize;
        this.drawJellyBlock(g, px, py, piece.color, 0.45, 0, true);
      }
    }
  }

  // 繪製正在下落中的活動方塊
  private renderActivePiece(): void {
    const g = this.activePieceGraphics;
    g.clear();

    const piece = this.game.currentPiece;
    if (!piece || this.game.status !== 'playing') return;

    const blocks = TETROMINO_SHAPES[piece.type][piece.rotation];

    for (const b of blocks) {
      const row = piece.pos.y + b.y;
      const col = piece.pos.x + b.x;

      if (row >= HIDDEN_ROWS) {
        const visibleRow = row - HIDDEN_ROWS;
        const px = this.boardX + col * this.cellSize;
        const py = this.boardY + visibleRow * this.cellSize;
        this.drawJellyBlock(g, px, py, piece.color, 1.0, 0, false);
      }
    }
  }

  // 繪製頂部右上角 NEXT 雲朵預覽
  public renderNextPiece(type: TetrominoType): void {
    const g = this.nextPreviewGraphics;
    g.clear();

    const color = CANDY_COLORS[type];
    const previewCellSize = Math.max(14, Math.floor(this.cellSize * 0.65));
    const blocks = TETROMINO_SHAPES[type][0];

    // 尋找邊界以置中
    let minX = 4, maxX = 0, minY = 4, maxY = 0;
    blocks.forEach(b => {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y);
    });

    const pieceW = (maxX - minX + 1) * previewCellSize;
    const pieceH = (maxY - minY + 1) * previewCellSize;

    // 放在頂部右上角
    const boxW = previewCellSize * 4 + 14;
    const boxH = previewCellSize * 2.8 + 14;
    const boxX = this.boardX + (this.cellSize * BOARD_COLS) - boxW;
    const boxY = Math.max(8, this.boardY - boxH - 6);

    // 雲朵小背板
    g.roundRect(boxX, boxY, boxW, boxH, 14).fill({ color: 0xFFFFFF, alpha: 0.85 });
    g.roundRect(boxX, boxY, boxW, boxH, 14).stroke({ width: 2, color: 0xFAD2E1, alpha: 0.9 });

    // 置中繪製小方塊
    const offsetX = boxX + (boxW - pieceW) / 2 - minX * previewCellSize;
    const offsetY = boxY + (boxH - pieceH) / 2 - minY * previewCellSize;

    blocks.forEach(b => {
      const px = offsetX + b.x * previewCellSize;
      const py = offsetY + b.y * previewCellSize;
      const s = previewCellSize - 1;
      const r = Math.round(s * 0.28);

      g.roundRect(px, py, s, s, r).fill({ color });
      g.ellipse(px + s * 0.35, py + s * 0.25, s * 0.2, s * 0.1).fill({ color: 0xFFFFFF, alpha: 0.6 });
    });
  }

  // 觸發消除行時的星星與糖果碎片爆炸特效
  public emitLineClearParticles(clearedRows: number[]): void {
    const colors = [0xFFD13B, 0xFF5277, 0x38B6FF, 0x52D681, 0xBF55EC, 0xFF9233];

    for (const r of clearedRows) {
      const visibleRow = r - HIDDEN_ROWS;
      const y = this.boardY + visibleRow * this.cellSize + this.cellSize / 2;

      for (let i = 0; i < 35; i++) {
        const x = this.boardX + Math.random() * (this.cellSize * BOARD_COLS);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;

        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 6,
          alpha: 1.0,
          isStar: Math.random() > 0.4
        });
      }
    }
  }

  private updateParticles(delta: number): void {
    if (this.particles.length === 0) return;

    const g = this.particleGraphics;
    g.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 0.18 * delta; // 重力下墜
      p.rotation += p.vRot * delta;
      p.alpha -= 0.025 * delta;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isStar) {
        // 繪製小五角星
        this.drawMiniStar(g, p.x, p.y, p.size, p.color, p.alpha);
      } else {
        // 糖果圓粒
        g.circle(p.x, p.y, p.size * 0.5).fill({ color: p.color, alpha: p.alpha });
      }
    }
  }

  private drawMiniStar(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number): void {
    const points: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    g.poly(points).fill({ color, alpha });
  }
}
