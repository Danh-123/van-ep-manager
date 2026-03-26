'use client';

import { Download } from 'lucide-react';

type ExportButtonProps = {
  onClick: () => void;
  loading?: boolean;
};

export default function ExportButton({ onClick, loading = false }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {loading ? 'Dang xuat...' : 'Xuat Excel'}
    </button>
  );
}
