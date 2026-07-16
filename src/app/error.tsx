'use client';

// Route-level error boundary. A render error previously white-screened the
// whole app ("it crashed the program"); sessions auto-save to localStorage
// every second, so recovery is just a reload + restore.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Your work is safe — sessions save automatically as you go. Reload and
          choose Restore to pick up where you left off.
        </p>
        {error?.message && (
          <p className="text-xs text-[var(--text-muted)] font-mono break-words">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={() => reset()} className="btn-outline text-sm px-5 py-2.5">
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary text-sm px-5 py-2.5"
          >
            Reload &amp; restore
          </button>
        </div>
      </div>
    </div>
  );
}
