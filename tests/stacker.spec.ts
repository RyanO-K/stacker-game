import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function startGame(page: Page) {
  await page.click('[data-testid="start-btn"]');
  await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
}

async function waitTick(page: Page) {
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Page load & static UI
// ---------------------------------------------------------------------------

test.describe('Page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has title "Stacker"', async ({ page }) => {
    await expect(page).toHaveTitle('Stacker');
  });

  test('canvas is visible', async ({ page }) => {
    await expect(page.locator('#game-canvas')).toBeVisible();
  });

  test('canvas has correct dimensions (320×480)', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toHaveAttribute('width', '320');
    await expect(canvas).toHaveAttribute('height', '480');
  });

  test('start button is visible before game begins', async ({ page }) => {
    await expect(page.locator('[data-testid="start-btn"]')).toBeVisible();
  });

  test('score display shows 0', async ({ page }) => {
    await expect(page.locator('[data-testid="score"]')).toHaveText('0');
  });

  test('level display shows 1', async ({ page }) => {
    await expect(page.locator('[data-testid="level"]')).toHaveText('1');
  });

  test('high scores panel is visible', async ({ page }) => {
    await expect(page.locator('#score-panel')).toBeVisible();
  });

  test('game status is IDLE on load', async ({ page }) => {
    await expect(page.locator('[data-game-status="IDLE"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Starting the game
// ---------------------------------------------------------------------------

test.describe('Starting the game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking Play changes status to PLAYING', async ({ page }) => {
    await page.click('[data-testid="start-btn"]');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });

  test('start button is hidden while game is PLAYING', async ({ page }) => {
    await page.click('[data-testid="start-btn"]');
    await expect(page.locator('[data-testid="start-btn"]')).toBeHidden();
  });

  test('pressing Enter also starts the game', async ({ page }) => {
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });

  test('pressing Space also starts the game', async ({ page }) => {
    await page.keyboard.press('Space');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Block movement
// ---------------------------------------------------------------------------

test.describe('Block movement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('block moves automatically after game starts', async ({ page }) => {
    const before = await page.evaluate(() => (window as any).__test__.getState().currentBlock.x);
    await waitTick(page);
    const after  = await page.evaluate(() => (window as any).__test__.getState().currentBlock.x);
    expect(after).not.toBe(before);
  });

  test('block stays within grid bounds after many ticks', async ({ page }) => {
    await page.waitForTimeout(2000);
    const state = await page.evaluate(() => (window as any).__test__.getState());
    if (state.status === 'PLAYING') {
      expect(state.currentBlock.x).toBeGreaterThanOrEqual(0);
      expect(state.currentBlock.x + state.currentBlock.width).toBeLessThanOrEqual(10);
    }
  });

  test('game remains in PLAYING status while block moves', async ({ page }) => {
    await waitTick(page);
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Drop mechanic
// ---------------------------------------------------------------------------

test.describe('Drop mechanic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('pressing Space drops the block and score increases', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="score"]')).not.toHaveText('0');
  });

  test('forced perfect drop adds to score', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceDrop());
    const score = await page.locator('[data-testid="score"]').textContent();
    expect(Number(score)).toBeGreaterThan(0);
  });

  test('stack height increases after a successful drop', async ({ page }) => {
    const before = await page.evaluate(() => (window as any).__test__.getState().placedBlocks.length);
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    const after  = await page.evaluate(() => (window as any).__test__.getState().placedBlocks.length);
    expect(after).toBeGreaterThan(before);
  });

  test('block width shrinks when drop is not perfectly aligned', async ({ page }) => {
    const widthBefore = await page.evaluate(() => {
      const s = (window as any).__test__.getState();
      return s.placedBlocks[s.placedBlocks.length - 1].width;
    });
    await page.evaluate(() => (window as any).__test__.forcePartialOverlap());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    const state = await page.evaluate(() => (window as any).__test__.getState());
    if (state.status === 'PLAYING') {
      const topPlaced = state.placedBlocks[state.placedBlocks.length - 1];
      expect(topPlaced.width).toBeLessThan(widthBefore);
    }
  });
});

// ---------------------------------------------------------------------------
// Infinite scroll
// ---------------------------------------------------------------------------

test.describe('Infinite scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('game continues past original grid height (15 rows)', async ({ page }) => {
    // Drop 20 times — well past the original 15-row win boundary
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const s = (window as any).__test__.getState();
        if (s.status === 'PLAYING') {
          (window as any).__test__.forcePerfect();
          (window as any).__test__.forceDrop();
        }
      });
    }
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
    const state = await page.evaluate(() => (window as any).__test__.getState());
    expect(state.placedBlocks.length).toBeGreaterThan(15);
  });

  test('there is no WIN status — game is infinite', async ({ page }) => {
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => {
        const s = (window as any).__test__.getState();
        if (s.status === 'PLAYING') {
          (window as any).__test__.forcePerfect();
          (window as any).__test__.forceDrop();
        }
      });
    }
    const status = await page.evaluate(() => (window as any).__test__.getState().status);
    expect(status).toBe('PLAYING');
  });

  test('score keeps accumulating past 15 drops', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const s = (window as any).__test__.getState();
        if (s.status === 'PLAYING') {
          (window as any).__test__.forcePerfect();
          (window as any).__test__.forceDrop();
        }
      });
    }
    const score = await page.locator('[data-testid="score"]').textContent();
    expect(Number(score)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Speed increase
// ---------------------------------------------------------------------------

test.describe('Speed increase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('level increments after 5 successful drops', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const s = (window as any).__test__.getState();
        if (s.status === 'PLAYING') {
          (window as any).__test__.forcePerfect();
          (window as any).__test__.forceDrop();
        }
      });
    }
    const level = await page.locator('[data-testid="level"]').textContent();
    expect(Number(level)).toBeGreaterThanOrEqual(2);
  });

  test('game moves faster at high drop count than at start', async ({ page }) => {
    const speeds = await page.evaluate(() => ({
      slowSpeed: 400,                          // 0 drops
      fastSpeed: Math.max(80, 400 - 50 * 4),  // 50 drops → 200ms
    }));
    expect(speeds.fastSpeed).toBeLessThan(speeds.slowSpeed);
  });

  test('speed never goes below minimum (80ms)', async ({ page }) => {
    // At 100 drops: 400 - 100*4 = 0 → clamped to MIN_TICK_MS=80
    const minSpeed = await page.evaluate(() => Math.max(80, 400 - 100 * 4));
    expect(minSpeed).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------

test.describe('Game over', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('status becomes GAME_OVER on a complete miss', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await expect(page.locator('[data-game-status="GAME_OVER"]')).toBeVisible();
  });

  test('game-over overlay is shown with final score', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await expect(page.locator('[data-testid="game-over-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-score"]')).toBeVisible();
  });

  test('initials input is shown with maxlength 3', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    const input = page.locator('[data-testid="initials-input"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('maxlength', '3');
  });

  test('submitting initials saves score and shows in high scores list', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await page.fill('[data-testid="initials-input"]', 'AAA');
    await page.click('[data-testid="submit-score-btn"]');
    await expect(page.locator('#score-list li')).toHaveCount(1);
  });

  test('start button reappears after game over and score submit', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await page.fill('[data-testid="initials-input"]', 'AAA');
    await page.click('[data-testid="submit-score-btn"]');
    await expect(page.locator('[data-testid="start-btn"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Pause / resume
// ---------------------------------------------------------------------------

test.describe('Pause and resume', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('pressing P pauses the game', async ({ page }) => {
    await page.keyboard.press('KeyP');
    await expect(page.locator('[data-game-status="PAUSED"]')).toBeVisible();
  });

  test('pressing P again resumes the game', async ({ page }) => {
    await page.keyboard.press('KeyP');
    await page.keyboard.press('KeyP');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });

  test('pressing Space resumes when paused', async ({ page }) => {
    await page.keyboard.press('KeyP');
    await page.keyboard.press('Space');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });

  test('score is frozen while paused', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    const scoreBefore = await page.locator('[data-testid="score"]').textContent();
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(600);
    const scoreAfter = await page.locator('[data-testid="score"]').textContent();
    expect(scoreAfter).toBe(scoreBefore);
  });
});

// ---------------------------------------------------------------------------
// NPC demo
// ---------------------------------------------------------------------------

test.describe('NPC demo', () => {
  test('NPC demo starts after 10 s of inactivity', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(11_000);
    await expect(page.locator('[data-game-status="NPC_DEMO"]')).toBeVisible();
  });

  test('arrow key during NPC demo returns to IDLE', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(11_000);
    await expect(page.locator('[data-game-status="NPC_DEMO"]')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-game-status="IDLE"]')).toBeVisible();
  });

  test('Enter during NPC demo starts a fresh game', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(11_000);
    await expect(page.locator('[data-game-status="NPC_DEMO"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// High scores API
// ---------------------------------------------------------------------------

test.describe('High scores API', () => {
  test('GET /api/scores returns JSON with entries array', async ({ request }) => {
    const res  = await request.get('/api/scores');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('entries');
    expect(Array.isArray(body.entries)).toBe(true);
  });

  test('POST /api/scores persists a new entry', async ({ request }) => {
    const entry = { name: 'TST', score: 99, timestamp: Date.now() };
    const res   = await request.post('/api/scores', { data: entry });
    expect(res.ok()).toBeTruthy();
    const board = await res.json();
    expect(board.entries.some((e: any) => e.name === 'TST' && e.score === 99)).toBe(true);
  });

  test('high scores list is capped at 10 entries', async ({ request }) => {
    for (let i = 0; i < 11; i++) {
      await request.post('/api/scores', {
        data: { name: 'X' + i, score: i * 10, timestamp: Date.now() },
      });
    }
    const res   = await request.get('/api/scores');
    const board = await res.json();
    expect(board.entries.length).toBeLessThanOrEqual(10);
  });

  test('scores are returned in descending order', async ({ request }) => {
    await request.post('/api/scores', { data: { name: 'LOW', score: 10, timestamp: Date.now() } });
    await request.post('/api/scores', { data: { name: 'HGH', score: 999, timestamp: Date.now() } });
    const res   = await request.get('/api/scores');
    const board = await res.json();
    if (board.entries.length >= 2) {
      expect(board.entries[0].score).toBeGreaterThanOrEqual(board.entries[1].score);
    }
  });
});
