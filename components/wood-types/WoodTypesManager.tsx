'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  createWoodType,
  deleteWoodType,
  getWoodTypes,
  importDefaultWoodTypes,
  type WoodTypeItem,
  updateWoodType,
} from '@/app/(dashboard)/wood-types/actions';

const formSchema = z.object({
  tenLoai: z.string().trim().min(2, 'Ten loai phai co it nhat 2 ky tu').max(120),
  donGia: z.number().positive('Don gia phai lon hon 0'),
  donVi: z.enum(['m2', 'kg']),
});

type FormValues = z.infer<typeof formSchema>;

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function WoodTypesManager() {
  const [rows, setRows] = useState<WoodTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WoodTypeItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenLoai: '',
      donGia: 0,
      donVi: 'm2',
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getWoodTypes();

    if (!result.success) {
      setRows([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setRows(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const title = useMemo(() => (editing ? 'Chinh sua loai van ep' : 'Them loai van ep'), [editing]);

  const openCreate = () => {
    setEditing(null);
    reset({
      tenLoai: '',
      donGia: 0,
      donVi: 'm2',
    });
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (row: WoodTypeItem) => {
    setEditing(row);
    reset({
      tenLoai: row.tenLoai,
      donGia: row.donGia,
      donVi: row.donVi,
    });
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const onSubmit = (values: FormValues) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = editing
        ? await updateWoodType({ id: editing.id, ...values })
        : await createWoodType(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setModalOpen(false);
      setEditing(null);
      setSuccess(editing ? 'Da cap nhat loai van ep.' : 'Da tao loai van ep moi.');
      await loadData();
    });
  };

  const handleDelete = (row: WoodTypeItem) => {
    const ok = window.confirm(`Xac nhan xoa loai van ep "${row.tenLoai}"?`);
    if (!ok) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await deleteWoodType(row.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess('Da xoa loai van ep.');
      await loadData();
    });
  };

  const handleImportDefaults = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await importDefaultWoodTypes();
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(`Import mac dinh xong: them ${result.data.inserted}, cap nhat ${result.data.updated}.`);
      await loadData();
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quan ly loai van ep</h1>
          <p className="mt-1 text-sm text-slate-600">Chi Admin moi duoc xem va chinh sua du lieu nay.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleImportDefaults}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import mac dinh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
          >
            <Plus className="h-4 w-4" />
            Them loai moi
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Ten loai</th>
                <th className="px-4 py-3 font-medium">Don gia</th>
                <th className="px-4 py-3 font-medium">Ngay tao</th>
                <th className="px-4 py-3 text-right font-medium">Hanh dong</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="h-6 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Chua co loai van ep nao.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{row.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{row.tenLoai}</p>
                      <p className="text-xs text-slate-500">Ma: {row.maLoai}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(row.donGia)} / {row.donVi}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{format(new Date(row.createdAt), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog.Root
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenLoai">
                  Ten loai
                </label>
                <input
                  id="tenLoai"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('tenLoai')}
                />
                {errors.tenLoai && <p className="mt-1 text-xs text-red-600">{errors.tenLoai.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="donGia">
                  Don gia
                </label>
                <input
                  id="donGia"
                  type="number"
                  min={1}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('donGia', { valueAsNumber: true })}
                />
                {errors.donGia && <p className="mt-1 text-xs text-red-600">{errors.donGia.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="donVi">
                  Don vi
                </label>
                <select
                  id="donVi"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('donVi')}
                >
                  <option value="m2">VND/m2</option>
                  <option value="kg">VND/kg</option>
                </select>
                {errors.donVi && <p className="mt-1 text-xs text-red-600">{errors.donVi.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Huy
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-70"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Luu thay doi' : 'Tao moi'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
