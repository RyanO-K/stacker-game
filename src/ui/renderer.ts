import type { GameState } from '../shared/types';
import type { Block } from '../shared/types';
import { GRID, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../shared/constants';

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

/**
 * Camera offset in rows. Keeps the active row near the top of the canvas
 * so the stack scrolls as it grows taller than the viewport.
 */
function computeViewOffset(state: GameState): number {
  const currentRow = state.placedBlocks.length;
  return Math.max(0, currentRow - (GRID.rows - 3));
}

/** Convert a logical row index to a canvas Y coordinate, accounting for scroll. */
function rowToY(row: number, viewOffset: number): number {
  return (GRID.rows - 1 - (row - viewOffset)) * GRID.cellSize;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  row: number,
  viewOffset: number,
  color: string,
  glowColor?: string,
): void {
  const x = block.x * GRID.cellSize + 1;
  const y = rowToY(row, viewOffset) + 1;
  const w = block.width * GRID.cellSize - 2;
  const h = GRID.cellSize - 2;

  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 2, y + 2, w - 4, 4);
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  highScore: number,
): void {
  const { cellSize, cols, rows } = GRID;
  const viewOffset = computeViewOffset(state);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid lines
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.5;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(CANVAS_WIDTH, r * cellSize); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Placed blocks — only those visible in the current viewport
  const totalPlaced = state.placedBlocks.length;
  const firstVisible = viewOffset;
  const lastVisible  = viewOffset + rows - 1;

  for (let i = firstVisible; i < totalPlaced && i <= lastVisible; i++) {
    const t   = totalPlaced > 1 ? i / (totalPlaced - 1) : 0;
    const col = i === 0
      ? COLORS.platform
      : lerpColor(COLORS.blockBottom, COLORS.blockTop, t);
    drawBlock(ctx, state.placedBlocks[i], i, viewOffset, col);
  }

  // Active / NPC moving block + ghost outline
  if (state.status === 'PLAYING' || state.status === 'NPC_DEMO') {
    const currentRow = totalPlaced;
    const topPlaced  = state.placedBlocks[totalPlaced - 1];

    // Ghost outline showing perfect-alignment target
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      topPlaced.x * cellSize + 1,
      rowToY(currentRow, viewOffset) + 1,
      topPlaced.width * cellSize - 2,
      cellSize - 2,
    );

    const activeColor = state.status === 'NPC_DEMO' ? COLORS.npcBlock : COLORS.blockActive;
    drawBlock(ctx, state.currentBlock, currentRow, viewOffset, activeColor, activeColor);
  }

  // IDLE overlay
  if (state.status === 'IDLE') {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.blockActive;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('STACKER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24);
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('Press SPACE to play', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8);
  }

  // PAUSED overlay
  if (state.status === 'PAUSED') {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);
  }

  // NPC demo tag
  if (state.status === 'NPC_DEMO') {
    ctx.fillStyle = 'rgba(0,180,216,0.4)';
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('NPC DEMO', CANVAS_WIDTH - 6, 14);
  }

  ctx.shadowBlur = 0;
  void highScore;
}
