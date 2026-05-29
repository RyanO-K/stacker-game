export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'NPC_DEMO';

export interface Block {
  x: number;     // leftmost column (0-based)
  width: number; // number of columns
}

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
}

export interface GameState {
  placedBlocks: Block[];    // [0] = bottom platform; grows upward on each successful drop
  currentBlock: Block;      // the moving block on the current row
  direction: 'LEFT' | 'RIGHT';
  score: number;
  status: GameStatus;
  tickCount: number;
  level: number;
  lastDropPerfect: boolean;
}

export interface ScoreEntry {
  name: string;
  score: number;
  timestamp: number;
}

export interface ScoreBoard {
  entries: ScoreEntry[];
  highScore: number;
}

export type GameEvent =
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'DROP_BLOCK' }
  | { type: 'SUBMIT_SCORE'; name: string };
