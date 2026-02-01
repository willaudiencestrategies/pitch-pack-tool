'use client';

import { useState, useRef, useCallback } from 'react';
import { parseFile, isFileSupported, getSupportedExtensions } from '@/lib/file-parser';

interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'processing' | 'success' | 'error';

export function FileUpload({ onFileContent, disabled = false }: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [filenames, setFilenames] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Check all files are supported first
      const unsupportedFiles = files.filter(f => !isFileSupported(f.name));
      if (unsupportedFiles.length > 0) {
        setState('error');
        setError(`Unsupported file type(s): ${unsupportedFiles.map(f => f.name).join(', ')}. Please use: ${getSupportedExtensions().join(', ')}`);
        return;
      }

      setState('processing');
      setFilenames(files.map(f => f.name));
      setError('');

      try {
        const results: string[] = [];
        for (const file of files) {
          const content = await parseFile(file);
          results.push(`--- ${file.name} ---\n${content}`);
        }
        const combinedContent = results.join('\n\n');
        const combinedFilenames = files.map(f => f.name).join(', ');
        setState('success');
        onFileContent(combinedContent, combinedFilenames);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      }
    },
    [onFileContent]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleReset = useCallback(() => {
    setState('idle');
    setFilenames([]);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const acceptString = getSupportedExtensions().join(',');

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative p-6 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-300 ease-out
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
          ${state === 'success' ? 'border-[var(--status-green)] bg-[var(--status-green)]/5' : ''}
          ${state === 'error' ? 'border-[var(--status-red)] bg-[var(--status-red-bg)]' : ''}
          ${state !== 'success' && state !== 'error' && !isDragging ? 'border-[var(--border-color)] hover:border-[var(--border-hover)]' : ''}
        `}
        style={{
          borderColor: isDragging ? 'var(--expedia-navy)' : undefined,
          boxShadow: isDragging
            ? '0 0 0 3px rgba(26, 31, 113, 0.15), 0 4px 12px rgba(26, 31, 113, 0.1)'
            : undefined,
          backgroundColor: isDragging ? 'rgba(26, 31, 113, 0.03)' : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          onChange={handleInputChange}
          disabled={disabled}
          multiple
          className="hidden"
          aria-label="File upload"
        />

        {state === 'idle' && (
          <div className="text-center">
            <div className="mb-3">
              <svg
                className="mx-auto h-10 w-10 text-[var(--text-muted)] transition-transform duration-300"
                style={{
                  transform: isDragging ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Supports: .docx, .pdf, .txt, .pptx (text only)
            </p>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center">
            <div className="flex justify-center gap-1.5 mb-4">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  animation: 'bounceDelay 0.6s ease-in-out infinite',
                  animationDelay: '0ms',
                }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  animation: 'bounceDelay 0.6s ease-in-out infinite',
                  animationDelay: '150ms',
                }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  animation: 'bounceDelay 0.6s ease-in-out infinite',
                  animationDelay: '300ms',
                }}
              />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Processing {filenames.length === 1 ? filenames[0] : `${filenames.length} files`}...
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div
              className="mb-3"
              style={{
                animation: 'scaleIn 0.3s ease-out forwards',
              }}
            >
              <svg
                className="mx-auto h-10 w-10 text-[var(--status-green)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--status-green)]">
              {filenames.length === 1 ? `${filenames[0]} loaded successfully` : `${filenames.length} files loaded successfully`}
            </p>
            {filenames.length > 1 && (
              <ul className="text-sm text-[var(--text-muted)] mt-2 space-y-0.5">
                {filenames.map((name, idx) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-[var(--text-muted)] underline mt-2 hover:text-[var(--text-secondary)] transition-colors duration-200"
            >
              Upload different files
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div
              className="mb-3"
              style={{
                animation: 'scaleIn 0.3s ease-out forwards',
              }}
            >
              <svg
                className="mx-auto h-10 w-10 text-[var(--status-red)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--status-red)]">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-[var(--text-muted)] underline mt-2 hover:text-[var(--text-secondary)] transition-colors duration-200"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        Word documents preserve formatting best. Tables will be converted to text.
      </p>

      <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-muted)]">
        <p className="font-medium mb-1">💡 About hyperlinks</p>
        <p>
          If your brief contains links, open them and copy the content manually.
          The tool can't access password-protected pages or content behind logins.
        </p>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes bounceDelay {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
