'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';

function parseBudgetString(raw: string): number | null {
  if (!raw) return null;
  // Match "$350K", "350,000", "1.5M", "2 billion", etc.
  const match = raw.match(/([\d,]+(?:\.\d+)?)\s*(k|m|b|thousand|million|billion)?/i);
  if (!match) return null;
  const base = parseFloat(match[1].replace(/,/g, ''));
  if (!isFinite(base)) return null;
  const suffix = (match[2] || '').toLowerCase();
  const multiplier =
    suffix === 'k' || suffix === 'thousand' ? 1_000
    : suffix === 'm' || suffix === 'million' ? 1_000_000
    : suffix === 'b' || suffix === 'billion' ? 1_000_000_000
    : 1;
  return Math.round(base * multiplier);
}

export function VaultProductionBudgetStep() {
  const { state, handlers } = useBriefState();
  const totalBudgetRaw = state.budgetDetails?.totalBudget || '';
  const totalBudgetUsd = parseBudgetString(totalBudgetRaw);
  const [value, setValue] = useState('');

  const quickPicks = totalBudgetUsd ? [
    { label: '10% of total', value: Math.round(totalBudgetUsd * 0.10) },
    { label: '15% of total', value: Math.round(totalBudgetUsd * 0.15) },
    { label: '20% of total', value: Math.round(totalBudgetUsd * 0.20) },
  ] : [];

  const parsedValue = parseInt(value.replace(/[^\d]/g, ''), 10);
  const hasInput = !!parsedValue;
  const isValid = hasInput && parsedValue >= 1000;
  const showFloorError = hasInput && !isValid;

  const submit = () => {
    if (!isValid) return;
    handlers.handleVaultProductionBudgetConfirm(parsedValue);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{
            backgroundColor: 'var(--expedia-navy)',
            color: 'white',
            opacity: 0.85,
          }}
        >
          Vault: Production Budget
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Confirm production budget
        </h2>
        <p className="text-[var(--text-secondary)]">
          Before matching, please confirm what portion of this budget is available for production.
          {totalBudgetUsd && <span> Total budget on the brief: <strong>${totalBudgetUsd.toLocaleString()}</strong>.</span>}
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Production Budget (USD)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg text-[var(--text-muted)] font-semibold">$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 300,000"
            className="input-field flex-1"
            autoFocus
          />
        </div>
        {showFloorError && (
          <p className="text-sm text-[var(--status-red)] mt-1">
            Minimum production budget is $1,000. Vault concepts have production costs that won&apos;t fit smaller budgets.
          </p>
        )}
      </div>

      {/* Quick picks */}
      {quickPicks.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Quick Pick
          </label>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map(p => (
              <button
                key={p.label}
                onClick={() => setValue(p.value.toLocaleString())}
                className="px-3 py-1.5 text-sm rounded-full border-2 border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--expedia-navy)] hover:text-[var(--expedia-navy)] transition-all"
              >
                {p.label} <span className="text-[var(--text-muted)]">(${p.value.toLocaleString()})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={submit}
          disabled={!isValid}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Confirm & Find Matches</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
