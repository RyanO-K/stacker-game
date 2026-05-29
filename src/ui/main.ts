import {
  GRID,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  IDLE_TIMEOUT_MS,
} from '../shared/constants';
import type { GameEvent, ScoreBoard } from '../shared/types';
import { createInitialState, moveTick, dropBlock, computeTickInterval } from '../game/core';
import { render } from './renderer';
import { attachInputHandlers } from './input';
import { ScoreManager } from '../score/score-manager';
import { NpcController } from '../npc/ai';

// ── Canvas setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width  = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;

// ── Score manager ─────────────────────────────────────────────────────────────
const scoreManager = new ScoreManager();

// ── Game state ────────────────────────────────────────────────────────────────
let state = createInitialState(GRID);

// ── Timers ────────────────────────────────────────────────────────────────────
let tickTimer: number | null = null;
let idleTimer: number | null = null;
let currentTickInterval      = computeTickInterval(1);

// ── NPC ───────────────────────────────────────────────────────────────────────
const npc = new NpcController();

// ── DOM helpers ───────────────────────────────────────────────────────────────
function updateScoreDom(board: ScoreBoard): void {
  const list = document.getElementById('score-list');
  if (!list) return;
  list.innerHTML = '';
  for (const entry of board.entries) {
    const li        = document.createElement('li');
    const nameSpan  = document.createElement('span');
    nameSpan.textContent  = entry.name;
    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = String(entry.score);
    li.appendChild(nameSpan);
    li.appendChild(scoreSpan);
    list.appendChild(li);
  }
}

function updateDom(): void {
  const container = document.getElementById('game-container')!;
  container.setAttribute('data-game-status', state.status);

  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = String(state.score);

  const levelEl = document.getElementById('level-display');
  if (levelEl) levelEl.textContent = String(state.level);

  const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
  if (startBtn) {
    startBtn.hidden = !(
      state.status === 'IDLE' ||
      state.status === 'GAME_OVER' ||
      state.status === 'WIN'
    );
  }

  const overlay = document.getElementById('game-over-overlay') as HTMLElement | null;
  if (overlay) overlay.hidden = state.status !== 'GAME_OVER';

  const winOverlay = document.getElementById('win-overlay') as HTMLElement | null;
  if (winOverlay) winOverlay.hidden = state.status !== 'WIN';
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function startGameLoop(): void {
  if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }

  currentTickInterval = computeTickInterval(state.level);

  tickTimer = window.setInterval(() => {
    if (state.status === 'NPC_DEMO' && npc.shouldDrop(state)) {
      state = dropBlock(state);
    } else {
      state = moveTick(state);
    }

    render(ctx, state, scoreManager.getHighScore());
    updateDom();

    if (state.status === 'GAME_OVER') {
      if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
      onGameOver();
      return;
    }

    if (state.status === 'WIN') {
      if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
      onWin();
      return;
    }

    // Restart loop if level changed (speed update)
    const newInterval = computeTickInterval(state.level);
    if (newInterval !== currentTickInterval) {
      startGameLoop();
    }
  }, currentTickInterval);
}

// ── NPC demo ──────────────────────────────────────────────────────────────────
function startNpcDemo(): void {
  npc.reset();
  state = { ...createInitialState(GRID), status: 'NPC_DEMO' };
  updateDom();
  startGameLoop();
}

// ── Idle timeout ──────────────────────────────────────────────────────────────
function startIdleTimeout(): void {
  if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
  idleTimer = window.setTimeout(() => startNpcDemo(), IDLE_TIMEOUT_MS);
}

// ── End-of-game handlers ──────────────────────────────────────────────────────
function onGameOver(): void {
  render(ctx, state, scoreManager.getHighScore());
  updateDom();
  const finalScoreEl = document.getElementById('final-score');
  if (finalScoreEl) finalScoreEl.textContent = String(state.score);
  const initialsInput = document.getElementById('initials-input') as HTMLInputElement | null;
  if (initialsInput) initialsInput.focus();
}

function onWin(): void {
  render(ctx, state, scoreManager.getHighScore());
  updateDom();
  const winScoreEl = document.getElementById('win-score');
  if (winScoreEl) winScoreEl.textContent = String(state.score);
  const initialsInput = document.getElementById('win-initials-input') as HTMLInputElement | null;
  if (initialsInput) initialsInput.focus();
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
function dispatch(event: GameEvent): void {
  switch (event.type) {
    case 'START_GAME':
      if (
        state.status === 'IDLE' ||
        state.status === 'GAME_OVER' ||
        state.status === 'WIN' ||
        state.status === 'NPC_DEMO'
      ) {
        if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
        npc.reset();
        state = { ...createInitialState(GRID), status: 'PLAYING' };
        updateDom();
        startGameLoop();
      }
      break;

    case 'PAUSE_GAME':
      if (state.status === 'PLAYING') {
        state = { ...state, status: 'PAUSED' };
        if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
        render(ctx, state, scoreManager.getHighScore());
        updateDom();
      }
      break;

    case 'RESUME_GAME':
      if (state.status === 'PAUSED') {
        state = { ...state, status: 'PLAYING' };
        updateDom();
        startGameLoop();
      }
      break;

    case 'RESET_GAME':
      if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
      if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
      npc.reset();
      state = createInitialState(GRID);
      render(ctx, state, scoreManager.getHighScore());
      updateDom();
      startIdleTimeout();
      break;

    case 'DROP_BLOCK':
      if (state.status === 'PLAYING') {
        state = dropBlock(state);
        render(ctx, state, scoreManager.getHighScore());
        updateDom();
        if (state.status === 'GAME_OVER') {
          if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
          onGameOver();
        } else if (state.status === 'WIN') {
          if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
          onWin();
        } else {
          // Restart loop if level changed
          const newInterval = computeTickInterval(state.level);
          if (newInterval !== currentTickInterval) {
            startGameLoop();
          }
        }
      }
      break;

    case 'SUBMIT_SCORE':
      scoreManager
        .submit({ name: event.name, score: state.score, timestamp: Date.now() })
        .then((board) => updateScoreDom(board))
        .catch(() => { /* silent */ });
      state = createInitialState(GRID);
      updateDom();
      startIdleTimeout();
      break;

    default:
      break;
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    const board = await scoreManager.load();
    updateScoreDom(board);
  } catch { /* ignore */ }
})();

attachInputHandlers(dispatch, () => state.status);

document.getElementById('start-btn')?.addEventListener('click', () => {
  dispatch({ type: 'START_GAME' });
});

function wireSubmitBtn(btnId: string, inputId: string): void {
  document.getElementById(btnId)?.addEventListener('click', () => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const name  = (input?.value ?? 'AAA').slice(0, 3).toUpperCase() || 'AAA';
    if (input) input.value = '';
    dispatch({ type: 'SUBMIT_SCORE', name });
  });
}

wireSubmitBtn('submit-score-btn', 'initials-input');
wireSubmitBtn('win-submit-btn',   'win-initials-input');

render(ctx, state, scoreManager.getHighScore());
updateDom();
startIdleTimeout();

// ── Test helpers ──────────────────────────────────────────────────────────────
(window as any).__test__ = {
  forceMiss() {
    // Move current block completely outside top placed block — next drop = GAME_OVER
    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    const missX = topPlaced.x + topPlaced.width + 1; // guaranteed no overlap
    state = {
      ...state,
      currentBlock: { ...state.currentBlock, x: Math.min(missX, GRID.cols - state.currentBlock.width) },
    };
    // Force a complete miss by placing it fully outside
    state = { ...state, currentBlock: { x: 0, width: 0 } };
  },
  forcePerfect() {
    // Align current block exactly to top placed block
    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    state = { ...state, currentBlock: { x: topPlaced.x, width: topPlaced.width } };
  },
  forceDrop() {
    if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
    state = dropBlock(state);
    render(ctx, state, scoreManager.getHighScore());
    updateDom();
    if (state.status === 'GAME_OVER') {
      onGameOver();
    } else if (state.status === 'WIN') {
      onWin();
    } else {
      startGameLoop();
    }
  },
  forceGameOver() {
    if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
    state = { ...state, status: 'GAME_OVER' };
    render(ctx, state, scoreManager.getHighScore());
    updateDom();
    onGameOver();
  },
  forcePartialOverlap() {
    // Shift current block 3 cells into topPlaced from the right, guaranteeing partial overlap
    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    const newX = Math.min(topPlaced.x + 3, GRID.cols - state.currentBlock.width);
    state = { ...state, currentBlock: { ...state.currentBlock, x: newX } };
  },
  forceWin() {
    // Fill placedBlocks to trigger WIN on next drop
    const { cols, rows } = GRID;
    const fakeBlocks = Array.from({ length: rows - 1 }, (_, i) => ({
      x: 0, width: Math.max(1, cols - i),
    }));
    state = {
      ...state,
      placedBlocks: fakeBlocks,
      currentBlock: { x: fakeBlocks[fakeBlocks.length - 1].x, width: fakeBlocks[fakeBlocks.length - 1].width },
    };
  },
  getState() { return state; },
};
