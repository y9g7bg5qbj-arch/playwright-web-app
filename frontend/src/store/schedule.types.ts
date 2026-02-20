/** Domain type for a UI schedule — decoupled from the UI component layer. */
export interface Schedule {
  id: string;
  name: string;
  cron: string;
  cronDescription: string;
  environment: string;
  environmentId?: string;
  parameterSetId?: string;
  retryStrategy: string;
  enabled: boolean;
  nextRun: string;
  lastRun?: {
    status: 'success' | 'failed';
    time: string;
  };
  tags: string[];
  notifications: {
    slack: { enabled: boolean; webhook: string };
    email: { enabled: boolean; address: string };
    teams: { enabled: boolean };
  };
  reporting: {
    traceOnFailure: boolean;
    recordVideo: boolean;
  };
}
