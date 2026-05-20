'use client';

export function LoadingOverlay({
  message,
  subMessage,
}: {
  message: string;
  subMessage?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8"
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      {/* Animated dots */}
      <div className="flex gap-2 mb-6">
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)]"
          style={{ animation: 'dotBounce 1.4s ease-in-out infinite', animationDelay: '0ms' }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)]"
          style={{ animation: 'dotBounce 1.4s ease-in-out infinite', animationDelay: '160ms' }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)]"
          style={{ animation: 'dotBounce 1.4s ease-in-out infinite', animationDelay: '320ms' }}
        />
      </div>

      {/* Main message */}
      <p className="text-lg font-medium text-[var(--text-primary)] text-center">{message}</p>

      {/* Sub message */}
      {subMessage && (
        <p className="text-sm text-[var(--text-muted)] mt-2 text-center">{subMessage}</p>
      )}

      {/* Gradient progress bar */}
      <div className="w-48 h-1.5 bg-[var(--bg-tertiary)] rounded-full mt-6 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--expedia-navy), var(--expedia-yellow), var(--expedia-navy))',
            backgroundSize: '200% 100%',
            animation: 'gradientSlide 2s ease-in-out infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        @keyframes gradientSlide {
          0% {
            background-position: 100% 0;
          }
          50% {
            background-position: 0% 0;
          }
          100% {
            background-position: 100% 0;
          }
        }
      `}</style>
    </div>
  );
}
