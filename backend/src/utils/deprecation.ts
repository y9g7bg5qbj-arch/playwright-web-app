import type { Response } from 'express';
import { logger } from './logger';

const DEFAULT_SUNSET = process.env.DEPRECATION_DEFAULT_SUNSET || 'Wed, 31 Dec 2026 23:59:59 GMT';

const usageCounts = new Map<string, number>();
const warnedKeys = new Set<string>();

export interface DeprecationMetadata {
  id: string;
  replacement?: string;
  docsUrl?: string;
  message?: string;
  sunset?: string;
}

interface DeprecatedHttpContext {
  method: string;
  path: string;
  userId?: string;
}

interface DeprecatedSocketContext {
  socketId: string;
  event: string;
  userId?: string;
  sessionId?: string;
  extra?: Record<string, unknown>;
}

function incrementUsage(key: string): number {
  const nextCount = (usageCounts.get(key) || 0) + 1;
  usageCounts.set(key, nextCount);
  return nextCount;
}

export function applyDeprecationHeaders(res: Response, metadata: DeprecationMetadata): void {
  const linkValues: string[] = [];
  if (metadata.docsUrl) {
    linkValues.push(`<${metadata.docsUrl}>; rel="deprecation"`);
  }
  if (metadata.replacement) {
    linkValues.push(`<${metadata.replacement}>; rel="successor-version"`);
  }

  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', metadata.sunset || DEFAULT_SUNSET);
  if (linkValues.length > 0) {
    res.setHeader('Link', linkValues.join(', '));
  }
}

export function warnDeprecatedHttpRoute(
  metadata: DeprecationMetadata,
  context: DeprecatedHttpContext
): void {
  const count = incrementUsage(`${metadata.id}:http`);
  logger.warn('[Deprecated] Legacy HTTP route used', {
    deprecatedId: metadata.id,
    method: context.method,
    path: context.path,
    userId: context.userId,
    replacement: metadata.replacement,
    docsUrl: metadata.docsUrl,
    sunset: metadata.sunset || DEFAULT_SUNSET,
    message: metadata.message,
    usageCount: count,
  });
}

export function warnDeprecatedSocketEvent(
  metadata: DeprecationMetadata,
  context: DeprecatedSocketContext,
  dedupeKey?: string
): void {
  if (dedupeKey && warnedKeys.has(dedupeKey)) {
    return;
  }
  if (dedupeKey) {
    warnedKeys.add(dedupeKey);
  }

  const count = incrementUsage(`${metadata.id}:ws:${context.event}`);
  logger.warn('[Deprecated] Legacy WebSocket event used', {
    deprecatedId: metadata.id,
    event: context.event,
    socketId: context.socketId,
    userId: context.userId,
    sessionId: context.sessionId,
    replacement: metadata.replacement,
    docsUrl: metadata.docsUrl,
    sunset: metadata.sunset || DEFAULT_SUNSET,
    message: metadata.message,
    usageCount: count,
    ...(context.extra || {}),
  });
}
