import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const auditQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  table: z.string().optional(),
  action: z.string().optional(),
  user: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

const PAGE_SIZE = 20;

function isValidDateText(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  const tableParam = url.searchParams.get('table') ?? 'TatCa';
  const actionParam = url.searchParams.get('action') ?? 'TatCa';
  const userSearch = url.searchParams.get('user')?.trim() ?? '';
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? String(PAGE_SIZE));

  const filters = auditQuerySchema.safeParse({ from, to, table: tableParam, action: actionParam, user: userSearch, page, pageSize });
  if (!filters.success) {
    return NextResponse.json(
      { success: false, error: filters.error.issues[0]?.message ?? 'Tham số không hợp lệ' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Bạn chưa đăng nhập' }, { status: 401 });
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data || profileResult.data.role !== 'Admin') {
    return NextResponse.json({ success: false, error: 'Bạn không có quyền truy cập' }, { status: 403 });
  }

  try {
    // Search for user IDs if user filter is provided
    let changedByIds: string[] | null = null;

    if (filters.data.user) {
      const profileSearch = await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${filters.data.user}%,email.ilike.%${filters.data.user}%`)
        .limit(200);

      if (profileSearch.error) {
        throw new Error(profileSearch.error.message);
      }

      changedByIds = (profileSearch.data ?? []).map((row) => (row as { id: string }).id);
    }

    const offset = (filters.data.page - 1) * filters.data.pageSize;
    const toIndex = offset + filters.data.pageSize - 1;

    let auditQuery = supabase
      .from('audit_log')
      .select(
        'id, table_name, record_id, hanh_dong, old_data, new_data, changed_by, changed_at, profiles:changed_by(full_name, email)',
        { count: 'exact' },
      )
      .order('changed_at', { ascending: false })
      .range(offset, toIndex);

    if (isValidDateText(filters.data.from)) {
      auditQuery = auditQuery.gte('changed_at', `${filters.data.from}T00:00:00`);
    }

    if (isValidDateText(filters.data.to)) {
      auditQuery = auditQuery.lte('changed_at', `${filters.data.to}T23:59:59`);
    }

    if (filters.data.table && filters.data.table !== 'TatCa') {
      auditQuery = auditQuery.eq('table_name', filters.data.table);
    }

    if (filters.data.action && filters.data.action !== 'TatCa') {
      auditQuery = auditQuery.eq('hanh_dong', filters.data.action);
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
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

      const userName = typed.profiles?.full_name?.trim() || typed.profiles?.email?.trim() || 'Hệ thống';

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
    const totalPages = Math.max(1, Math.ceil(total / filters.data.pageSize));

    return NextResponse.json({
      success: true,
      data: {
        rows,
        total,
        totalPages,
        page: filters.data.page,
        pageSize: filters.data.pageSize,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tải audit log' },
      { status: 500 },
    );
  }
}
