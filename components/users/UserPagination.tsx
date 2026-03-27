'use client';

interface UserPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function UserPagination({ page, limit, total, onPageChange, onLimitChange }: UserPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const fromIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const toIndex = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Hiển thị {fromIndex}-{toIndex} / {total}
        </span>

        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="h-8 rounded border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        >
          <option value={10}>10/trang</option>
          <option value={20}>20/trang</option>
          <option value={50}>50/trang</option>
          <option value={100}>100/trang</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Trước
        </button>
        <span className="text-sm font-medium">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </div>
  );
}
