// src/instrumentation.ts
//
// Runs once when the server boots. We pre-warm the Claude connection here so the
// first real request of the day doesn't pay cold-start latency on top of an already
// long call — the exact margin that tips triage over into a timeout.

export async function register() {
  // Only the Node.js server runtime can (and should) make the warmup call.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { warmupClaude } = await import('./lib/claude');
    await warmupClaude();
  } catch {
    // Warmup is strictly best-effort and must never block or fail boot.
  }
}
