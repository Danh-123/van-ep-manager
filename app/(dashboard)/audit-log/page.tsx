'use client';

import { Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import AuditTable from '@/components/audit/AuditTable';
import { useMounted } from '@/hooks/useMounted';

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

type AuditLogResponse = {
  rows: AuditLogRow[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

const TABLE_OPTIONS = [
  'TatCa',
  'profiles',
  'cong_nhan',
  'cham_cong',
  'tong_tien_cong_ngay',
  'phieu_can',
  'lich_su_thanh_toan',
  'luong_thang',
  'xe_hang',
  'loai_van_ep',
  'import',
] as const;

const ACTION_OPTIONS = ['TatCa', 'INSERT', 'UPDATE', 'DELETE'] as const;

export default function AuditLogPage() {
  const mounted = useMounted();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [table, setTable] = useState('TatCa');
  const [action, setAction] = useState('TatCa');
  const [user, setUser] = useState('');
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ['audit-log', from, to, table, action, user, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: from || '',
        to: to || '',
        table: table || 'TatCa',
        action: action || 'TatCa',
        user: user || '',
        page: String(page),
      });

      const response = await fetch(`/api/audit-log?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Không thể tải audit log');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: AuditLogResponse };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải audit log');
      }

      return json.data;
    },
    staleTime: 30_000,
  });

  const handleFilterChange = useCallback(() => {
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFrom('');
    setTo('');
    setTable('TatCa');
    setAction('TatCa');
    setUser('');
    setPage(1);
  }, []);

  if (!mounted) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const data = auditQuery.data;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const loading = auditQuery.isLoading || auditQuery.isFetching;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Nhật ký kiểm toán</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi thay đổi dữ liệu trên các bảng quan trọng.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Từ ngày</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                handleFilterChange();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Đến ngày</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                handleFilterChange();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Bảng</label>
            <select
              value={table}
              onChange={(e) => {
                setTable(e.target.value);
                handleFilterChange();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            >
              {TABLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hành động</label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                handleFilterChange();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Tìm theo người dùng</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập tên hoặc email..."
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  handleFilterChange();
                }}
                className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
              />
            </div>
          </div>

          <div className="flex items-end gap-2 lg:col-span-6">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </section>

      {auditQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(auditQuery.error as Error).message}
        </div>
      )}

      <AuditTable rows={rows} page={page} totalPages={totalPages} total={total} onPageChange={setPage} loading={loading} />
    </div>
  );
}
