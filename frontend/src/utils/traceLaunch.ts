export const NO_TRACE_MESSAGE = 'No trace found. Traces are retained on failure by default.';

export type LaunchExecutionTraceStatus = 'launched' | 'no_trace' | 'error';

export interface LaunchExecutionTraceResult {
  status: LaunchExecutionTraceStatus;
  message: string;
  httpStatus?: number;
  viewerUrl?: string;
  traceViewerUrl?: string;
  launchedLocally?: boolean;
}

interface LaunchExecutionTraceOptions {
  executionId: string;
  scenarioName?: string;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return extraHeaders;
  }
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

function isNoTraceError(status: number, errorMessage: string): boolean {
  if (status === 404) return true;

  const normalizedError = errorMessage.toLowerCase();
  return (
    normalizedError.includes('no trace found') ||
    normalizedError.includes('trace file not found') ||
    normalizedError.includes('trace not found') ||
    normalizedError.includes('no trace files found')
  );
}

export async function launchExecutionTrace({
  executionId,
  scenarioName,
}: LaunchExecutionTraceOptions): Promise<LaunchExecutionTraceResult> {
  const normalizedExecutionId = executionId.trim();
  if (!normalizedExecutionId) {
    return {
      status: 'error',
      message: 'Invalid execution ID.',
    };
  }

  try {
    const response = await fetch(`/api/executions/${encodeURIComponent(normalizedExecutionId)}/trace/view`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        scenarioName: typeof scenarioName === 'string' ? scenarioName : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));
    const backendError = typeof data?.error === 'string' ? data.error : '';

    if (response.ok && data.success !== false) {
      const traceViewerUrl =
        typeof data?.traceViewerUrl === 'string' && data.traceViewerUrl.trim()
          ? data.traceViewerUrl.trim()
          : undefined;
      const viewerUrl =
        typeof data?.viewerUrl === 'string' && data.viewerUrl.trim()
          ? data.viewerUrl.trim()
          : undefined;
      const launchedLocally = data?.launchedLocally === true;
      // Cloud viewer URL is cross-machine safe; local viewer remains a fallback.
      const preferredUrl = viewerUrl || traceViewerUrl;

      if (preferredUrl) {
        const popup = window.open(preferredUrl, '_blank', 'noopener,noreferrer');
        if (!popup) {
          window.location.assign(preferredUrl);
        }
      }

      const message =
        typeof data?.message === 'string' && data.message.trim()
          ? data.message
          : 'Trace viewer opened.';
      return {
        status: 'launched',
        message,
        httpStatus: response.status,
        viewerUrl,
        traceViewerUrl,
        launchedLocally,
      };
    }

    if (isNoTraceError(response.status, backendError)) {
      return {
        status: 'no_trace',
        message: NO_TRACE_MESSAGE,
        httpStatus: response.status,
      };
    }

    return {
      status: 'error',
      message: backendError || `Failed to open trace viewer (HTTP ${response.status}).`,
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to open trace viewer.',
    };
  }
}
