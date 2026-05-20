'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';

export function VaultProductionBudgetStep() {
  const { state, handlers } = useBriefState();
  const totalBudgetRaw = state.budgetDetails?.totalBudget || '';
  const totalBudgetMatch = totalBudgetRaw.match(/[\d,]+/);
  const totalBudgetUsd = totalBudgetMatch ? parseInt(totalBudgetMatch[0].replace(/,/g, ''), 10) : null;
  const [value, setValue] = useState('');

  const quickPicks = totalBudgetUsd ? [
    { label: '10% of total', value: Math.round(totalBudgetUsd * 0.10) },
    { label: '15% of total', value: Math.round(totalBudgetUsd * 0.15) },
    { label: '20% of total', value: Math.round(totalBudgetUsd * 0.20) },
  ] : [];

  const submit = () => {
    const parsed = parseInt(value.replace(/[^\d]/g, ''), 10);
    if (!parsed || parsed < 1000) return;
    handlers.handleVaultProductionBudgetConfirm(parsed);
  };

  const parsedValue = parseInt(value.replace(/[^\d]/g, ''), 10);
  const isValid = parsedValue && parsedValue >= 1000;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2">Confirm production budget</h2>
      <p className="text-[var(--text-muted)] mb-6">
        Before I can match this to existing Vault concepts, please confirm what portion
        of this budget is available for production.
        {totalBudgetUsd && <span> Total budget on the brief: ${totalBudgetUsd.toLocaleString()}.</span>}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Production budget (USD)</label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">$</span>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 300,000"
              className="flex-1 px-4 py-3 border border-[var(--border-color)] rounded-lg focus:border-[var(--expedia-navy)] focus:outline-none"
            />
          </div>
        </div>

        {quickPicks.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Quick pick</div>
            <div className="flex gap-2">
              {quickPicks.map(p => (
                <button
                  key={p.label}
                  onClick={() => setValue(p.value.toLocaleString())}
                  className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded hover:bg-[var(--bg-tertiary)]"
                >
                  {p.label} (${p.value.toLocaleString()})
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!isValid}
          className="w-full py-3 bg-[var(--expedia-navy)] text-white rounded-lg font-medium disabled:opacity-50"
        >
          Confirm and find matches
        </button>
      </div>
    </div>
  );
}
