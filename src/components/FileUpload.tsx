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
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isFileSupported(file.name)) {
        setState('error');
        setError(`Unsupported file type. Please use: ${getSupportedExtensions().join(', ')}`);
        return;
      }

      setState('processing');
      setFilename(file.name);
      setError('');

      try {
        const content = await parseFile(file);
        setState('success');
        onFileContent(content, file.name);
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

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
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
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleReset = useCallback(() => {
    setState('idle');
    setFilename('');
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
          relative p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragging ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5' : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'}
          ${state === 'success' ? 'border-[var(--status-green)] bg-[var(--status-green)]/5' : ''}
          ${state === 'error' ? 'border-[var(--status-red)] bg-[var(--status-red-bg)]' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="File upload"
        />

        {state === 'idle' && (
          <div className="text-center">
            <div className="mb-3">
              <svg
                className="mx-auto h-10 w-10 text-[var(--text-muted)]"
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
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Supports: Word (.docx), Markdown (.md), Text (.txt)
            </p>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center">
            <div className="mb-3">
              <svg
                className="mx-auto h-10 w-10 text-[var(--expedia-navy)] animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Processing {filename}...
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="mb-3">
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
              {filename} loaded successfully
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-[var(--text-muted)] underline mt-2 hover:text-[var(--text-secondary)]"
            >
              Upload a different file
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="mb-3">
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
              className="text-xs text-[var(--text-muted)] underline mt-2 hover:text-[var(--text-secondary)]"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        Word documents preserve formatting best. Tables will be converted to text.
      </p>
    </div>
  );
}
