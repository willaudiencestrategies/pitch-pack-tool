// src/lib/file-utils.ts

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.doc', '.docx', '.pdf', '.ppt', '.pptx'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function getSupportedExtensions(): readonly string[] {
  return SUPPORTED_EXTENSIONS;
}

export function isFileSupported(filename: string): boolean {
  const ext = getExtension(filename);
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}
