import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('vero-lang', async () => await import('../../../vero-lang/src/index.ts'));

let transpileVero: typeof import('../services/veroTranspiler').transpileVero;

beforeAll(async () => {
    ({ transpileVero } = await import('../services/veroTranspiler'));
});

describe('veroTranspiler tab switching integration', () => {
    it('emits hardened tab switching code for scenario tab operations', () => {
        const source = `
PAGE HomePage {
  FIELD launch = text "Launch"
  FIELD next = text "Next"
}

FEATURE TabFlow {
  USE HomePage

  SCENARIO PopupFlow {
    CLICK HomePage.launch
    SWITCH TO NEW TAB
    SWITCH TO TAB 1
    CLOSE TAB
    CLICK HomePage.next
  }
}
`;

        const code = transpileVero(source);

        expect(code).toContain("const eventPage = await context.waitForEvent('page', {");
        expect(code).toContain("predicate: (candidate) => candidate !== page");
        expect(code).toContain("const requestedIndex = Number(1);");
        expect(code).toContain('const pagesBeforeClose = context.pages();');
        expect(code).toContain("await page.bringToFront();");
        expect(code).toContain("await page.waitForLoadState('domcontentloaded');");
        expect(code).toContain('homePage = new HomePage(page);');
    });

    it('rejects tab operations in BEFORE ALL hooks', () => {
        const source = `
PAGE HomePage {
  FIELD launch = text "Launch"
}

FEATURE TabFlow {
  USE HomePage

  BEFORE ALL {
    SWITCH TO NEW TAB
  }

  SCENARIO Smoke {
    CLICK HomePage.launch
  }
}
`;

        expect(() => transpileVero(source)).toThrow(/not allowed in BEFORE ALL hooks/i);
    });

    it('rejects tab operations inside PAGEACTIONS', () => {
        const source = `
PAGE HomePage {
  FIELD launch = text "Launch"
}

PAGEACTIONS HomeActions FOR HomePage {
  openPopup {
    SWITCH TO NEW TAB
  }
}

FEATURE TabFlow {
  USE HomePage
  USE HomeActions

  SCENARIO Smoke {
    PERFORM HomeActions.openPopup
  }
}
`;

        expect(() => transpileVero(source)).toThrow(/not allowed inside PAGEACTIONS/i);
    });

    it('keeps backend transpilation routed through vero-lang compile', () => {
        const serviceSource = readFileSync(join(__dirname, '..', 'services', 'veroTranspiler.ts'), 'utf8');
        expect(serviceSource).toContain("import { compile");
        expect(serviceSource).not.toContain("import { transpile");
    });
});
