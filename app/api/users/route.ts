import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  LinkStatus,
  RoleFilter,
  SortBy,
  SortOrder,
  UserListItem,
  UserListResponse,
  UserRole,
} from '@/types/user';

type ProfileMapValue = {
  fullName: string;
  role: UserRole;
  createdAt: string;
};

type WorkerMapValue = {
  id: number;
  code: string;
  name: string;
};

type CustomerMapValue = {
  id: number;
  code: string;
  name: string;
};

function normalizeRole(role: unknown): UserRole {
  if (role === 'Admin' || role === 'KeToan' || role === 'Viewer') {
    return role;
  }

  return 'Viewer';
}

function parseQueryParam(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseIntParam(value: unknown, defaultValue: number, min: number, max: number): number {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return Math.max(min, Math.min(max, parsed));
    }
  }

  return defaultValue;
}

function parseSortBy(value: unknown): SortBy {
  if (value === 'created_at' || value === 'email') {
    return value;
  }

  return 'created_at';
}

function parseSortOrder(value: unknown): SortOrder {
  if (value === 'asc' || value === 'desc') {
    return value;
  }

  return 'desc';
}

function parseRoleFilter(value: unknown): RoleFilter {
  if (value === 'Admin' || value === 'KeToan' || value === 'Viewer' || value === 'all') {
    return value;
  }

  return 'all';
}

function parseLinkStatus(value: unknown): LinkStatus {
  if (value === 'linked' || value === 'unlinked' || value === 'all') {
    return value;
  }

  return 'all';
}

async function ensureAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Bạn chưa đăng nhập' };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role !== 'Admin') {
    return { ok: false as const, status: 403, error: 'Chỉ Admin mới có quyền truy cập chức năng này' };
  }

  return { ok: true as const, supabase };
}

export async function GET(request: NextRequest) {
  const access = await ensureAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseIntParam(searchParams.get('page'), 1, 1, 10000);
    const limit = parseIntParam(searchParams.get('limit'), 20, 1, 100);
    const sortBy = parseSortBy(searchParams.get('sortBy'));
    const sortOrder = parseSortOrder(searchParams.get('sortOrder'));
    const roleFilter = parseRoleFilter(searchParams.get('role'));
    const linkStatusFilter = parseLinkStatus(searchParams.get('linkStatus'));
    const search = parseQueryParam(searchParams.get('search')).toLowerCase().trim();

    // Fetch all auth users
    const users: Array<{ id: string; email: string; createdAt: string }> = [];
    let pageNum = 1;

    while (true) {
      const listResult = await supabaseAdmin.auth.admin.listUsers({ page: pageNum, perPage: 1000 });
      if (listResult.error) {
        return NextResponse.json({ success: false, error: listResult.error.message }, { status: 500 });
      }

      const batch = listResult.data.users;
      if (!batch || batch.length === 0) {
        break;
      }

      batch.forEach((authUser) => {
        users.push({
          id: authUser.id,
          email: authUser.email ?? '',
          createdAt: authUser.created_at ?? new Date().toISOString(),
        });
      });

      if (batch.length < 1000) {
        break;
      }

      pageNum += 1;
    }

    const userIds = users.map((user) => user.id);

    // Fetch profiles, workers, customers in parallel
    const [profilesResult, workersResult, customersResult] = await Promise.all([
      access.supabase.from('profiles').select('id, full_name, role, created_at').in('id', userIds),
      access.supabase
        .from('cong_nhan')
        .select('id, ma_cong_nhan, ho_ten, user_id')
        .not('user_id', 'is', null)
        .in('user_id', userIds),
      access.supabase
        .from('khach_hang')
        .select('id, ma_khach_hang, ten_khach_hang, user_id')
        .not('user_id', 'is', null)
        .in('user_id', userIds),
    ]);

    if (profilesResult.error) {
      return NextResponse.json({ success: false, error: profilesResult.error.message }, { status: 500 });
    }

    if (workersResult.error) {
      return NextResponse.json({ success: false, error: workersResult.error.message }, { status: 500 });
    }

    if (customersResult.error) {
      return NextResponse.json({ success: false, error: customersResult.error.message }, { status: 500 });
    }

    // Build lookup maps
    const profileMap = new Map<string, ProfileMapValue>();
    ((profilesResult.data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
      const id = String(row.id ?? '');
      if (!id) return;

      profileMap.set(id, {
        fullName: String(row.full_name ?? ''),
        role: normalizeRole(row.role),
        createdAt: String(row.created_at ?? ''),
      });
    });

    const workerByUserId = new Map<string, WorkerMapValue>();
    ((workersResult.data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
      const userId = String(row.user_id ?? '');
      if (!userId) return;

      workerByUserId.set(userId, {
        id: Number(row.id ?? 0),
        code: String(row.ma_cong_nhan ?? ''),
        name: String(row.ho_ten ?? ''),
      });
    });

    const customerByUserId = new Map<string, CustomerMapValue>();
    ((customersResult.data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
      const userId = String(row.user_id ?? '');
      if (!userId) return;

      customerByUserId.set(userId, {
        id: Number(row.id ?? 0),
        code: String(row.ma_khach_hang ?? ''),
        name: String(row.ten_khach_hang ?? ''),
      });
    });

    // Build user list with all info
    let userList = users
      .map((user) => {
        const profile = profileMap.get(user.id);
        const linkedWorker = workerByUserId.get(user.id);
        const linkedCustomer = customerByUserId.get(user.id);

        const item: UserListItem = {
          id: user.id,
          email: user.email,
          full_name: profile?.fullName ?? '',
          role: profile?.role ?? 'Viewer',
          created_at: profile?.createdAt || user.createdAt,
          linked_to: linkedWorker
            ? { type: 'worker', id: linkedWorker.id, name: linkedWorker.name, code: linkedWorker.code }
            : linkedCustomer
              ? { type: 'customer', id: linkedCustomer.id, name: linkedCustomer.name, code: linkedCustomer.code }
              : null,
        };

        return item;
      });

    // Apply filters
    userList = userList.filter((user) => {
      // Filter by role
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      // Filter by link status
      if (linkStatusFilter === 'linked' && user.linked_to === null) {
        return false;
      }

      if (linkStatusFilter === 'unlinked' && user.linked_to !== null) {
        return false;
      }

      // Filter by search (email or full_name)
      if (search) {
        const emailMatches = user.email.toLowerCase().includes(search);
        const nameMatches = user.full_name.toLowerCase().includes(search);
        if (!emailMatches && !nameMatches) {
          return false;
        }
      }

      return true;
    });

    // Get total count after filtering
    const total = userList.length;

    // Apply sorting
    userList.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortBy === 'email') {
        aValue = a.email;
        bValue = b.email;
      } else {
        // 'created_at'
        aValue = a.created_at;
        bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = userList.slice(startIndex, endIndex);

    const totalPages = Math.ceil(total / limit);

    const response: UserListResponse = {
      success: true,
      data: paginatedData,
      total,
      page,
      totalPages,
      limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tải danh sách người dùng' },
      { status: 500 },
    );
  }
}
