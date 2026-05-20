export function ReassessConfirmation({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div
      className="p-3 rounded-lg bg-[var(--status-green)]/10 text-[var(--status-green)] text-sm font-medium flex items-center gap-2"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <span>✓</span>
      <span>Reassessed with new context ({count}x)</span>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
