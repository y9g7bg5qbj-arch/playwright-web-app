/**
 * Vero Action Runtime
 *
 * Runtime helper injected into generated spec files to support
 * PERFORM <ExternalAction> statements. Dynamically imports and
 * executes TypeScript action modules with timeout enforcement.
 *
 * This file is emitted as a string by the transpiler into the
 * generated spec file's preamble.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Returns the TypeScript source code for the __veroRuntime object
 * that gets embedded in each generated spec file.
 */
export function generateRuntimePreamble(projectRoot: string): string {
  // Escape backslashes for Windows paths
  const escaped = projectRoot.replace(/\\/g, '\\\\');
  return `
// ─── Vero External Action Runtime ───────────────────────────────
const __veroRuntime = {
  async performExternalAction(
    name: string,
    args: any[],
    ctx: { page: any; context?: any; testInfo?: any },
    timeoutMs?: number,
  ) {
    const path = await import('path');
    const fs = await import('fs');
    const manifestPath = path.join('${escaped}', 'custom-actions', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const actionDef = (manifest.actions || []).find((a: any) => a.name === name);
    if (!actionDef) {
      throw new Error(\`External action "\${name}" not found in manifest.json\`);
    }
    const modulePath = path.resolve('${escaped}', 'custom-actions', 'actions', actionDef.sourceFile);
    const mod = await import(modulePath);
    const fn = mod.default || mod[name];
    if (typeof fn !== 'function') {
      throw new Error(\`External action "\${name}" does not export a default function or named export "\${name}"\`);
    }
    const timeout = timeoutMs || actionDef.timeoutMs || ${DEFAULT_TIMEOUT_MS};
    let timer: ReturnType<typeof setTimeout>;
    try {
      const result = await Promise.race([
        fn(ctx, ...args),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(\`External action "\${name}" timed out after \${timeout}ms\`)), timeout);
        }),
      ]);
      return result;
    } finally {
      clearTimeout(timer!);
    }
  },
};
// ─── End Vero External Action Runtime ───────────────────────────
`;
}
