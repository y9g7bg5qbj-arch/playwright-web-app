import React from 'react';
import { FolderOpen, Clock } from 'lucide-react';
import { Card, StatusBadge } from '@/components/ui';

interface ProjectCardProps {
  id: string;
  name: string;
  testCount: number;
  lastRun?: {
    status: 'passed' | 'failed' | 'running';
    timestamp: string;
  };
  passRate?: number;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  testCount,
  lastRun,
  passRate,
  onClick,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <Card
      padding="lg"
      hover
      onClick={onClick}
      className="hover:border-accent-blue/50 hover:bg-dark-elevated cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center group-hover:from-accent-blue/30 group-hover:to-accent-purple/30 transition-colors">
          <FolderOpen className="w-6 h-6 text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate group-hover:text-accent-blue transition-colors">
            {name}
          </h3>
          <p className="text-sm text-text-muted mt-0.5">
            {testCount} test{testCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-default flex items-center justify-between">
        {lastRun ? (
          <StatusBadge status={lastRun.status} />
        ) : (
          <span className="text-sm text-text-muted">No runs yet</span>
        )}

        {lastRun && (
          <div className="flex items-center gap-1.5 text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{formatTime(lastRun.timestamp)}</span>
          </div>
        )}
      </div>

      {passRate !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-text-muted">Pass Rate</span>
            <span className={`font-medium ${passRate >= 80 ? 'text-accent-green' : passRate >= 50 ? 'text-accent-yellow' : 'text-accent-red'}`}>
              {passRate}%
            </span>
          </div>
          <div className="h-1.5 bg-dark-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                passRate >= 80 ? 'bg-accent-green' : passRate >= 50 ? 'bg-accent-yellow' : 'bg-accent-red'
              }`}
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProjectCard;
