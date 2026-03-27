'use client';

import { Link2, Loader2, Unlink2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import LinkBadge from '@/components/users/LinkBadge';
import LinkUserModal from '@/components/users/LinkUserModal';
import UserFilters from '@/components/users/UserFilters';
import UserPagination from '@/components/users/UserPagination';
import UserSort, { SortableHeader } from '@/components/users/UserSort';
import { useUserFilters } from '@/hooks/useUserFilters';
import { type UserListItem, type UserRole } from '@/types/user';

type LinkTargetTab = 'worker' | 'customer';

type UserForLink = {
  id: string;
  email: string;
  linkedType: LinkTargetTab | null;
  linkedLabel: string;
};

type UsersApiItem = UserListItem & {
  linkedType: LinkTargetTab | null;
  linkedLabel: string;
};

type UserTableProps = {
  currentUserId: string;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; badgeClass: string }> = [
  { value: 'Admin', label: 'Admin', badgeClass: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'KeToan', label: 'Kế toán', badgeClass: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'Viewer', label: 'Viewer', badgeClass: 'border-slate-200 bg-slate-50 text-slate-700' },
];

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

export default function UserTable({ currentUserId }: UserTableProps) {
  const { filters, setPage, setLimit, setSortBy, setSortOrder, setRole, setLinkStatus, setSearch, resetFilters } = useUserFilters();

  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsersApiItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unlinkingUserId, setUnlinkingUserId] = useState<string | null>(null);

  // Use all filters in queryKey so it refetches when ANY filter changes
  const usersQuery = useQuery({
    queryKey: [
      'users-admin-list',
      filters.page,
      filters.limit,
      filters.sortBy,
      filters.sortOrder,
      filters.role,
      filters.linkStatus,
      filters.search,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        role: filters.role,
        linkStatus: filters.linkStatus,
      });

      if (filters.search) {
        params.set('search', filters.search);
      }

      const response = await fetch(`/api/users?${params.toString()}`, {
        cache: 'no-store',
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: UserListItem[];
        error?: string;
      };

      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(payload.error ?? 'Không thể tải danh sách người dùng');
      }

      return payload.data.map((item): UsersApiItem => ({
        ...item,
        linkedType: item.linked_to?.type ?? null,
        linkedLabel: item.linked_to
          ? item.linked_to.type === 'worker'
            ? `Công nhân: ${item.linked_to.name} (${item.linked_to.code})`
            : `Khách hàng: ${item.linked_to.name} (${item.linked_to.code})`
          : 'Chưa liên kết',
      }));
    },
    staleTime: 30_000,
  });

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

  const handleQuickUnlink = async (user: UsersApiItem) => {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn hủy liên kết của tài khoản ${user.email}?`);
    if (!confirmed) return;

    setUnlinkingUserId(user.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/users/${user.id}/unlink`, {
        method: 'DELETE',
      });

      const payload = (await response.json()) as { success?: boolean; error?: string; message?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? 'Không thể hủy liên kết tài khoản');
      }

      await usersQuery.refetch();
      setActionSuccess(payload.message ?? 'Đã hủy liên kết tài khoản thành công.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không thể hủy liên kết tài khoản');
    } finally {
      setUnlinkingUserId(null);
    }
  };

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-600">Tổng số user: {users.length}</p>
        </div>

        <button
          type="button"
          onClick={() => void refreshUsers()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Làm mới
        </button>
      </header>

      <div className="space-y-3">
        <UserFilters
          search={filters.search}
          role={filters.role}
          linkStatus={filters.linkStatus}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onLinkStatusChange={setLinkStatus}
          onClear={resetFilters}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <UserSort sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSortByChange={setSortBy} onSortOrderChange={setSortOrder} />
        </div>
      </div>

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
                <SortableHeader
                  label="Email"
                  fieldName="email"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={setSortBy}
                  className="w-[19%]"
                />
                <th className="w-[15%] px-4 py-3 font-medium">Họ tên</th>
                <th className="w-[10%] px-4 py-3 font-medium">Vai trò</th>
                <th className="w-[24%] px-4 py-3 font-medium">Liên kết với</th>
                <SortableHeader
                  label="Ngày tạo"
                  fieldName="created_at"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={setSortBy}
                  className="w-[10%]"
                />
                <th className="w-[16%] px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                Array.from({ length: Math.min(filters.limit, 8) }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="px-4 py-3" colSpan={7}>
                      <div className="h-6 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const stt = (filters.page - 1) * filters.limit + index + 1;
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-600">{stt}</td>
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.full_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <LinkBadge linkedTo={user.linked_to} />
                          {isCurrentUser && (
                            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                              Tài khoản hiện tại
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.created_at)}</td>
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

                          {user.linked_to && (
                            <button
                              type="button"
                              onClick={() => void handleQuickUnlink(user)}
                              disabled={unlinkingUserId === user.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              {unlinkingUserId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Unlink2 className="h-3.5 w-3.5" />
                              )}
                              Hủy liên kết
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <UserPagination page={filters.page} limit={filters.limit} total={users.length} onPageChange={setPage} onLimitChange={setLimit} />
      </section>

      <LinkUserModal
        open={linkOpen}
        user={
          selectedUser
            ? ({
                id: selectedUser.id,
                email: selectedUser.email,
                linkedType: selectedUser.linkedType,
                linkedLabel: selectedUser.linkedLabel,
              } as UserForLink)
            : null
        }
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
