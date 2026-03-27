'use client';

import { Link2, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import LinkUserModal from '@/components/users/LinkUserModal';

type UsersManagerProps = {
  currentUserId: string;
};

type UserRole = 'Admin' | 'KeToan' | 'Viewer';

type UsersApiItem = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  linkedType: 'worker' | 'customer' | null;
  linkedLabel: string;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; badgeClass: string }> = [
  { value: 'Admin', label: 'Admin', badgeClass: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'KeToan', label: 'Kế toán', badgeClass: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'Viewer', label: 'Viewer', badgeClass: 'border-slate-200 bg-slate-50 text-slate-700' },
];

type RoleFilter = UserRole | 'TatCa';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function roleLabel(role: UserRole) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

function roleBadgeClass(role: UserRole) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.badgeClass ?? 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function UsersManager({ currentUserId }: UsersManagerProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TatCa');
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsersApiItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users-admin-list'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        cache: 'no-store',
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: UsersApiItem[];
        error?: string;
      };

      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(payload.error ?? 'Không thể tải danh sách người dùng');
      }

      return payload.data;
    },
    staleTime: 30_000,
  });

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const sourceUsers = usersQuery.data ?? [];

    return sourceUsers.filter((user) => {
      const roleMatched = roleFilter === 'TatCa' || user.role === roleFilter;
      if (!roleMatched) return false;

      if (!normalizedSearch) return true;

      const text = `${user.email} ${user.fullName}`.toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [roleFilter, search, usersQuery.data]);

  const totalLabel = useMemo(() => `${filteredUsers.length} người dùng`, [filteredUsers.length]);

  const refreshUsers = async () => {
    setActionError(null);
    setActionSuccess(null);
    setRefreshing(true);
    try {
      await usersQuery.refetch();
      setActionSuccess('Đã cập nhật danh sách người dùng.');
    } catch {
      setActionError('Không thể làm mới danh sách người dùng.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-600">{totalLabel}</p>
        </div>

        <button
          type="button"
          onClick={() => void refreshUsers()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Làm mới
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo email hoặc họ tên..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          >
            <option value="TatCa">Tất cả vai trò</option>
            <option value="Admin">Admin</option>
            <option value="KeToan">Kế toán</option>
            <option value="Viewer">Viewer</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRoleFilter('TatCa');
            }}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        </div>
      </section>

      {usersQuery.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(usersQuery.error as Error).message}
        </p>
      )}
      {actionError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
      {actionSuccess && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-[#1B5E20]">{actionSuccess}</p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="w-[6%] px-4 py-3 font-medium">STT</th>
                <th className="w-[20%] px-4 py-3 font-medium">Email</th>
                <th className="w-[16%] px-4 py-3 font-medium">Họ tên</th>
                <th className="w-[10%] px-4 py-3 font-medium">Vai trò</th>
                <th className="w-[26%] px-4 py-3 font-medium">Liên kết với</th>
                <th className="w-[10%] px-4 py-3 font-medium">Ngày tạo</th>
                <th className="w-[12%] px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="px-4 py-3" colSpan={7}>
                      <div className="h-6 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const stt = index + 1;
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-600">{stt}</td>
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.fullName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="space-y-1">
                          <p>{user.linkedLabel}</p>
                          {isCurrentUser && (
                            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                              Tài khoản hiện tại
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setLinkOpen(true);
                              setActionError(null);
                              setActionSuccess(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Liên kết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LinkUserModal
        open={linkOpen}
        user={selectedUser}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
        onLinked={async () => {
          await usersQuery.refetch();
          setActionSuccess('Cập nhật liên kết tài khoản thành công.');
          setActionError(null);
        }}
      />
    </div>
  );
}
