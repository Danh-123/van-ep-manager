'use client';

import { Download, Loader2 } from 'lucide-react';

type ExportButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function ExportButton({ loading = false, disabled = false, onClick }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? 'Đang xuất...' : 'Xuất Excel'}
    </button>
  );
}
