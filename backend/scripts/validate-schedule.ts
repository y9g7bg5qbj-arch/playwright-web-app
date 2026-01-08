/**
 * Validation script: Creates a schedule to run in 2 minutes and monitors queue
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Schedule Validation Script');
  console.log('==============================\n');

  // Check for existing user
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('Creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'test-hash',
      },
    });
  }
  console.log(`Using user: ${user.email} (${user.id})\n`);

  // Check for existing workflow or create one
  let workflow = await prisma.workflow.findFirst({
    where: { userId: user.id },
  });
  if (!workflow) {
    console.log('Creating test workflow...');
    workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: 'Validation Test Suite',
        description: 'For testing schedule execution',
      },
    });
  }
  console.log(`Using workflow: ${workflow.name} (${workflow.id})\n`);

  // Check for test flow
  let testFlow = await prisma.testFlow.findFirst({
    where: { workflowId: workflow.id },
  });
  if (!testFlow) {
    console.log('Creating test flow...');
    testFlow = await prisma.testFlow.create({
      data: {
        workflowId: workflow.id,
        name: 'Quick Validation Test',
        language: 'typescript',
        code: `
import { test, expect } from '@playwright/test';

test('validation test', async ({ page }) => {
  console.log('Schedule triggered successfully!');
  expect(true).toBe(true);
});
`.trim(),
      },
    });
  }
  console.log(`Using test flow: ${testFlow.name} (${testFlow.id})\n`);

  // Calculate cron for 2 minutes from now
  const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
  const minute = twoMinutesFromNow.getMinutes();
  const hour = twoMinutesFromNow.getHours();
  const dayOfMonth = twoMinutesFromNow.getDate();
  const month = twoMinutesFromNow.getMonth() + 1;

  // Specific cron expression that only runs once
  const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} *`;

  // Generate webhook token
  const webhookToken = randomBytes(32).toString('hex');

  // Create the validation schedule
  console.log('Creating validation schedule...');
  const schedule = await prisma.schedule.create({
    data: {
      userId: user.id,
      workflowId: workflow.id,
      name: 'Validation Schedule - ' + new Date().toISOString(),
      description: 'Temporary schedule for validation testing',
      cronExpression,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      testSelector: JSON.stringify({
        testFlowIds: [testFlow.id],
      }),
      notificationConfig: JSON.stringify({
        email: [],
        onFailureOnly: false,
      }),
      isActive: true,
      webhookToken,
      nextRunAt: twoMinutesFromNow,
    },
  });

  console.log('\n✅ Validation Schedule Created!');
  console.log('================================');
  console.log(`ID: ${schedule.id}`);
  console.log(`Name: ${schedule.name}`);
  console.log(`Cron: ${schedule.cronExpression}`);
  console.log(`Scheduled for: ${twoMinutesFromNow.toLocaleString()}`);
  console.log(`Current time: ${new Date().toLocaleString()}`);
  console.log(`Wait time: ~2 minutes`);
  console.log('================================\n');

  console.log('📋 Next steps to validate:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Watch the console for schedule trigger logs');
  console.log('3. Check queue stats: curl http://localhost:3000/api/queues/stats');
  console.log('4. Check schedule runs: curl http://localhost:3000/api/schedules/' + schedule.id + '/runs');
  console.log('');
  console.log('🔗 Trigger manually via webhook:');
  console.log(`   curl -X POST http://localhost:3000/api/schedules/webhook/${webhookToken}`);
  console.log('');

  // Show existing schedules
  const allSchedules = await prisma.schedule.findMany({
    where: { isActive: true },
    orderBy: { nextRunAt: 'asc' },
    take: 5,
  });

  console.log('\n📅 Active Schedules (next 5):');
  console.log('─'.repeat(60));
  for (const s of allSchedules) {
    console.log(`  ${s.name}`);
    console.log(`    Cron: ${s.cronExpression}`);
    console.log(`    Next: ${s.nextRunAt?.toLocaleString() || 'Not scheduled'}`);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
