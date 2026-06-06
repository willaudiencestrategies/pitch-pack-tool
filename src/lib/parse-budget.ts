/**
 * Parse a free-text production budget string into a USD figure.
 *
 * Briefs (and the Vault itself) state budgets in shorthand: "$200k p/e",
 * "$1.5M", "$150k–$200k", "USD 500,000". The old runtime parser grabbed the
 * first run of digits and dropped every k/M/million suffix, so "$200k" became
 * 200 and was then rejected by the API floor — the matcher never ran. This
 * parser understands currency symbols, k/M/million scale suffixes, decimals,
 * comma thousands, and ranges.
 *
 * Heuristics:
 *  - When the string has currency-anchored numbers ($300,000), prefer those.
 *    This skips stray numbers like a year ("2026 campaign, budget $300,000").
 *  - For a range ("$80–$120k"), take the lower bound — conservative for a
 *    budget the work has to fit inside.
 *  - A scale suffix anywhere in the string is inherited by an unscaled lead
 *    number ("$80-120k" → 80k), since ranges often write the suffix once.
 */

interface BudgetToken {
  value: number;
  scale: string | null;
}

const SCALE_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  mm: 1_000_000,
  mn: 1_000_000,
  million: 1_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

const SCALE_PATTERN = '(k|mm|mn|m|million|bn|billion)?';
const NUMBER = '(\\d[\\d,]*(?:\\.\\d+)?)';

function multiplier(scale: string | null): number {
  if (!scale) return 1;
  return SCALE_MULTIPLIER[scale] ?? 1;
}

function collect(text: string, re: RegExp): BudgetToken[] {
  const tokens: BudgetToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    tokens.push({ value, scale: m[2] || null });
  }
  return tokens;
}

export function parseUsdBudget(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.toLowerCase();

  const allTokens = collect(text, new RegExp(`${NUMBER}\\s*${SCALE_PATTERN}`, 'g'));
  if (!allTokens.length) return null;

  const currencyTokens = collect(text, new RegExp(`[$£€]\\s*${NUMBER}\\s*${SCALE_PATTERN}`, 'g'));
  const chosen = currencyTokens.length ? currencyTokens : allTokens;

  // A scale stated once in a range applies to the lead number too.
  const sharedScale =
    chosen.find(t => t.scale)?.scale ?? allTokens.find(t => t.scale)?.scale ?? null;

  const lead = chosen[0];
  const result = Math.round(lead.value * multiplier(lead.scale ?? sharedScale));
  return Number.isFinite(result) && result > 0 ? result : null;
}
