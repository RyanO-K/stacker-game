"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../shared/constants");
const PUBLIC_DIR = path_1.default.resolve(__dirname, '../../public');
const SCORES_PATH = path_1.default.resolve(__dirname, '../../', constants_1.SCORES_FILE);
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
};
function readScoreBoard() {
    try {
        return JSON.parse(fs_1.default.readFileSync(SCORES_PATH, 'utf-8'));
    }
    catch {
        return { entries: [], highScore: 0 };
    }
}
function writeScoreBoard(board) {
    fs_1.default.writeFileSync(SCORES_PATH, JSON.stringify(board, null, 2), 'utf-8');
}
const server = http_1.default.createServer((req, res) => {
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';
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
                const entry = JSON.parse(body);
                const board = readScoreBoard();
                const merged = [...board.entries, entry]
                    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
                    .slice(0, constants_1.MAX_HIGH_SCORES);
                const updated = { entries: merged, highScore: merged[0]?.score ?? 0 };
                writeScoreBoard(updated);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(updated));
            }
            catch {
                res.writeHead(400);
                res.end('Bad request');
            }
        });
        return;
    }
    const filePath = url === '/' ? '/index.html' : url;
    const absPath = path_1.default.join(PUBLIC_DIR, filePath);
    const ext = path_1.default.extname(absPath);
    fs_1.default.readFile(absPath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        res.end(data);
    });
});
const port = Number(process.env.PORT) || constants_1.SERVER_PORT;
server.listen(port, () => {
    console.log(`Stacker server running at http://localhost:${port}`);
});
