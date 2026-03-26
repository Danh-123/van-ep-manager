'use client';

type TruckPaginationProps = {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  loading?: boolean;
  onPageChange: (nextPage: number) => void;
  onLimitChange: (nextLimit: number) => void;
};

export default function TruckPagination({
  page,
  totalPages,
  limit,
  total,
  loading = false,
  onPageChange,
  onLimitChange,
}: TruckPaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = total === 0 ? 0 : Math.min(page * limit, total);
  const disablePrev = loading || page <= 1;
  const disableNext = loading || page >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span>Số dòng mỗi trang:</span>
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          disabled={loading}
          className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4 disabled:opacity-60"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <p className="text-sm text-slate-600">
        Hiển thị {from}-{to} trên tổng số {total} phiếu
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disablePrev}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {'<<'}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disablePrev}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Trước
        </button>

        <span className="text-sm text-slate-600">
          Trang {Math.min(page, Math.max(totalPages, 1))}/{Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disableNext}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Sau
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(totalPages, 1))}
          disabled={disableNext}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {'>>'}
        </button>
      </div>
    </div>
  );
}
