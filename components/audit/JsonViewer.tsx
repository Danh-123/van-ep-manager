'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

type JsonViewerProps = {
  value: unknown;
  modal?: boolean;
};

function stringifyValue(value: unknown) {
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SyntaxHighlightedJson({ text }: { text: string }) {
  return (
    <pre className="font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

export default function JsonViewer({ value, modal }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(modal ?? false);

  const fullText = useMemo(() => stringifyValue(value), [value]);
  const shortText = useMemo(() => {
    if (!fullText) return '-';
    return fullText.length > 120 ? `${fullText.slice(0, 120)}...` : fullText;
  }, [fullText]);

  if (!fullText) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  if (modal) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-auto max-h-80">
        <SyntaxHighlightedJson text={fullText} />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#0B7285] hover:underline"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Thu gọn
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Mở rộng
          </>
        )}
      </button>

      <div className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${expanded ? 'max-h-80 overflow-auto' : 'overflow-hidden'}`}>
        {expanded ? (
          <SyntaxHighlightedJson text={fullText} />
        ) : (
          <pre className="font-mono text-xs text-slate-700 truncate whitespace-pre-wrap break-words">
            {shortText}
          </pre>
        )}
      </div>
    </div>
  );
}
