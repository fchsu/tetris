import { TetrominoType } from './types';

const TETROMINOES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class Randomizer {
  private bag: TetrominoType[] = [];

  constructor() {
    this.refillBag();
  }

  // 7-Bag 洗牌演算法
  private refillBag(): void {
    const newBag = [...TETROMINOES];
    // Fisher-Yates 洗牌
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    this.bag = newBag;
  }

  // 取得下一個方塊
  public next(): TetrominoType {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    return this.bag.pop()!;
  }

  // 窺視接下來的方塊（不消耗）
  public peek(count: number = 1): TetrominoType[] {
    const result: TetrominoType[] = [];
    const tempBag = [...this.bag];

    while (result.length < count) {
      if (tempBag.length === 0) {
        const extraBag = [...TETROMINOES];
        for (let i = extraBag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [extraBag[i], extraBag[j]] = [extraBag[j], extraBag[i]];
        }
        tempBag.push(...extraBag);
      }
      result.push(tempBag.pop()!);
    }

    return result;
  }
}
