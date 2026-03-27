'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type EmployeeForLink = {
  id: number;
  hoTen: string;
};

type UnlinkedUser = {
  id: string;
  email: string;
  full_name: string;
};

type UnlinkedUsersPayload = {
  users: UnlinkedUser[];
  error?: string;
};

type LinkUserModalProps = {
  open: boolean;
  employee: EmployeeForLink | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => Promise<void> | void;
  submitting?: boolean;
};

export default function LinkUserModal({
  open,
  employee,
  onOpenChange,
  onConfirm,
  submitting = false,
}: LinkUserModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setLocalError(null);
    }
  }, [open]);

  const usersQuery = useQuery({
    queryKey: ['users-unlinked'],
    enabled: open,
    queryFn: async () => {
      const response = await fetch('/api/users/unlinked', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as UnlinkedUsersPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? 'Không thể tải danh sách tài khoản chưa liên kết');
      }

      return payload.users;
    },
    staleTime: 30_000,
  });

  const handleConfirm = async () => {
    setLocalError(null);
    if (!selectedUserId) {
      setLocalError('Vui lòng chọn tài khoản cần liên kết.');
      return;
    }

    await onConfirm(selectedUserId);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {`Liên kết tài khoản với công nhân ${employee?.hoTen ?? ''}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="link-user-select">
                Chọn tài khoản
              </label>
              {usersQuery.isLoading ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <select
                  id="link-user-select"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                >
                  <option value="">Chọn tài khoản chưa liên kết</option>
                  {(usersQuery.data ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} - {user.full_name || 'Không có tên'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {usersQuery.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {(usersQuery.error as Error).message}
              </p>
            )}
            {localError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting || usersQuery.isLoading}
                onClick={() => void handleConfirm()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Xác nhận
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
