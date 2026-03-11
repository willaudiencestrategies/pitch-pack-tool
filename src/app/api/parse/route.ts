// src/app/api/parse/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx', '.pdf', '.ppt', '.pptx'];

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

async function parseFileBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
  const ext = getExtension(filename);

  if (ext === '.txt' || ext === '.md') {
    return new TextDecoder().decode(buffer);
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (ext === '.ppt' || ext === '.pptx') {
    return `[PowerPoint file: ${filename}]\n[Text extraction from PPTX requires manual copy - please copy and paste the text content]`;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    for (const file of files) {
      const ext = getExtension(file.name);
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const results: string[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const content = await parseFileBuffer(buffer, file.name);
      results.push(`--- ${file.name} ---\n${content}`);
    }

    const combinedContent = results.join('\n\n');
    const combinedFilenames = files.map(f => f.name).join(', ');

    return NextResponse.json({ content: combinedContent, filenames: combinedFilenames });
  } catch (error) {
    console.error('File parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse file' },
      { status: 500 }
    );
  }
}
