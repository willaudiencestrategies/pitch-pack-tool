#!/usr/bin/env tsx
/**
 * One-shot script: parses THE VAULT_November 2025_Kat.docx into vault-content.json.
 * Run via: npx tsx scripts/parse-vault.ts <path-to-docx> <output-json-path>
 *
 * Vault structure per concept:
 *   - Title (rendered as graphic in the docx — NOT in extracted text;
 *     we derive the name from the first quoted string in the Idea Summary)
 *   - Idea Summary (paragraph)
 *   - Creative Mechanism (paragraph, with "Core message: ..." line following)
 *   - What It's Good For (bulleted list)
 *   - Audience Fit (bulleted list)
 *   - Channels & Formats (bulleted list)
 *   - Watchouts (bulleted list)
 *   - Previously pitched to (line)
 *   - Estimate production timelines (line)
 *   - Estimate production budget (line)
 *
 * Categories (split-across-lines headers in the Word doc, separated by blanks):
 *   DESTINATION PARTNERSHIPS, AIRLINE PARTNERSHIPS, LODGING PARTNERSHIPS,
 *   CAR PARTNERSHIPS, NON-ENDEMIC PARTNERSHIPS
 */

import mammoth from 'mammoth';
import { writeFileSync, readFileSync } from 'fs';

interface VaultConcept {
  id: string;
  name: string;
  conceptType: 'one-off' | 'franchise';
  category: 'destination' | 'lodging' | 'airline' | 'car' | 'non-endemic';
  archetype: string[];
  ideaSummary: string;
  creativeMechanism: string;
  coreMessage: string;
  whatItsGoodFor: string[];
  audienceFit: string[];
  channelsFormats: string[];
  watchouts: string[];
  previouslyPitchedTo: string[];
  productionTimelineRaw: string;
  productionTimeline: { minWeeks: number; maxWeeks: number } | null;
  productionBudget: { label: string; minUsd: number; maxUsd: number }[];
  referenceLinks: string[];
  lastValidated: string | null;
  eraTags: string[];
}

interface VaultContent {
  sourceFile: string;
  parsedAt: string;
  concepts: VaultConcept[];
}

type Category = VaultConcept['category'];

const CATEGORY_WORDS: Record<string, Category> = {
  DESTINATION: 'destination',
  AIRLINE: 'airline',
  LODGING: 'lodging',
  CAR: 'car',
  'NON-ENDEMIC': 'non-endemic',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseTimelineRaw(raw: string): { minWeeks: number; maxWeeks: number } | null {
  // Matches "12-14 weeks", "10 weeks", "6 to 8 weeks", "6–8 weeks"
  const range = raw.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*weeks/i);
  if (range) return { minWeeks: parseInt(range[1]), maxWeeks: parseInt(range[2]) };
  const single = raw.match(/(\d+)\s*weeks/i);
  if (single) return { minWeeks: parseInt(single[1]), maxWeeks: parseInt(single[1]) };
  return null;
}

function parseBudget(raw: string): { label: string; minUsd: number; maxUsd: number }[] {
  // Examples: "$300k (3x films)", "$150k-$200k", "$50,000 - $75,000",
  //           "$200k–$400k per franchise", "$60-$80k (1x creator)".
  // The "k" suffix applies to the WHOLE range when it appears anywhere in the tier
  // (so "$60-$80k" means $60k-$80k, not $60-$80000).
  const tiers: { label: string; minUsd: number; maxUsd: number }[] = [];
  const tierPattern = /\$([\d,]+)(k|K)?(?:\s*(?:-|–|—|to)\s*\$?([\d,]+)(k|K)?)?(?:\s*\(([^)]+)\))?/g;
  let match;
  while ((match = tierPattern.exec(raw)) !== null) {
    const hasK = !!(match[2] || match[4]);
    const minNum = parseInt(match[1].replace(/,/g, ''));
    const min = minNum * (hasK ? 1000 : 1);
    let max = min;
    if (match[3]) {
      const maxNum = parseInt(match[3].replace(/,/g, ''));
      max = maxNum * (hasK ? 1000 : 1);
    }
    const label = match[5] || 'standard';
    tiers.push({ label, minUsd: min, maxUsd: max });
  }
  return tiers;
}

/** Extract the first quoted string (curly or straight) from a paragraph as the concept name. */
function extractConceptName(ideaSummary: string): string | null {
  // Typewriter-style double-single quotes wrapping a title at the start of the paragraph
  // (e.g. "‘’A Better Way to Listen’’ is..."). Check this BEFORE curly double-quotes,
  // since the same paragraph may also contain curly-quoted phrases later in the body.
  const dblSingleLead = ideaSummary.match(/^\s*[‘’]{2}([^‘’]+)[‘’]{2}/);
  if (dblSingleLead) return dblSingleLead[1].trim();
  // Curly double quotes (U+201C / U+201D) — most concepts wrap the title in these
  const curly = ideaSummary.match(/[“]([^”]+)[”]/);
  if (curly) return curly[1].trim();
  // Anywhere doubled single (defensive)
  const dblSingle = ideaSummary.match(/[‘’]{2}([^‘’]+)[‘’]{2}/);
  if (dblSingle) return dblSingle[1].trim();
  // Straight double quotes
  const straight = ideaSummary.match(/"([^"]+)"/);
  if (straight) return straight[1].trim();
  return null;
}

/** Detect a category header at position i. Returns [category, nextIndex] or null. */
function matchCategoryHeader(lines: string[], i: number): [Category, number] | null {
  const line = lines[i].trim().replace(/ /g, ' ');
  if (!line) return null;
  const upper = line.toUpperCase();

  // Single-line: "DESTINATION PARTNERSHIPS"
  const singleMatch = upper.match(/^(DESTINATION|AIRLINE|LODGING|CAR|NON-ENDEMIC)\s+PARTNERSHIPS$/);
  if (singleMatch) {
    return [CATEGORY_WORDS[singleMatch[1]], i + 1];
  }

  // Multi-line with potentially blank lines between word and "PARTNERSHIPS"
  const wordMatch = upper.match(/^(DESTINATION|AIRLINE|LODGING|CAR|NON-ENDEMIC)$/);
  if (wordMatch) {
    // Scan forward up to 5 lines for "PARTNERSHIPS"
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (next.toUpperCase() === 'PARTNERSHIPS') {
        return [CATEGORY_WORDS[wordMatch[1]], j + 1];
      }
      // Found non-blank non-PARTNERSHIPS — not a category header
      break;
    }
  }
  return null;
}

const FIELD_HEADERS = new Set([
  'Idea Summary',
  'Creative Mechanism',
  'What It’s Good For',
  "What It's Good For",
  'What This Approach Delivers', // Shape Your Stay variant
  'Audience Fit',
  'Channels & Formats',
  'Watchouts',
  'Core Message', // Choose Your Own Adventure variant
]);

type FieldName =
  | 'ideaSummary'
  | 'creativeMechanism'
  | 'whatItsGoodFor'
  | 'audienceFit'
  | 'channelsFormats'
  | 'watchouts';

type FieldOrCoreMessage = FieldName | 'coreMessage';

const HEADER_TO_FIELD: Record<string, FieldOrCoreMessage> = {
  'Idea Summary': 'ideaSummary',
  'Creative Mechanism': 'creativeMechanism',
  'What It’s Good For': 'whatItsGoodFor',
  "What It's Good For": 'whatItsGoodFor',
  'What This Approach Delivers': 'whatItsGoodFor',
  'Audience Fit': 'audienceFit',
  'Channels & Formats': 'channelsFormats',
  Watchouts: 'watchouts',
  'Core Message': 'coreMessage',
};

const PARAGRAPH_FIELDS: FieldName[] = ['ideaSummary', 'creativeMechanism'];
const LIST_FIELDS: FieldName[] = ['whatItsGoodFor', 'audienceFit', 'channelsFormats', 'watchouts'];

async function parseVault(docxPath: string): Promise<VaultContent> {
  const buffer = readFileSync(docxPath);
  const { value: text } = await mammoth.extractRawText({ buffer });
  // Strip zero-width spaces (U+200B, U+FEFF) and trim each line.
  // The Word doc inserts ZWSP between "Idea Summary" header and the body paragraph
  // on some concepts (the ones imported from another source), which would otherwise
  // collapse them onto a single line.
  const cleanedLines = text.split('\n').map(l => l.replace(/[​‌‍﻿]/g, '').trim());
  // Split any line that begins with a section header followed by body text into two lines.
  // The Word doc has ZWSP-joined entries where headers and content collapsed onto one line.
  const splittableHeaders = [
    'Idea Summary',
    'Creative Mechanism',
    'What It’s Good For',
    "What It's Good For",
    'Audience Fit',
    'Channels & Formats',
    'Watchouts',
  ];
  const lines: string[] = [];
  for (const l of cleanedLines) {
    let pushed = false;
    for (const h of splittableHeaders) {
      if (l.length > h.length && l.startsWith(h) && !FIELD_HEADERS.has(l)) {
        const rest = l.slice(h.length).trim();
        if (rest) {
          lines.push(h);
          lines.push(rest);
          pushed = true;
          break;
        }
      }
    }
    if (!pushed) lines.push(l);
  }

  const concepts: VaultConcept[] = [];
  let currentCategory: Category | null = null;

  // Pass 1: walk through and split into per-concept blocks by Idea Summary markers,
  // tracking current category from headers we encounter.
  type Block = { category: Category; startLine: number; endLine: number };
  const blocks: Block[] = [];

  let i = 0;
  // Find the indices of "Idea Summary" lines (true header lines, not text containing the phrase)
  const ideaSummaryIndices: number[] = [];
  while (i < lines.length) {
    const cat = matchCategoryHeader(lines, i);
    if (cat) {
      currentCategory = cat[0];
      i = cat[1];
      continue;
    }
    if (lines[i] === 'Idea Summary') {
      if (currentCategory) {
        ideaSummaryIndices.push(i);
        // Also record the active category for this block via a parallel array
        blocks.push({ category: currentCategory, startLine: i, endLine: -1 });
      }
      i++;
      continue;
    }
    i++;
  }

  // Set endLine: each block ends at the next block's startLine (or EOF)
  // BUT category transitions also delimit; we need to handle them.
  for (let b = 0; b < blocks.length; b++) {
    const nextStart = b + 1 < blocks.length ? blocks[b + 1].startLine : lines.length;
    blocks[b].endLine = nextStart;
  }

  // Pass 2: parse each block
  for (const block of blocks) {
    const concept: Partial<VaultConcept> = {
      conceptType: 'one-off',
      category: block.category,
      archetype: [],
      ideaSummary: '',
      creativeMechanism: '',
      coreMessage: '',
      whatItsGoodFor: [],
      audienceFit: [],
      channelsFormats: [],
      watchouts: [],
      previouslyPitchedTo: [],
      productionTimelineRaw: '',
      productionTimeline: null,
      productionBudget: [],
      referenceLinks: [],
      lastValidated: null,
      eraTags: [],
    };

    let currentField: FieldOrCoreMessage | null = 'ideaSummary';
    let buffer: string[] = [];

    const flush = () => {
      if (!currentField) {
        buffer = [];
        return;
      }
      if (currentField === 'coreMessage') {
        const value = buffer
          .filter(Boolean)
          .join(' ')
          .replace(/^[“"]/, '')
          .replace(/[”"]\s*$/, '')
          .trim();
        if (value) concept.coreMessage = value;
      } else if (PARAGRAPH_FIELDS.includes(currentField as FieldName)) {
        const value = buffer.filter(Boolean).join(' ').trim();
        const existing = (concept as any)[currentField] as string;
        (concept as any)[currentField] = existing ? `${existing} ${value}`.trim() : value;
      } else if (LIST_FIELDS.includes(currentField as FieldName)) {
        const list = (concept as any)[currentField] as string[];
        for (const item of buffer) {
          const cleaned = item.replace(/^[•‣◦⁃·●\-•]\s*/, '').trim();
          if (cleaned) list.push(cleaned);
        }
      }
      buffer = [];
    };

    // Start one line past "Idea Summary"
    for (let k = block.startLine + 1; k < block.endLine; k++) {
      const sub = lines[k];

      // Skip blank lines
      if (!sub) continue;

      // Skip stray category headers that fall inside a block (shouldn't, but be safe)
      const cat = matchCategoryHeader(lines, k);
      if (cat) {
        // jump past header but stay in block
        k = cat[1] - 1;
        continue;
      }

      // Field header transitions
      if (FIELD_HEADERS.has(sub)) {
        flush();
        currentField = HEADER_TO_FIELD[sub];
        continue;
      }

      // Core message — line-leading form
      if (/^Core message[:\s]/i.test(sub)) {
        const msg = sub
          .replace(/^Core message:?\s*/i, '')
          .replace(/^[“"]/, '')
          .replace(/[”"]\s*$/, '')
          .trim();
        concept.coreMessage = msg;
        continue;
      }
      // Core message — embedded mid-paragraph (e.g. "...Core message: 'X'")
      const inlineCm = sub.match(/Core message:\s*[“"]?([^“”"]+?)[”"]?\s*$/i);
      if (inlineCm && !concept.coreMessage) {
        concept.coreMessage = inlineCm[1].trim();
        // Also keep the lead-in text as part of the current field paragraph.
        // Strip the trailing "Core message: ..." from the line and continue.
        const trimmedLine = sub.replace(/\s*Core message:.*$/i, '').trim();
        if (trimmedLine && currentField) buffer.push(trimmedLine);
        continue;
      }

      // Previously pitched to — value may be inline OR on a following non-blank line
      if (/^Previously pitched to/i.test(sub)) {
        flush();
        let rest = sub.replace(/^Previously pitched to[:\s]*/i, '').trim();
        if (!rest) {
          // Scan forward up to 4 lines for the value
          for (let n = k + 1; n < Math.min(k + 5, block.endLine); n++) {
            const next = lines[n];
            if (!next) continue;
            // Stop if we hit another known field marker
            if (/^Estimate production/i.test(next) || FIELD_HEADERS.has(next)) break;
            rest = next.trim();
            k = n;
            break;
          }
        }
        concept.previouslyPitchedTo = rest
          ? rest.split(/,|;|\band\b/i).map(s => s.trim()).filter(Boolean)
          : [];
        currentField = null;
        continue;
      }

      // Production timeline
      if (/^Estimate production timeline/i.test(sub)) {
        flush();
        const rest = sub.replace(/^Estimate production timelines?:?\s*/i, '').trim();
        concept.productionTimelineRaw = rest;
        concept.productionTimeline = parseTimelineRaw(rest);
        currentField = null;
        continue;
      }

      // Production budget
      if (/^Estimate production budget/i.test(sub)) {
        flush();
        const rest = sub.replace(/^Estimate production budget:?\s*/i, '').trim();
        concept.productionBudget = parseBudget(rest);
        (concept as any).productionBudgetRaw = rest;
        currentField = null;
        continue;
      }

      // Otherwise: content line for current field
      if (currentField) {
        buffer.push(sub);
      }
    }
    flush();

    // Derive concept name from idea summary
    const name = extractConceptName(concept.ideaSummary || '') || 'Unknown Concept';
    concept.name = name;
    concept.id = slugify(name);

    concepts.push(concept as VaultConcept);
  }

  return {
    sourceFile: docxPath.split('/').pop() || 'unknown',
    parsedAt: new Date().toISOString(),
    concepts,
  };
}

const args = process.argv.slice(2);
const docxPath = args[0] || '/Users/will.bainbridge/Desktop/World/03_Inbox/THE VAULT_November 2025_Kat.docx';
const outputPath = args[1] || '/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/vault-content.json';

parseVault(docxPath).then(result => {
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Parsed ${result.concepts.length} concepts to ${outputPath}`);
  console.log(`Categories:`, result.concepts.reduce((acc: Record<string, number>, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {}));
}).catch(err => {
  console.error('Parse failed:', err);
  process.exit(1);
});
