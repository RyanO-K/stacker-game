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
let currentTickInterval      = computeTickInterval(0);

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

function dropCount(): number {
  return state.placedBlocks.length - 1;
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
    startBtn.hidden = !(state.status === 'IDLE' || state.status === 'GAME_OVER');
  }

  const overlay = document.getElementById('game-over-overlay') as HTMLElement | null;
  if (overlay) overlay.hidden = state.status !== 'GAME_OVER';
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function startGameLoop(): void {
  if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }

  currentTickInterval = computeTickInterval(dropCount());

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

    // Restart loop when speed changes after a drop
    const newInterval = computeTickInterval(dropCount());
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

// ── Game over handler ─────────────────────────────────────────────────────────
function onGameOver(): void {
  render(ctx, state, scoreManager.getHighScore());
  updateDom();
  const finalScoreEl = document.getElementById('final-score');
  if (finalScoreEl) finalScoreEl.textContent = String(state.score);
  const initialsInput = document.getElementById('initials-input') as HTMLInputElement | null;
  if (initialsInput) initialsInput.focus();
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
function dispatch(event: GameEvent): void {
  switch (event.type) {
    case 'START_GAME':
      if (state.status === 'IDLE' || state.status === 'GAME_OVER' || state.status === 'NPC_DEMO') {
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
        } else {
          const newInterval = computeTickInterval(dropCount());
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

document.getElementById('submit-score-btn')?.addEventListener('click', () => {
  const input = document.getElementById('initials-input') as HTMLInputElement | null;
  const name  = (input?.value ?? 'AAA').slice(0, 3).toUpperCase() || 'AAA';
  if (input) input.value = '';
  dispatch({ type: 'SUBMIT_SCORE', name });
  startIdleTimeout();
});

render(ctx, state, scoreManager.getHighScore());
updateDom();
startIdleTimeout();

// ── Test helpers ──────────────────────────────────────────────────────────────
(window as any).__test__ = {
  forcePerfect() {
    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    state = { ...state, currentBlock: { x: topPlaced.x, width: topPlaced.width } };
  },
  forcePartialOverlap() {
    const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
    const newX = Math.min(topPlaced.x + 3, GRID.cols - state.currentBlock.width);
    state = { ...state, currentBlock: { ...state.currentBlock, x: newX } };
  },
  forceDrop() {
    if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
    state = dropBlock(state);
    render(ctx, state, scoreManager.getHighScore());
    updateDom();
    if (state.status === 'GAME_OVER') {
      onGameOver();
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
  getState() { return state; },
};
