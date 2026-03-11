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

/**
 * Parse a line of markdown text into TextRun elements.
 * Handles **bold** markers.
 */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    runs.push(new TextRun({ text: match[1], bold: true }));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

/**
 * Convert markdown content string into an array of docx Paragraphs.
 * Handles: ## headings, ### subheadings, - bullets, **bold**, Differentiator: prefix
 */
function markdownToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') continue;

    if (trimmed.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^### /, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
      continue;
    }

    if (trimmed.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^## /, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }));
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '');
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '• ' }), ...parseInlineMarkdown(bulletText)],
        spacing: { before: 60, after: 60 },
        indent: { left: 360 },
      }));
      continue;
    }

    if (trimmed.startsWith('Differentiator:')) {
      const value = trimmed.replace(/^Differentiator:\s*/, '');
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: 'Differentiator: ', bold: true, italics: true }),
          new TextRun({ text: value, italics: true }),
        ],
        spacing: { before: 60, after: 120 },
        indent: { left: 360 },
      }));
      continue;
    }

    paragraphs.push(new Paragraph({
      children: parseInlineMarkdown(trimmed),
      spacing: { before: 60, after: 60 },
    }));
  }

  return paragraphs;
}

export async function exportToWord(data: ExportData): Promise<void> {
  const { sections, audience, personification, insights, brandAlignment, briefFilename } = data;

  const children: Paragraph[] = [
    new Paragraph({ text: 'Creative Brief', heading: HeadingLevel.TITLE }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleDateString()}`,
      spacing: { after: 400 },
    }),
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
        new Paragraph({
          text: section.name,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        ...markdownToParagraphs(section.content),
      );
    }
  }

  if (audience) {
    children.push(
      new Paragraph({
        text: 'Audience',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: audience.name,
        heading: HeadingLevel.HEADING_2,
      }),
      ...markdownToParagraphs(audience.needsValues),
    );
  }

  if (personification) {
    children.push(
      new Paragraph({
        text: 'Personification',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      ...markdownToParagraphs(personification),
    );
  }

  if (insights && insights.length > 0) {
    children.push(new Paragraph({
      text: 'Audience Insights',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
    for (const insight of insights) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${insight.text}` })],
        spacing: { before: 60, after: 60 },
        indent: { left: 360 },
      }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const exportName = briefFilename
    ? briefFilename.replace(/\.[^/.]+$/, '') + ' — Enhanced'
    : 'creative-brief';
  saveAs(blob, `${exportName}.docx`);
}
