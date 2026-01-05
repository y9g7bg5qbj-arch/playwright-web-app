/**
 * Script to create a sample scenario and schedule it to run in 1 hour
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const userId = '4a6ceb7d-9883-44e9-bfd3-6a1cd2557ffc';

  // 1. Create a workflow
  console.log('Creating workflow...');
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: 'Smoke Test Suite',
      description: 'Core smoke tests for critical user journeys',
    },
  });
  console.log(`Created workflow: ${workflow.id} - ${workflow.name}`);

  // 2. Create test flows (scenarios)
  console.log('\nCreating test flows...');

  const testFlows = await Promise.all([
    prisma.testFlow.create({
      data: {
        workflowId: workflow.id,
        name: 'Login Flow',
        language: 'typescript',
        code: `
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
});
`.trim(),
      },
    }),
    prisma.testFlow.create({
      data: {
        workflowId: workflow.id,
        name: 'Dashboard Smoke Test',
        language: 'typescript',
        code: `
import { test, expect } from '@playwright/test';

test('dashboard loads with key elements', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
  await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
});
`.trim(),
      },
    }),
    prisma.testFlow.create({
      data: {
        workflowId: workflow.id,
        name: 'Search Functionality',
        language: 'typescript',
        code: `
import { test, expect } from '@playwright/test';

test('search returns relevant results', async ({ page }) => {
  await page.goto('/search');
  await page.fill('[data-testid="search-input"]', 'test query');
  await page.click('[data-testid="search-button"]');
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  const results = await page.locator('[data-testid="result-item"]').count();
  expect(results).toBeGreaterThan(0);
});
`.trim(),
      },
    }),
  ]);

  console.log(`Created ${testFlows.length} test flows:`);
  testFlows.forEach(tf => console.log(`  - ${tf.id}: ${tf.name}`));

  // 3. Calculate cron for 1 hour from now
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const minute = oneHourFromNow.getMinutes();
  const hour = oneHourFromNow.getHours();

  // Cron expression: run at specific minute and hour, any day
  const cronExpression = `${minute} ${hour} * * *`;

  // Generate secure webhook token
  const webhookToken = randomBytes(32).toString('hex');

  // 4. Create the schedule
  console.log('\nCreating schedule...');
  const schedule = await prisma.schedule.create({
    data: {
      userId,
      workflowId: workflow.id,
      name: 'Hourly Smoke Tests',
      description: 'Runs core smoke tests every hour to verify system health',
      cronExpression,
      timezone: 'UTC',
      testSelector: JSON.stringify({
        tags: ['@smoke', '@critical'],
        testFlowIds: testFlows.map(tf => tf.id),
      }),
      notificationConfig: JSON.stringify({
        email: ['dev@example.com'],
        onFailureOnly: true,
      }),
      isActive: true,
      webhookToken,
      nextRunAt: oneHourFromNow,
    },
  });

  console.log(`\nSchedule created successfully!`);
  console.log(`================================`);
  console.log(`ID: ${schedule.id}`);
  console.log(`Name: ${schedule.name}`);
  console.log(`Cron: ${schedule.cronExpression}`);
  console.log(`Next Run: ${schedule.nextRunAt?.toISOString()}`);
  console.log(`Webhook Token: ${schedule.webhookToken}`);
  console.log(`Webhook URL: http://localhost:3000/api/schedules/webhook/${schedule.webhookToken}`);
  console.log(`================================`);

  // 5. Also create a regression schedule (runs daily at 2 AM)
  console.log('\nCreating regression schedule...');
  const regressionToken = randomBytes(32).toString('hex');
  const regressionSchedule = await prisma.schedule.create({
    data: {
      userId,
      workflowId: workflow.id,
      name: 'Nightly Regression Suite',
      description: 'Comprehensive regression tests running every night at 2 AM',
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
      testSelector: JSON.stringify({
        tags: ['@regression', '@smoke', '@critical'],
        folders: ['tests/**/*.spec.ts'],
      }),
      notificationConfig: JSON.stringify({
        email: ['dev@example.com', 'qa@example.com'],
        slack: {
          webhook: 'https://hooks.slack.com/services/EXAMPLE',
          channel: '#qa-alerts',
        },
        onFailureOnly: false,
        includeArtifacts: true,
      }),
      isActive: true,
      webhookToken: regressionToken,
      nextRunAt: new Date(new Date().setHours(26, 0, 0, 0)), // Next 2 AM
    },
  });

  console.log(`\nRegression Schedule created!`);
  console.log(`================================`);
  console.log(`ID: ${regressionSchedule.id}`);
  console.log(`Name: ${regressionSchedule.name}`);
  console.log(`Cron: ${regressionSchedule.cronExpression} (Daily at 2 AM)`);
  console.log(`Next Run: ${regressionSchedule.nextRunAt?.toISOString()}`);
  console.log(`================================`);

  console.log('\n✅ All done! Schedules are ready.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
