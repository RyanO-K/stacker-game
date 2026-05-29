import type { Block, GameState, GridConfig } from '../shared/types';
import {
  GRID,
  INITIAL_BLOCK_WIDTH,
  BASE_TICK_MS,
  TICK_SPEED_STEP,
  MIN_TICK_MS,
  POINTS_PER_CELL,
  PERFECT_BONUS,
} from '../shared/constants';

export function computeTickInterval(level: number): number {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - (level - 1) * TICK_SPEED_STEP);
}

export function computeLevel(placedCount: number): number {
  // Level increases every 3 successful placements (after the initial platform)
  return Math.floor((placedCount - 1) / 3) + 1;
}

/** Returns the overlap of two blocks, or null if they don't overlap. */
export function intersectBlocks(a: Block, b: Block): Block | null {
  const left  = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  if (right <= left) return null;
  return { x: left, width: right - left };
}

/** Returns true when a and b are identical (same x and width). */
export function isPerfectMatch(a: Block, b: Block): boolean {
  return a.x === b.x && a.width === b.width;
}

export function createInitialState(grid: GridConfig = GRID): GameState {
  const platform: Block = { x: 0, width: grid.cols };
  const currentBlock: Block = {
    x: Math.floor((grid.cols - INITIAL_BLOCK_WIDTH) / 2),
    width: INITIAL_BLOCK_WIDTH,
  };
  return {
    placedBlocks: [platform],
    currentBlock,
    direction: 'RIGHT',
    score: 0,
    status: 'IDLE',
    tickCount: 0,
    level: 1,
    lastDropPerfect: false,
  };
}

/** Move the current block one cell. Reverses direction at walls. */
export function moveTick(state: GameState): GameState {
  if (state.status !== 'PLAYING' && state.status !== 'NPC_DEMO') return state;

  const { currentBlock, direction } = state;
  const cols = GRID.cols;

  let newX = currentBlock.x + (direction === 'RIGHT' ? 1 : -1);
  let newDir = direction;

  if (newX < 0) {
    newX = 0;
    newDir = 'RIGHT';
  } else if (newX + currentBlock.width > cols) {
    newX = cols - currentBlock.width;
    newDir = 'LEFT';
  }

  return {
    ...state,
    currentBlock: { ...currentBlock, x: newX },
    direction: newDir,
    tickCount: state.tickCount + 1,
  };
}

/** Drop the current block onto the stack. Returns updated game state. */
export function dropBlock(state: GameState): GameState {
  if (state.status !== 'PLAYING' && state.status !== 'NPC_DEMO') return state;

  const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
  const intersection = intersectBlocks(state.currentBlock, topPlaced);

  if (!intersection) {
    return { ...state, status: 'GAME_OVER', tickCount: state.tickCount + 1 };
  }

  const perfect = isPerfectMatch(intersection, topPlaced) && isPerfectMatch(intersection, state.currentBlock);
  const points  = intersection.width * POINTS_PER_CELL + (perfect ? PERFECT_BONUS : 0);
  const newPlaced = [...state.placedBlocks, intersection];
  const newLevel  = computeLevel(newPlaced.length);

  // Win: stack has filled all rows
  if (newPlaced.length >= GRID.rows) {
    return {
      ...state,
      placedBlocks: newPlaced,
      score: state.score + points,
      status: state.status === 'NPC_DEMO' ? 'NPC_DEMO' : 'WIN',
      level: newLevel,
      lastDropPerfect: perfect,
      tickCount: state.tickCount + 1,
    };
  }

  // Next block starts at the intersection position, alternating start direction
  const nextBlock: Block = { x: intersection.x, width: intersection.width };
  const nextDir  = state.direction === 'RIGHT' ? 'LEFT' : 'RIGHT';

  return {
    ...state,
    placedBlocks: newPlaced,
    currentBlock: nextBlock,
    direction: nextDir,
    score: state.score + points,
    level: newLevel,
    lastDropPerfect: perfect,
    tickCount: state.tickCount + 1,
  };
}
