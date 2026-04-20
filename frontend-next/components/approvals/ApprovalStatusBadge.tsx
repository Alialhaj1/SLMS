import React from 'react';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../hooks/useTranslation';

type ApprovalStatus =
  | 'draft' | 'pending_review' | 'under_review' | 'pending_approval'
  | 'approved' | 'pending_post' | 'posted' | 'rejected' | 'voided' | 'cancelled';

const statusConfig: Record<ApprovalStatus, { variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'; icon: string }> = {
  draft:             { variant: 'secondary', icon: '📝' },
  pending_review:    { variant: 'warning',   icon: '⏳' },
  under_review:      { variant: 'info',      icon: '👁️' },
  pending_approval:  { variant: 'warning',   icon: '🔄' },
  approved:          { variant: 'success',   icon: '✅' },
  pending_post:      { variant: 'info',      icon: '📋' },
  posted:            { variant: 'success',   icon: '✨' },
  rejected:          { variant: 'danger',    icon: '❌' },
  voided:            { variant: 'danger',    icon: '🚫' },
  cancelled:         { variant: 'secondary', icon: '⊘'  },
};

interface Props {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

export default function ApprovalStatusBadge({ status, size = 'md', showIcon = true, pulse = false }: Props) {
  const { t } = useTranslation();
  const config = statusConfig[status as ApprovalStatus] || { variant: 'secondary' as const, icon: '❓' };

  const label = t(`approvals.status.${status}`) || status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1 ${pulse && (status === 'pending_review' || status === 'pending_approval') ? 'animate-pulse' : ''}`}>
      <Badge variant={config.variant} size={size}>
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {label}
      </Badge>
    </span>
  );
}
