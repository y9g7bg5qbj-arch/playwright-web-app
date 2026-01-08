
const { spawn } = require('child_process');

// Run Playwright test
const child = spawn('npx', ['playwright', 'test', 'test.spec.ts', '--headed'], {
  cwd: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/7fed1325-0c28-44a6-a033-49f4554cda7d',
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
    VERO_DEBUG: 'true',
    VERO_BREAKPOINTS: ''
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
    require('fs').writeFileSync('/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/7fed1325-0c28-44a6-a033-49f4554cda7d/debug-signal.json', JSON.stringify(msg));
  }
});

child.on('close', (code) => {
  process.exit(code);
});
