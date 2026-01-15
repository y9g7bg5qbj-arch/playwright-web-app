import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

const variantStyles = {
  default: {
    icon: 'bg-accent-blue/20 text-accent-blue',
    trend: 'text-accent-blue',
  },
  success: {
    icon: 'bg-accent-green/20 text-accent-green',
    trend: 'text-accent-green',
  },
  danger: {
    icon: 'bg-accent-red/20 text-accent-red',
    trend: 'text-accent-red',
  },
  warning: {
    icon: 'bg-accent-yellow/20 text-accent-yellow',
    trend: 'text-accent-yellow',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}) => {
  const styles = variantStyles[variant];

  return (
    <div className="bg-dark-card border border-border-default rounded-lg p-5 hover:border-border-muted transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-text-muted">vs last week</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${styles.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
