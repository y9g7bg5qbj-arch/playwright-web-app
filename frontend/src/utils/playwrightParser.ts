/** Strip ANSI escape codes from Playwright error messages */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/** Convert Playwright JS selectors to Vero syntax */
function playwrightSelectorToVero(str: string): string {
  return str
    .replace(
      /getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*(?:,\s*exact:\s*\w+\s*)?\})?/g,
      (_m, role, name) => name ? `role "${role}" name "${name}"` : `role "${role}"`
    )
    .replace(/getByText\(['"]([^'"]+)['"]\)/g, 'text "$1"')
    .replace(/getByLabel\(['"]([^'"]+)['"]\)/g, 'label "$1"')
    .replace(/getByPlaceholder\(['"]([^'"]+)['"]\)/g, 'placeholder "$1"')
    .replace(/getByTestId\(['"]([^'"]+)['"]\)/g, 'testid "$1"')
    .replace(/getByAltText\(['"]([^'"]+)['"]\)/g, 'alt "$1"')
    .replace(/getByTitle\(['"]([^'"]+)['"]\)/g, 'title "$1"')
    .replace(/locator\(['"]([^'"]+)['"]\)/g, 'css "$1"');
}

/**
 * Translate a raw Playwright error message into a user-friendly message.
 * Strips ANSI codes, converts JS selectors to Vero syntax, extracts key info.
 */
export function humanizePlaywrightError(raw: string): string {
  if (!raw) return 'Unknown error';

  // Step 1: Strip ANSI escape codes (Playwright embeds color codes in error.message)
  let msg = stripAnsi(raw);

  // Step 2: Convert Playwright selectors to Vero syntax
  msg = playwrightSelectorToVero(msg);

  // Step 3: Extract structured info from the multi-line error

  // Assertion errors: "expect(locator).toBeVisible() failed"
  const expectMatch = msg.match(/expect\(.*?\)\.(to\w+)\(\)/);
  if (expectMatch) {
    const assertion = expectMatch[1];
    const locatorMatch = msg.match(/Locator:\s*(.+?)(?:\n|$)/);
    const expectedMatch = msg.match(/Expected:\s*(.+?)(?:\n|$)/);
    const timeoutMatch = msg.match(/Timeout:\s*(\d+)ms/);
    const errorDetailMatch = msg.match(/Error:\s*(.+?)(?:\n|$)/);

    const parts: string[] = [];
    // What assertion
    parts.push(assertion.replace(/^to/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase());
    // Which element
    if (locatorMatch) {
      parts.push(`on ${locatorMatch[1].trim()}`);
    }
    // Why it failed
    if (errorDetailMatch && !errorDetailMatch[1].includes('expect(')) {
      parts.push(`- ${errorDetailMatch[1].trim()}`);
    } else if (expectedMatch) {
      parts.push(`- expected ${expectedMatch[1].trim()}`);
    }
    // Timeout
    if (timeoutMatch) {
      const seconds = Math.round(parseInt(timeoutMatch[1]) / 1000);
      parts.push(`(${seconds}s timeout)`);
    }

    return `Assertion failed: ${parts.join(' ')}`;
  }

  // Timeout errors: "locator.click: Timeout 30000ms exceeded"
  const timeoutMatch = msg.match(/Timeout\s+(\d+)ms\s+exceeded/);
  if (timeoutMatch) {
    const seconds = Math.round(parseInt(timeoutMatch[1]) / 1000);
    const actionMatch = msg.match(/^(\w+)\.(\w+):\s*/);
    const action = actionMatch ? actionMatch[2] : 'action';
    const waitingMatch = msg.match(/waiting for\s+(.*?)(?:\n|$)/);
    const target = waitingMatch ? waitingMatch[1].trim() : '';
    if (target) {
      return `Timeout after ${seconds}s: ${action} could not find ${target}`;
    }
    return `Timeout after ${seconds}s: ${action} failed`;
  }

  // Strict mode violations
  const strictMatch = msg.match(/strict mode violation:.*?resolved to (\d+) elements/);
  if (strictMatch) {
    const selectorPart = msg.replace(/.*strict mode violation:\s*/, '').replace(/\s*resolved to.*/, '');
    return `Ambiguous selector: ${selectorPart} matched ${strictMatch[1]} elements. Use FIRST, NTH, or a more specific selector.`;
  }

  // Navigation errors
  const netErrMatch = msg.match(/net::(ERR_\w+)/);
  if (netErrMatch) {
    const urlMatch = msg.match(/goto\(['"]([^'"]+)['"]\)/);
    const url = urlMatch ? ` for ${urlMatch[1]}` : '';
    return `Navigation failed${url}: ${netErrMatch[1].replace(/^ERR_/, '').replace(/_/g, ' ').toLowerCase()}`;
  }

  // Browser closed
  if (msg.includes('has been closed')) {
    return 'Browser was closed before the action completed';
  }

  // Fallback: choose a meaningful line (skip generic runtime warnings first).
  const lines = msg
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const warningLike = /^(warning:|\(node:\d+\)\s*warning:|note:)/i;
  const meaningful = lines.find((line) =>
    /(error|failed|timeout|expect\(|strict mode violation|net::err_|has been closed)/i.test(line)
  );
  const candidate = meaningful || lines.find((line) => !warningLike.test(line)) || lines[0] || msg.trim();
  const cleaned = candidate.replace(/^\w+\.\w+:\s*/, '').replace(/^Error:\s*/, '');
  return cleaned.length > 200 ? cleaned.substring(0, 197) + '...' : cleaned;
}
