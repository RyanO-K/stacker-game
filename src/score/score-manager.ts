import type { ScoreBoard, ScoreEntry } from '../shared/types';
import { MAX_HIGH_SCORES } from '../shared/constants';

const LS_KEY = 'stacker-scores';

export class ScoreManager {
  private board: ScoreBoard = { entries: [], highScore: 0 };

  async load(): Promise<ScoreBoard> {
    try {
      const res  = await fetch('/api/scores');
      const data = await res.json() as ScoreBoard;
      this.board = data;
      localStorage.setItem(LS_KEY, JSON.stringify(this.board));
    } catch {
      try {
        const raw    = localStorage.getItem(LS_KEY) ?? 'null';
        const parsed = JSON.parse(raw) as ScoreBoard | null;
        this.board   = parsed ?? { entries: [], highScore: 0 };
      } catch {
        this.board = { entries: [], highScore: 0 };
      }
    }
    return this.board;
  }

  async submit(entry: ScoreEntry): Promise<ScoreBoard> {
    try {
      const res  = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(entry),
      });
      const data = await res.json() as ScoreBoard;
      this.board = data;
      localStorage.setItem(LS_KEY, JSON.stringify(this.board));
    } catch {
      const merged = ScoreManager.mergeEntry(this.board.entries, entry);
      this.board   = { entries: merged, highScore: merged[0]?.score ?? 0 };
      localStorage.setItem(LS_KEY, JSON.stringify(this.board));
    }
    return this.board;
  }

  getBoard(): ScoreBoard    { return this.board; }
  getHighScore(): number    { return this.board.highScore; }

  static mergeEntry(entries: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
    return [...entries, entry]
      .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
      .slice(0, MAX_HIGH_SCORES);
  }
}
