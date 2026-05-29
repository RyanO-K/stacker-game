import { test, expect, Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.click('[data-testid="start-btn"]');
  await expect(page.locator('[data-game-status="PLAYING"]')).toBeVisible();
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

test.describe('Canvas rendering', () => {
  test('canvas is not blank after game starts', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.waitForTimeout(300);

    const isNotBlank = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      const ctx    = canvas.getContext('2d')!;
      const data   = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // Check that not all pixels are the background color (#1a1a2e = 26,26,46)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 26 || data[i+1] !== 26 || data[i+2] !== 46) return true;
      }
      return false;
    });
    expect(isNotBlank).toBe(true);
  });

  test('canvas renders placed blocks after a drop', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());

    const hasNonBackground = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      const ctx    = canvas.getContext('2d')!;
      const data   = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 26 || data[i+1] !== 26 || data[i+2] !== 46) return true;
      }
      return false;
    });
    expect(hasNonBackground).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// HUD updates
// ---------------------------------------------------------------------------

test.describe('HUD updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await startGame(page);
  });

  test('score updates after a successful drop', async ({ page }) => {
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    const score = await page.locator('[data-testid="score"]').textContent();
    expect(Number(score)).toBeGreaterThan(0);
  });

  test('level display is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="level"]')).toBeVisible();
  });

  test('level increments after enough successful drops', async ({ page }) => {
    // 3 drops increases level (computeLevel: every 3 placements after platform)
    for (let i = 0; i < 3; i++) {
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
});

// ---------------------------------------------------------------------------
// Overlay visibility
// ---------------------------------------------------------------------------

test.describe('Overlay visibility', () => {
  test('game-over overlay is hidden during play', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await expect(page.locator('[data-testid="game-over-overlay"]')).toBeHidden();
  });

  test('win overlay is hidden during play', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await expect(page.locator('[data-testid="win-overlay"]')).toBeHidden();
  });

  test('game-over overlay has correct heading', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await expect(page.locator('#game-over-overlay h3')).toHaveText('GAME OVER');
  });

  test('win overlay has correct heading', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.evaluate(() => (window as any).__test__.forceWin());
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    await expect(page.locator('#win-overlay h3')).toHaveText('YOU WIN!');
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

test.describe('Reset', () => {
  test('pressing R during play resets to IDLE', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.keyboard.press('KeyR');
    await expect(page.locator('[data-game-status="IDLE"]')).toBeVisible();
  });

  test('score resets to 0 after R', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.evaluate(() => (window as any).__test__.forcePerfect());
    await page.evaluate(() => (window as any).__test__.forceDrop());
    await page.keyboard.press('KeyR');
    await expect(page.locator('[data-testid="score"]')).toHaveText('0');
  });
});

// ---------------------------------------------------------------------------
// Score panel
// ---------------------------------------------------------------------------

test.describe('Score panel', () => {
  test('score panel is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#score-panel')).toBeVisible();
  });

  test('high scores panel heading is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#score-panel h2')).toBeVisible();
  });

  test('submitting a score adds entry to sidebar list', async ({ page }) => {
    await page.goto('/');
    await startGame(page);
    await page.evaluate(() => (window as any).__test__.forceGameOver());
    await page.fill('[data-testid="initials-input"]', 'RYA');
    await page.click('[data-testid="submit-score-btn"]');
    await expect(page.locator('#score-list li')).toHaveCount(1);
    await expect(page.locator('#score-list li span').first()).toHaveText('RYA');
  });
});
