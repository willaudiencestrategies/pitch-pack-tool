import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultResult } from '../types';

// Mock file-saver before importing word-export
const saveAsMock = vi.fn();
vi.mock('file-saver', () => ({
  saveAs: (...args: unknown[]) => saveAsMock(...args),
}));

// Mock the docx Packer.toBlob to return something inspectable
import { Packer } from 'docx';

describe('exportVaultPack', () => {
  beforeEach(() => {
    saveAsMock.mockClear();
  });

  const sampleVaultResult: VaultResult = {
    rankedConcepts: [
      {
        conceptId: 'next-stop',
        conceptName: 'Next Stop',
        slot: 'A',
        confidence: 'strong',
        confidenceReason: 'Same partner type. Strong fit.',
        partnerTypeMatch: 'same-category',
        budgetFlag: 'within-range',
        conceptDescription: 'A dynamic travel series exploring regions.',
        estimatedProductionTimeline: '12-14 weeks',
        estimatedProductionBudget: '$300,000 (3x films)',
        qualityFlags: [],
        referenceLinks: ['https://drive.example/next-stop-deck'],
      },
      {
        conceptId: 'q-and-a-to-b',
        conceptName: 'Q&A to B',
        slot: 'B',
        confidence: 'plausible',
        confidenceReason: 'Cross-category but channel mix matches.',
        partnerTypeMatch: 'adjacent',
        budgetFlag: 'close-to-edge',
        conceptDescription: 'A photography-led discovery series.',
        estimatedProductionTimeline: '8-10 weeks',
        estimatedProductionBudget: '$200,000-$250,000',
        qualityFlags: ['overly-generic'],
        referenceLinks: [],
      },
    ],
    selectedConceptIds: ['next-stop'],
    narrativeDrafts: {
      'next-stop': {
        conceptId: 'next-stop',
        slides: {
          keyBriefPoints: 'Brief points: objective, audience, budget, timing.',
          creativeProblemWeAreSolving: 'How to feel continuous across regions.',
          narrativePitch: 'The story moves like a road trip with intent.',
          conceptDescriptionFull: 'Concept structure, tone, mechanism. Deployment examples Jamaica and Bahamas.',
          tailoringTo: 'Tailored to Germany: Bavaria to the Ruhr.',
          strategicFitAndBudget: 'Strategic fit strong. Timeline 12-14 weeks. Budget $300k.',
        },
        creativeLabFlag: false,
      },
    },
    customEdits: {},
    exportedAt: null,
    resumeToken: null,
    topLineNote: null,
  };

  it('produces a non-empty .docx blob via Packer', async () => {
    const { exportVaultPack } = await import('../word-export');
    await exportVaultPack({
      briefFilename: 'germany-brief.docx',
      partnerName: 'expedia',
      vaultResult: sampleVaultResult,
      resumeUrl: 'https://pitch-pack-tool-production.up.railway.app/?resume=ABC123',
    });

    expect(saveAsMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = saveAsMock.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).size).toBeGreaterThan(1000); // a real docx is at least 1KB
    expect(filename).toBe('vault-pitch-pack-expedia.docx');
  });

  it('produces a docx blob that decodes as a valid ZIP archive (PK header)', async () => {
    const { exportVaultPack } = await import('../word-export');
    await exportVaultPack({
      briefFilename: 'germany-brief.docx',
      partnerName: 'expedia',
      vaultResult: sampleVaultResult,
      resumeUrl: 'https://pitch-pack-tool-production.up.railway.app/?resume=MARKER123',
    });

    const [blob] = saveAsMock.mock.calls[0];
    // jsdom's Blob lacks arrayBuffer(); read bytes via FileReader instead.
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob as Blob);
    });
    const bytes = new Uint8Array(buffer);

    // A .docx is a ZIP archive. The first 4 bytes must be: 0x50 0x4B 0x03 0x04 ("PK").
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
    // ZIP archive must contain a central directory marker further in.
    let foundCentralDir = false;
    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x01 && bytes[i + 3] === 0x02) {
        foundCentralDir = true;
        break;
      }
    }
    expect(foundCentralDir).toBe(true);
  });

  it('sanitises filename slugs (spaces become hyphens, lowercased)', async () => {
    const { exportVaultPack } = await import('../word-export');
    await exportVaultPack({
      briefFilename: 'brief.docx',
      partnerName: 'Hotels Com',
      vaultResult: sampleVaultResult,
      resumeUrl: 'https://example.com/',
    });

    const [, filename] = saveAsMock.mock.calls[0];
    expect(filename).toBe('vault-pitch-pack-hotels-com.docx');
  });

  it('handles vault result with multiple selected concepts without error', async () => {
    const multiResult: VaultResult = {
      ...sampleVaultResult,
      selectedConceptIds: ['next-stop', 'q-and-a-to-b'],
      narrativeDrafts: {
        ...sampleVaultResult.narrativeDrafts,
        'q-and-a-to-b': {
          conceptId: 'q-and-a-to-b',
          slides: {
            keyBriefPoints: 'Different brief points for Q&A to B.',
            creativeProblemWeAreSolving: 'Q-problem.',
            narrativePitch: 'Q-pitch.',
            conceptDescriptionFull: 'Q-concept-full.',
            tailoringTo: 'Q-tailoring.',
            strategicFitAndBudget: 'Q-strategic.',
          },
          creativeLabFlag: true,
        },
      },
    };

    const { exportVaultPack } = await import('../word-export');
    await expect(
      exportVaultPack({
        briefFilename: 'brief.docx',
        partnerName: 'vrbo',
        vaultResult: multiResult,
        resumeUrl: 'https://example.com/?resume=X',
      }),
    ).resolves.not.toThrow();

    // Multi-concept packs are bigger than single-concept ones (more slide content)
    const [blob] = saveAsMock.mock.calls[0];
    expect((blob as Blob).size).toBeGreaterThan(1500);
    expect(saveAsMock.mock.calls[0][1]).toBe('vault-pitch-pack-vrbo.docx');
  });

  it('handles vault result with empty selectedConceptIds (matches summary only)', async () => {
    const emptyResult: VaultResult = {
      ...sampleVaultResult,
      selectedConceptIds: [],
      narrativeDrafts: {},
    };

    const { exportVaultPack } = await import('../word-export');
    await expect(
      exportVaultPack({
        briefFilename: 'brief.docx',
        partnerName: 'expedia',
        vaultResult: emptyResult,
        resumeUrl: 'https://example.com/?resume=X',
      }),
    ).resolves.not.toThrow();

    const [blob] = saveAsMock.mock.calls[0];
    expect((blob as Blob).size).toBeGreaterThan(800);
  });

  it('uses the docx library Packer correctly', () => {
    // Sanity check: Packer.toBlob exists and is callable
    expect(typeof Packer.toBlob).toBe('function');
  });
});
