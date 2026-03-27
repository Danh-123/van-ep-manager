'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Link2, Unlink2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type LinkTargetTab = 'worker' | 'customer';

type WorkerItem = {
  id: number;
  maCongNhan: string;
  hoTen: string;
  soDienThoai: string;
};

type CustomerItem = {
  id: number;
  maKhachHang: string;
  tenKhachHang: string;
  soDienThoai: string;
};

type UserForLink = {
  id: string;
  email: string;
  linkedType: LinkTargetTab | null;
  linkedLabel: string;
};

type LinkUserModalProps = {
  open: boolean;
  user: UserForLink | null;
  onOpenChange: (open: boolean) => void;
  onLinked: () => Promise<void> | void;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: string;
};

function ModalBodySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export default function LinkUserModal({ open, user, onOpenChange, onLinked }: LinkUserModalProps) {
  const [tab, setTab] = useState<LinkTargetTab>('worker');
  const [workerId, setWorkerId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab('worker');
    setWorkerId('');
    setCustomerId('');
    setError(null);
    setSuccess(null);
  }, [open]);

  const workersQuery = useQuery({
    queryKey: ['users-unlinked-workers'],
    queryFn: async () => {
      const response = await fetch('/api/users/unlinked-workers', { cache: 'no-store' });
      const payload = (await response.json()) as ApiSuccess<WorkerItem[]> | ApiFailure;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.success === false ? payload.error : 'Không thể tải danh sách công nhân chưa liên kết');
      }

      return payload.data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const customersQuery = useQuery({
    queryKey: ['users-unlinked-customers'],
    queryFn: async () => {
      const response = await fetch('/api/users/unlinked-customers', { cache: 'no-store' });
      const payload = (await response.json()) as ApiSuccess<CustomerItem[]> | ApiFailure;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.success === false ? payload.error : 'Không thể tải danh sách khách hàng chưa liên kết');
      }

      return payload.data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const tabLoading = useMemo(() => {
    return tab === 'worker' ? workersQuery.isLoading : customersQuery.isLoading;
  }, [customersQuery.isLoading, tab, workersQuery.isLoading]);

  const tabError = useMemo(() => {
    const queryError = tab === 'worker' ? workersQuery.error : customersQuery.error;
    return queryError instanceof Error ? queryError.message : null;
  }, [customersQuery.error, tab, workersQuery.error]);

  const handleLink = async () => {
    if (!user) return;

    setError(null);
    setSuccess(null);

    const selectedId = tab === 'worker' ? Number(workerId) : Number(customerId);
    if (!Number.isInteger(selectedId) || selectedId <= 0) {
      setError(tab === 'worker' ? 'Vui lòng chọn công nhân để liên kết.' : 'Vui lòng chọn khách hàng để liên kết.');
      return;
    }

    const targetLabel = tab === 'worker' ? 'công nhân' : 'khách hàng';
    const confirmed = window.confirm(`Bạn có chắc chắn muốn liên kết tài khoản này với ${targetLabel} đã chọn?`);
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, targetId: selectedId }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string; message?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? 'Không thể liên kết tài khoản');
      }

      setSuccess(payload.message ?? 'Liên kết tài khoản thành công');
      await onLinked();
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể liên kết tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!user) return;

    const confirmed = window.confirm('Bạn có chắc chắn muốn hủy liên kết tài khoản này?');
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${user.id}/unlink`, {
        method: 'DELETE',
      });

      const payload = (await response.json()) as { success?: boolean; error?: string; message?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? 'Không thể hủy liên kết tài khoản');
      }

      setSuccess(payload.message ?? 'Đã hủy liên kết tài khoản');
      await onLinked();
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể hủy liên kết tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">Liên kết tài khoản: {user?.email ?? ''}</Dialog.Title>
              <p className="mt-1 text-sm text-slate-600">{user?.linkedLabel ?? 'Chưa liên kết'}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {user?.linkedType && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>Tài khoản hiện đã liên kết: {user.linkedLabel}</span>
              <button
                type="button"
                onClick={() => void handleUnlink()}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink2 className="h-3.5 w-3.5" />}
                Hủy liên kết
              </button>
            </div>
          )}

          <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab('worker')}
              className={`rounded-md px-3 py-1.5 ${
                tab === 'worker' ? 'bg-[#2E7D32] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Công nhân
            </button>
            <button
              type="button"
              onClick={() => setTab('customer')}
              className={`rounded-md px-3 py-1.5 ${
                tab === 'customer' ? 'bg-[#2E7D32] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Khách hàng
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            {tabLoading ? (
              <ModalBodySkeleton />
            ) : (
              <>
                {tab === 'worker' ? (
                  <div>
                    <label htmlFor="worker-select" className="mb-1 block text-sm font-medium text-slate-700">
                      Chọn công nhân chưa liên kết
                    </label>
                    <select
                      id="worker-select"
                      value={workerId}
                      onChange={(event) => setWorkerId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                    >
                      <option value="">-- Chọn công nhân --</option>
                      {(workersQuery.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.maCongNhan} - {item.hoTen} - {item.soDienThoai || '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="customer-select" className="mb-1 block text-sm font-medium text-slate-700">
                      Chọn khách hàng chưa liên kết
                    </label>
                    <select
                      id="customer-select"
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {(customersQuery.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.maKhachHang} - {item.tenKhachHang} - {item.soDienThoai || '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {(tabError || error) && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error || tabError}</p>
          )}
          {success && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void handleLink()}
              disabled={submitting || tabLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Liên kết
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
