'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  createEmployee,
  type EmployeeItem,
  updateEmployee,
} from '@/app/(dashboard)/employees/actions';

const employeeFormSchema = z.object({
  maCongNhan: z.string().trim().optional(),
  hoTen: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

type EmployeeFormProps = {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeItem | null;
  onSuccess: () => void;
};

export default function EmployeeForm({
  mode,
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = useMemo(() => (mode === 'create' ? 'Them cong nhan' : 'Cap nhat cong nhan'), [mode]);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      maCongNhan: '',
      hoTen: '',
      soDienThoai: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && employee) {
      reset({
        maCongNhan: employee.maCongNhan,
        hoTen: employee.hoTen,
        soDienThoai: employee.soDienThoai ?? '',
        isActive: employee.trangThai === 'DangLam',
      });
      return;
    }

    reset({
      maCongNhan: '',
      hoTen: '',
      soDienThoai: '',
      isActive: true,
    });
  }, [employee, mode, open, reset]);

  const onSubmit = (values: EmployeeFormValues) => {
    setError(null);

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createEmployee(values);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        if (!employee) {
          setError('Khong tim thay du lieu cong nhan');
          return;
        }

        const result = await updateEmployee({
          id: employee.id,
          maCongNhan: values.maCongNhan || employee.maCongNhan,
          hoTen: values.hoTen,
          soDienThoai: values.soDienThoai,
          isActive: values.isActive,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="maCongNhan">
                Ma cong nhan (auto generate)
              </label>
              <input
                id="maCongNhan"
                disabled={mode === 'create' || isPending}
                placeholder={mode === 'create' ? 'He thong tu dong sinh khi luu' : ''}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4 disabled:bg-slate-100"
                {...register('maCongNhan')}
              />
              {errors.maCongNhan && <p className="mt-1 text-xs text-red-600">{errors.maCongNhan.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hoTen">
                Ho ten
              </label>
              <input
                id="hoTen"
                disabled={isPending}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4 disabled:bg-slate-100"
                {...register('hoTen')}
              />
              {errors.hoTen && <p className="mt-1 text-xs text-red-600">{errors.hoTen.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="soDienThoai">
                So dien thoai
              </label>
              <input
                id="soDienThoai"
                disabled={isPending}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4 disabled:bg-slate-100"
                {...register('soDienThoai')}
              />
              {errors.soDienThoai && <p className="mt-1 text-xs text-red-600">{errors.soDienThoai.message}</p>}
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('isActive')} />
              Dang lam viec
            </label>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
                {mode === 'create' ? 'Tao moi' : 'Luu thay doi'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
