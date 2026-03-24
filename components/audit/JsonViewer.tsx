'use client';

import { useMemo, useState } from 'react';

type JsonViewerProps = {
  value: unknown;
};

function stringifyValue(value: unknown) {
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function JsonViewer({ value }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(false);

  const fullText = useMemo(() => stringifyValue(value), [value]);
  const shortText = useMemo(() => {
    if (!fullText) return '-';
    return fullText.length > 120 ? `${fullText.slice(0, 120)}...` : fullText;
  }, [fullText]);

  if (!fullText) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <div className="max-w-[460px]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mb-1 text-xs font-medium text-[#1B5E20] hover:underline"
      >
        {expanded ? 'Thu gon JSON' : 'Mo rong JSON'}
      </button>

      <pre
        className={`rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 ${
          expanded ? 'max-h-52 overflow-auto' : 'truncate whitespace-pre-wrap'
        }`}
      >
        {expanded ? fullText : shortText}
      </pre>
    </div>
  );
}
