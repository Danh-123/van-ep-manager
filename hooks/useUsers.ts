'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import {
  createUser,
  deleteUser,
  getUsers,
  resetPassword,
  updateUser,
  type UserItem,
  type UserRole,
} from '@/app/(dashboard)/users/actions';

type RoleFilter = UserRole | 'TatCa';

type CreateUserInput = {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
};

type UpdateUserInput = {
  id: string;
  fullName: string;
  role: UserRole;
};

export function useUsers(currentUserId: string) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TatCa');
  const [isPending, startTransition] = useTransition();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getUsers({ search, role: roleFilter });
    if (!result.success) {
      setUsers([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setUsers(result.data);
    setLoading(false);
  }, [roleFilter, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const create = useCallback(
    async (input: CreateUserInput) => {
      setError(null);
      setSuccess(null);

      const result = await createUser(input);
      if (!result.success) {
        setError(result.error);
        return { success: false as const };
      }

      await loadUsers();
      setSuccess('Da tao nguoi dung moi thanh cong.');
      return { success: true as const };
    },
    [loadUsers],
  );

  const update = useCallback(
    async (input: UpdateUserInput) => {
      setError(null);
      setSuccess(null);

      const result = await updateUser(input);
      if (!result.success) {
        setError(result.error);
        return { success: false as const };
      }

      await loadUsers();
      setSuccess('Da cap nhat thong tin nguoi dung.');
      return { success: true as const };
    },
    [loadUsers],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      setSuccess(null);

      const result = await deleteUser({ id });
      if (!result.success) {
        setError(result.error);
        return { success: false as const };
      }

      await loadUsers();
      setSuccess('Da xoa nguoi dung.');
      return { success: true as const };
    },
    [loadUsers],
  );

  const sendResetPassword = useCallback(async (user: UserItem) => {
    setError(null);
    setSuccess(null);

    const result = await resetPassword({ id: user.id, email: user.email });
    if (!result.success) {
      setError(result.error);
      return { success: false as const };
    }

    setSuccess(`Da gui email reset mat khau cho ${user.email}.`);
    return { success: true as const };
  }, []);

  const runTransition = useCallback(
    async (task: () => Promise<void>) => {
      startTransition(() => {
        void task();
      });
    },
    [startTransition],
  );

  const filteredCount = useMemo(() => users.length, [users]);

  return {
    users,
    loading,
    error,
    success,
    search,
    roleFilter,
    isPending,
    currentUserId,
    filteredCount,
    setSearch,
    setRoleFilter,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    },
    loadUsers,
    create,
    update,
    remove,
    sendResetPassword,
    runTransition,
  };
}
