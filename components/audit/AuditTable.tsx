'use client';

import Link from 'next/link';

import JsonViewer from '@/components/audit/JsonViewer';

export type AuditLogRow = {
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
  pageSize: number;
  total: number;
  query: {
    from: string;
    to: string;
    table: string;
    action: string;
    user: string;
  };
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function actionClass(action: AuditLogRow['action']) {
  if (action === 'DELETE') return 'border-red-200 bg-red-50 text-red-700';
  if (action === 'UPDATE') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function buildPageHref(nextPage: number, query: AuditTableProps['query']) {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.table) params.set('table', query.table);
  if (query.action) params.set('action', query.action);
  if (query.user) params.set('user', query.user);
  params.set('page', String(nextPage));
  return `/audit-log?${params.toString()}`;
}

export default function AuditTable({ rows, page, totalPages, pageSize, total, query }: AuditTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Tong ban ghi: <span className="font-semibold text-slate-900">{total}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">Thoi gian</th>
              <th className="px-4 py-3 font-medium">Nguoi dung</th>
              <th className="px-4 py-3 font-medium">Bang</th>
              <th className="px-4 py-3 font-medium">Record ID</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Old value</th>
              <th className="px-4 py-3 font-medium">New value</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Khong co du lieu audit log.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-4 py-3 text-slate-700">{formatDateTime(row.changedAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.userName}</td>
                  <td className="px-4 py-3 text-slate-700">{row.tableName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.recordId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${actionClass(row.action)}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <JsonViewer value={row.oldData} />
                  </td>
                  <td className="px-4 py-3">
                    <JsonViewer value={row.newData} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
        <span>
          Trang {page}/{totalPages} - {pageSize} dong/trang
        </span>

        <div className="flex items-center gap-2">
          <Link
            href={buildPageHref(Math.max(1, page - 1), query)}
            className={`rounded-lg border px-3 py-1.5 ${
              page <= 1 ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            Truoc
          </Link>
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1), query)}
            className={`rounded-lg border px-3 py-1.5 ${
              page >= totalPages ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            Sau
          </Link>
        </div>
      </div>
    </section>
  );
}
