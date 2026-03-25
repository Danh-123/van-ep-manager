'use client';

import { format } from 'date-fns';
import { Edit3, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { type EmployeeItem } from '@/app/(dashboard)/employees/actions';

type EmployeeTableProps = {
  rows: EmployeeItem[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  onEdit: (item: EmployeeItem) => void;
  onDelete: (item: EmployeeItem) => void;
  onPageChange: (page: number) => void;
};

function StatusBadge({ status }: { status: 'DangLam' | 'NghiViec' }) {
  const className =
    status === 'DangLam'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {status === 'DangLam' ? 'Dang lam' : 'Nghi viec'}
    </span>
  );
}

function EmployeeTableComponent({
  rows,
  page,
  totalPages,
  total,
  pageSize,
  loading,
  onEdit,
  onDelete,
  onPageChange,
}: EmployeeTableProps) {
  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = rows.length === 0 ? 0 : from + rows.length - 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">Ma</th>
              <th className="px-4 py-3 font-medium">Ho ten</th>
              <th className="px-4 py-3 font-medium">So dien thoai</th>
              <th className="px-4 py-3 font-medium">Trang thai</th>
              <th className="px-4 py-3 font-medium">Ngay tao</th>
              <th className="px-4 py-3 text-right font-medium">Thao tac</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 7 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-6 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Khong co cong nhan phu hop bo loc.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.maCongNhan}</td>
                  <td className="px-4 py-3 text-slate-700">{row.hoTen}</td>
                  <td className="px-4 py-3 text-slate-700">{row.soDienThoai ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <StatusBadge status={row.trangThai} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{format(new Date(row.createdAt), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => onEdit(row)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Sua
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Hien thi {from}-{to} / {total} cong nhan
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Truoc
          </button>
          <span className="text-sm text-slate-600">
            Trang {page}/{Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}

const EmployeeTable = memo(EmployeeTableComponent);

export default EmployeeTable;
