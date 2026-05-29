import type { GridConfig } from './types';

export const GRID: GridConfig = { cols: 10, rows: 15, cellSize: 32 };
export const CANVAS_WIDTH  = GRID.cols * GRID.cellSize;  // 320
export const CANVAS_HEIGHT = GRID.rows * GRID.cellSize;  // 480

export const INITIAL_BLOCK_WIDTH = 7;
export const BASE_TICK_MS        = 400;
export const SPEED_PER_DROP      = 4;    // ms faster per successful drop
export const MIN_TICK_MS         = 80;
export const IDLE_TIMEOUT_MS     = 10_000;
export const SERVER_PORT         = 3001;
export const SCORES_FILE         = 'scores.json';
export const MAX_HIGH_SCORES     = 10;
export const PERFECT_BONUS       = 50;
export const POINTS_PER_CELL     = 10;

export const COLORS = {
  background:   '#1a1a2e',
  grid:         '#16213e',
  platform:     '#2a2060',
  blockBottom:  '#7a2040',
  blockTop:     '#e94560',
  blockActive:  '#e94560',
  blockPerfect: '#f5a623',
  npcBlock:     '#00b4d8',
  text:         '#eaeaea',
  overlay:      'rgba(0,0,0,0.6)',
};
