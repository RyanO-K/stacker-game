import http from 'http';
import fs from 'fs';
import path from 'path';
import { SERVER_PORT, SCORES_FILE, MAX_HIGH_SCORES } from '../shared/constants';
import type { ScoreEntry, ScoreBoard } from '../shared/types';

const PUBLIC_DIR  = path.resolve(__dirname, '../../public');
const SCORES_PATH = path.resolve(__dirname, '../../', SCORES_FILE);

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
};

function readScoreBoard(): ScoreBoard {
  try {
    return JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8')) as ScoreBoard;
  } catch {
    return { entries: [], highScore: 0 };
  }
}

function writeScoreBoard(board: ScoreBoard): void {
  fs.writeFileSync(SCORES_PATH, JSON.stringify(board, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  const method = req.method ?? 'GET';
  const url    = req.url   ?? '/';

  if (method === 'GET' && url === '/api/scores') {
    const board = readScoreBoard();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(board));
    return;
  }

  if (method === 'POST' && url === '/api/scores') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const entry   = JSON.parse(body) as ScoreEntry;
        const board   = readScoreBoard();
        const merged  = [...board.entries, entry]
          .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
          .slice(0, MAX_HIGH_SCORES);
        const updated: ScoreBoard = { entries: merged, highScore: merged[0]?.score ?? 0 };
        writeScoreBoard(updated);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  const filePath = url === '/' ? '/index.html' : url;
  const absPath  = path.join(PUBLIC_DIR, filePath);
  const ext      = path.extname(absPath);

  fs.readFile(absPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  });
});

const port = Number(process.env.PORT) || SERVER_PORT;
server.listen(port, () => {
  console.log(`Stacker server running at http://localhost:${port}`);
});
