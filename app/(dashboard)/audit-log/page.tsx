import { redirect } from 'next/navigation';

import AuditTable, { type AuditLogRow } from '@/components/audit/AuditTable';
import { createClient } from '@/lib/supabase/server';

type AuditLogPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    table?: string;
    action?: string;
    user?: string;
    page?: string;
  }>;
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

const PAGE_SIZE = 20;

function isValidDateText(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolvePage(rawValue: string | undefined) {
  const num = Number(rawValue ?? '1');
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.trunc(num);
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'Admin') {
    redirect('/dashboard');
  }

  const query = await searchParams;

  const from = isValidDateText(query.from) ? query.from! : '';
  const to = isValidDateText(query.to) ? query.to! : '';
  const table = TABLE_OPTIONS.includes((query.table as (typeof TABLE_OPTIONS)[number]) ?? 'TatCa')
    ? (query.table ?? 'TatCa')
    : 'TatCa';
  const action = ACTION_OPTIONS.includes((query.action as (typeof ACTION_OPTIONS)[number]) ?? 'TatCa')
    ? (query.action ?? 'TatCa')
    : 'TatCa';
  const userSearch = query.user?.trim() ?? '';
  const page = resolvePage(query.page);

  let changedByIds: string[] | null = null;

  if (userSearch) {
    const profileSearch = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
      .limit(200);

    if (profileSearch.error) {
      throw new Error(profileSearch.error.message);
    }

    changedByIds = (profileSearch.data ?? []).map((row) => (row as { id: string }).id);
  }

  const offset = (page - 1) * PAGE_SIZE;
  const toIndex = offset + PAGE_SIZE - 1;

  let auditQuery = supabase
    .from('audit_log')
    .select('id, table_name, record_id, hanh_dong, old_data, new_data, changed_by, changed_at, profiles:changed_by(full_name, email)', {
      count: 'exact',
    })
    .order('changed_at', { ascending: false })
    .range(offset, toIndex);

  if (from) {
    auditQuery = auditQuery.gte('changed_at', `${from}T00:00:00`);
  }

  if (to) {
    auditQuery = auditQuery.lte('changed_at', `${to}T23:59:59`);
  }

  if (table !== 'TatCa') {
    auditQuery = auditQuery.eq('table_name', table);
  }

  if (action !== 'TatCa') {
    auditQuery = auditQuery.eq('hanh_dong', action);
  }

  if (changedByIds) {
    if (changedByIds.length === 0) {
      auditQuery = auditQuery.eq('changed_by', '00000000-0000-0000-0000-000000000000');
    } else {
      auditQuery = auditQuery.in('changed_by', changedByIds);
    }
  }

  const { data, error, count } = await auditQuery;

  if (error) {
    throw new Error(error.message);
  }

  const rows: AuditLogRow[] = (data ?? []).map((row) => {
    const typed = row as {
      id: number;
      table_name: string;
      record_id: string;
      hanh_dong: 'INSERT' | 'UPDATE' | 'DELETE';
      old_data: unknown;
      new_data: unknown;
      changed_at: string;
      profiles: { full_name?: string | null; email?: string | null } | null;
    };

    const userName =
      typed.profiles?.full_name?.trim() || typed.profiles?.email?.trim() || 'He thong';

    return {
      id: typed.id,
      changedAt: typed.changed_at,
      userName,
      tableName: typed.table_name,
      recordId: typed.record_id,
      action: typed.hanh_dong,
      oldData: typed.old_data,
      newData: typed.new_data,
    };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-600">Theo doi thay doi du lieu tren cac bang quan trong.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6" method="get">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tu ngay</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Den ngay</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Bang</label>
            <select
              name="table"
              defaultValue={table}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            >
              {TABLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Action</label>
            <select
              name="action"
              defaultValue={action}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Tim theo nguoi dung</label>
            <input
              type="text"
              name="user"
              placeholder="Nhap ten hoac email..."
              defaultValue={userSearch}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <div className="flex items-end gap-2 lg:col-span-6">
            <button
              type="submit"
              className="h-10 rounded-lg bg-[#2E7D32] px-4 text-sm font-medium text-white hover:bg-[#1B5E20]"
            >
              Loc du lieu
            </button>
            <a
              href="/audit-log"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
            >
              Xoa loc
            </a>
          </div>
        </form>
      </section>

      <AuditTable
        rows={rows}
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        total={total}
        query={{
          from,
          to,
          table,
          action,
          user: userSearch,
        }}
      />
    </div>
  );
}
