import { Status } from '@/lib/types';

export function StatusBadge({ status }: { status: Status }) {
  const config = {
    green: { className: 'status-green', label: 'Good', icon: '✓' },
    amber: { className: 'status-amber', label: 'Needs Work', icon: '!' },
    red: { className: 'status-red', label: 'Missing', icon: '✗' },
  };
  const { className, label, icon } = config[status];

  return (
    <span className={`status-badge ${className}`}>
      <span
        className="text-xs"
        style={{
          display: 'inline-block',
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        {icon}
      </span>
      {label}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
}
