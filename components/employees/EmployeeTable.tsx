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
  onLink: (item: EmployeeItem) => void;
  onUnlink: (item: EmployeeItem) => void;
  onPageChange: (page: number) => void;
};

function StatusBadge({ status }: { status: 'DangLam' | 'NghiViec' }) {
  const className =
    status === 'DangLam'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {status === 'DangLam' ? 'Đang làm' : 'Nghỉ việc'}
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
  onLink,
  onUnlink,
  onPageChange,
}: EmployeeTableProps) {
  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = rows.length === 0 ? 0 : from + rows.length - 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-slate-600">
              <th className="w-[10%] px-4 py-3 font-medium">Mã</th>
              <th className="w-[20%] px-4 py-3 font-medium">Họ tên</th>
              <th className="w-[14%] px-4 py-3 font-medium">Số điện thoại</th>
              <th className="w-[12%] px-4 py-3 text-center font-medium">Trạng thái</th>
              <th className="w-[20%] px-4 py-3 font-medium">Tài khoản liên kết</th>
              <th className="w-[10%] px-4 py-3 text-center font-medium">Ngày tạo</th>
              <th className="w-[14%] px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 7 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-6 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Không có công nhân phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.maCongNhan}</td>
                  <td className="px-4 py-3 text-slate-700">{row.hoTen}</td>
                  <td className="px-4 py-3 text-slate-700">{row.soDienThoai ?? '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    <StatusBadge status={row.trangThai} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700">{row.linkedUserEmail ?? '-'}</p>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          row.linkedUserId
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.linkedUserId ? 'Đã liên kết' : 'Chưa liên kết'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{format(new Date(row.createdAt), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.linkedUserId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50"
                          onClick={() => onUnlink(row)}
                        >
                          Hủy liên kết
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                          onClick={() => onLink(row)}
                        >
                          Liên kết
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => onEdit(row)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
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
          Hiển thị {from}-{to} / {total} công nhân
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Trước
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
