'use client';

import { format } from 'date-fns';
import { useMemo, useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';

import ExportButton from '@/components/salary/ExportButton';
import MonthRangePicker from '@/components/salary/MonthRangePicker';
import { exportExcel } from '@/lib/excel/exportPersonalSalary';

type SalaryRow = {
  thang: string;
  luong_co_ban: number;
  thuong: number;
  phat: number;
  tong_luong: number;
  ho_ten: string;
  ma_cong_nhan: string;
};

type SalaryApiPayload = {
  data: SalaryRow[];
  total?: number;
  linked?: boolean;
  message?: string;
  ho_ten?: string;
  ma_cong_nhan?: string;
  employee?: {
    ho_ten: string;
    ma_cong_nhan: string;
    so_dien_thoai: string;
    email: string;
    created_at: string;
  };
  error?: string;
};

type PersonalSalaryTableProps = {
  month: string;
  workerName: string;
  workerCode: string;
};

const PAGE_SIZE = 12;

type ViewMode = 'single' | 'multi';

function getMonthOptions(anchorDate = new Date()) {
  const options: Array<{ value: string; label: string; year: string }> = [];

  for (let i = 0; i < 24; i += 1) {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MM/yyyy'),
      year: format(date, 'yyyy'),
    });
  }

  return options;
}

function getMonthLabel(month: string) {
  const [year, mon] = month.split('-');
  if (!year || !mon) return month;
  return `${mon}/${year}`;
}

function aggregateByMonth(rows: SalaryRow[]) {
  const map = new Map<string, SalaryRow>();

  rows.forEach((row) => {
    const key = String(row.thang).slice(0, 7);
    const current = map.get(key) ?? {
      thang: key,
      luong_co_ban: 0,
      thuong: 0,
      phat: 0,
      tong_luong: 0,
      ho_ten: row.ho_ten,
      ma_cong_nhan: row.ma_cong_nhan,
    };

    current.luong_co_ban += row.luong_co_ban;
    current.thuong += row.thuong;
    current.phat += row.phat;
    current.tong_luong += row.tong_luong;

    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.thang.localeCompare(a.thang));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeFileName(input: string) {
  return input
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function SalarySkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-10 animate-pulse rounded bg-slate-100" />
        <div className="h-10 animate-pulse rounded bg-slate-100" />
        <div className="h-10 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-11 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

export default function PersonalSalaryTable({ month, workerName, workerCode }: PersonalSalaryTableProps) {
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [fromMonth, setFromMonth] = useState(monthOptions[11]?.value ?? month);
  const [toMonth, setToMonth] = useState(monthOptions[0]?.value ?? month);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [isExporting, startExport] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const singleQuery = useQuery({
    queryKey: ['my-salary', selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/my-salary?month=${selectedMonth}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as SalaryApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Không thể tải dữ liệu lương cá nhân');
      }

      if (payload.linked === false) {
        throw new Error(payload.message ?? 'Tài khoản chưa được liên kết với công nhân');
      }

      return payload;
    },
    enabled: viewMode === 'single',
    staleTime: 60_000,
  });

  const multiQuery = useQuery({
    queryKey: ['my-salary-range', fromMonth, toMonth],
    queryFn: async () => {
      const response = await fetch(`/api/my-salary?fromMonth=${fromMonth}&toMonth=${toMonth}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as SalaryApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Không thể tải dữ liệu lương cá nhân');
      }

      if (payload.linked === false) {
        throw new Error(payload.message ?? 'Tài khoản chưa được liên kết với công nhân');
      }

      return payload;
    },
    enabled: viewMode === 'multi' && fromMonth <= toMonth,
    staleTime: 60_000,
  });

  const activeQuery = viewMode === 'single' ? singleQuery : multiQuery;
  const baseRows = useMemo(() => activeQuery.data?.data ?? [], [activeQuery.data]);

  const rows = useMemo(() => {
    if (viewMode === 'single') {
      return aggregateByMonth(baseRows);
    }

    const aggregated = aggregateByMonth(baseRows);
    if (selectedMonths.length === 0) {
      return aggregated;
    }

    const selected = new Set(selectedMonths);
    return aggregated.filter((row) => selected.has(row.thang));
  }, [baseRows, selectedMonths, viewMode]);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const pageRows = useMemo(() => {
    if (viewMode === 'single') {
      return rows;
    }

    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [page, rows, viewMode]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          luong_co_ban: acc.luong_co_ban + row.luong_co_ban,
          thuong: acc.thuong + row.thuong,
          phat: acc.phat + row.phat,
          tong_luong: acc.tong_luong + row.tong_luong,
        }),
        { luong_co_ban: 0, thuong: 0, phat: 0, tong_luong: 0 },
      ),
    [rows],
  );

  const displayName = activeQuery.data?.ho_ten || workerName;
  const displayCode = activeQuery.data?.ma_cong_nhan || workerCode;

  const fromIndex = viewMode === 'multi' ? (totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1) : 1;
  const toIndex = viewMode === 'multi' ? Math.min(page * PAGE_SIZE, totalRows) : totalRows;

  const handleExport = () => {
    setLocalError(null);

    if (rows.length === 0) {
      setLocalError('Không có dữ liệu để xuất Excel.');
      return;
    }

    startExport(() => {
      void (async () => {
        try {
          const safeName = normalizeFileName(displayName || 'NhanVien');
          const safeMonth = normalizeFileName(viewMode === 'single' ? selectedMonth : `${fromMonth}_${toMonth}`);
          const fileName = `Luong_${safeName}_${safeMonth}.xlsx`;

          const employee = activeQuery.data?.employee ?? {
            ho_ten: displayName,
            ma_cong_nhan: displayCode,
            so_dien_thoai: '',
            email: '',
            created_at: '',
          };

          await exportExcel({
            rows: rows.map((row) => ({
              ...row,
              thang: getMonthLabel(row.thang),
            })),
            employee,
            fileName,
          });
        } catch {
          setLocalError('Không thể xuất Excel, vui lòng thử lại.');
        }
      })();
    });
  };

  if (activeQuery.isLoading || activeQuery.isFetching) {
    return <SalarySkeleton />;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setViewMode('single');
            setPage(1);
            setLocalError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            viewMode === 'single'
              ? 'bg-[#0B7285] text-white'
              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Một tháng
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('multi');
            setPage(1);
            setLocalError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            viewMode === 'multi'
              ? 'bg-[#0B7285] text-white'
              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Nhiều tháng
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Họ tên: <span className="font-semibold text-slate-900">{displayName}</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Mã nhân viên: <span className="font-semibold text-slate-900">{displayCode}</span>
        </div>
        {viewMode === 'single' ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <label htmlFor="month-picker" className="mr-2 font-medium text-slate-800">
              Tháng:
            </label>
            <select
              id="month-picker"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-8 rounded-md border border-slate-200 px-2 text-sm outline-none ring-[#0B7285]/20 focus:border-[#0B7285] focus:ring-4"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-end sm:col-span-1">
            <MonthRangePicker
              options={monthOptions}
              fromMonth={fromMonth}
              toMonth={toMonth}
              selectedMonths={selectedMonths}
              onRangeApply={({ fromMonth: nextFrom, toMonth: nextTo }) => {
                setFromMonth(nextFrom);
                setToMonth(nextTo);
                setPage(1);
              }}
              onSelectedMonthsApply={(months) => {
                setSelectedMonths(months);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {(activeQuery.error || localError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError || (activeQuery.error as Error).message}
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <ExportButton loading={isExporting} disabled={rows.length === 0} onClick={handleExport} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="w-[16%] px-3 py-2.5 font-medium">Tháng</th>
              <th className="w-[21%] px-3 py-2.5 text-right font-medium">Lương cơ bản</th>
              <th className="w-[21%] px-3 py-2.5 text-right font-medium">Thưởng</th>
              <th className="w-[21%] px-3 py-2.5 text-right font-medium">Phạt</th>
              <th className="w-[21%] px-3 py-2.5 text-right font-medium">Tổng lương</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td className="px-3 py-7 text-center text-slate-500" colSpan={5}>
                  {viewMode === 'single' ? 'Không có dữ liệu lương trong tháng này.' : 'Không có dữ liệu trong khoảng đã chọn.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={`${row.thang}-${idx}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 text-slate-800">{getMonthLabel(row.thang)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(row.luong_co_ban)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700">{formatMoney(row.thuong)}</td>
                  <td className="px-3 py-2.5 text-right text-red-700">{formatMoney(row.phat)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#0B7285]">{formatMoney(row.tong_luong)}</td>
                </tr>
              ))
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-800">
                <td className="px-3 py-2.5">Tổng cộng</td>
                <td className="px-3 py-2.5 text-right">{formatMoney(totals.luong_co_ban)}</td>
                <td className="px-3 py-2.5 text-right text-emerald-700">{formatMoney(totals.thuong)}</td>
                <td className="px-3 py-2.5 text-right text-red-700">{formatMoney(totals.phat)}</td>
                <td className="px-3 py-2.5 text-right text-[#0B7285]">{formatMoney(totals.tong_luong)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {viewMode === 'multi' && (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Hiển thị tháng {fromIndex}-{toIndex} / Tổng số {totalRows} tháng
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-slate-600">
              Trang {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
