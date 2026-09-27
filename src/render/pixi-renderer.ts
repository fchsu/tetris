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

  private stageContainer: Container;
  private boardBgGraphics: Graphics;
  private gridGraphics: Graphics;
  private ghostGraphics: Graphics;
  private boardBlocksGraphics: Graphics;
  private activePieceGraphics: Graphics;
  private nextPreviewGraphics: Graphics;
  private particleGraphics: Graphics;

  private particles: Particle[] = [];
  public cellSize = 32;
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
    this.nextPreviewGraphics = new Graphics();
    this.particleGraphics = new Graphics();
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

    // 動畫迴圈 (粒子更新)
    this.app.ticker.add((ticker) => {
      this.updateParticles(ticker.deltaTime);
    });
  }

  // 精確響應式佈局計算：徹底避免下方操作按鈕被截斷
  public resize(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // 頂部保留 70px 給分數雲朵與選單，底部保留 105px 給雙手觸控按鍵 (含安全區域)
    const topReserved = 70;
    const bottomReserved = 105;
    const availableHeight = Math.max(200, height - topReserved - bottomReserved);
    const availableWidth = width * 0.94;

    const cellByHeight = availableHeight / BOARD_ROWS;
    const cellByWidth = availableWidth / BOARD_COLS;

    // 單一方塊大小
    this.cellSize = Math.floor(Math.min(cellByHeight, cellByWidth));

    const boardWidth = this.cellSize * BOARD_COLS;
    const boardHeight = this.cellSize * BOARD_ROWS;

    this.boardX = Math.round((width - boardWidth) / 2);
    // 居中放置於保留區間
    this.boardY = topReserved + Math.max(0, Math.round((availableHeight - boardHeight) / 2));

    this.drawBoardBackground(boardWidth, boardHeight);
    this.render();
  }

  // 繪製對齊設計圖的糖果粉外框與沉穩紫色網格底板
  private drawBoardBackground(boardWidth: number, boardHeight: number): void {
    const g = this.boardBgGraphics;
    g.clear();

    const padding = 8;
    const radius = 26;

    // 1. 外層糖果粉/薰衣草紫果凍外框 (Pastel Pink Jelly Frame)
    g.roundRect(
      this.boardX - padding,
      this.boardY - padding,
      boardWidth + padding * 2,
      boardHeight + padding * 2,
      radius
    ).fill({ color: 0xF6C4D9, alpha: 0.95 });

    g.roundRect(
      this.boardX - padding,
      this.boardY - padding,
      boardWidth + padding * 2,
      boardHeight + padding * 2,
      radius
    ).stroke({ width: 3, color: 0xFFFFFF, alpha: 0.9 });

    // 頂部高光倒角白光條
    g.roundRect(
      this.boardX - padding + 8,
      this.boardY - padding + 2,
      boardWidth * 0.5,
      3,
      2
    ).fill({ color: 0xFFFFFF, alpha: 0.75 });

    // 2. 內部棋盤：深粉紫/黑醋栗沉穩網格背景 (與明亮果凍方塊形成高對比，極致立體)
    g.roundRect(
      this.boardX,
      this.boardY,
      boardWidth,
      boardHeight,
      18
    ).fill({ color: 0x3E344C, alpha: 0.98 });

    // 3. 網格線 (柔和微紫線條)
    const grid = this.gridGraphics;
    grid.clear();
    for (let c = 1; c < BOARD_COLS; c++) {
      const x = this.boardX + c * this.cellSize;
      grid.moveTo(x, this.boardY);
      grid.lineTo(x, this.boardY + boardHeight);
      grid.stroke({ width: 1, color: 0x544766, alpha: 0.65 });
    }
    for (let r = 1; r < BOARD_ROWS; r++) {
      const y = this.boardY + r * this.cellSize;
      grid.moveTo(this.boardX, y);
      grid.lineTo(this.boardX + boardWidth, y);
      grid.stroke({ width: 1, color: 0x544766, alpha: 0.65 });
    }
  }

  // 繪製生動的糖果果凍方塊 (圓角、高光、深色陰影、生動大眼萌臉)
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
    const radius = Math.round(size * 0.32);
    const x = pixelX + 1;
    const y = pixelY + 1;

    if (isGhost) {
      // 虛影：半透明發光圓角外框
      g.roundRect(x + 1, y + 1, size - 2, size - 2, radius)
        .stroke({ width: 2, color: color, alpha: 0.45 });
      return;
    }

    // 1. 本體糖果圓角方塊
    g.roundRect(x, y, size, size, radius).fill({ color, alpha });

    // 2. 底部暗色立體陰影層 (增添厚實果凍感)
    g.roundRect(x + 2, y + size - 6, size - 4, 4, radius * 0.4)
      .fill({ color: 0x000000, alpha: 0.16 * alpha });

    // 3. 頂部晶瑩弧形高光反光 (Glossy Jelly Shine)
    g.ellipse(x + size * 0.33, y + size * 0.24, size * 0.25, size * 0.13)
      .fill({ color: 0xFFFFFF, alpha: 0.65 * alpha });

    // 4. 萌眼表情
    if (!isGhost && size >= 20) {
      this.drawCuteFace(g, x, y, size, faceIndex, alpha);
    }
  }

  // 繪製生動卡通笑臉表情
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
    const eyeRadius = Math.max(1.8, size * 0.08);
    const eyeColor = 0x2A1C25;

    if (faceIndex === 0) {
      // 圓滾滾大眼（含水汪汪高光白點）+ 微笑嘴角 + 腮紅
      g.circle(leftEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.9 * alpha });
      g.circle(leftEyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.35, eyeRadius * 0.35).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });

      g.circle(rightEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.9 * alpha });
      g.circle(rightEyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.35, eyeRadius * 0.35).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });

      // 粉嫩腮紅
      g.circle(leftEyeX - eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });
      g.circle(rightEyeX + eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });

      // 微笑嘴型
      g.moveTo(x + size * 0.44, eyeY + eyeRadius * 0.8);
      g.quadraticCurveTo(x + size * 0.5, eyeY + eyeRadius * 1.7, x + size * 0.56, eyeY + eyeRadius * 0.8);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });
    } else if (faceIndex === 1) {
      // 眨眼表情 (左眼大圓水汪汪、右眼彎月瞇眼 ^)
      g.circle(leftEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.9 * alpha });
      g.circle(leftEyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.35, eyeRadius * 0.35).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });

      g.moveTo(rightEyeX - eyeRadius * 1.2, eyeY + 1);
      g.lineTo(rightEyeX, eyeY - eyeRadius * 1.1);
      g.lineTo(rightEyeX + eyeRadius * 1.2, eyeY + 1);
      g.stroke({ width: 1.8, color: eyeColor, alpha: 0.9 * alpha });

      g.circle(leftEyeX - eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });
      g.circle(rightEyeX + eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });

      g.moveTo(x + size * 0.44, eyeY + eyeRadius * 0.8);
      g.quadraticCurveTo(x + size * 0.5, eyeY + eyeRadius * 1.7, x + size * 0.56, eyeY + eyeRadius * 0.8);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });
    } else if (faceIndex === 2) {
      // 超開心笑瞇眼 (^ ^)
      g.moveTo(leftEyeX - eyeRadius * 1.1, eyeY + 1);
      g.lineTo(leftEyeX, eyeY - eyeRadius * 1.1);
      g.lineTo(leftEyeX + eyeRadius * 1.1, eyeY + 1);
      g.stroke({ width: 1.8, color: eyeColor, alpha: 0.9 * alpha });

      g.moveTo(rightEyeX - eyeRadius * 1.1, eyeY + 1);
      g.lineTo(rightEyeX, eyeY - eyeRadius * 1.1);
      g.lineTo(rightEyeX + eyeRadius * 1.1, eyeY + 1);
      g.stroke({ width: 1.8, color: eyeColor, alpha: 0.9 * alpha });

      g.circle(leftEyeX - eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });
      g.circle(rightEyeX + eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });

      g.moveTo(x + size * 0.42, eyeY + eyeRadius * 0.8);
      g.quadraticCurveTo(x + size * 0.5, eyeY + eyeRadius * 1.8, x + size * 0.58, eyeY + eyeRadius * 0.8);
      g.stroke({ width: 1.5, color: eyeColor, alpha: 0.85 * alpha });
    } else {
      // 大笑張嘴表情 ( :D )
      g.circle(leftEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.9 * alpha });
      g.circle(leftEyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.35, eyeRadius * 0.35).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });

      g.circle(rightEyeX, eyeY, eyeRadius).fill({ color: eyeColor, alpha: 0.9 * alpha });
      g.circle(rightEyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.35, eyeRadius * 0.35).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });

      // 粉嫩腮紅
      g.circle(leftEyeX - eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });
      g.circle(rightEyeX + eyeRadius * 1.1, eyeY + eyeRadius * 1.1, eyeRadius * 1.1).fill({ color: 0xFF5D84, alpha: 0.45 * alpha });

      // 開朗張嘴 (D 形半圓) - 明確 moveTo 弧線起點並 closePath，解決自畫布 (0,0) 牽引的紅色射線問題
      const mouthX = x + size * 0.5;
      const mouthY = eyeY + eyeRadius * 0.7;
      const mouthR = eyeRadius * 1.3;
      g.moveTo(mouthX + mouthR, mouthY);
      g.arc(mouthX, mouthY, mouthR, 0, Math.PI, false);
      g.closePath();
      g.fill({ color: 0xFF5D84, alpha: 0.85 * alpha });
      g.stroke({ width: 1.2, color: eyeColor, alpha: 0.85 * alpha });
    }
  }

  // 繪製棋盤已鎖定方塊
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

  // 繪製 Ghost 落地虛影
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
        this.drawJellyBlock(g, px, py, piece.color, 0.4, 0, true);
      }
    }
  }

  // 繪製下落中的活動方塊
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

  // 繪製右上角可愛雲朵 NEXT 預覽
  public renderNextPiece(type: TetrominoType): void {
    const g = this.nextPreviewGraphics;
    g.clear();

    const color = CANDY_COLORS[type];
    const previewCellSize = Math.max(14, Math.floor(this.cellSize * 0.65));
    const blocks = TETROMINO_SHAPES[type][0];

    // 邊界定位
    let minX = 4, maxX = 0, minY = 4, maxY = 0;
    blocks.forEach(b => {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y);
    });

    const pieceW = (maxX - minX + 1) * previewCellSize;
    const pieceH = (maxY - minY + 1) * previewCellSize;

    const cloudW = Math.max(68, previewCellSize * 4 + 14);
    const cloudH = Math.max(52, previewCellSize * 2.6 + 14);
    const cloudX = this.boardX + (this.cellSize * BOARD_COLS) - cloudW + 6;
    const cloudY = Math.max(8, this.boardY - cloudH - 10);

    // 蓬鬆白雲外形 (3個圓球堆疊)
    g.circle(cloudX + cloudW * 0.32, cloudY + cloudH * 0.58, cloudH * 0.38).fill({ color: 0xFFFFFF, alpha: 0.95 });
    g.circle(cloudX + cloudW * 0.68, cloudY + cloudH * 0.58, cloudH * 0.38).fill({ color: 0xFFFFFF, alpha: 0.95 });
    g.circle(cloudX + cloudW * 0.5, cloudY + cloudH * 0.42, cloudH * 0.45).fill({ color: 0xFFFFFF, alpha: 0.95 });
    g.roundRect(cloudX + cloudW * 0.15, cloudY + cloudH * 0.4, cloudW * 0.7, cloudH * 0.45, 12).fill({ color: 0xFFFFFF, alpha: 0.95 });

    // 雲朵柔和藍粉外框
    g.circle(cloudX + cloudW * 0.32, cloudY + cloudH * 0.58, cloudH * 0.38).stroke({ width: 2, color: 0xB8E0D2, alpha: 0.85 });
    g.circle(cloudX + cloudW * 0.68, cloudY + cloudH * 0.58, cloudH * 0.38).stroke({ width: 2, color: 0xB8E0D2, alpha: 0.85 });
    g.circle(cloudX + cloudW * 0.5, cloudY + cloudH * 0.42, cloudH * 0.45).stroke({ width: 2, color: 0xB8E0D2, alpha: 0.85 });

    // 置中繪製小方塊
    const offsetX = cloudX + (cloudW - pieceW) / 2 - minX * previewCellSize;
    const offsetY = cloudY + (cloudH - pieceH) / 2 - minY * previewCellSize + 2;

    blocks.forEach(b => {
      const px = offsetX + b.x * previewCellSize;
      const py = offsetY + b.y * previewCellSize;
      const s = previewCellSize - 1;
      const r = Math.round(s * 0.32);

      g.roundRect(px, py, s, s, r).fill({ color });
      g.ellipse(px + s * 0.35, py + s * 0.25, s * 0.22, s * 0.12).fill({ color: 0xFFFFFF, alpha: 0.65 });
    });
  }

  // 消除行時的金色小星星與彩色碎糖粒子爆炸
  public emitLineClearParticles(clearedRows: number[]): void {
    const colors = [0xFFD13B, 0xFF5277, 0x38B6FF, 0x52D681, 0xBF55EC, 0xFF9233];

    for (const r of clearedRows) {
      const visibleRow = r - HIDDEN_ROWS;
      const y = this.boardY + visibleRow * this.cellSize + this.cellSize / 2;

      for (let i = 0; i < 35; i++) {
        const x = this.boardX + Math.random() * (this.cellSize * BOARD_COLS);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 5.5;

        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.0,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.25,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 6,
          alpha: 1.0,
          isStar: Math.random() > 0.35
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
      p.vy += 0.2 * delta; // 重力下墜
      p.rotation += p.vRot * delta;
      p.alpha -= 0.024 * delta;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isStar) {
        this.drawMiniStar(g, p.x, p.y, p.size, p.color, p.alpha);
      } else {
        g.circle(p.x, p.y, p.size * 0.55).fill({ color: p.color, alpha: p.alpha });
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

  public render(): void {
    this.renderBoardBlocks();
    this.renderGhostPiece();
    this.renderActivePiece();
    this.renderNextPiece(this.game.nextPieceType);
  }
}
