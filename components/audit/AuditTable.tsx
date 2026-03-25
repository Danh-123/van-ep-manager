'use client';

import { Copy, X } from 'lucide-react';
import { useState } from 'react';

import JsonViewer from '@/components/audit/JsonViewer';

type AuditLogRow = {
  id: number;
  changedAt: string;
  userName: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData: unknown;
  newData: unknown;
};

type AuditTableProps = {
  rows: AuditLogRow[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function actionBadgeClass(action: AuditLogRow['action']) {
  if (action === 'DELETE') return 'border-red-300 bg-red-50 text-red-700';
  if (action === 'UPDATE') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-emerald-300 bg-emerald-50 text-emerald-700';
}

function actionBadgeText(action: AuditLogRow['action']) {
  if (action === 'DELETE') return 'Xóa';
  if (action === 'UPDATE') return 'Sửa';
  return 'Thêm';
}

export default function AuditTable({ rows, page, totalPages, total, onPageChange, loading }: AuditTableProps) {
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);
  const [copied, setCopied] = useState<'old' | 'new' | null>(null);

  const handleCopy = (type: 'old' | 'new') => {
    const value = type === 'old' ? selectedRow?.oldData : selectedRow?.newData;
    const text = value == null ? '' : JSON.stringify(value, null, 2);

    if (navigator.clipboard && text) {
      void navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  const PAGE_SIZE = 20;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Tổng bản ghi: <span className="font-semibold text-slate-900">{total}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Bảng</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Hành động</th>
                <th className="px-4 py-3 text-right">Xem chi tiết</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Không có dữ liệu audit log.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(row.changedAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.userName}</td>
                    <td className="px-4 py-3 text-slate-700">{row.tableName}</td>
                    <td className="px-4 py-3 max-w-xs truncate font-mono text-xs text-slate-600">{row.recordId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${actionBadgeClass(row.action)}`}
                      >
                        {actionBadgeText(row.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRow(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span>
            Trang {page}/{totalPages} • {PAGE_SIZE} dòng/trang
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Chi tiết thay đổi</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedRow.tableName} • Record ID: {selectedRow.recordId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Old Data */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Giá trị cũ</h3>
                    {selectedRow.oldData != null && (
                      <button
                        type="button"
                        onClick={() => handleCopy('old')}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                          copied === 'old'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Copy className="h-3 w-3" />
                        {copied === 'old' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    )}
                  </div>
                  {selectedRow.oldData == null ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      Không có dữ liệu cũ
                    </div>
                  ) : (
                    <JsonViewer value={selectedRow.oldData} modal={true} />
                  )}
                </div>

                {/* New Data */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Giá trị mới</h3>
                    {selectedRow.newData != null && (
                      <button
                        type="button"
                        onClick={() => handleCopy('new')}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                          copied === 'new'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Copy className="h-3 w-3" />
                        {copied === 'new' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    )}
                  </div>
                  {selectedRow.newData == null ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      Không có dữ liệu mới
                    </div>
                  ) : (
                    <JsonViewer value={selectedRow.newData} modal={true} />
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
