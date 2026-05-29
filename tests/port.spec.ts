/**
 * Verifies the server can start on alternate ports via PORT env var.
 * Each test spawns its own server instance on a unique port.
 */
import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const SERVER_JS = path.resolve(__dirname, '../dist/server/server.js');

function startServer(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [SERVER_JS], {
      env: { ...process.env, PORT: String(port) },
      stdio: 'pipe',
    });
    proc.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('localhost:' + port)) resolve(proc);
    });
    proc.on('error', reject);
    setTimeout(() => reject(new Error(`Server on port ${port} did not start in time`)), 5000);
  });
}

function stopServer(proc: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    proc.on('close', () => resolve());
    proc.kill();
  });
}

for (const port of [3002, 4001, 8081]) {
  test(`server starts on port ${port} and serves HTML with title "Stacker"`, async ({ request }) => {
    const proc = await startServer(port);
    try {
      const res  = await request.get(`http://localhost:${port}/`);
      expect(res.ok()).toBeTruthy();
      const html = await res.text();
      expect(html).toContain('<title>Stacker</title>');
    } finally {
      await stopServer(proc);
    }
  });

  test(`GET /api/scores on port ${port} returns valid JSON`, async ({ request }) => {
    const proc = await startServer(port);
    try {
      const res  = await request.get(`http://localhost:${port}/api/scores`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty('entries');
    } finally {
      await stopServer(proc);
    }
  });
}
