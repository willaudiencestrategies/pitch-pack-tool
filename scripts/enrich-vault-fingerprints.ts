#!/usr/bin/env tsx
// scripts/enrich-vault-fingerprints.ts
// Run: npx tsx scripts/enrich-vault-fingerprints.ts src/lib/vault-content.json
import { readFileSync, writeFileSync } from 'fs';
import { callClaudeJSON } from '../src/lib/claude';
import { CONCEPT_FINGERPRINT_PROMPT } from '../src/lib/prompts/concept-fingerprint';
import type { ConceptFingerprint } from '../src/lib/vault-match/types';

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('usage: enrich-vault-fingerprints.ts <vault-content.json>');
  const vault = JSON.parse(readFileSync(path, 'utf8'));
  const concepts: Array<Record<string, unknown>> = vault.concepts;

  for (const c of concepts) {
    const input = {
      ideaSummary: c.ideaSummary, creativeMechanism: c.creativeMechanism,
      coreMessage: c.coreMessage, whatItsGoodFor: c.whatItsGoodFor,
      audienceFit: c.audienceFit, channelsFormats: c.channelsFormats, category: c.category,
    };
    const fp = await callClaudeJSON<ConceptFingerprint>(
      CONCEPT_FINGERPRINT_PROMPT, JSON.stringify(input, null, 2), { endpoint: 'concept-fingerprint' },
    );
    c.fingerprint = fp;
    console.log(`fingerprinted: ${c.id}`);
  }

  writeFileSync(path, JSON.stringify(vault, null, 2));
  console.log(`Wrote ${concepts.length} fingerprints to ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
