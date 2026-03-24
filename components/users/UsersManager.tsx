'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, KeyRound, Loader2, PencilLine, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useUsers } from '@/hooks/useUsers';
import type { UserItem, UserRole } from '@/app/(dashboard)/users/actions';

type UsersManagerProps = {
  currentUserId: string;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; badgeClass: string }> = [
  { value: 'Admin', label: 'Admin', badgeClass: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'KeToan', label: 'Ke toan', badgeClass: 'border-amber-200 bg-amber-50 text-amber-700' },
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

export default function UsersManager({ currentUserId }: UsersManagerProps) {
  const {
    users,
    loading,
    error,
    success,
    search,
    roleFilter,
    isPending,
    filteredCount,
    setSearch,
    setRoleFilter,
    clearMessages,
    create,
    update,
    remove,
    sendResetPassword,
    runTransition,
  } = useUsers(currentUserId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);

  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('Viewer');

  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Viewer');

  const totalLabel = useMemo(() => `${filteredCount} nguoi dung`, [filteredCount]);

  const resetCreateForm = () => {
    setCreateEmail('');
    setCreateFullName('');
    setCreatePassword('');
    setCreateRole('Viewer');
    setCreateValidationError(null);
  };

  const openEdit = (user: UserItem) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditOpen(true);
  };

  const openReset = (user: UserItem) => {
    setSelectedUser(user);
    setResetOpen(true);
  };

  const openDelete = (user: UserItem) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const validateCreate = () => {
    if (!createEmail.trim()) return 'Email la bat buoc';
    if (!/^\S+@\S+\.\S+$/.test(createEmail.trim())) return 'Email khong hop le';
    if (!createFullName.trim() || createFullName.trim().length < 2) return 'Ho ten phai tu 2 ky tu tro len';
    if (createPassword.length < 8) return 'Mat khau tam thoi phai tu 8 ky tu tro len';
    return null;
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quan ly nguoi dung</h1>
          <p className="mt-1 text-sm text-slate-600">{totalLabel}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            clearMessages();
            setCreateValidationError(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
        >
          <Plus className="h-4 w-4" />
          Tao nguoi dung
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tim theo email hoac ho ten..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | 'TatCa')}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          >
            <option value="TatCa">Tat ca vai tro</option>
            <option value="Admin">Admin</option>
            <option value="KeToan">Ke toan</option>
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
            Xoa loc
          </button>
        </div>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {createValidationError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createValidationError}</p>
      )}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-[#1B5E20]">{success}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Ho ten</th>
                <th className="px-4 py-3 font-medium">Vai tro</th>
                <th className="px-4 py-3 font-medium">Ngay tao</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="h-6 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Khong co nguoi dung nao.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => openReset(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset MK
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => openDelete(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xoa
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

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-slate-900">Tao nguoi dung moi</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Ho ten</label>
                <input
                  value={createFullName}
                  onChange={(event) => setCreateFullName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Mat khau tam thoi</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Vai tro</label>
                <select
                  value={createRole}
                  onChange={(event) => setCreateRole(event.target.value as UserRole)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                >
                  <option value="Admin">Admin</option>
                  <option value="KeToan">Ke toan</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const validationError = validateCreate();
                  if (validationError) {
                    clearMessages();
                    setCreateValidationError(validationError);
                    return;
                  }

                  setCreateValidationError(null);

                  return runTransition(async () => {
                    const result = await create({
                      email: createEmail,
                      fullName: createFullName,
                      password: createPassword,
                      role: createRole,
                    });

                    if (result.success) {
                      setCreateOpen(false);
                      resetCreateForm();
                    }
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tao moi
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-slate-900">Cap nhat nguoi dung</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {!selectedUser ? (
              <p className="text-sm text-slate-500">Khong tim thay nguoi dung.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Email</label>
                  <input
                    value={selectedUser.email}
                    disabled
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-700">Ho ten</label>
                  <input
                    value={editFullName}
                    onChange={(event) => setEditFullName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-700">Vai tro</label>
                  <select
                    value={editRole}
                    disabled={selectedUser.id === currentUserId}
                    onChange={(event) => setEditRole(event.target.value as UserRole)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="KeToan">Ke toan</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  {selectedUser.id === currentUserId && (
                    <p className="mt-1 text-xs text-amber-700">Ban khong the thay doi vai tro cua chinh minh.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                disabled={isPending || !selectedUser}
                onClick={() => {
                  if (!selectedUser) return;

                  runTransition(async () => {
                    const result = await update({
                      id: selectedUser.id,
                      fullName: editFullName,
                      role: selectedUser.id === currentUserId ? selectedUser.role : editRole,
                    });

                    if (result.success) {
                      setEditOpen(false);
                    }
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Luu thay doi
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Reset mat khau</Dialog.Title>
            <p className="mt-2 text-sm text-slate-600">
              Gui email reset mat khau cho <span className="font-medium text-slate-900">{selectedUser?.email ?? '-'}</span>?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                disabled={isPending || !selectedUser}
                onClick={() => {
                  if (!selectedUser) return;

                  runTransition(async () => {
                    const result = await sendResetPassword(selectedUser);
                    if (result.success) {
                      setResetOpen(false);
                    }
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Gui email reset
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">Xoa nguoi dung</Dialog.Title>
                <p className="mt-1 text-sm text-slate-600">
                  Ban chac chan muon xoa nguoi dung <span className="font-medium text-slate-900">{selectedUser?.email ?? '-'}</span>?
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Neu nguoi dung da co du lieu lien quan, he thong se tu dong chan thao tac xoa.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                disabled={isPending || !selectedUser}
                onClick={() => {
                  if (!selectedUser) return;

                  runTransition(async () => {
                    const result = await remove(selectedUser.id);
                    if (result.success) {
                      setDeleteOpen(false);
                    }
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xac nhan xoa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
