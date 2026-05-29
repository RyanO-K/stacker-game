"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = exports.POINTS_PER_CELL = exports.PERFECT_BONUS = exports.MAX_HIGH_SCORES = exports.SCORES_FILE = exports.SERVER_PORT = exports.IDLE_TIMEOUT_MS = exports.MIN_TICK_MS = exports.TICK_SPEED_STEP = exports.BASE_TICK_MS = exports.INITIAL_BLOCK_WIDTH = exports.CANVAS_HEIGHT = exports.CANVAS_WIDTH = exports.GRID = void 0;
exports.GRID = { cols: 10, rows: 15, cellSize: 32 };
exports.CANVAS_WIDTH = exports.GRID.cols * exports.GRID.cellSize; // 320
exports.CANVAS_HEIGHT = exports.GRID.rows * exports.GRID.cellSize; // 480
exports.INITIAL_BLOCK_WIDTH = 7;
exports.BASE_TICK_MS = 400;
exports.TICK_SPEED_STEP = 25; // ms faster per level above 1
exports.MIN_TICK_MS = 80;
exports.IDLE_TIMEOUT_MS = 10000;
exports.SERVER_PORT = 3001;
exports.SCORES_FILE = 'scores.json';
exports.MAX_HIGH_SCORES = 10;
exports.PERFECT_BONUS = 50;
exports.POINTS_PER_CELL = 10;
exports.COLORS = {
    background: '#1a1a2e',
    grid: '#16213e',
    platform: '#2a2060',
    blockBottom: '#7a2040',
    blockTop: '#e94560',
    blockActive: '#e94560',
    blockPerfect: '#f5a623',
    npcBlock: '#00b4d8',
    text: '#eaeaea',
    overlay: 'rgba(0,0,0,0.6)',
};
