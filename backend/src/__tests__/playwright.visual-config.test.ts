import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('playwright.config visual snapshot settings', () => {
  it('applies env-driven expect.toHaveScreenshot configuration', async () => {
    process.env.VERO_SNAPSHOT_PATH_TEMPLATE = '/tmp/visual/{platform}{/projectName}/{arg}{ext}';
    process.env.VERO_VISUAL_THRESHOLD = '0.25';
    process.env.VERO_VISUAL_MAX_DIFF_PIXELS = '8';
    process.env.VERO_VISUAL_MAX_DIFF_PIXEL_RATIO = '0.01';

    vi.resetModules();
    const module = await import('../../playwright.config');
    const config = module.default as any;

    expect(config.expect.toHaveScreenshot.pathTemplate).toBe('/tmp/visual/{platform}{/projectName}/{arg}{ext}');
    expect(config.expect.toHaveScreenshot.threshold).toBe(0.25);
    expect(config.expect.toHaveScreenshot.maxDiffPixels).toBe(8);
    expect(config.expect.toHaveScreenshot.maxDiffPixelRatio).toBe(0.01);
  });

  it('derives path template from VERO_SNAPSHOT_BASE_DIR when explicit template is missing', async () => {
    process.env.VERO_SNAPSHOT_BASE_DIR = '/tmp/visual-base';
    delete process.env.VERO_SNAPSHOT_PATH_TEMPLATE;

    vi.resetModules();
    const module = await import('../../playwright.config');
    const config = module.default as any;

    expect(config.expect.toHaveScreenshot.pathTemplate)
      .toBe('/tmp/visual-base/{platform}{/projectName}/{arg}{ext}');
  });
});
