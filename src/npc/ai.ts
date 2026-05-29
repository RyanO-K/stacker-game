import type { GameState } from '../shared/types';
import { intersectBlocks } from '../game/core';

export class NpcController {
  private cooldown = 0;

  /** Returns true if the NPC should drop this tick. */
  shouldDrop(state: GameState): boolean {
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }

    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    const intersection = intersectBlocks(state.currentBlock, topPlaced);
    if (!intersection) return false;

    const overlapRatio = intersection.width / topPlaced.width;

    // Drop when overlap is 90%+ (near-perfect), with slight randomness
    if (overlapRatio >= 0.9 && Math.random() < 0.65) {
      this.cooldown = 2;
      return true;
    }

    return false;
  }

  reset(): void {
    this.cooldown = 0;
  }
}
