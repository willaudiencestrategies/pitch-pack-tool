// src/lib/file-parser.ts

/**
 * File parsing utility for handling different document formats.
 * Supports: Word (.docx), Markdown (.md), Text (.txt)
 */

import mammoth from 'mammoth';

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Returns list of supported file extensions
 */
export function getSupportedExtensions(): readonly string[] {
  return SUPPORTED_EXTENSIONS;
}

/**
 * Checks if a filename has a supported extension (case insensitive)
 */
export function isFileSupported(filename: string): boolean {
  const ext = getExtension(filename);
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

/**
 * Gets the lowercase extension from a filename
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Parses a file and returns its text content
 * - .txt and .md files are read as plain text
 * - .docx files are parsed using mammoth to extract raw text
 */
export async function parseFile(file: File): Promise<string> {
  const ext = getExtension(file.name);

  if (!isFileSupported(file.name)) {
    throw new Error(
      `Unsupported file type: ${ext || 'unknown'}. Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`
    );
  }

  if (ext === '.txt' || ext === '.md') {
    return await file.text();
  }

  if (ext === '.docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // This shouldn't be reached due to the isFileSupported check, but TypeScript needs it
  throw new Error(`Unexpected file type: ${ext}`);
}
