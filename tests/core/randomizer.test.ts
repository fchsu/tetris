import { describe, expect, it } from 'vitest';
import { Randomizer } from '../../src/core/randomizer';
import { TetrominoType } from '../../src/core/types';

const ALL_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

describe('Randomizer (7-Bag Distribution)', () => {
  it('每連續取 7 個方塊必須包含完整且不重複的 7 種方塊', () => {
    const randomizer = new Randomizer();
    const firstBag: TetrominoType[] = [];

    for (let i = 0; i < 7; i++) {
      firstBag.push(randomizer.next());
    }

    expect(new Set(firstBag).size).toBe(7);
    for (const type of ALL_TYPES) {
      expect(firstBag).toContain(type);
    }
  });

  it('跨 Bag 生成依然維持無重複 7-Bag 特性', () => {
    const randomizer = new Randomizer();
    const secondBag: TetrominoType[] = [];

    // 消耗第一個 bag
    for (let i = 0; i < 7; i++) randomizer.next();

    // 取第二個 bag
    for (let i = 0; i < 7; i++) {
      secondBag.push(randomizer.next());
    }

    expect(new Set(secondBag).size).toBe(7);
    for (const type of ALL_TYPES) {
      expect(secondBag).toContain(type);
    }
  });
});
