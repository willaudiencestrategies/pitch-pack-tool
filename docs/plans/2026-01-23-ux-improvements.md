# UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 UX issues: file upload support, audience feedback before regenerate, editable segments, correct content display, reliable export, and back navigation.

**Architecture:** Batch by area — three work streams that can be parallelised:
1. **Upload & Export** — File handling at start and end of flow
2. **Audience Flow** — Feedback, editing, regeneration improvements
3. **Navigation** — Back buttons and clickable progress bar

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, mammoth.js (new dependency for Word parsing)

---

## Batch 1: Upload & Export

### Task 1.1: Install mammoth.js for Word parsing

**Files:**
- Modify: `package.json`

**Step 1: Add mammoth dependency**

```bash
cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool && npm install mammoth
```

**Step 2: Verify installation**

Run: `npm ls mammoth`
Expected: `mammoth@1.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mammoth.js for Word document parsing"
```

---

### Task 1.2: Create file parsing utility

**Files:**
- Create: `src/lib/file-parser.ts`
- Create: `src/lib/file-parser.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/file-parser.test.ts
import { describe, it, expect, vi } from 'vitest';
import { parseFile, getSupportedExtensions, isFileSupported } from './file-parser';

describe('file-parser', () => {
  describe('getSupportedExtensions', () => {
    it('returns txt, md, and docx', () => {
      const extensions = getSupportedExtensions();
      expect(extensions).toEqual(['.txt', '.md', '.docx']);
    });
  });

  describe('isFileSupported', () => {
    it('returns true for .txt files', () => {
      expect(isFileSupported('brief.txt')).toBe(true);
    });

    it('returns true for .md files', () => {
      expect(isFileSupported('brief.md')).toBe(true);
    });

    it('returns true for .docx files', () => {
      expect(isFileSupported('brief.docx')).toBe(true);
    });

    it('returns false for .pdf files', () => {
      expect(isFileSupported('brief.pdf')).toBe(false);
    });

    it('returns false for .doc files (old Word format)', () => {
      expect(isFileSupported('brief.doc')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isFileSupported('BRIEF.TXT')).toBe(true);
      expect(isFileSupported('Brief.DOCX')).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('parses txt file as plain text', async () => {
      const content = 'This is a test brief';
      const file = new File([content], 'brief.txt', { type: 'text/plain' });

      const result = await parseFile(file);
      expect(result).toBe(content);
    });

    it('parses md file as plain text', async () => {
      const content = '# Brief\n\nThis is markdown content';
      const file = new File([content], 'brief.md', { type: 'text/markdown' });

      const result = await parseFile(file);
      expect(result).toBe(content);
    });

    it('throws error for unsupported file type', async () => {
      const file = new File(['content'], 'brief.pdf', { type: 'application/pdf' });

      await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool && npm test -- src/lib/file-parser.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/lib/file-parser.ts

import mammoth from 'mammoth';

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx'] as const;

export function getSupportedExtensions(): string[] {
  return [...SUPPORTED_EXTENSIONS];
}

export function isFileSupported(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number]);
}

export async function parseFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();
  const ext = filename.slice(filename.lastIndexOf('.'));

  if (!isFileSupported(filename)) {
    throw new Error(`Unsupported file type: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  if (ext === '.txt' || ext === '.md') {
    return await file.text();
  }

  if (ext === '.docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool && npm test -- src/lib/file-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/file-parser.ts src/lib/file-parser.test.ts
git commit -m "feat: add file parsing utility for txt, md, and docx"
```

---

### Task 1.3: Create FileUpload component

**Files:**
- Create: `src/components/FileUpload.tsx`

**Step 1: Write the component**

```typescript
// src/components/FileUpload.tsx
'use client';

import { useRef, useState, DragEvent } from 'react';
import { parseFile, getSupportedExtensions, isFileSupported } from '@/lib/file-parser';

interface FileUploadProps {
  onFileContent: (content: string) => void;
  onError: (error: string) => void;
}

export function FileUpload({ onFileContent, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedExtensions = getSupportedExtensions();

  const handleFile = async (file: File) => {
    if (!isFileSupported(file.name)) {
      onError(`Unsupported file type. Please use: ${supportedExtensions.join(', ')}`);
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const content = await parseFile(file);
      onFileContent(content);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to parse file');
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
            : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={supportedExtensions.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="py-4">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--expedia-navy)] border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Processing {fileName}...</p>
          </div>
        ) : fileName ? (
          <div className="py-4">
            <p className="text-sm text-[var(--status-green)] font-medium">✓ {fileName}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Click or drop to replace</p>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Supports: Word (.docx), Markdown (.md), Text (.txt)
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        💡 Word documents preserve formatting best. Tables will be converted to text.
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FileUpload.tsx
git commit -m "feat: add FileUpload component with drag-drop support"
```

---

### Task 1.4: Integrate FileUpload into upload step

**Files:**
- Modify: `src/app/page.tsx` (renderUploadStep function, lines ~796-841)

**Step 1: Add import at top of file**

Add after line 25 (after PersonificationReview import):
```typescript
import { FileUpload } from '@/components/FileUpload';
```

**Step 2: Update renderUploadStep function**

Replace the entire `renderUploadStep` function (lines ~796-841) with:

```typescript
const renderUploadStep = () => {
  if (state.loading) {
    return (
      <LoadingOverlay
        message="Analyzing your brief..."
        subMessage="Extracting content and assessing each section"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Upload Your Brief
        </h2>
        <p className="text-[var(--text-secondary)]">
          Upload a document or paste your brief below. I'll assess each section, highlighting what's strong and what needs work.
        </p>
      </div>

      {/* File Upload */}
      <FileUpload
        onFileContent={(content) => updateState({ brief: content, error: null })}
        onError={(error) => updateState({ error })}
      />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--border-color)]" />
        <span className="text-sm text-[var(--text-muted)]">or paste directly</span>
        <div className="flex-1 h-px bg-[var(--border-color)]" />
      </div>

      {/* Text Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Brief Content
        </label>
        <textarea
          aria-label="Paste your brief content here"
          className="textarea-field font-mono text-sm"
          style={{ minHeight: '250px' }}
          placeholder="Paste the full brief content here..."
          value={state.brief}
          onChange={(e) => updateState({ brief: e.target.value })}
        />
      </div>

      <button
        onClick={handleTriage}
        disabled={!state.brief.trim()}
        className="btn-secondary flex items-center gap-2 w-full justify-center"
      >
        Assess Brief →
      </button>
    </div>
  );
};
```

**Step 3: Test manually in dev**

Run: `cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool && npm run dev`
Test: Open http://localhost:3000, verify file upload appears, test with a .txt file

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate file upload into upload step"
```

---

### Task 1.5: Fix export with reliable fallback

**Files:**
- Modify: `src/app/page.tsx` (handleCompileOutput function, lines ~681-734)

**Step 1: Replace handleCompileOutput function**

Replace the `handleCompileOutput` function with:

```typescript
const handleCompileOutput = async () => {
  updateState({ loading: true, error: null });
  setLastAction(() => handleCompileOutput);

  try {
    const response = await fetch('/api/output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections: state.sections,
        audience: state.selectedAudienceSegment,
        personification: state.personification?.narrative || '',
        selectedTruths: state.selectedTruths,
      }),
    });

    if (!response.ok) throw new Error('Failed to compile output');

    const data: OutputResponse = await response.json();

    // Store output for display
    updateState({
      step: 'output',
      loading: false,
      outputMarkdown: data.markdown,
    });

  } catch (err) {
    updateState({
      error: err instanceof Error ? err.message : 'Something went wrong',
      loading: false,
    });
  }
};
```

**Step 2: Add outputMarkdown to SessionState type**

In `src/lib/types.ts`, add to SessionState interface (after line 85):
```typescript
outputMarkdown?: string;
```

**Step 3: Update renderOutputStep for inline display with copy/download**

Replace the `renderOutputStep` function with:

```typescript
const renderOutputStep = () => {
  if (state.loading) {
    return (
      <LoadingOverlay
        message="Compiling your Pitch Pack..."
        subMessage="Formatting all sections into the final document"
      />
    );
  }

  const handleCopy = async () => {
    if (!state.outputMarkdown) return;
    try {
      await navigator.clipboard.writeText(state.outputMarkdown);
      // Show success feedback
      updateState({ error: null });
      alert('Copied to clipboard!');
    } catch {
      // Clipboard API failed, offer download instead
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!state.outputMarkdown) return;
    const blob = new Blob([state.outputMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pitch-pack.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Show output if we have it
  if (state.outputMarkdown) {
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Your Pitch Pack
          </h2>
          <p className="text-[var(--text-secondary)]">
            Review your completed Pitch Pack below. Copy or download when ready.
          </p>
        </div>

        {/* Action buttons at top */}
        <div className="flex gap-3">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-2">
            📋 Copy to Clipboard
          </button>
          <button onClick={handleDownload} className="btn-outline flex items-center gap-2">
            ⬇️ Download as Markdown
          </button>
        </div>

        {/* Output display */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 overflow-auto max-h-[500px]">
          <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono">
            {state.outputMarkdown}
          </pre>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              if (window.confirm('Are you sure? This will clear all your work.')) {
                setState(createInitialState());
              }
            }}
            className="btn-outline"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Pre-output summary (before compile)
  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Pitch Pack Complete
        </h2>
        <p className="text-[var(--text-secondary)]">
          All sections reviewed. Ready to compile your final Pitch Pack.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
        {state.sections.map((section, index) => (
          <div
            key={section.key}
            className={`p-4 ${
              index !== state.sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[var(--text-primary)]">{section.name}</span>
              <StatusBadge status={section.status} />
            </div>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">
              {section.content || '(not provided)'}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleCompileOutput} className="btn-secondary flex items-center gap-2">
          Export Pitch Pack
        </button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure? This will clear all your work.')) {
              setState(createInitialState());
            }
          }}
          className="btn-outline"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};
```

**Step 4: Update createInitialState in types.ts**

Add `outputMarkdown: undefined,` to the return object in `createInitialState()`.

**Step 5: Test manually**

Run dev server, complete a flow, verify copy and download work.

**Step 6: Commit**

```bash
git add src/app/page.tsx src/lib/types.ts
git commit -m "fix: replace popup export with inline display and reliable copy/download"
```

---

## Batch 2: Audience Flow Improvements

### Task 2.1: Add feedback field before regenerate in AudienceMenu

**Files:**
- Modify: `src/components/AudienceMenu.tsx`
- Modify: `src/app/api/generate/audience/route.ts`

**Step 1: Update AudienceMenu component**

Replace entire file with:

```typescript
// src/components/AudienceMenu.tsx
'use client';

import { useState } from 'react';
import { AudienceSegment, AudienceSegmentMenu } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segment: AudienceSegment) => void;
  onRegenerate: (feedback: string) => void;
  loading: boolean;
}

export function AudienceMenu({ menu, onSelect, onRegenerate, loading }: AudienceMenuProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingSegment, setEditingSegment] = useState<AudienceSegment | null>(null);
  const [editedSegments, setEditedSegments] = useState<Record<number, AudienceSegment>>({});

  const getSegment = (segment: AudienceSegment): AudienceSegment => {
    return editedSegments[segment.id] || segment;
  };

  const handleEditSegment = (segment: AudienceSegment) => {
    setEditingSegment(getSegment(segment));
  };

  const handleSaveEdit = () => {
    if (editingSegment) {
      setEditedSegments(prev => ({
        ...prev,
        [editingSegment.id]: editingSegment,
      }));
      setEditingSegment(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSegment(null);
  };

  const handleSelectSegment = (segment: AudienceSegment) => {
    if (loading) return;
    // Use edited version if available
    onSelect(getSegment(segment));
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Choose Your Audience
        </h2>
        <p className="text-[var(--text-secondary)]">{menu.intro}</p>
      </div>

      {/* Segment editing modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Edit Segment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg"
                  value={editingSegment.name}
                  onChange={(e) => setEditingSegment({ ...editingSegment, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Needs & Values
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg"
                  rows={4}
                  value={editingSegment.needsValues}
                  onChange={(e) => setEditingSegment({ ...editingSegment, needsValues: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Demographics
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg"
                  rows={3}
                  value={editingSegment.demographics}
                  onChange={(e) => setEditingSegment({ ...editingSegment, demographics: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveEdit} className="btn-secondary">
                Save Changes
              </button>
              <button onClick={handleCancelEdit} className="btn-outline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segments list */}
      <div className="space-y-3">
        {menu.segments.map((segment) => {
          const displaySegment = getSegment(segment);
          const isEdited = !!editedSegments[segment.id];

          return (
            <div
              key={segment.id}
              className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  className="font-semibold text-lg text-[var(--expedia-navy)] group-hover:underline cursor-pointer flex-1"
                  onClick={() => handleSelectSegment(segment)}
                >
                  {displaySegment.name}
                  {isEdited && <span className="text-xs text-[var(--status-amber)] ml-2">(edited)</span>}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSegment(segment);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--expedia-navy)] px-2 py-1"
                >
                  ✏️ Edit
                </button>
              </div>
              <p
                className="text-[var(--text-primary)] mb-2 cursor-pointer"
                onClick={() => handleSelectSegment(segment)}
              >
                {displaySegment.needsValues}
              </p>
              <p
                className="text-sm text-[var(--text-muted)] cursor-pointer"
                onClick={() => handleSelectSegment(segment)}
              >
                {displaySegment.demographics}
              </p>
            </div>
          );
        })}
      </div>

      {/* Regenerate section */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        {showFeedback ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              What would you like to change about these options?
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="e.g., Focus more on business travellers, make the segments more distinct, include younger demographics..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onRegenerate(feedback);
                  setFeedback('');
                  setShowFeedback(false);
                }}
                disabled={loading || !feedback.trim()}
                className="btn-primary text-sm"
              >
                Regenerate with Feedback
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback('');
                }}
                className="btn-outline text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowFeedback(true)}
            disabled={loading}
            className="btn-outline text-sm"
          >
            Not quite right? Give feedback & regenerate
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update audience API route to accept feedback**

In `src/app/api/generate/audience/route.ts`, update the POST handler to accept feedback:

```typescript
// src/app/api/generate/audience/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { AudienceSegmentMenu, PersonificationResponse, AudienceSegment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { brief, additionalContext, selectedSegment, feedback } = await request.json();

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const promptConfig = loadPrompt('audience');

    if (selectedSegment) {
      // Step 2: Personify the selected segment
      if (!promptConfig.personify) {
        return NextResponse.json(
          { error: 'Personify prompt not configured' },
          { status: 500 }
        );
      }
      const systemPrompt = buildSystemPrompt(promptConfig.personify);

      const userMessage = `Brief:\n${brief}\n\nSelected segment:\nName: ${selectedSegment.name}\nNeeds & Values: ${selectedSegment.needsValues}\nDemographics: ${selectedSegment.demographics}\n\nPlease personify this segment.`;

      const response = await callClaudeJSON<PersonificationResponse>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:personify' }
      );

      return NextResponse.json(response);
    } else {
      // Step 1: Generate segment menu
      const systemPrompt = buildSystemPrompt(promptConfig.generate);

      let userMessage = `Brief:\n${brief}\n\n`;
      if (additionalContext) {
        userMessage += `Additional context:\n${additionalContext}\n\n`;
      }
      if (feedback) {
        userMessage += `User feedback on previous options:\n${feedback}\n\nPlease generate 5 NEW audience segments that address this feedback.\n`;
      } else {
        userMessage += `Please generate 5 audience segments.`;
      }

      const response = await callClaudeJSON<AudienceSegmentMenu>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:generate' }
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Audience generation error:', error);
    return NextResponse.json(
      { error: 'Failed to process audience' },
      { status: 500 }
    );
  }
}
```

**Step 3: Update page.tsx to pass onRegenerate prop**

In `src/app/page.tsx`, find the `renderAudienceStep` function and update the AudienceMenu usage:

Replace:
```typescript
<AudienceMenu
  menu={state.audienceMenu}
  onSelect={handleSelectAudience}
  loading={state.loading}
/>
<button
  onClick={handleGenerateAudience}
  disabled={state.loading}
  className="btn-outline text-sm"
>
  Regenerate Options
</button>
```

With:
```typescript
<AudienceMenu
  menu={state.audienceMenu}
  onSelect={handleSelectAudience}
  onRegenerate={handleRegenerateAudienceWithFeedback}
  loading={state.loading}
/>
```

And add the handler function near the other handlers:

```typescript
const handleRegenerateAudienceWithFeedback = async (feedback: string) => {
  updateState({ loading: true, error: null, audienceMenu: null });
  setLastAction(() => () => handleRegenerateAudienceWithFeedback(feedback));

  try {
    const response = await fetch('/api/generate/audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: state.brief,
        additionalContext: state.additionalContext,
        feedback,
      }),
    });

    if (!response.ok) throw new Error('Failed to regenerate audience options');

    const data: AudienceSegmentMenu = await response.json();
    updateState({
      audienceMenu: data,
      loading: false,
    });
  } catch (err) {
    updateState({
      error: err instanceof Error ? err.message : 'Something went wrong',
      loading: false,
    });
  }
};
```

**Step 4: Test manually**

Run dev, go to audience step, verify:
- Can edit segment name/description/demographics before selecting
- "Not quite right?" shows feedback input
- Regenerate with feedback creates new options

**Step 5: Commit**

```bash
git add src/components/AudienceMenu.tsx src/app/api/generate/audience/route.ts src/app/page.tsx
git commit -m "feat: add feedback before regenerate and editable segments in audience step"
```

---

### Task 2.2: Fix Current Content to show actual brief content

**Files:**
- Modify: `src/app/api/triage/route.ts`

**Context:** The issue is that `synthesizedContent` in triage results contains AI summary, not the actual extracted content from the brief. We need to ensure the `verbatimQuotes` or actual extracted text is shown.

**Step 1: Read current triage route**

Check current implementation to understand how synthesizedContent is populated.

**Step 2: Update Section type usage in page.tsx**

In `SectionStepContent`, the "Current Content" textarea shows `section.content`. This comes from `result.synthesizedContent` in the triage transform.

The fix: In `handleTriage`, change how we populate `content`:

```typescript
// In handleTriage, update the section mapping:
const sections: Section[] = triageAssessment.map((result) => ({
  key: result.key,
  name: SECTION_CONFIG[result.key]?.name || result.key,
  status: result.status || 'red',
  // Use verbatimQuotes if available, otherwise synthesizedContent
  content: result.verbatimQuotes?.length
    ? result.verbatimQuotes.join('\n\n')
    : result.synthesizedContent || '',
  feedback: (result.whyThisRating || '') + (result.whatNeeded ? `\n\nNeeded: ${result.whatNeeded}` : ''),
  questions: result.questions || [],
  gaps: [...(result.contradictions || []), ...(result.vagueness || [])],
}));
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: show actual brief content in Current Content box, not AI summary"
```

---

## Batch 3: Navigation

### Task 3.1: Make progress bar steps clickable

**Files:**
- Modify: `src/app/page.tsx` (GlobalProgressBar component)

**Step 1: Update GlobalProgressBar to accept navigation handler**

```typescript
function GlobalProgressBar({
  step,
  sectionIndex,
  totalSections,
  sections,
  onNavigate,
}: {
  step: string;
  sectionIndex: number;
  totalSections: number;
  sections: Section[];
  onNavigate: (step: Step) => void;
}) {
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'triage', label: 'Triage' },
    { key: 'budget', label: 'Budget' },
    { key: 'sections', label: 'Sections' },
    { key: 'audience', label: 'Audience' },
    { key: 'truths', label: 'Truths' },
    { key: 'output', label: 'Output' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleStepClick = (stepKey: string, stepIndex: number) => {
    // Can only navigate to completed steps
    if (stepIndex < currentStepIndex) {
      onNavigate(stepKey as Step);
    }
  };

  return (
    <div className="bg-white border-b border-[var(--border-color)] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isClickable = isCompleted;

            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isCompleted
                      ? 'bg-[var(--status-green)] text-white cursor-pointer hover:bg-[var(--status-green)]/80'
                      : isCurrent
                      ? 'bg-[var(--expedia-navy)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}
                  onClick={() => isClickable && handleStepClick(s.key, i)}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                >
                  {isCompleted && <span>✓</span>}
                  {s.label}
                  {s.key === 'sections' && isCurrent && (
                    <span className="opacity-70">({sectionIndex + 1}/{totalSections})</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-4 h-0.5 mx-1 ${
                    i < currentStepIndex ? 'bg-[var(--status-green)]' : 'bg-[var(--border-color)]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Section sub-progress when in sections step */}
        {step === 'sections' && sections.length > 0 && (
          <div className="flex gap-1 mt-2">
            {sections.map((section, i) => (
              <div
                key={section.key}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < sectionIndex
                    ? section.status === 'green' ? 'bg-[var(--status-green)]' :
                      section.status === 'amber' ? 'bg-[var(--status-amber)]' : 'bg-[var(--status-red)]'
                    : i === sectionIndex
                    ? 'bg-[var(--expedia-navy)]'
                    : 'bg-[var(--border-color)]'
                }`}
                title={section.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add navigation handler and update usage**

Add handler in main component:

```typescript
const handleNavigateToStep = (step: Step) => {
  // Reset step-specific state when navigating back
  if (step === 'upload') {
    // Going back to upload clears everything
    setState(createInitialState());
    return;
  }

  // For other steps, just update the step
  updateState({ step });

  // If going back to sections, reset section index to 0
  if (step === 'sections') {
    updateState({ currentSectionIndex: 0 });
  }
};
```

Update GlobalProgressBar usage:

```typescript
{state.step !== 'upload' && (
  <GlobalProgressBar
    step={state.step}
    sectionIndex={state.currentSectionIndex}
    totalSections={state.sections.length}
    sections={state.sections}
    onNavigate={handleNavigateToStep}
  />
)}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: make progress bar steps clickable for back navigation"
```

---

### Task 3.2: Add back button to each step

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Create BackButton helper component**

Add after the other helper components:

```typescript
function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
    >
      ← {label}
    </button>
  );
}
```

**Step 2: Add back buttons to each step renderer**

In `renderTriageStep`, add at the start of the return:
```typescript
<BackButton onClick={() => updateState({ step: 'upload' })} label="Back to Upload" />
```

In `renderSectionStep`, add at the start:
```typescript
{state.currentSectionIndex === 0 ? (
  <BackButton onClick={() => updateState({ step: 'triage' })} label="Back to Triage" />
) : (
  <BackButton
    onClick={() => updateState({ currentSectionIndex: state.currentSectionIndex - 1 })}
    label={`Back to ${state.sections[state.currentSectionIndex - 1]?.name}`}
  />
)}
```

In `renderAudienceStep`, add:
```typescript
<BackButton
  onClick={() => {
    // Go back to last section
    updateState({
      step: 'sections',
      currentSectionIndex: state.sections.length - 1
    });
  }}
  label="Back to Sections"
/>
```

In `renderTruthsStep`, add:
```typescript
<BackButton
  onClick={() => updateState({ step: 'audience' })}
  label="Back to Audience"
/>
```

In `renderOutputStep`, add:
```typescript
<BackButton
  onClick={() => updateState({ step: 'truths' })}
  label="Back to Truths"
/>
```

**Step 3: Test all back navigation paths manually**

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add back button to each step for sequential navigation"
```

---

## Final Tasks

### Task 4.1: Run full test suite

**Step 1: Run all tests**

```bash
cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool && npm test
```

Expected: All tests pass (35 existing + new file-parser tests)

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

---

### Task 4.2: Update documentation

**Files:**
- Modify: `_state/status.md`
- Modify: `_state/tasks.md`
- Modify: `_state/changelog.md`

Update status.md to reflect UX improvements complete.
Move tasks from In Progress to Completed.
Add changelog entry for this session.

---

### Task 4.3: Deploy and verify

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Monitor Railway deployment**

Check https://pitch-pack-tool-production.up.railway.app

**Step 3: Test each improvement:**
- [ ] Upload a .docx file
- [ ] Upload a .txt file
- [ ] Paste text directly
- [ ] Navigate back using progress bar
- [ ] Navigate back using back buttons
- [ ] Edit audience segment before selecting
- [ ] Give feedback before regenerating audience
- [ ] Verify Current Content shows actual brief text
- [ ] Export → Copy to clipboard works
- [ ] Export → Download works

---

## Summary

| Batch | Tasks | Est. Commits |
|-------|-------|--------------|
| **1: Upload & Export** | 1.1-1.5 | 5 commits |
| **2: Audience Flow** | 2.1-2.2 | 2 commits |
| **3: Navigation** | 3.1-3.2 | 2 commits |
| **4: Final** | 4.1-4.3 | 1 commit |

**Total: 10 commits**

---

Plan complete and saved to `docs/plans/2026-01-23-ux-improvements.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
