
const { spawn } = require('child_process');

// Run Playwright test
const child = spawn('npx', ['playwright', 'test', 'test.spec.ts', '--headed'], {
  cwd: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/b9a4ed4b-4ba2-4f1a-ba1d-9ea200bdd577',
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
    VERO_DEBUG: 'true',
    VERO_BREAKPOINTS: '9,5'
  }
});

// Forward stdout/stderr
child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Listen for messages from parent
process.on('message', (msg) => {
  // Forward control messages to test via environment signaling
  if (msg.type === 'resume' || msg.type === 'step' || msg.type === 'stop') {
    // For now, we'll use file-based signaling
    require('fs').writeFileSync('/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/b9a4ed4b-4ba2-4f1a-ba1d-9ea200bdd577/debug-signal.json', JSON.stringify(msg));
  }
});

child.on('close', (code) => {
  process.exit(code);
});
