import { describe, it, expect } from 'vitest';
import { getSupportedExtensions, isFileSupported, parseFile } from './file-parser';

// Helper to create a mock File with text() method for jsdom
function createMockFile(content: string, name: string, type: string): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  // Add text() method if not present (jsdom compatibility)
  if (!file.text) {
    (file as File & { text: () => Promise<string> }).text = () => Promise.resolve(content);
  }
  return file;
}

describe('getSupportedExtensions', () => {
  it('returns array with all supported extensions', () => {
    const extensions = getSupportedExtensions();
    expect(extensions).toContain('.txt');
    expect(extensions).toContain('.md');
    expect(extensions).toContain('.docx');
    expect(extensions).toContain('.pdf');
    expect(extensions).toContain('.ppt');
    expect(extensions).toContain('.pptx');
    expect(extensions.length).toBe(6);
  });
});

describe('isFileSupported', () => {
  it('returns true for .txt files', () => {
    expect(isFileSupported('document.txt')).toBe(true);
  });

  it('returns true for .md files', () => {
    expect(isFileSupported('readme.md')).toBe(true);
  });

  it('returns true for .docx files', () => {
    expect(isFileSupported('brief.docx')).toBe(true);
  });

  it('is case insensitive for extensions', () => {
    expect(isFileSupported('document.TXT')).toBe(true);
    expect(isFileSupported('document.Txt')).toBe(true);
    expect(isFileSupported('brief.DOCX')).toBe(true);
    expect(isFileSupported('readme.MD')).toBe(true);
  });

  it('returns true for .pdf files', () => {
    expect(isFileSupported('document.pdf')).toBe(true);
  });

  it('returns true for .pptx files', () => {
    expect(isFileSupported('presentation.pptx')).toBe(true);
    expect(isFileSupported('slides.ppt')).toBe(true);
  });

  it('returns false for unsupported extensions', () => {
    expect(isFileSupported('image.png')).toBe(false);
    expect(isFileSupported('data.json')).toBe(false);
    expect(isFileSupported('video.mp4')).toBe(false);
  });

  it('returns false for files without extension', () => {
    expect(isFileSupported('noextension')).toBe(false);
  });

  it('handles filenames with multiple dots', () => {
    expect(isFileSupported('my.document.txt')).toBe(true);
    expect(isFileSupported('brief.v2.docx')).toBe(true);
  });
});

describe('parseFile', () => {
  it('reads .txt files as text', async () => {
    const content = 'Hello, this is a text file.';
    const file = createMockFile(content, 'test.txt', 'text/plain');

    const result = await parseFile(file);
    expect(result).toBe(content);
  });

  it('reads .md files as text', async () => {
    const content = '# Heading\n\nSome markdown content.';
    const file = createMockFile(content, 'readme.md', 'text/markdown');

    const result = await parseFile(file);
    expect(result).toBe(content);
  });

  it('throws error for unsupported file types', async () => {
    const file = createMockFile('content', 'image.png', 'image/png');

    await expect(parseFile(file)).rejects.toThrow('Unsupported file type: .png');
  });

  it('throws error for files without extension', async () => {
    const file = createMockFile('content', 'noextension', 'application/octet-stream');

    await expect(parseFile(file)).rejects.toThrow('Unsupported file type: unknown');
  });
});
