/**
 * Notification Service
 *
 * Handles email (SendGrid) and Slack webhook notifications.
 */

import { notificationHistoryRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';
import { auditService } from './audit.service';

export type NotificationType = 'email' | 'slack' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface EmailConfig {
  to: string[];
  onSuccess?: boolean;
  onFailure?: boolean;
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  onSuccess?: boolean;
  onFailure?: boolean;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  onSuccess?: boolean;
  onFailure?: boolean;
}

export interface NotificationConfig {
  email?: EmailConfig;
  slack?: SlackConfig;
  webhook?: WebhookConfig;
}

export interface ScheduleRunInfo {
  scheduleId: string;
  scheduleName: string;
  runId: string;
  status: 'passed' | 'failed' | 'cancelled';
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  errorMessage?: string;
  triggeredBy?: string;
  environment?: string;
}

export interface NotificationResult {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  errorMessage?: string;
}

class NotificationService {
  private sendGridApiKey: string | null = null;
  private fromEmail: string = 'noreply@vero-ide.com';

  constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY || null;
    this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@vero-ide.com';
  }

  /**
   * Send notifications based on schedule run results
   */
  async sendRunNotifications(
    runInfo: ScheduleRunInfo,
    config: NotificationConfig
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const shouldNotify = this.shouldSendNotification(runInfo.status, config);

    if (!shouldNotify.any) {
      logger.debug(`Skipping notifications for run ${runInfo.runId} - conditions not met`);
      return results;
    }

    // Send email notifications
    if (config.email && shouldNotify.email) {
      for (const recipient of config.email.to) {
        const result = await this.sendEmailNotification(runInfo, recipient);
        results.push(result);
      }
    }

    // Send Slack notification
    if (config.slack && shouldNotify.slack) {
      const result = await this.sendSlackNotification(runInfo, config.slack);
      results.push(result);
    }

    // Send webhook notification
    if (config.webhook && shouldNotify.webhook) {
      const result = await this.sendWebhookNotification(runInfo, config.webhook);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if notifications should be sent based on run status and config
   */
  private shouldSendNotification(
    status: string,
    config: NotificationConfig
  ): { any: boolean; email: boolean; slack: boolean; webhook: boolean } {
    const isFailed = status === 'failed';
    const isSuccess = status === 'passed';

    const emailShouldSend = config.email
      ? (isFailed && (config.email.onFailure ?? true)) || (isSuccess && config.email.onSuccess)
      : false;

    const slackShouldSend = config.slack
      ? (isFailed && (config.slack.onFailure ?? true)) || (isSuccess && config.slack.onSuccess)
      : false;

    const webhookShouldSend = config.webhook
      ? (isFailed && (config.webhook.onFailure ?? true)) || (isSuccess && config.webhook.onSuccess)
      : false;

    return {
      any: Boolean(emailShouldSend || slackShouldSend || webhookShouldSend),
      email: Boolean(emailShouldSend),
      slack: Boolean(slackShouldSend),
      webhook: Boolean(webhookShouldSend),
    };
  }

  /**
   * Send email notification via SendGrid
   */
  private async sendEmailNotification(
    runInfo: ScheduleRunInfo,
    recipient: string
  ): Promise<NotificationResult> {
    const subject = this.buildEmailSubject(runInfo);
    const content = this.buildEmailContent(runInfo);

    // Create notification history record
    const notification = await notificationHistoryRepository.create({
      scheduleId: runInfo.scheduleId,
      runId: runInfo.runId,
      type: 'email',
      recipient,
      subject,
      content,
      status: 'pending',
    });

    try {
      if (!this.sendGridApiKey) {
        logger.warn('SendGrid API key not configured - email notification skipped');
        await this.updateNotificationStatus(notification.id, 'failed', 'SendGrid API key not configured');
        return {
          id: notification.id,
          type: 'email',
          status: 'failed',
          recipient,
          errorMessage: 'SendGrid API key not configured',
        };
      }

      // Send via SendGrid API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: this.fromEmail, name: 'Vero IDE' },
          subject,
          content: [
            { type: 'text/plain', value: content },
            { type: 'text/html', value: this.buildEmailHtml(runInfo) },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${error}`);
      }

      await this.updateNotificationStatus(notification.id, 'sent');
      await auditService.logNotificationAction('sent', notification.id, undefined, {
        type: 'email',
        recipient,
        runId: runInfo.runId,
      });

      logger.info(`Email notification sent to ${recipient} for run ${runInfo.runId}`);

      return {
        id: notification.id,
        type: 'email',
        status: 'sent',
        recipient,
      };
    } catch (error: any) {
      logger.error(`Failed to send email to ${recipient}:`, error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);

      return {
        id: notification.id,
        type: 'email',
        status: 'failed',
        recipient,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Send Slack notification via webhook
   */
  private async sendSlackNotification(
    runInfo: ScheduleRunInfo,
    config: SlackConfig
  ): Promise<NotificationResult> {
    const payload = this.buildSlackPayload(runInfo, config.channel);

    // Create notification history record
    const notification = await notificationHistoryRepository.create({
      scheduleId: runInfo.scheduleId,
      runId: runInfo.runId,
      type: 'slack',
      recipient: config.webhookUrl,
      subject: `Schedule Run: ${runInfo.scheduleName}`,
      content: JSON.stringify(payload),
      status: 'pending',
    });

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Slack webhook error: ${error}`);
      }

      await this.updateNotificationStatus(notification.id, 'sent');
      await auditService.logNotificationAction('sent', notification.id, undefined, {
        type: 'slack',
        channel: config.channel,
        runId: runInfo.runId,
      });

      logger.info(`Slack notification sent for run ${runInfo.runId}`);

      return {
        id: notification.id,
        type: 'slack',
        status: 'sent',
        recipient: config.webhookUrl,
      };
    } catch (error: any) {
      logger.error(`Failed to send Slack notification:`, error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);

      return {
        id: notification.id,
        type: 'slack',
        status: 'failed',
        recipient: config.webhookUrl,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Send generic webhook notification
   */
  private async sendWebhookNotification(
    runInfo: ScheduleRunInfo,
    config: WebhookConfig
  ): Promise<NotificationResult> {
    const payload = this.buildWebhookPayload(runInfo);

    // Create notification history record
    const notification = await notificationHistoryRepository.create({
      scheduleId: runInfo.scheduleId,
      runId: runInfo.runId,
      type: 'webhook',
      recipient: config.url,
      subject: `Schedule Run: ${runInfo.scheduleName}`,
      content: JSON.stringify(payload),
      status: 'pending',
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Vero-Event': 'schedule.run.completed',
        ...config.headers,
      };

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Webhook error: ${response.status} ${error}`);
      }

      await this.updateNotificationStatus(notification.id, 'sent');
      await auditService.logNotificationAction('sent', notification.id, undefined, {
        type: 'webhook',
        url: config.url,
        runId: runInfo.runId,
      });

      logger.info(`Webhook notification sent to ${config.url} for run ${runInfo.runId}`);

      return {
        id: notification.id,
        type: 'webhook',
        status: 'sent',
        recipient: config.url,
      };
    } catch (error: any) {
      logger.error(`Failed to send webhook notification to ${config.url}:`, error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);

      return {
        id: notification.id,
        type: 'webhook',
        status: 'failed',
        recipient: config.url,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    await notificationHistoryRepository.update(id, {
      status,
      errorMessage,
      sentAt: status === 'sent' ? new Date() : undefined,
    });
  }

  /**
   * Build email subject
   */
  private buildEmailSubject(runInfo: ScheduleRunInfo): string {
    const statusEmoji = runInfo.status === 'passed' ? '✅' : runInfo.status === 'failed' ? '❌' : '⚠️';
    return `${statusEmoji} [Vero IDE] ${runInfo.scheduleName} - ${runInfo.status.toUpperCase()}`;
  }

  /**
   * Build plain text email content
   */
  private buildEmailContent(runInfo: ScheduleRunInfo): string {
    const lines = [
      `Schedule: ${runInfo.scheduleName}`,
      `Status: ${runInfo.status.toUpperCase()}`,
      '',
      'Results:',
      `  Total Tests: ${runInfo.testCount}`,
      `  Passed: ${runInfo.passedCount}`,
      `  Failed: ${runInfo.failedCount}`,
      `  Skipped: ${runInfo.skippedCount}`,
      '',
      `Duration: ${this.formatDuration(runInfo.durationMs)}`,
    ];

    if (runInfo.triggeredBy) {
      lines.push(`Triggered by: ${runInfo.triggeredBy}`);
    }

    if (runInfo.environment) {
      lines.push(`Environment: ${runInfo.environment}`);
    }

    if (runInfo.errorMessage) {
      lines.push('', `Error: ${runInfo.errorMessage}`);
    }

    return lines.join('\n');
  }

  /**
   * Build HTML email content
   */
  private buildEmailHtml(runInfo: ScheduleRunInfo): string {
    const statusColor = runInfo.status === 'passed' ? '#22c55e' : runInfo.status === 'failed' ? '#ef4444' : '#f59e0b';
    const statusEmoji = runInfo.status === 'passed' ? '✅' : runInfo.status === 'failed' ? '❌' : '⚠️';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px; }
    .status { font-size: 24px; font-weight: bold; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { color: #666; font-size: 12px; }
    .error { background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status">${statusEmoji} ${runInfo.scheduleName}</div>
      <div>Run ${runInfo.status.toUpperCase()} in ${this.formatDuration(runInfo.durationMs)}</div>
    </div>
    <div class="content">
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${runInfo.testCount}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #22c55e;">${runInfo.passedCount}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ef4444;">${runInfo.failedCount}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #f59e0b;">${runInfo.skippedCount}</div>
          <div class="stat-label">Skipped</div>
        </div>
      </div>
      ${runInfo.errorMessage ? `<div class="error"><strong>Error:</strong> ${runInfo.errorMessage}</div>` : ''}
      <div class="footer">
        ${runInfo.triggeredBy ? `<p>Triggered by: ${runInfo.triggeredBy}</p>` : ''}
        ${runInfo.environment ? `<p>Environment: ${runInfo.environment}</p>` : ''}
        <p>Run ID: ${runInfo.runId}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build Slack message payload
   */
  private buildSlackPayload(runInfo: ScheduleRunInfo, channel?: string): Record<string, unknown> {
    const statusColor = runInfo.status === 'passed' ? '#22c55e' : runInfo.status === 'failed' ? '#ef4444' : '#f59e0b';
    const statusEmoji = runInfo.status === 'passed' ? ':white_check_mark:' : runInfo.status === 'failed' ? ':x:' : ':warning:';

    const payload: Record<string, unknown> = {
      attachments: [
        {
          color: statusColor,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${statusEmoji} ${runInfo.scheduleName} - ${runInfo.status.toUpperCase()}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Total Tests:*\n${runInfo.testCount}` },
                { type: 'mrkdwn', text: `*Passed:*\n${runInfo.passedCount}` },
                { type: 'mrkdwn', text: `*Failed:*\n${runInfo.failedCount}` },
                { type: 'mrkdwn', text: `*Duration:*\n${this.formatDuration(runInfo.durationMs)}` },
              ],
            },
          ],
        },
      ],
    };

    if (channel) {
      payload.channel = channel;
    }

    if (runInfo.errorMessage) {
      (payload.attachments as any[])[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:* ${runInfo.errorMessage}`,
        },
      });
    }

    return payload;
  }

  /**
   * Build generic webhook payload
   */
  private buildWebhookPayload(runInfo: ScheduleRunInfo): Record<string, unknown> {
    return {
      event: 'schedule.run.completed',
      timestamp: new Date().toISOString(),
      schedule: {
        id: runInfo.scheduleId,
        name: runInfo.scheduleName,
      },
      run: {
        id: runInfo.runId,
        status: runInfo.status,
        testCount: runInfo.testCount,
        passedCount: runInfo.passedCount,
        failedCount: runInfo.failedCount,
        skippedCount: runInfo.skippedCount,
        durationMs: runInfo.durationMs,
        errorMessage: runInfo.errorMessage,
        triggeredBy: runInfo.triggeredBy,
        environment: runInfo.environment,
      },
    };
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get notification history for a schedule
   */
  async getScheduleNotifications(scheduleId: string, limit: number = 50) {
    return notificationHistoryRepository.findByScheduleId(scheduleId, limit);
  }

  /**
   * Get notification history for a run
   */
  async getRunNotifications(runId: string) {
    return notificationHistoryRepository.findByRunId(runId);
  }

  /**
   * Retry a failed notification
   */
  async retryNotification(notificationId: string): Promise<NotificationResult> {
    const notification = await notificationHistoryRepository.findById(notificationId);

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.status !== 'failed') {
      throw new Error('Can only retry failed notifications');
    }

    // Re-send based on type
    // This would require reconstructing the run info which we don't have stored
    // For now, just mark as pending and log
    await notificationHistoryRepository.update(notificationId, {
      status: 'pending',
      errorMessage: undefined,
    });

    logger.info(`Notification ${notificationId} marked for retry`);

    return {
      id: notificationId,
      type: notification.type,
      status: 'pending',
      recipient: notification.recipient,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
