import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { loadReferencedPages } from '../routes/veroExecution.utils';

describe('veroExecution utils', () => {
  it('deduplicates base page when both PageActions and Page are referenced', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-execution-utils-'));
    const pagesDir = join(tempRoot, 'Pages');
    const pageActionsDir = join(tempRoot, 'PageActions');

    try {
      await mkdir(pagesDir, { recursive: true });
      await mkdir(pageActionsDir, { recursive: true });

      const pageContent = 'PAGE HerokuLoginPage {\n  FIELD flashMessage = "#flash"\n}\n';
      const pageActionsContent =
        'PAGEACTIONS HerokuLoginPageActions FOR HerokuLoginPage {\n  awaitFlash { WAIT FOR flashMessage }\n}\n';

      await writeFile(join(pagesDir, 'HerokuLoginPage.vero'), pageContent, 'utf-8');
      await writeFile(join(pageActionsDir, 'HerokuLoginPageActions.vero'), pageActionsContent, 'utf-8');

      const combined = await loadReferencedPages(
        ['HerokuLoginPageActions', 'HerokuLoginPage'],
        tempRoot
      );

      const pageDefinitionCount = (combined.match(/PAGE HerokuLoginPage/g) || []).length;
      const pageActionsDefinitionCount = (combined.match(/PAGEACTIONS HerokuLoginPageActions/g) || []).length;

      expect(pageDefinitionCount).toBe(1);
      expect(pageActionsDefinitionCount).toBe(1);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
