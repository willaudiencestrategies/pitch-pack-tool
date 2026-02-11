import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { Section, AudienceSegment, Truth, BrandAlignment } from './types';

interface ExportData {
  sections: Section[];
  audience?: AudienceSegment;
  personification?: string;
  insights?: Truth[];
  brandAlignment?: BrandAlignment;
  briefFilename?: string;
}

export async function exportToWord(data: ExportData): Promise<void> {
  const { sections, audience, personification, insights, brandAlignment, briefFilename } = data;

  const children: Paragraph[] = [
    new Paragraph({ text: 'Creative Brief', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}`, spacing: { after: 400 } }),
  ];

  if (brandAlignment?.brand) {
    children.push(
      new Paragraph({ text: 'Brand', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: brandAlignment.brand.replace('_', '.') }),
    );
  }

  for (const section of sections) {
    if (section.content) {
      children.push(
        new Paragraph({ text: section.name, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: section.content }),
      );
    }
  }

  if (audience) {
    children.push(
      new Paragraph({ text: 'Audience', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: audience.name, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: audience.needsValues }),
    );
  }

  if (personification) {
    children.push(
      new Paragraph({ text: 'Personification', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: personification }),
    );
  }

  if (insights && insights.length > 0) {
    children.push(new Paragraph({ text: 'Audience Insights', heading: HeadingLevel.HEADING_1 }));
    for (const insight of insights) {
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${insight.text}` })] }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const exportName = briefFilename
    ? briefFilename.replace(/\.[^/.]+$/, '') + ' — Enhanced'
    : 'creative-brief';
  saveAs(blob, `${exportName}.docx`);
}
