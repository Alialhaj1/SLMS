/**
 * SecurityFlagsBadges Component
 * Phase 4B Feature 4: Display security warning indicators
 */

interface SecurityFlagsBadgesProps {
  flags: {
    new_device?: boolean;
    multiple_ips?: boolean;
    suspicious_ip?: boolean;
    [key: string]: any;
  } | null;
  className?: string;
}

export default function SecurityFlagsBadges({ flags, className = '' }: SecurityFlagsBadgesProps) {
  if (!flags || Object.keys(flags).length === 0) {
    return null;
  }

  const getFlagConfig = (key: string) => {
    switch (key) {
      case 'new_device':
        return {
          label: 'New Device',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
          icon: (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'multiple_ips':
        return {
          label: 'Multiple IPs',
          color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
          icon: (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'suspicious_ip':
        return {
          label: 'Suspicious IP',
          color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
          icon: (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
          ),
        };
      default:
        return {
          label: key.replace('_', ' '),
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
          icon: null,
        };
    }
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {Object.entries(flags).map(([key, value]) => {
        if (!value) return null;
        const config = getFlagConfig(key);
        
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.color}`}
            title={`Security flag: ${config.label}`}
          >
            {config.icon}
            {config.label}
          </span>
        );
      })}
    </div>
  );
}
