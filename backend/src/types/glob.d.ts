declare module 'glob' {
  function glob(
    pattern: string,
    options: { cwd: string; absolute: boolean },
    callback: (err: Error | null, matches: string[]) => void
  ): void;
  export = glob;
}
